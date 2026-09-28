import { prisma } from './prisma.js';
import { runAiValidation } from './ai-sales-order-validation.js';
import { pushApprovalHistory, sendApprovalNotification } from './approval-helpers.js';
import { logActivity } from './activity-log.js';
import { logger } from './logger.js';

/**
 * Fire-and-forget background AI validation for a sales order.
 * Updates the order status to PROPOSED on success, or keeps it VALIDATING on failure.
 */
export function startBackgroundValidation(orderId: string, userId: string) {
  // Fire-and-forget — do NOT await
  void runValidation(orderId, userId).catch((err) => {
    logger.error(`[background-validation] Unhandled error for order ${orderId}`, { error: err });
  });
}

async function runValidation(orderId: string, userId: string) {
  try {
    // Run AI validation
    const result = await runAiValidation(orderId);

    // Fetch current order state
    const order = await prisma.salesOrder.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { name: true } },
      },
    });

    if (!order) {
      logger.error(`[background-validation] Order ${orderId} not found`);
      return;
    }

    // Build standardized approval history entry with full validation data
    const historyEntry = {
      process: 'AI Validation',
      name: 'AI System',
      dateTime: new Date().toISOString(),
      message: result.valid
        ? `Validation passed (score: ${result.score}, risk: ${result.riskLevel})`
        : `Validation completed with issues (score: ${result.score}, risk: ${result.riskLevel})`,
      // Store full validation data in the entry for timeline display
      aiValidationStatus: 'SUCCESS',
      aiValidationResult: result,
      aiValidatedAt: new Date().toISOString(),
      aiValidationError: null,
    };

    const history = pushApprovalHistory((order as unknown as { approvalHistory: unknown }).approvalHistory, historyEntry);

    // Update order: auto-transition to PROPOSED if valid, otherwise back to DRAFT
    const newStatus = result.valid ? 'PROPOSED' : 'DRAFT';

    await prisma.salesOrder.update({
      where: { id: orderId },
      data: {
        approvalStatus: newStatus,
        proposedAt: result.valid ? new Date() : undefined,
        approvalHistory: history,
      },
    });

    // Log activity
    await logActivity(prisma, {
      action: 'APPROVE',
      userId,
      resource: 'sales_order',
      resourceId: orderId,
      message: `AI validation completed for sales order ${order.documentNumber ?? orderId} (score: ${result.score}, risk: ${result.riskLevel})`,
    });

    // If valid and auto-proposed, notify approvers
    if (result.valid) {
      await notifyApprovers(orderId, order.documentNumber, order.customer?.name ?? 'N/A', userId);
    } else {
      // If invalid, notify creator with AI feedback
      await notifyCreatorOfFailure(orderId, order.documentNumber, order.createdById, userId, result);
    }

    logger.info(`[background-validation] Order ${orderId} validated: ${newStatus}`, { score: result.score });
  } catch (error) {
    logger.error(`[background-validation] Validation failed for order ${orderId}`, { error });

    // Fetch current order state for history
    const order = await prisma.salesOrder.findUnique({
      where: { id: orderId },
    });

    if (order) {
      // Build standardized error entry
      const historyEntry = {
        process: 'AI Validation',
        name: 'AI System',
        dateTime: new Date().toISOString(),
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        aiValidationStatus: 'FAILED',
        aiValidationResult: null,
        aiValidatedAt: new Date().toISOString(),
        aiValidationError: error instanceof Error ? error.message : 'Unknown error',
      };

    const history = pushApprovalHistory((order as unknown as { approvalHistory: unknown }).approvalHistory, historyEntry);

    // Update order with error
    await prisma.salesOrder.update({
      where: { id: orderId },
      data: {
        approvalHistory: history,
      },
    });
    }

    // Log error
    await logActivity(prisma, {
      action: 'REJECT',
      userId,
      resource: 'sales_order',
      resourceId: orderId,
      message: `AI validation failed for sales order ${orderId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

async function notifyApprovers(orderId: string, documentNumber: string | null, customerName: string, createdById: string) {
  // Find all users with sales-order@approve permission
  const approvers = await prisma.user.findMany({
    where: {
      role: {
        permissions: {
          some: {
            permission: {
              name: 'sales-order@approve',
            },
          },
        },
      },
    },
    select: { id: true, name: true },
  });

  // Send notification to each approver (exclude the creator)
  for (const approver of approvers) {
    if (approver.id === createdById) continue;

    await sendApprovalNotification({
      recipientId: approver.id,
      createdById,
      title: 'Sales Order Ready for Approval',
      message: `Sales order ${documentNumber ?? orderId} for ${customerName} has been AI validated and is ready for your review.`,
      targetType: 'SALES_ORDER',
      targetId: orderId,
      actionUrl: `/sales-order/${orderId}`,
    });
  }
}

async function notifyCreatorOfFailure(
  orderId: string,
  documentNumber: string | null,
  creatorId: string,
  validatorId: string,
  result: any
) {
  const issuesText = result.issues?.length > 0 
    ? `\n\nIssues found:\n${result.issues.map((issue: string) => `• ${issue}`).join('\n')}`
    : '';
  
  const recommendationsText = result.recommendations?.length > 0
    ? `\n\nRecommendations:\n${result.recommendations.map((rec: string) => `• ${rec}`).join('\n')}`
    : '';

  await sendApprovalNotification({
    recipientId: creatorId,
    createdById: validatorId,
    title: 'Sales Order AI Validation Failed',
    message: `Your sales order ${documentNumber ?? orderId} did not pass AI validation.\n\nScore: ${result.score}/100\nRisk Level: ${result.riskLevel}\n\nAnalysis: ${result.analysis}${issuesText}${recommendationsText}\n\nPlease review and resubmit after addressing the issues.`,
    targetType: 'SALES_ORDER',
    targetId: orderId,
    actionUrl: `/sales-order/${orderId}`,
    type: 'WARNING',
  });
}

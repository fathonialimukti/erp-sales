import { prisma } from './prisma.js';

export interface ValidationResult {
  valid: boolean;
  issues: string[];
}

/**
 * AI Validation - Rule-based checks for document completeness and sanity
 * This runs before allowing documents to move from DRAFT to AI_VALIDATED status
 */

export async function validateSalesOrder(orderId: string): Promise<ValidationResult> {
  const issues: string[] = [];

  const order = await prisma.salesOrder.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      customer: true,
      outlet: true,
    },
  });

  if (!order) {
    return { valid: false, issues: ['Sales order not found'] };
  }

  // Check required fields
  if (!order.customerId) issues.push('Customer is required');
  if (!order.areaId) issues.push('Area is required');
  if (!order.date) issues.push('Date is required');

  // Check items
  if (order.items.length === 0) {
    issues.push('At least one item is required');
  } else {
    order.items.forEach((item, idx) => {
      if (!item.skuId) issues.push(`Item ${idx + 1}: SKU is required`);
      if (!item.quantity || item.quantity.toNumber() <= 0) issues.push(`Item ${idx + 1}: Quantity must be greater than 0`);
      if (!item.unitPrice || item.unitPrice.toNumber() <= 0) issues.push(`Item ${idx + 1}: Unit price must be greater than 0`);
    });
  }

  // Check totals
  if (!order.grandTotal || order.grandTotal.toNumber() <= 0) {
    issues.push('Grand total must be greater than 0');
  }

  return { valid: issues.length === 0, issues };
}

export async function validateActionProgram(programId: string): Promise<ValidationResult> {
  const issues: string[] = [];

  const program = await prisma.actionProgram.findUnique({
    where: { id: programId },
    include: {
      outlets: true,
      skus: true,
      items: true,
    },
  });

  if (!program) {
    return { valid: false, issues: ['Action program not found'] };
  }

  // Check required fields
  if (!program.name || program.name.trim().length === 0) issues.push('Name is required');
  if (!program.areaId) issues.push('Area is required');
  if (!program.startDate) issues.push('Start date is required');
  if (!program.endDate) issues.push('End date is required');

  // Check date range
  if (program.startDate && program.endDate) {
    if (program.startDate > program.endDate) {
      issues.push('Start date must be before end date');
    }
  }

  // Check outlets
  if (program.outlets.length === 0) {
    issues.push('At least one outlet is required');
  }

  // Check SKUs or items
  if (program.skus.length === 0 && program.items.length === 0) {
    issues.push('At least one SKU or item is required');
  }

  // Validate SKUs
  program.skus.forEach((sku, idx) => {
    if (!sku.skuId) issues.push(`SKU ${idx + 1}: SKU is required`);
    if (!sku.quantity || sku.quantity.toNumber() <= 0) issues.push(`SKU ${idx + 1}: Quantity must be greater than 0`);
    if (sku.price === null || sku.price === undefined || sku.price.toNumber() < 0) {
      issues.push(`SKU ${idx + 1}: Price must be non-negative`);
    }
  });

  // Validate items
  program.items.forEach((item, idx) => {
    if (!item.name || item.name.trim().length === 0) issues.push(`Item ${idx + 1}: Name is required`);
    if (!item.quantity || item.quantity.toNumber() <= 0) issues.push(`Item ${idx + 1}: Quantity must be greater than 0`);
    if (item.price === null || item.price === undefined || item.price.toNumber() < 0) {
      issues.push(`Item ${idx + 1}: Price must be non-negative`);
    }
  });

  // Check budget
  if (!program.budgetAmount || program.budgetAmount.toNumber() <= 0) {
    issues.push('Budget amount must be greater than 0');
  }

  return { valid: issues.length === 0, issues };
}

export async function validateEventProposal(proposalId: string): Promise<ValidationResult> {
  const issues: string[] = [];

  const proposal = await prisma.eventProposal.findUnique({
    where: { id: proposalId },
    include: {
      skus: true,
    },
  });

  if (!proposal) {
    return { valid: false, issues: ['Event proposal not found'] };
  }

  // Check required fields
  if (!proposal.name || proposal.name.trim().length === 0) issues.push('Name is required');
  if (!proposal.areaId) issues.push('Area is required');
  if (!proposal.eventDate) issues.push('Event date is required');

  // Check SKUs
  if (proposal.skus.length === 0) {
    issues.push('At least one SKU is required');
  } else {
    proposal.skus.forEach((sku, idx) => {
      if (!sku.skuId) issues.push(`SKU ${idx + 1}: SKU is required`);
      if (!sku.quantity || sku.quantity.toNumber() <= 0) issues.push(`SKU ${idx + 1}: Quantity must be greater than 0`);
      if (sku.price === null || sku.price === undefined || sku.price.toNumber() < 0) {
        issues.push(`SKU ${idx + 1}: Price must be non-negative`);
      }
    });
  }

  // Check budget
  if (!proposal.proposedBudget || proposal.proposedBudget.toNumber() <= 0) {
    issues.push('Proposed budget must be greater than 0');
  }

  return { valid: issues.length === 0, issues };
}

export async function validateVisitLog(visitLogId: string): Promise<ValidationResult> {
  const issues: string[] = [];

  const visitLog = await prisma.visitLog.findUnique({
    where: { id: visitLogId },
  });

  if (!visitLog) {
    return { valid: false, issues: ['Visit log not found'] };
  }

  // Check required fields
  if (!visitLog.outletId) issues.push('Outlet is required');
  if (!visitLog.date) issues.push('Date is required');
  if (!visitLog.purpose && !visitLog.notes) {
    issues.push('Purpose or notes is required');
  }

  return { valid: issues.length === 0, issues };
}

import type { Request, Response } from 'express';
import { parseCookie } from 'cookie';
import jwt from 'jsonwebtoken';
import { generateText } from 'ai';
import { getChatModel } from '../lib/ai-provider.js';
import { getJwtSecret } from '../lib/jwt-secret.js';
import { prisma } from '../lib/prisma.js';

const JWT_SECRET = getJwtSecret();

// Reuse the auth pattern from ai-form-fill.ts — parse cookie `access_token`
// or Bearer header, verify JWT, return null (and 401) if invalid.
function authUserId(req: Request, res: Response): string | null {
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
        const cookies = parseCookie(cookieHeader);
        if (cookies.access_token) {
            try {
                const payload = jwt.verify(cookies.access_token, JWT_SECRET) as jwt.JwtPayload;
                return payload?.userId ? String(payload.userId) : null;
            } catch {
                res.status(401).json({ error: 'Invalid token' });
                return null;
            }
        }
    }
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
        try {
            const payload = jwt.verify(auth.slice('Bearer '.length), JWT_SECRET) as jwt.JwtPayload;
            return payload?.userId ? String(payload.userId) : null;
        } catch {
            res.status(401).json({ error: 'Invalid token' });
            return null;
        }
    }
    res.status(401).json({ error: 'Unauthorized' });
    return null;
}

const SUPPORTED_MODULES = ['sales-order', 'customer', 'visit-log', 'action-program', 'event-proposal'] as const;
type SupportedModule = (typeof SUPPORTED_MODULES)[number];

const SUMMARIZE_INSTRUCTIONS = `Produce a 3-5 line executive brief in Markdown for a sales manager. Include: what this record is, key facts (customer/outlet, amounts, items, status, dates), and 1-2 notable risks/opportunities if any. Be concise, business language, never raw JSON. Use Indonesian if the context seems Indonesian, else English.`;

function fmtDate(value: Date | null | undefined): string | null {
    return value ? value.toISOString().slice(0, 10) : null;
}

function fmtMoney(value: { toString(): string } | null | undefined): string | null {
    return value !== null && value !== undefined ? Number(value).toLocaleString('en-US') : null;
}

type NamedLink = { outlet?: { name?: string } | null; sku?: { name?: string } | null };

function joinNames(values: NamedLink[]): string {
    const names = values
        .map((v) => v.outlet?.name ?? v.sku?.name ?? null)
        .filter((n): n is string => Boolean(n));
    return names.length > 0 ? `${names.length}: ${names.slice(0, 6).join(', ')}${names.length > 6 ? ', …' : ''}` : String(values.length);
}

async function buildSalesOrderContext(id: string): Promise<string> {
    const record = await prisma.salesOrder.findUnique({
        where: { id },
        include: {
            customer: { select: { name: true } },
            outlet: { select: { name: true } },
            area: { select: { name: true } },
            createdBy: { select: { name: true } },
            approvedBy: { select: { name: true } },
            items: {
                include: { sku: { select: { name: true, code: true } } },
                orderBy: { sortOrder: 'asc' },
            },
        },
    });
    if (!record) return 'NOT_FOUND';
    const itemLines = record.items
        .map((i) => `- ${i.sku.name} (${i.sku.code}): qty ${Number(i.quantity)}, unit price ${fmtMoney(i.unitPrice)}, line total ${fmtMoney(i.lineTotal)}`)
        .join('\n');
    return [
        `Sales order ${record.documentNumber ?? record.id}`,
        `Customer: ${record.customer?.name ?? '-'}`,
        `Outlet: ${record.outlet.name} | Area: ${record.area.name}`,
        `Date: ${fmtDate(record.date)} | Expected delivery: ${fmtDate(record.expectedDeliveryDate)}`,
        `Approval status: ${record.approvalStatus} | Proposed at: ${fmtDate(record.proposedAt)} | Approved by: ${record.approvedBy?.name ?? '-'} at ${fmtDate(record.approvedAt)}`,
        `Created by: ${record.createdBy.name}`,
        `Subtotal: ${fmtMoney(record.subtotal)} | Discount: ${fmtMoney(record.discountTotal)} | Tax: ${fmtMoney(record.taxTotal)} | Grand total: ${fmtMoney(record.grandTotal)} (${record.currency})`,
        `Items (${record.items.length}):\n${itemLines}`,
        record.notes ? `Notes: ${record.notes}` : null,
        approvalMessages(record.approvalHistory),
    ]
        .filter((l): l is string => Boolean(l))
        .join('\n');
}

async function buildCustomerContext(id: string): Promise<string> {
    const record = await prisma.customer.findUnique({
        where: { id },
        include: {
            outlets: { select: { id: true, name: true, code: true } },
            contacts: {
                select: { id: true, name: true, title: true, isPrimary: true },
                orderBy: { isPrimary: 'desc' },
            },
        },
    });
    if (!record) return 'NOT_FOUND';
    const [salesOrderCount, paymentCount] = await Promise.all([
        prisma.salesOrder.count({ where: { customerId: id } }),
        prisma.payment.count({ where: { customerId: id } }),
    ]);
    const primary = record.contacts.find((c) => c.isPrimary);
    return [
        `Customer ${record.name} (code ${record.code ?? '-'})`,
        `Status: ${record.status} | Tax ID: ${record.taxId ?? '-'} | Payment terms: ${record.paymentTerms ?? '-'} | Credit limit: ${fmtMoney(record.creditLimit)}`,
        `Outlets (${record.outlets.length}): ${record.outlets.map((o) => o.name).join(', ')}`,
        `Contacts (${record.contacts.length}): ${record.contacts.map((c) => `${c.name}${c.title ? ` (${c.title})` : ''}${c.isPrimary ? ' [primary]' : ''}`).join(', ')}`,
        primary ? `Primary contact: ${primary.name}` : null,
        `Sales orders: ${salesOrderCount} | Payments: ${paymentCount}`,
        record.billingAddress ? `Billing address: ${record.billingAddress}` : null,
        record.notes ? `Notes: ${record.notes}` : null,
    ]
        .filter((l): l is string => Boolean(l))
        .join('\n');
}

async function buildVisitLogContext(id: string): Promise<string> {
    const record = await prisma.visitLog.findUnique({
        where: { id },
        include: {
            salesman: { select: { name: true } },
            outlet: {
                select: {
                    name: true,
                    customer: { select: { name: true } },
                    area: { select: { name: true } },
                },
            },
            salesOrder: { select: { id: true, documentNumber: true, grandTotal: true } },
            approvedBy: { select: { name: true } },
        },
    });
    if (!record) return 'NOT_FOUND';
    return [
        `Visit log by ${record.salesman.name} on ${fmtDate(record.date)}`,
        `Outlet: ${record.outlet.name} (customer ${record.outlet.customer?.name ?? '-'}, area ${record.outlet.area?.name ?? '-'})`,
        `Check-in: ${fmtDate(record.checkInAt)} | Check-out: ${fmtDate(record.checkOutAt)}`,
        record.purpose ? `Purpose: ${record.purpose}` : null,
        record.notes ? `Notes: ${record.notes}` : null,
        record.feedback ? `Feedback: ${record.feedback}` : null,
        `Approval status: ${record.approvalStatus} | Submitted: ${fmtDate(record.submittedAt)} | Approved by: ${record.approvedBy?.name ?? '-'} at ${fmtDate(record.approvedAt)}`,
        record.salesOrder ? `Sales order created: ${record.salesOrder.documentNumber ?? record.salesOrder.id} (grand total ${fmtMoney(record.salesOrder.grandTotal)})` : 'No sales order linked',
    ]
        .filter((l): l is string => Boolean(l))
        .join('\n');
}

async function buildActionProgramContext(id: string): Promise<string> {
    const record = await prisma.actionProgram.findUnique({
        where: { id },
        include: {
            area: { select: { name: true } },
            pic: { select: { name: true } },
            createdBy: { select: { name: true } },
            actionType: { select: { name: true } },
            outlets: { include: { outlet: { select: { name: true } } } },
            skus: { include: { sku: { select: { name: true } } } },
            items: true,
            payments: { orderBy: { paymentDate: 'asc' } },
        },
    });
    if (!record) return 'NOT_FOUND';
    const totalPayment = record.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    return [
        `Action program ${record.name} (${record.documentNumber ?? record.id})`,
        `Type: ${record.actionType?.name ?? '-'} | Area: ${record.area.name} | PIC: ${record.pic.name}`,
        `Period: ${fmtDate(record.startDate)} → ${fmtDate(record.endDate)}`,
        `Budget: ${fmtMoney(record.plannedCost)} (${record.budgetCurrency}) | Payments: ${fmtMoney(totalPayment)} across ${record.payments.length} payment(s)`,
        record.description ? `Description: ${record.description}` : null,
        `Outlets (${record.outlets.length}: ${record.outlets.map((o) => o.outlet.name).join(', ')})`,
        `SKUs (${record.skus.length}: ${record.skus.map((s) => s.sku.name).join(', ')})`,
        record.items.length > 0 ? `Items (${record.items.length}): ${record.items.map((i) => `${i.name} x${Number(i.quantity)}`).join(', ')}` : null,
        `Approval status: ${record.approvalStatus}`,
        `Created by: ${record.createdBy.name}`,
        approvalMessages(record.approvalHistory),
    ]
        .filter((l): l is string => Boolean(l))
        .join('\n');
}

async function buildEventProposalContext(id: string): Promise<string> {
    const record = await prisma.eventProposal.findUnique({
        where: { id },
        include: {
            area: { select: { name: true } },
            createdBy: { select: { name: true } },
            eventType: { select: { name: true } },
            skus: { include: { sku: { select: { name: true } } } },
            payments: { orderBy: { paymentDate: 'asc' } },
        },
    });
    if (!record) return 'NOT_FOUND';
    const totalPayment = record.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    return [
        `Event proposal ${record.name} (${record.documentNumber ?? record.id})`,
        `Event type: ${record.eventType?.name ?? '-'} | Venue: ${record.venue ?? '-'} | Area: ${record.area.name}`,
        `Event dates: ${fmtDate(record.eventDate)}${record.eventEndDate ? ` → ${fmtDate(record.eventEndDate)}` : ''}`,
        `Organizer: ${record.organizerName ?? '-'} (${record.organizerContact ?? '-'})`,
        `Proposed budget: ${fmtMoney(record.plannedCost)} (${record.currency}) | Payments: ${fmtMoney(totalPayment)} across ${record.payments.length} payment(s)`,
        record.description ? `Description: ${record.description}` : null,
        `SKUs (${record.skus.length}: ${record.skus.map((s) => s.sku.name).join(', ')})`,
        `Approval status: ${record.approvalStatus}`,
        `Created by: ${record.createdBy.name}`,
        approvalMessages(record.approvalHistory),
    ]
        .filter((l): l is string => Boolean(l))
        .join('\n');
}

// Extract human-readable submit/approve/reject messages from approval history JSON.
function approvalMessages(history: unknown): string | null {
    if (!Array.isArray(history) || history.length === 0) return null;
    const messages = history
        .map((h) => {
            const entry = h as { process?: unknown; name?: unknown; message?: unknown; dateTime?: unknown };
            if (!entry?.message) return null;
            const date = typeof entry.dateTime === 'string' ? entry.dateTime.slice(0, 10) : '';
            return `${entry.process ?? 'Approval'} by ${entry.name ?? '-'} (${date}): ${entry.message}`;
        })
        .filter((m): m is string => Boolean(m));
    return messages.length > 0 ? `Approval history:\n${messages.join('\n')}` : null;
}

const contextBuilders: Record<SupportedModule, (id: string) => Promise<string>> = {
    'sales-order': buildSalesOrderContext,
    customer: buildCustomerContext,
    'visit-log': buildVisitLogContext,
    'action-program': buildActionProgramContext,
    'event-proposal': buildEventProposalContext,
};

export async function aiSummarizeRecordHandler(req: Request, res: Response) {
    const userId = authUserId(req, res);
    if (!userId) return;

    const { module, id, contextJson } = req.body as {
        module?: unknown;
        id?: unknown;
        contextJson?: unknown;
    };
    if (typeof module !== 'string' || !SUPPORTED_MODULES.includes(module as SupportedModule)) {
        res.status(400).json({ error: 'module must be one of: ' + SUPPORTED_MODULES.join(', ') });
        return;
    }
    if (typeof id !== 'string' || !id) {
        res.status(400).json({ error: 'id is required' });
        return;
    }

    try {
        const contextText = await contextBuilders[module as SupportedModule](id);
        if (contextText === 'NOT_FOUND') {
            res.status(404).json({ error: 'Record not found' });
            return;
        }

        const promptParts = [
            `Record module: ${module}`,
            `Record context:\n${contextText}`,
            typeof contextJson === 'string' && contextJson.trim() ? `Additional context:\n${contextJson}` : null,
        ].filter((l): l is string => Boolean(l));

        const { text } = await generateText({
            model: await getChatModel(prisma),
            instructions: SUMMARIZE_INSTRUCTIONS,
            prompt: promptParts.join('\n\n'),
            temperature: 0.3,
        });
        res.json({ summary: text.trim() });
    } catch (error) {
        res.status(500).json({
            error: 'Summarize failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}

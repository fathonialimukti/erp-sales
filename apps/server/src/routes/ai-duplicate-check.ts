import type { Request, Response } from 'express';
import * as z from 'zod';
import { generateObject } from 'ai';
import { getChatModel } from '../lib/ai-provider.js';
import { withAuth } from '../lib/express-auth.js';
import { prisma } from '../lib/prisma.js';



const parentSchema = z.object({
    dataset: z.enum(['customer', 'outlet']),
});

const duplicateSchema = z.object({
    duplicates: z.array(
        z.object({
            a: z.string(),
            b: z.string(),
            reason: z.string(),
            confidence: z.number().min(0).max(1),
        })
    ),
});

const DUPLICATE_SYSTEM = `You are a CRM data-hygiene assistant. Given a list of customers (or outlets) with their fields, identify likely duplicate records. Rules: (1) Compare normalized names (case/whitespace-insensitive), codes, tax IDs, phones, addresses. (2) Only flag pairs that are genuinely likely duplicates (same name + same phone/address/taxId, or near-identical name + same location). (3) a and b must be the actual record ids. (4) reason is a short human explanation. (5) confidence 0-1. (6) Return at most 20 pairs, strongest first. (7) Do not flag records that merely share a common word.`;

export const aiDuplicateCheckHandler = withAuth({ aiRateLimit: true }, async (req: Request, res: Response) => {

    const parsed = parentSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid dataset' });
        return;
    }
    const { dataset } = parsed.data;

    try {
        let lines: string[] = [];
        if (dataset === 'customer') {
            const customers = await prisma.customer.findMany({
                select: { id: true, code: true, name: true, taxId: true, billingAddress: true, status: true },
            });
            const contacts = await prisma.customerContact.findMany({
                select: { customerId: true, name: true, email: true, phone: true },
            });
            const contactsByCustomer = new Map<string, typeof contacts>();
            for (const c of contacts) {
                const list = contactsByCustomer.get(c.customerId) ?? [];
                list.push(c);
                contactsByCustomer.set(c.customerId, list);
            }
            lines = customers.map((c) => {
                const contact = contactsByCustomer.get(c.id)?.[0];
                const phone = contact?.phone ?? '';
                return `${c.id} | ${c.name} | ${c.code ?? ''} | ${c.taxId ?? phone}`;
            });
        } else {
            const outlets = await prisma.outlet.findMany({
                select: {
                    id: true,
                    code: true,
                    name: true,
                    address: true,
                    contactName: true,
                    contactPhone: true,
                    customerId: true,
                    areaId: true,
                    status: true,
                },
            });
            lines = outlets.map((o) => `${o.id} | ${o.name} | ${o.code ?? ''} | ${o.contactPhone ?? ''} | ${o.address ?? ''}`);
        }

        const { object } = await generateObject({
            model: await getChatModel(prisma),
            schema: duplicateSchema,
            temperature: 0.1,
            system: DUPLICATE_SYSTEM,
            prompt: lines.join('\n'),
        });

        res.json({ duplicates: object.duplicates });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: 'Duplicate check failed', message });
    }
});

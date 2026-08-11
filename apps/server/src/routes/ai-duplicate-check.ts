import type { Request, Response } from 'express';
import { parseCookie } from 'cookie';
import jwt from 'jsonwebtoken';
import * as z from 'zod';
import { generateObject } from 'ai';
import { getChatModel } from '../lib/ai-provider.js';
import { prisma } from '../lib/prisma.js';
import { getJwtSecret } from '../lib/jwt-secret.js';

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

export async function aiDuplicateCheckHandler(req: Request, res: Response) {
    const userId = authUserId(req, res);
    if (!userId) return;

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
                const address = c.billingAddress ?? contact?.email ?? '';
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
}

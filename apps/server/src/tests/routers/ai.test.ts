import { describe, expect, it } from 'vitest';
import { validateReadOnlySql } from '../../lib/ai-db-tools.js';
import { createSalesOrderSchema } from '@repo/schemas/sales-order';

describe('ai-db-tools validateReadOnlySql', () => {
    it('allows SELECT queries', () => {
        const r = validateReadOnlySql('SELECT id FROM crm_sales_orders LIMIT 10');
        expect(r.valid).toBe(true);
    });

    it('allows WITH (CTE) queries', () => {
        const r = validateReadOnlySql(
            'WITH x AS (SELECT id FROM crm_customers) SELECT * FROM x LIMIT 5'
        );
        expect(r.valid).toBe(true);
    });

    it('blocks INSERT', () => {
        const r = validateReadOnlySql("INSERT INTO crm_customers (id) VALUES ('1')");
        expect(r.valid).toBe(false);
    });

    it('blocks UPDATE', () => {
        const r = validateReadOnlySql("UPDATE crm_customers SET name = 'x' WHERE id = '1'");
        expect(r.valid).toBe(false);
    });

    it('blocks DELETE', () => {
        const r = validateReadOnlySql("DELETE FROM crm_customers WHERE id = '1'");
        expect(r.valid).toBe(false);
    });

    it('blocks DROP', () => {
        const r = validateReadOnlySql('DROP TABLE crm_customers');
        expect(r.valid).toBe(false);
    });

    it('blocks comment-based injection', () => {
        const r = validateReadOnlySql('SELECT 1; DROP TABLE crm_customers -- comment');
        expect(r.valid).toBe(false);
    });

    it('blocks multi-statement queries', () => {
        const r = validateReadOnlySql('SELECT 1; SELECT 2');
        expect(r.valid).toBe(false);
    });
});

describe('createSalesOrderSchema (extraction target)', () => {
    it('accepts a minimal valid order', () => {
        const parsed = createSalesOrderSchema.safeParse({
            outletId: '01ABC',
            items: [{ skuId: '01SKU', quantity: 2, unitPrice: 1000, lineTotal: 2000 }],
        });
        expect(parsed.success).toBe(true);
    });

    it('requires at least one item', () => {
        const parsed = createSalesOrderSchema.safeParse({ outletId: '01ABC', items: [] });
        expect(parsed.success).toBe(false);
    });

    it('defaults currency to IDR when omitted', () => {
        const parsed = createSalesOrderSchema.parse({
            outletId: '01ABC',
            items: [{ skuId: '01SKU', quantity: 1, unitPrice: 500, lineTotal: 500 }],
        });
        expect(parsed.currency).toBe('IDR');
    });
});

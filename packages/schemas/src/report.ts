import { z } from 'zod';

// Shared filter inputs for the read-only reporting router.
// All reporting procedures accept an optional date range + geo scope so
// every report can be sliced the same way.

export const reportDateRangeSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const reportGeoFilterSchema = z.object({
  regionId: z.string().optional(),
  areaId: z.string().optional(),
  customerId: z.string().optional(),
  outletId: z.string().optional(),
  salesmanId: z.string().optional(),
  skuId: z.string().optional(),
});

export const reportDimensionSchema = z.enum(['region', 'area', 'outlet', 'customer', 'sku']);

export const reportPeriodSchema = z.enum(['day', 'week', 'month']);

export const reportFilterSchema = reportDateRangeSchema
  .merge(reportGeoFilterSchema)
  .extend({
    approvalStatus: z.string().optional(),
  })
  .optional();

export type ReportDateRange = z.infer<typeof reportDateRangeSchema>;
export type ReportGeoFilter = z.infer<typeof reportGeoFilterSchema>;
export type ReportDimension = z.infer<typeof reportDimensionSchema>;
export type ReportPeriod = z.infer<typeof reportPeriodSchema>;
export type ReportFilter = z.infer<typeof reportFilterSchema>;

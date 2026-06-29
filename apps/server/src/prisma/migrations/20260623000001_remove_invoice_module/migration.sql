-- Drop crm_invoices table and its indexes
DROP TABLE IF EXISTS "crm_invoices" CASCADE;

-- Remove INVOICE from NotificationTargetType enum
-- PostgreSQL doesn't support removing values from enums directly, so we recreate it
ALTER TYPE "NotificationTargetType" RENAME TO "NotificationTargetType_old";
CREATE TYPE "NotificationTargetType" AS ENUM ('SYSTEM', 'SALES_ORDER', 'PAYMENT', 'ACTION_PROGRAM', 'EVENT_PROPOSAL', 'VISIT_LOG', 'CUSTOMER', 'OUTLET');
ALTER TABLE "crm_notifications" ALTER COLUMN "target_type" TYPE "NotificationTargetType" USING "target_type"::text::"NotificationTargetType";
DROP TYPE "NotificationTargetType_old";
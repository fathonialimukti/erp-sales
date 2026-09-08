-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('DRAFT', 'VALIDATING', 'PROPOSED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AiValidationStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR');

-- CreateEnum
CREATE TYPE "NotificationTargetType" AS ENUM ('SYSTEM', 'SALES_ORDER', 'PAYMENT', 'ACTION_PROGRAM', 'EVENT_PROPOSAL', 'VISIT_LOG', 'CUSTOMER', 'OUTLET');

-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "role_id" TEXT,
    "photo" TEXT,
    "area_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_has_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_has_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "sku_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sku_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skus" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "photo" TEXT,
    "category_id" TEXT,
    "base_price" DECIMAL(65,30),
    "base_unit" TEXT NOT NULL DEFAULT 'pcs',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_by_id" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'INFO',
    "target_type" "NotificationTargetType" NOT NULL DEFAULT 'SYSTEM',
    "target_id" TEXT,
    "action_url" TEXT,
    "metadata" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "action" "ActivityAction" NOT NULL,
    "user_id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "detail" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_regions" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_areas" (
    "id" TEXT NOT NULL,
    "region_id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_customers" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "tax_id" TEXT,
    "payment_terms" TEXT,
    "credit_limit" DECIMAL(65,30),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "billing_address" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_customer_contacts" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "outlet_id" TEXT,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_customer_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_outlets" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "area_id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_outlets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_visit_logs" (
    "id" TEXT NOT NULL,
    "salesman_id" TEXT NOT NULL,
    "outlet_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "check_in_at" TIMESTAMP(3),
    "check_out_at" TIMESTAMP(3),
    "purpose" TEXT,
    "notes" TEXT,
    "photos" JSONB,
    "feedback" TEXT,
    "sales_order_id" TEXT,
    "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMP(3),
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_visit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_sales_orders" (
    "id" TEXT NOT NULL,
    "document_number" TEXT,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customer_id" TEXT,
    "outlet_id" TEXT NOT NULL,
    "area_id" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "payment_terms" TEXT,
    "expected_delivery_date" DATE,
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "email_conversation_id" TEXT,
    "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" TEXT NOT NULL,
    "proposed_at" TIMESTAMP(3),
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "approval_history" JSONB,
    "subtotal" DECIMAL(65,30),
    "discount_total" DECIMAL(65,30),
    "tax_total" DECIMAL(65,30),
    "grand_total" DECIMAL(65,30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "action_program_id" TEXT,

    CONSTRAINT "crm_sales_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_conversations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "sentiment" TEXT,
    "tags" JSONB,
    "last_message_at" TIMESTAMP(3),
    "customer_id" TEXT,
    "agent_status" TEXT NOT NULL DEFAULT 'IDLE',
    "agent_error" TEXT,
    "last_outbound_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "html_body" TEXT,
    "message_id" TEXT,
    "in_reply_to" TEXT,
    "email_references" TEXT,
    "send_status" TEXT,
    "sent_at" TIMESTAMP(3),
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_sales_order_items" (
    "id" TEXT NOT NULL,
    "sort_order" INTEGER DEFAULT 0,
    "sales_order_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unit_price" DECIMAL(65,30) NOT NULL,
    "discount_percent" DECIMAL(65,30) DEFAULT 0,
    "tax_percent" DECIMAL(65,30) DEFAULT 0,
    "line_total" DECIMAL(65,30) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "crm_sales_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_payments" (
    "id" TEXT NOT NULL,
    "sales_order_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(65,30) NOT NULL,
    "method" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_periods" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_lines" (
    "id" TEXT NOT NULL,
    "budget_type_id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'AREA',
    "region_id" TEXT,
    "area_id" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "action_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_misc_items" (
    "id" TEXT NOT NULL,
    "event_proposal_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "quantity" DECIMAL(65,30) NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "total" DECIMAL(65,30) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_misc_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_vendors" (
    "id" TEXT NOT NULL,
    "event_proposal_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "scope" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_vendor_payments" (
    "id" TEXT NOT NULL,
    "event_vendor_id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "payment_date" DATE NOT NULL,
    "method" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_vendor_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_action_programs" (
    "id" TEXT NOT NULL,
    "document_number" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "files" JSONB,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "budget_currency" TEXT NOT NULL DEFAULT 'IDR',
    "rules" JSONB NOT NULL,
    "area_id" TEXT NOT NULL,
    "pic_id" TEXT NOT NULL,
    "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" TEXT NOT NULL,
    "area_manager_approved_by_id" TEXT,
    "area_manager_approved_at" TIMESTAMP(3),
    "region_manager_approved_by_id" TEXT,
    "region_manager_approved_at" TIMESTAMP(3),
    "finance_manager_approved_by_id" TEXT,
    "finance_manager_approved_at" TIMESTAMP(3),
    "director_approved_by_id" TEXT,
    "director_approved_at" TIMESTAMP(3),
    "approval_history" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "action_type_id" TEXT NOT NULL,
    "budget_line_id" TEXT,
    "planned_cost" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "crm_action_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_action_program_outlets" (
    "action_program_id" TEXT NOT NULL,
    "outlet_id" TEXT NOT NULL,
    "cost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "explanation" TEXT,

    CONSTRAINT "crm_action_program_outlets_pkey" PRIMARY KEY ("action_program_id","outlet_id")
);

-- CreateTable
CREATE TABLE "crm_action_program_skus" (
    "action_program_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "discount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "price_after_discount" DECIMAL(65,30) NOT NULL,
    "cost" DECIMAL(65,30) NOT NULL,
    "tax" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "crm_action_program_skus_pkey" PRIMARY KEY ("action_program_id","sku_id")
);

-- CreateTable
CREATE TABLE "crm_action_program_payments" (
    "id" TEXT NOT NULL,
    "action_program_id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "payment_date" DATE NOT NULL,
    "method" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_action_program_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_action_program_items" (
    "id" TEXT NOT NULL,
    "action_program_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "cost" DECIMAL(65,30) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_action_program_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_event_proposals" (
    "id" TEXT NOT NULL,
    "document_number" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "files" JSONB,
    "venue" TEXT,
    "event_date" DATE NOT NULL,
    "event_end_date" DATE,
    "organizer_name" TEXT,
    "organizer_contact" TEXT,
    "area_id" TEXT NOT NULL,
    "observation_days" INTEGER NOT NULL DEFAULT 90,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" TEXT NOT NULL,
    "area_manager_approved_by_id" TEXT,
    "area_manager_approved_at" TIMESTAMP(3),
    "region_manager_approved_by_id" TEXT,
    "region_manager_approved_at" TIMESTAMP(3),
    "finance_manager_approved_by_id" TEXT,
    "finance_manager_approved_at" TIMESTAMP(3),
    "director_approved_by_id" TEXT,
    "director_approved_at" TIMESTAMP(3),
    "approval_history" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "budget_line_id" TEXT,
    "event_type_id" TEXT,
    "planned_cost" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "crm_event_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_event_proposal_skus" (
    "event_proposal_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "tax" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "crm_event_proposal_skus_pkey" PRIMARY KEY ("event_proposal_id","sku_id")
);

-- CreateTable
CREATE TABLE "crm_event_proposal_payments" (
    "id" TEXT NOT NULL,
    "event_proposal_id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "payment_date" DATE NOT NULL,
    "method" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_event_proposal_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_chunks" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector,
    "embedding_model" TEXT,
    "embedding_updated_at" TIMESTAMP(3),
    "embedding_status" TEXT NOT NULL DEFAULT 'none',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "user_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id","key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sku_categories_code_key" ON "sku_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "skus_code_key" ON "skus"("code");

-- CreateIndex
CREATE INDEX "skus_category_id_idx" ON "skus"("category_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_target_type_target_id_idx" ON "notifications"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "notifications_created_by_id_idx" ON "notifications"("created_by_id");

-- CreateIndex
CREATE INDEX "activity_logs_user_id_created_at_idx" ON "activity_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "activity_logs_resource_resource_id_action_idx" ON "activity_logs"("resource", "resource_id", "action");

-- CreateIndex
CREATE INDEX "activity_logs_action_created_at_idx" ON "activity_logs"("action", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "crm_regions_code_key" ON "crm_regions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "crm_areas_code_key" ON "crm_areas"("code");

-- CreateIndex
CREATE INDEX "crm_areas_region_id_idx" ON "crm_areas"("region_id");

-- CreateIndex
CREATE UNIQUE INDEX "crm_customers_code_key" ON "crm_customers"("code");

-- CreateIndex
CREATE INDEX "crm_customer_contacts_customer_id_idx" ON "crm_customer_contacts"("customer_id");

-- CreateIndex
CREATE INDEX "crm_customer_contacts_outlet_id_idx" ON "crm_customer_contacts"("outlet_id");

-- CreateIndex
CREATE UNIQUE INDEX "crm_outlets_code_key" ON "crm_outlets"("code");

-- CreateIndex
CREATE INDEX "crm_outlets_customer_id_idx" ON "crm_outlets"("customer_id");

-- CreateIndex
CREATE INDEX "crm_outlets_area_id_idx" ON "crm_outlets"("area_id");

-- CreateIndex
CREATE INDEX "crm_visit_logs_salesman_id_date_idx" ON "crm_visit_logs"("salesman_id", "date");

-- CreateIndex
CREATE INDEX "crm_visit_logs_outlet_id_date_idx" ON "crm_visit_logs"("outlet_id", "date");

-- CreateIndex
CREATE INDEX "crm_visit_logs_approval_status_idx" ON "crm_visit_logs"("approval_status");

-- CreateIndex
CREATE UNIQUE INDEX "crm_sales_orders_document_number_key" ON "crm_sales_orders"("document_number");

-- CreateIndex
CREATE INDEX "crm_sales_orders_customer_id_idx" ON "crm_sales_orders"("customer_id");

-- CreateIndex
CREATE INDEX "crm_sales_orders_outlet_id_idx" ON "crm_sales_orders"("outlet_id");

-- CreateIndex
CREATE INDEX "crm_sales_orders_area_id_idx" ON "crm_sales_orders"("area_id");

-- CreateIndex
CREATE INDEX "crm_sales_orders_created_by_id_idx" ON "crm_sales_orders"("created_by_id");

-- CreateIndex
CREATE INDEX "crm_sales_orders_approved_by_id_idx" ON "crm_sales_orders"("approved_by_id");

-- CreateIndex
CREATE INDEX "crm_sales_orders_approval_status_idx" ON "crm_sales_orders"("approval_status");

-- CreateIndex
CREATE INDEX "crm_sales_orders_document_number_idx" ON "crm_sales_orders"("document_number");

-- CreateIndex
CREATE INDEX "crm_sales_orders_date_idx" ON "crm_sales_orders"("date");

-- CreateIndex
CREATE INDEX "crm_sales_orders_approval_status_date_idx" ON "crm_sales_orders"("approval_status", "date");

-- CreateIndex
CREATE INDEX "crm_sales_orders_email_conversation_id_idx" ON "crm_sales_orders"("email_conversation_id");

-- CreateIndex
CREATE INDEX "crm_sales_orders_action_program_id_idx" ON "crm_sales_orders"("action_program_id");

-- CreateIndex
CREATE INDEX "email_conversations_email_idx" ON "email_conversations"("email");

-- CreateIndex
CREATE INDEX "email_conversations_customer_id_idx" ON "email_conversations"("customer_id");

-- CreateIndex
CREATE INDEX "email_conversations_status_idx" ON "email_conversations"("status");

-- CreateIndex
CREATE INDEX "email_conversations_last_message_at_idx" ON "email_conversations"("last_message_at");

-- CreateIndex
CREATE UNIQUE INDEX "email_messages_message_id_key" ON "email_messages"("message_id");

-- CreateIndex
CREATE INDEX "email_messages_conversation_id_idx" ON "email_messages"("conversation_id");

-- CreateIndex
CREATE INDEX "crm_sales_order_items_sales_order_id_idx" ON "crm_sales_order_items"("sales_order_id");

-- CreateIndex
CREATE INDEX "crm_sales_order_items_sku_id_idx" ON "crm_sales_order_items"("sku_id");

-- CreateIndex
CREATE INDEX "crm_payments_sales_order_id_idx" ON "crm_payments"("sales_order_id");

-- CreateIndex
CREATE INDEX "crm_payments_customer_id_idx" ON "crm_payments"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "budget_types_code_key" ON "budget_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "budget_periods_code_key" ON "budget_periods"("code");

-- CreateIndex
CREATE INDEX "budget_lines_region_id_idx" ON "budget_lines"("region_id");

-- CreateIndex
CREATE INDEX "budget_lines_area_id_idx" ON "budget_lines"("area_id");

-- CreateIndex
CREATE UNIQUE INDEX "budget_lines_budget_type_id_period_id_scope_region_id_area__key" ON "budget_lines"("budget_type_id", "period_id", "scope", "region_id", "area_id");

-- CreateIndex
CREATE UNIQUE INDEX "action_types_code_key" ON "action_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "event_types_code_key" ON "event_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_code_key" ON "vendors"("code");

-- CreateIndex
CREATE INDEX "event_misc_items_event_proposal_id_idx" ON "event_misc_items"("event_proposal_id");

-- CreateIndex
CREATE INDEX "event_vendors_event_proposal_id_idx" ON "event_vendors"("event_proposal_id");

-- CreateIndex
CREATE INDEX "event_vendors_vendor_id_idx" ON "event_vendors"("vendor_id");

-- CreateIndex
CREATE INDEX "event_vendor_payments_event_vendor_id_idx" ON "event_vendor_payments"("event_vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "crm_action_programs_document_number_key" ON "crm_action_programs"("document_number");

-- CreateIndex
CREATE INDEX "crm_action_programs_area_id_idx" ON "crm_action_programs"("area_id");

-- CreateIndex
CREATE INDEX "crm_action_programs_pic_id_idx" ON "crm_action_programs"("pic_id");

-- CreateIndex
CREATE INDEX "crm_action_programs_created_by_id_idx" ON "crm_action_programs"("created_by_id");

-- CreateIndex
CREATE INDEX "crm_action_programs_approval_status_idx" ON "crm_action_programs"("approval_status");

-- CreateIndex
CREATE INDEX "crm_action_programs_start_date_end_date_idx" ON "crm_action_programs"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "crm_action_programs_action_type_id_idx" ON "crm_action_programs"("action_type_id");

-- CreateIndex
CREATE INDEX "crm_action_programs_budget_line_id_idx" ON "crm_action_programs"("budget_line_id");

-- CreateIndex
CREATE INDEX "crm_action_program_payments_action_program_id_idx" ON "crm_action_program_payments"("action_program_id");

-- CreateIndex
CREATE INDEX "crm_action_program_items_action_program_id_idx" ON "crm_action_program_items"("action_program_id");

-- CreateIndex
CREATE UNIQUE INDEX "crm_event_proposals_document_number_key" ON "crm_event_proposals"("document_number");

-- CreateIndex
CREATE INDEX "crm_event_proposals_area_id_idx" ON "crm_event_proposals"("area_id");

-- CreateIndex
CREATE INDEX "crm_event_proposals_created_by_id_idx" ON "crm_event_proposals"("created_by_id");

-- CreateIndex
CREATE INDEX "crm_event_proposals_approval_status_idx" ON "crm_event_proposals"("approval_status");

-- CreateIndex
CREATE INDEX "crm_event_proposals_event_date_idx" ON "crm_event_proposals"("event_date");

-- CreateIndex
CREATE INDEX "crm_event_proposals_event_type_id_idx" ON "crm_event_proposals"("event_type_id");

-- CreateIndex
CREATE INDEX "crm_event_proposals_budget_line_id_idx" ON "crm_event_proposals"("budget_line_id");

-- CreateIndex
CREATE INDEX "crm_event_proposal_payments_event_proposal_id_idx" ON "crm_event_proposal_payments"("event_proposal_id");

-- CreateIndex
CREATE INDEX "knowledge_chunks_source_idx" ON "knowledge_chunks"("source");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "crm_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_has_permissions" ADD CONSTRAINT "role_has_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_has_permissions" ADD CONSTRAINT "role_has_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skus" ADD CONSTRAINT "skus_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "sku_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_areas" ADD CONSTRAINT "crm_areas_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "crm_regions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_customer_contacts" ADD CONSTRAINT "crm_customer_contacts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "crm_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_customer_contacts" ADD CONSTRAINT "crm_customer_contacts_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "crm_outlets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_outlets" ADD CONSTRAINT "crm_outlets_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "crm_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_outlets" ADD CONSTRAINT "crm_outlets_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "crm_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_visit_logs" ADD CONSTRAINT "crm_visit_logs_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_visit_logs" ADD CONSTRAINT "crm_visit_logs_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "crm_outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_visit_logs" ADD CONSTRAINT "crm_visit_logs_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "crm_sales_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_visit_logs" ADD CONSTRAINT "crm_visit_logs_salesman_id_fkey" FOREIGN KEY ("salesman_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_sales_orders" ADD CONSTRAINT "crm_sales_orders_action_program_id_fkey" FOREIGN KEY ("action_program_id") REFERENCES "crm_action_programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_sales_orders" ADD CONSTRAINT "crm_sales_orders_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_sales_orders" ADD CONSTRAINT "crm_sales_orders_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "crm_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_sales_orders" ADD CONSTRAINT "crm_sales_orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_sales_orders" ADD CONSTRAINT "crm_sales_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "crm_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_sales_orders" ADD CONSTRAINT "crm_sales_orders_email_conversation_id_fkey" FOREIGN KEY ("email_conversation_id") REFERENCES "email_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_sales_orders" ADD CONSTRAINT "crm_sales_orders_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "crm_outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_conversations" ADD CONSTRAINT "email_conversations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "crm_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "email_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_sales_order_items" ADD CONSTRAINT "crm_sales_order_items_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "crm_sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_sales_order_items" ADD CONSTRAINT "crm_sales_order_items_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_payments" ADD CONSTRAINT "crm_payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "crm_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_payments" ADD CONSTRAINT "crm_payments_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "crm_sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "crm_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_budget_type_id_fkey" FOREIGN KEY ("budget_type_id") REFERENCES "budget_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "budget_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "crm_regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_misc_items" ADD CONSTRAINT "event_misc_items_event_proposal_id_fkey" FOREIGN KEY ("event_proposal_id") REFERENCES "crm_event_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_vendors" ADD CONSTRAINT "event_vendors_event_proposal_id_fkey" FOREIGN KEY ("event_proposal_id") REFERENCES "crm_event_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_vendors" ADD CONSTRAINT "event_vendors_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_vendor_payments" ADD CONSTRAINT "event_vendor_payments_event_vendor_id_fkey" FOREIGN KEY ("event_vendor_id") REFERENCES "event_vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_action_programs" ADD CONSTRAINT "crm_action_programs_action_type_id_fkey" FOREIGN KEY ("action_type_id") REFERENCES "action_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_action_programs" ADD CONSTRAINT "crm_action_programs_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "crm_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_action_programs" ADD CONSTRAINT "crm_action_programs_budget_line_id_fkey" FOREIGN KEY ("budget_line_id") REFERENCES "budget_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_action_programs" ADD CONSTRAINT "crm_action_programs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_action_programs" ADD CONSTRAINT "crm_action_programs_pic_id_fkey" FOREIGN KEY ("pic_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_action_program_outlets" ADD CONSTRAINT "crm_action_program_outlets_action_program_id_fkey" FOREIGN KEY ("action_program_id") REFERENCES "crm_action_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_action_program_outlets" ADD CONSTRAINT "crm_action_program_outlets_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "crm_outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_action_program_skus" ADD CONSTRAINT "crm_action_program_skus_action_program_id_fkey" FOREIGN KEY ("action_program_id") REFERENCES "crm_action_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_action_program_skus" ADD CONSTRAINT "crm_action_program_skus_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_action_program_payments" ADD CONSTRAINT "crm_action_program_payments_action_program_id_fkey" FOREIGN KEY ("action_program_id") REFERENCES "crm_action_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_action_program_items" ADD CONSTRAINT "crm_action_program_items_action_program_id_fkey" FOREIGN KEY ("action_program_id") REFERENCES "crm_action_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_event_proposals" ADD CONSTRAINT "crm_event_proposals_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "crm_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_event_proposals" ADD CONSTRAINT "crm_event_proposals_budget_line_id_fkey" FOREIGN KEY ("budget_line_id") REFERENCES "budget_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_event_proposals" ADD CONSTRAINT "crm_event_proposals_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_event_proposals" ADD CONSTRAINT "crm_event_proposals_event_type_id_fkey" FOREIGN KEY ("event_type_id") REFERENCES "event_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_event_proposal_skus" ADD CONSTRAINT "crm_event_proposal_skus_event_proposal_id_fkey" FOREIGN KEY ("event_proposal_id") REFERENCES "crm_event_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_event_proposal_skus" ADD CONSTRAINT "crm_event_proposal_skus_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_event_proposal_payments" ADD CONSTRAINT "crm_event_proposal_payments_event_proposal_id_fkey" FOREIGN KEY ("event_proposal_id") REFERENCES "crm_event_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;


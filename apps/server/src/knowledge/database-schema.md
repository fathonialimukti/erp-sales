# Database Schema Reference

## Core CRM Tables

### crm_regions
- id (TEXT, PK, ULID)
- code (TEXT, unique, nullable)
- name (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### crm_areas
- id (TEXT, PK, ULID)
- region_id (TEXT, FK -> crm_regions.id)
- code (TEXT, unique, nullable)
- name (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### crm_customers
- id (TEXT, PK, ULID)
- code (TEXT, unique, nullable)
- name (TEXT)
- tax_id (TEXT, nullable)
- payment_terms (TEXT, nullable)
- credit_limit (NUMERIC, nullable)
- status (TEXT, default 'ACTIVE')
- billing_address (TEXT, nullable)
- notes (TEXT, nullable)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### crm_outlets
- id (TEXT, PK, ULID)
- customer_id (TEXT, FK -> crm_customers.id)
- area_id (TEXT, FK -> crm_areas.id)
- code (TEXT, unique, nullable)
- name (TEXT)
- address (TEXT, nullable)
- contact_name (TEXT, nullable)
- contact_phone (TEXT, nullable)
- latitude (FLOAT, nullable)
- longitude (FLOAT, nullable)
- status (TEXT, default 'ACTIVE')
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### sku_categories
- id (TEXT, PK, ULID)
- code (TEXT, unique, nullable)
- name (TEXT)
- description (TEXT, nullable)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### skus
- id (TEXT, PK, ULID)
- code (TEXT, unique, nullable)
- name (TEXT)
- description (TEXT, nullable)
- category_id (TEXT, FK -> sku_categories.id, nullable)
- base_price (NUMERIC, nullable)
- base_unit (TEXT, default 'pcs')
- status (TEXT, default 'ACTIVE')
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### crm_sales_orders
- id (TEXT, PK, ULID)
- document_number (TEXT, unique, nullable)
- date (DATE)
- customer_id (TEXT, FK -> crm_customers.id, nullable)
- outlet_id (TEXT, FK -> crm_outlets.id)
- area_id (TEXT, FK -> crm_areas.id)
- currency (TEXT, default 'IDR')
- payment_terms (TEXT, nullable)
- approval_status (ENUM: DRAFT, VALIDATING, PROPOSED, APPROVED, REJECTED)
- subtotal (NUMERIC, nullable)
- discount_total (NUMERIC, nullable)
- tax_total (NUMERIC, nullable)
- grand_total (NUMERIC, nullable)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### crm_sales_order_items
- id (TEXT, PK, ULID)
- sales_order_id (TEXT, FK -> crm_sales_orders.id)
- sku_id (TEXT, FK -> skus.id)
- quantity (NUMERIC)
- unit_price (NUMERIC)
- discount_percent (NUMERIC, default 0)
- tax_percent (NUMERIC, default 0)
- line_total (NUMERIC)
- notes (TEXT, nullable)

### crm_visit_logs
- id (TEXT, PK, ULID)
- salesman_id (TEXT, FK -> users.id)
- outlet_id (TEXT, FK -> crm_outlets.id)
- date (DATE)
- check_in_at (TIMESTAMP, nullable)
- check_out_at (TIMESTAMP, nullable)
- purpose (TEXT, nullable)
- notes (TEXT, nullable)
- feedback (TEXT, nullable)
- sales_order_id (TEXT, FK -> crm_sales_orders.id, nullable)
- approval_status (ENUM: DRAFT, VALIDATING, PROPOSED, APPROVED, REJECTED)

### crm_action_programs
- id (TEXT, PK, ULID)
- document_number (TEXT, unique, nullable)
- name (TEXT)
- type (ENUM: DISCOUNT, BUNDLE, FREE_ITEM, REBATE, LOYALTY)
- description (TEXT, nullable)
- start_date (DATE)
- end_date (DATE)
- budget_amount (NUMERIC, nullable)
- budget_currency (TEXT, default 'IDR')
- area_id (TEXT, FK -> crm_areas.id)
- pic_id (TEXT, FK -> users.id)
- approval_status (ENUM: DRAFT, VALIDATING, PROPOSED, APPROVED, REJECTED)

### crm_event_proposals
- id (TEXT, PK, ULID)
- document_number (TEXT, unique, nullable)
- name (TEXT)
- event_type (TEXT, nullable)
- venue (TEXT, nullable)
- event_date (DATE)
- event_end_date (DATE, nullable)
- area_id (TEXT, FK -> crm_areas.id)
- proposed_budget (NUMERIC, nullable)
- currency (TEXT, default 'IDR')
- approval_status (ENUM: DRAFT, VALIDATING, PROPOSED, APPROVED, REJECTED)

### users
- id (TEXT, PK, ULID)
- email (TEXT, unique)
- name (TEXT, nullable)
- role_id (TEXT, FK -> roles.id, nullable)
- area_id (TEXT, FK -> crm_areas.id, nullable)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### roles
- id (TEXT, PK, ULID)
- name (TEXT, unique)
- description (TEXT, nullable)

### permissions
- id (TEXT, PK, ULID)
- name (TEXT, unique) — format `resource@action`
- description (TEXT, nullable)

### activity_logs
- id (TEXT, PK, ULID)
- action (ENUM: CREATE, UPDATE, DELETE, APPROVE, REJECT, LOGIN, LOGOUT, EXPORT, IMPORT)
- user_id (TEXT, FK -> users.id)
- resource (TEXT)
- resource_id (TEXT)
- message (TEXT)
- detail (JSON, nullable)
- created_at (TIMESTAMP)

### notifications
- id (TEXT, PK, ULID)
- user_id (TEXT, FK -> users.id)
- title (TEXT)
- message (TEXT)
- type (ENUM: INFO, SUCCESS, WARNING, ERROR)
- target_type (ENUM)
- is_read (BOOLEAN, default false)
- created_at (TIMESTAMP)

# Page Purpose Reference

Use this document to map user intent to the correct page. It is intentionally written for RAG so the assistant can infer where to navigate for any module.

## Core Navigation Pattern

For most modules:
- List page: browse, search, or manage records
- `/create` (or `/new`): create a new record
- `/:id`: view a specific record
- `/:id/edit`: edit a specific record

If the user says "add", "create", or "new", prefer the create page.
If the user says "view", "manage", "search", or "browse", prefer the list page.
If the user references an existing record by name or id, prefer the detail page.

## Main Pages

| Route | Purpose |
| --- | --- |
| `/dashboard` | Overview of the sales ERP with key KPIs (open orders, revenue, customers, SKUs, visits) |
| `/notifications` | View system notifications and alerts |
| `/activity-logs` | Review audit trail and system actions |
| `/login` | Authenticate into the application |

## Master Data Modules

| Module | List Route | Create Route | Detail Route | Edit Route | Purpose |
| --- | --- | --- | --- | --- | --- |
| Region | `/region` | `/region/create` | `/region/:id` | `/region/:id/edit` | Top-level sales territory |
| Area | `/area` | `/area/create` | `/area/:id` | `/area/:id/edit` | Sub-territory inside a Region |
| Customer | `/customer` | `/customer/create` | `/customer/:id` | `/customer/:id/edit` | Company / account |
| Outlet | `/outlet` | `/outlet/create` | `/outlet/:id` | `/outlet/:id/edit` | Physical store of a Customer |
| SKU Category | `/sku-category` | `/sku-category/create` | `/sku-category/:id` | `/sku-category/:id/edit` | Product grouping |
| SKU | `/sku` | `/sku/create` | `/sku/:id` | `/sku/:id/edit` | Sellable product |

## Transaction Modules

| Module | List Route | Create Route | Detail Route | Edit Route | Purpose |
| --- | --- | --- | --- | --- | --- |
| Sales Order | `/sales-order` | `/sales-order/create` | `/sales-order/:id` | `/sales-order/:id/edit` | Order from an Outlet with SKU line items |
| Visit Log | `/visit-log` | `/visit-log/create` | `/visit-log/:id` | n/a | Field-sales visit to an Outlet |
| Action Program | `/action-program` | `/action-program/create` | `/action-program/:id` | `/action-program/:id/edit` | Promotional program (discount/bundle/rebate/loyalty) |
| Event Proposal | `/event-proposal` | `/event-proposal/create` | `/event-proposal/:id` | `/event-proposal/:id/edit` | Marketing event proposal with budget |

## Administration Modules

| Module | List Route | Create Route | Detail Route | Edit Route | Purpose |
| --- | --- | --- | --- | --- | --- |
| Users | `/users` | `/users/create` | `/users/:id` | `/users/:id/edit` | System users (salesmen, managers) |
| Roles | `/access-control` | `/access-control/create` | `/access-control/:id` | `/access-control/:id/edit` | Roles and their permissions |

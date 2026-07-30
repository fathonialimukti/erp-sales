# Permissions Reference

## Permission Format

All permissions follow the format: `resource@action`

Examples: `region@create`, `sales-order@approve`, `user@delete`

## Full Permission List

### Region
- `region@read` — View regions
- `region@create` — Create regions
- `region@update` — Edit regions
- `region@delete` — Delete regions

### Area
- `area@read` — View areas
- `area@create` — Create areas
- `area@update` — Edit areas
- `area@delete` — Delete areas

### Customer
- `customer@read` — View customers
- `customer@create` — Create customers
- `customer@update` — Edit customers
- `customer@delete` — Delete customers

### Outlet
- `outlet@read` — View outlets
- `outlet@create` — Create outlets
- `outlet@update` — Edit outlets
- `outlet@delete` — Delete outlets

### SKU Category
- `sku@read` — View SKU categories and SKUs
- `sku@create` — Create SKU categories and SKUs
- `sku@update` — Edit SKU categories and SKUs
- `sku@delete` — Delete SKU categories and SKUs
- `skuCategory@read` — Read SKU categories
- `skuCategory@create` — Create SKU categories
- `skuCategory@update` — Update SKU categories
- `skuCategory@delete` — Delete SKU categories

### Sales Order
- `sales-order@read` — View sales orders
- `sales-order@create` — Create sales orders
- `sales-order@update` — Edit sales orders
- `sales-order@delete` — Delete sales orders
- `sales-order@approve` — Approve / reject sales orders

### Visit Log
- `visit-log@read` — View visit logs
- `visit-log@create` — Create visit logs
- `visit-log@update` — Edit visit logs
- `visit-log@delete` — Delete visit logs
- `visit-log@approve` — Approve / reject visit logs

### Action Program
- `action-program@read` — View action programs
- `action-program@create` — Create action programs
- `action-program@update` — Edit action programs
- `action-program@delete` — Delete action programs
- `action-program@approve` — Approve / reject action programs

### Event Proposal
- `event-proposal@read` — View event proposals
- `event-proposal@create` — Create event proposals
- `event-proposal@update` — Edit event proposals
- `event-proposal@delete` — Delete event proposals
- `event-proposal@approve` — Approve / reject event proposals

### User & Access Control
- `user@read` — View users
- `user@create` — Create users
- `user@update` — Edit users
- `user@delete` — Delete users
- `role@read` — View roles
- `role@create` — Create roles
- `role@update` — Edit roles
- `role@delete` — Delete roles

### System
- `activity_log@read` — View activity logs
- `notification@read` — View notifications

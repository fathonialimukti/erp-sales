# ERP Sales Management System Overview

This is a Sales ERP (Customer Relationship Management + Sales Order) system for managing the sales field force, customers, outlets, products (SKUs), sales orders, visit logs, and promotional programs.

## Domain Hierarchy

The data model is a geographic + account hierarchy:

- **Region** — top-level sales territory (e.g. "Java Island")
- **Area** — a sub-territory inside a Region (e.g. "Jakarta Selatan")
- **Customer** — a company / account that buys goods
- **Outlet** — a physical store belonging to a Customer, located in an Area
- **Salesman (User)** — a field user assigned to an Area

## Catalog

- **SKU Category** — groups products (e.g. "Beverages", "Snacks")
- **SKU** — a sellable product with a base price and unit (e.g. "Refined Cooking Oil 1L")

## Transactions

- **Sales Order** — an order placed by an Outlet, containing SKU line items, with an approval workflow (DRAFT -> PROPOSED -> APPROVED/REJECTED)
- **Visit Log** — a field-sales visit to an Outlet, with check-in/check-out, purpose, and notes
- **Action Program** — a promotional program (discount, bundle, rebate, loyalty) targeting outlets and SKUs in an Area, with a multi-level approval chain
- **Event Proposal** — a marketing event proposal for an Area with a proposed budget

## Main Features

- Browse and manage master data: Regions, Areas, Customers, Outlets, SKU Categories, SKUs
- Create and approve Sales Orders
- Log and approve field Visits
- Plan and approve Action Programs and Event Proposals
- Review Activity Logs (audit trail) and Notifications

# How to Approve Documents

## Document Approval Workflow

Every transaction document in the system (Sales Order, Visit Log, Action Program, Event Proposal) follows a two-step process:
1. First a user creates and **proposes** the document (changes status from DRAFT to PROPOSED)
2. Then an approver **approves** or **rejects** the document

## Steps to Approve a Sales Order

1. Navigate to Sales Orders: go to `/sales-order`
2. Find a document with status PROPOSED in the list
3. Click on the document to open its detail page (`/sales-order/:id`)
4. On the detail page, look for the action buttons at the top right
5. Click the **Approve** button (`data-ai-target="approve-button"`) to approve
6. Or click the **Reject** button (`data-ai-target="reject-button"`) to reject with a reason

Required permission: `sales-order@approve`

## Steps to Propose a Document (Submit for Approval)

1. Open or create a document (e.g., a Sales Order)
2. Fill in all required fields
3. Click **Propose** (`data-ai-target="propose-button"`) to submit for approval
4. The document status changes to PROPOSED

Required permission: the resource's `@update` permission (e.g., `sales-order@update`)

## Approval Buttons by Document Type

| Document | List Route | Approve Permission |
| --- | --- | --- |
| Sales Order | `/sales-order` | `sales-order@approve` |
| Visit Log | `/visit-log` | `visit-log@approve` |
| Action Program | `/action-program` | `action-program@approve` |
| Event Proposal | `/event-proposal` | `event-proposal@approve` |

## Multi-level Approval (Action Program)

Action Programs have a multi-level approval chain: Area Manager -> Region Manager -> Finance Manager -> Director. Each level approves in sequence; the document reaches APPROVED only after the final level approves.

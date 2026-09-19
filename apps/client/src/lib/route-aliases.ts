/**
 * Route aliases understood by the AI assistant's navigation tooling.
 *
 * Users (and LLMs) often say `/sku` when the real route is `/skus`, or
 * `/roles` when it lives under `/access-control/roles`. This maps the
 * shorthand onto the canonical route so navigation just works.
 *
 * Shared by the in-page AiAssistant widget and the AiAdmin chat page.
 */
export const ROUTE_ALIASES: Record<string, string> = {
  "/": "/dashboard",
  "/sku": "/skus",
  "/sku/new": "/skus/new",
  "/sku/create": "/skus/new",
  "/warehouses": "/warehouse",
  "/warehouses/new": "/warehouse/new",
  "/users/create": "/users/new",
  "/roles": "/access-control/roles",
  "/roles/new": "/access-control/roles/new",
  "/access-control": "/access-control/roles",
  "/stock-movements": "/stock-movement",
  "/receiving-transactions": "/inbound-transaction",
  "/receiving-transactions/new": "/inbound-transaction/receiving/new",
  "/shipments": "/outbound-transaction",
  "/shipments/new": "/outbound-transaction/shipment/new",
  "/disposals": "/outbound-transaction",
  "/disposals/new": "/outbound-transaction/disposal/new",
  "/loss-transactions": "/outbound-transaction",
  "/loss-transactions/new": "/outbound-transaction/loss/new",
  "/found-transactions": "/inbound-transaction",
  "/found-transactions/new": "/inbound-transaction/found/new",
  "/rma-receipts": "/inbound-transaction",
  "/rma-receipts/new": "/inbound-transaction/rma-receipt/new",
  "/wip-completions": "/inbound-transaction",
  "/wip-completions/new": "/inbound-transaction/wip-completion/new",
  "/wip-issues": "/outbound-transaction",
  "/wip-issues/new": "/outbound-transaction/wip-issue/new",
  "/return-to-supplier": "/outbound-transaction",
  "/return-to-supplier/new": "/outbound-transaction/return-to-supplier/new",
};

export const normalizeRoutePath = (path: string): string => {
  const trimmedPath = path.trim();
  return ROUTE_ALIASES[trimmedPath] ?? trimmedPath;
};

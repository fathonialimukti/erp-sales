import { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useAtom, useAtomValue } from "jotai";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpDown,
  CornerDownLeft,
  FileText,
  Package,
  Search,
  UserRound,
} from "lucide-react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { icons } from "@/assets/icons";
import { NAV_MENU, type NavMenuItem } from "@/constants/nav-menu";
import { hasPermissionAtom, searchOpenAtom } from "@/lib/atoms";
import { trpcClient } from "@/lib/trpc";
import { formatCurrency } from "@/lib/format";
import { useGeneralSettings } from "@/hooks/useGeneralSettings";
import { cn } from "@/lib/utils";

type SearchResultKind = "page" | "customer" | "sku" | "sales-order" | "action";

interface SearchResult {
  kind: SearchResultKind;
  id: string;
  href: string;
  label: string;
  hint: string;
  icon?: string;
}

interface NavLeaf {
  name: string;
  href: string;
  icon?: string;
  permission?: string | string[];
}

const flattenLeaves = (items: NavMenuItem[]): NavLeaf[] => {
  const leaves: NavLeaf[] = [];
  for (const item of items) {
    if (item.href) {
      leaves.push({
        name: item.name,
        href: item.href,
        icon: item.icon,
        permission: item.permission,
      });
    }
    if (item.children?.length) {
      leaves.push(...flattenLeaves(item.children));
    }
  }
  return leaves;
};

const normalize = (s: string) => s.toLowerCase().trim();

const KIND_TINT: Record<SearchResultKind, string> = {
  page: "bg-primary/10 text-primary",
  action: "bg-muted text-muted-foreground",
  customer: "bg-primary/10 text-primary",
  sku: "bg-muted text-foreground",
  "sales-order": "bg-primary/10 text-primary",
};

export const SearchPalette = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const [open, setOpen] = useAtom(searchOpenAtom);
  const [query, setQuery] = useState("");
  const { currencyCode } = useGeneralSettings();

  const navPages = useMemo<SearchResult[]>(() => {
    const leaves = flattenLeaves(NAV_MENU).filter(
      (l) => !l.permission || hasPermission(l.permission),
    );
    return leaves.map((l) => ({
      kind: "page" as const,
      id: l.href,
      href: l.href,
      label: intl.formatMessage({ id: l.name, defaultMessage: l.name }),
      hint: intl.formatMessage({
        id: "search.hint.navigate",
        defaultMessage: "Go to page",
      }),
      icon: l.icon,
    }));
  }, [hasPermission, intl]);

  const createActions = useMemo<SearchResult[]>(() => {
    const actions: Array<{
      id: string;
      href: string;
      labelId: string;
      label: string;
      permission: string;
      icon?: string;
    }> = [
      {
        id: "create-sales-order",
        href: "/sales-order/create",
        labelId: "search.create.sales_order",
        label: "New sales order",
        permission: "sales-order@create",
        icon: icons.dashNewOrder,
      },
      {
        id: "create-customer",
        href: "/customer/create",
        labelId: "search.create.customer",
        label: "New customer",
        permission: "customer@create",
        icon: icons.dashNewCustomer,
      },
      {
        id: "create-visit",
        href: "/visit-log/create",
        labelId: "search.create.visit",
        label: "Log a visit",
        permission: "visit-log@create",
        icon: icons.dashNewVisit,
      },
      {
        id: "create-sku",
        href: "/sku/create",
        labelId: "search.create.sku",
        label: "New SKU",
        permission: "sku@create",
        icon: icons.dashNewSku,
      },
      {
        id: "create-action-program",
        href: "/action-program/create",
        labelId: "search.create.action_program",
        label: "New action program",
        permission: "action-program@create",
        icon: icons.dashNewProgram,
      },
      {
        id: "create-event-proposal",
        href: "/event-proposal/create",
        labelId: "search.create.event_proposal",
        label: "New event proposal",
        permission: "event-proposal@create",
        icon: icons.dashNewEvent,
      },
    ];
    return actions
      .filter((a) => hasPermission(a.permission))
      .map((a) => ({
        kind: "action" as const,
        id: a.id,
        href: a.href,
        label: intl.formatMessage({
          id: a.labelId,
          defaultMessage: a.label,
        }),
        hint: intl.formatMessage({
          id: "search.hint.create",
          defaultMessage: "Create new",
        }),
        icon: a.icon,
      }));
  }, [hasPermission, intl]);

  const debouncedQuery = useDebounced(query, 220);

  const customerQuery = useQuery({
    queryKey: ["search", "customer", debouncedQuery],
    queryFn: () =>
      trpcClient.customer.list.query({
        page: 1,
        limit: 5,
        search: debouncedQuery,
      }),
    enabled: open && debouncedQuery.length >= 2,
    staleTime: 10_000,
  });

  const skuQuery = useQuery({
    queryKey: ["search", "sku", debouncedQuery],
    queryFn: () =>
      trpcClient.sku.list.query({
        page: 1,
        limit: 5,
        search: debouncedQuery,
      }),
    enabled: open && debouncedQuery.length >= 2,
    staleTime: 10_000,
  });

  const salesOrderQuery = useQuery({
    queryKey: ["search", "sales-order", debouncedQuery],
    queryFn: () =>
      trpcClient.salesOrder.list.query({
        page: 1,
        limit: 5,
        search: debouncedQuery,
      }),
    enabled: open && debouncedQuery.length >= 2,
    staleTime: 10_000,
  });

  const results = useMemo<SearchResult[]>(() => {
    const q = normalize(query);
    const isCreateIntent = /^(new|create|\+|add|buat|baru)/.test(q);

    if (!q) {
      return [...createActions, ...navPages].slice(0, 12);
    }

    if (isCreateIntent) {
      const matched = createActions.filter(
        (a) =>
          a.label.toLowerCase().includes(q) ||
          a.hint.toLowerCase().includes(q),
      );
      const filteredPages = navPages.filter(
        (r) =>
          r.label.toLowerCase().includes(q) ||
          r.href.toLowerCase().includes(q),
      );
      return [...matched, ...filteredPages].slice(0, 12);
    }

    const filteredPages = navPages.filter(
      (r) =>
        r.label.toLowerCase().includes(q) || r.href.toLowerCase().includes(q),
    );

    const customerItems = (
      (customerQuery.data?.data as unknown as
        | Array<{
            id: string;
            name: string;
            code?: string | null;
            _count?: { outlets?: number };
          }>
        | undefined) ?? []
    ).map<SearchResult>((c) => ({
      kind: "customer",
      id: c.id,
      href: `/customer/${c.id}`,
      label: c.name,
      hint:
        (c.code ?? "") +
        (c._count?.outlets ? ` · ${c._count.outlets} outlets` : ""),
    }));

    const skuItems = (
      (skuQuery.data?.data as unknown as
        | Array<{
            id: string;
            name: string;
            code?: string | null;
          }>
        | undefined) ?? []
    ).map<SearchResult>((s) => ({
      kind: "sku",
      id: s.id,
      href: `/sku/${s.id}`,
      label: s.name,
      hint: s.code ?? "",
    }));

    const soItems = (
      (salesOrderQuery.data?.data as unknown as
        | Array<{
            id: string;
            documentNumber?: string | null;
            grandTotal?: number | null;
            customer?: { name?: string | null } | null;
          }>
        | undefined) ?? []
    ).map<SearchResult>((so) => ({
      kind: "sales-order",
      id: so.id,
      href: `/sales-order/${so.id}`,
      label: so.documentNumber ?? so.id,
      hint: `${so.customer?.name ?? "—"} · ${formatCurrency(Number(so.grandTotal ?? 0), currencyCode)}`,
    }));

    return [
      ...filteredPages,
      ...customerItems,
      ...skuItems,
      ...soItems,
    ].slice(0, 20);
  }, [
    query,
    navPages,
    createActions,
    customerQuery.data,
    skuQuery.data,
    salesOrderQuery.data,
  ]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCmdK =
        (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isCmdK) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setOpen]);

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const goTo = (href: string) => {
    navigate(href);
    setOpen(false);
  };

  const kindLabel = (kind: SearchResultKind) => {
    if (kind === "page") {
      return intl.formatMessage({
        id: "search.kind.page",
        defaultMessage: "Page",
      });
    }
    if (kind === "action") {
      return intl.formatMessage({
        id: "search.kind.action",
        defaultMessage: "Action",
      });
    }
    if (kind === "customer") {
      return intl.formatMessage({
        id: "search.kind.customer",
        defaultMessage: "Customer",
      });
    }
    if (kind === "sku") {
      return intl.formatMessage({
        id: "search.kind.sku",
        defaultMessage: "SKU",
      });
    }
    return intl.formatMessage({
      id: "search.kind.salesOrder",
      defaultMessage: "Sales order",
    });
  };

  const groups = useMemo(() => {
    const order: SearchResultKind[] = [
      "action",
      "page",
      "customer",
      "sku",
      "sales-order",
    ];
    return order
      .map((kind) => ({
        kind,
        items: results.filter((r) => r.kind === kind),
      }))
      .filter((g) => g.items.length > 0);
  }, [results]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title={intl.formatMessage({
        id: "search.title",
        defaultMessage: "Search",
      })}
      description={intl.formatMessage({
        id: "search.placeholder",
        defaultMessage: "Search pages, customers, SKUs, sales orders…",
      })}
      className="top-[12%] max-w-xl sm:max-w-xl"
      showCloseButton={false}
    >
      <Command
        shouldFilter={false}
        className="rounded-none"
        data-ai-context={JSON.stringify({
          section: "search-palette",
          open,
          resultCount: results.length,
        })}
      >
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder={intl.formatMessage({
            id: "search.placeholder",
            defaultMessage: "Search pages, customers, SKUs, sales orders…",
          })}
        />
        <CommandList className="max-h-[min(420px,55vh)]">
          <CommandEmpty>
            <div className="flex flex-col items-center gap-1 px-2 py-4">
              <span className="text-sm font-medium text-foreground">
                {intl.formatMessage({
                  id: "search.empty.title",
                  defaultMessage: "No results",
                })}
              </span>
              <span className="text-xs text-muted-foreground">
                {intl.formatMessage({
                  id: "search.empty.text",
                  defaultMessage:
                    "Try a different keyword or check your spelling.",
                })}
              </span>
            </div>
          </CommandEmpty>

          {groups.map((group) => (
            <CommandGroup
              key={group.kind}
              heading={kindLabel(group.kind)}
            >
              {group.items.map((r) => (
                <CommandItem
                  key={`${r.kind}-${r.id}`}
                  value={`${r.kind}-${r.id}-${r.label}`}
                  onSelect={() => goTo(r.href)}
                  className="min-h-11 gap-3 rounded-lg px-2.5 py-2"
                >
                  <span
                    className={cn(
                      "inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg",
                      KIND_TINT[r.kind],
                    )}
                    aria-hidden
                  >
                    {r.icon ? (
                      <img src={r.icon} alt="" className="size-5" />
                    ) : r.kind === "customer" ? (
                      <UserRound className="size-4" />
                    ) : r.kind === "sku" ? (
                      <Package className="size-4" />
                    ) : r.kind === "sales-order" ? (
                      <FileText className="size-4" />
                    ) : (
                      <Search className="size-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      <HighlightedText text={r.label} query={query} />
                    </span>
                    {r.hint ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        <HighlightedText text={r.hint} query={query} />
                      </span>
                    ) : null}
                  </span>
                  <CommandShortcut className="tracking-wide uppercase">
                    {kindLabel(r.kind)}
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>

      <footer className="flex flex-wrap items-center gap-3 border-t border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <kbd className="inline-flex items-center rounded border border-border bg-card px-1 py-0.5 font-mono text-[10px]">
            <ArrowUpDown className="size-3" aria-hidden />
          </kbd>
          {intl.formatMessage({
            id: "search.hint.navigate_keys",
            defaultMessage: "navigate",
          })}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <kbd className="inline-flex items-center rounded border border-border bg-card px-1 py-0.5 font-mono text-[10px]">
            <CornerDownLeft className="size-3" aria-hidden />
          </kbd>
          {intl.formatMessage({
            id: "search.hint.open",
            defaultMessage: "open",
          })}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px]">
            esc
          </kbd>
          {intl.formatMessage({
            id: "search.hint.close",
            defaultMessage: "close",
          })}
        </span>
      </footer>
    </CommandDialog>
  );
};

const HighlightedText = ({
  text,
  query,
}: {
  text: string;
  query: string;
}) => {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-primary/20 px-0.5 text-foreground">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
};

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

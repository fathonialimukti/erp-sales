import { useEffect, useMemo, useRef, useState } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { icons } from "@/assets/icons";
import { NAV_MENU, type NavMenuItem } from "@/constants/nav-menu";
import { hasPermissionAtom, searchOpenAtom } from "@/lib/atoms";
import { trpcClient } from "@/lib/trpc";
import { cn } from "@/lib/utils";

type SearchResultKind = "page" | "customer" | "sku" | "sales-order";

interface SearchResult {
  kind: SearchResultKind;
  id: string;
  href: string;
  label: string;
  hint: string;
  icon?: string;
  tint: string;
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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const TINT_CLASS: Record<string, string> = {
  violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  green: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  pink: "bg-pink-500/15 text-pink-600 dark:text-pink-400",
  orange: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  blue: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
};

export const SearchPalette = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const [open, setOpen] = useAtom(searchOpenAtom);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const navPages = useMemo<SearchResult[]>(() => {
    const leaves = flattenLeaves(NAV_MENU).filter(
      (l) => !l.permission || hasPermission(l.permission),
    );
    return leaves.map((l) => ({
      kind: "page",
      id: l.href,
      href: l.href,
      label: intl.formatMessage({ id: l.name, defaultMessage: l.name }),
      hint: intl.formatMessage({
        id: "search.hint.navigate",
        defaultMessage: "Go to page",
      }),
      icon: l.icon,
      tint: "violet",
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
        kind: "page" as const,
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
        tint: "green",
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
      tint: "pink",
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
      tint: "orange",
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
      hint: `${so.customer?.name ?? "—"} · ${formatCurrency(Number(so.grandTotal ?? 0))}`,
      tint: "blue",
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
    if (activeIndex >= results.length) setActiveIndex(0);
  }, [results.length, activeIndex]);

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
    if (open) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const goTo = (href: string) => {
    navigate(href);
    setOpen(false);
  };

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = results[activeIndex];
      if (target) goTo(target.href);
    }
  };

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-result-index="${activeIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const kindLabel = (kind: SearchResultKind) => {
    if (kind === "page") {
      return intl.formatMessage({
        id: "search.kind.page",
        defaultMessage: "Page",
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="top-[12%] w-full max-w-xl translate-y-0 gap-0 overflow-hidden rounded-2xl border-border/80 p-0 shadow-2xl sm:max-w-xl"
        data-ai-context={JSON.stringify({
          section: "search-palette",
          open,
          resultCount: results.length,
        })}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>
            {intl.formatMessage({
              id: "search.title",
              defaultMessage: "Search",
            })}
          </DialogTitle>
          <DialogDescription>
            {intl.formatMessage({
              id: "search.placeholder",
              defaultMessage:
                "Search pages, customers, SKUs, sales orders…",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <input
            ref={inputRef}
            type="text"
            className="h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            placeholder={intl.formatMessage({
              id: "search.placeholder",
              defaultMessage:
                "Search pages, customers, SKUs, sales orders…",
            })}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onInputKey}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
            esc
          </kbd>
        </div>

        <div
          ref={listRef}
          role="listbox"
          className="max-h-[min(420px,55vh)] overflow-y-auto p-1.5"
        >
          {results.length === 0 ? (
            <div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
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
          ) : (
            results.map((r, i) => (
              <button
                type="button"
                key={`${r.kind}-${r.id}`}
                data-result-index={i}
                role="option"
                aria-selected={i === activeIndex}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-left outline-none transition-colors",
                  i === activeIndex
                    ? "bg-primary/10 text-foreground"
                    : "hover:bg-accent",
                )}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => goTo(r.href)}
              >
                <span
                  className={cn(
                    "inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg",
                    TINT_CLASS[r.tint] ?? TINT_CLASS.violet,
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
                <span className="shrink-0 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {kindLabel(r.kind)}
                </span>
              </button>
            ))
          )}
        </div>

        <footer className="flex flex-wrap items-center gap-3 border-t border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <kbd className="inline-flex items-center rounded border border-border bg-card px-1 py-0.5 font-mono text-[10px]">
              <ArrowUpDown className="size-3" aria-hidden />
            </kbd>
            {intl.formatMessage({
              id: "search.hint.navigate",
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
      </DialogContent>
    </Dialog>
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

import { useEffect, useMemo, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { useAtom, useAtomValue } from "jotai";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ICONS } from "../assets/chrome-icons";
import { hasPermissionAtom, searchOpenAtom } from "../lib/atoms";
import { NAV_MENU, type NavMenuItem } from "../constants/nav-menu";
import { trpcClient } from "../lib/trpc";
import "./SearchPalette.css";

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

export const SearchPalette = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const [open, setOpen] = useAtom(searchOpenAtom);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Static nav pages — derived once per open change.
  const navPages = useMemo<SearchResult[]>(() => {
    const leaves = flattenLeaves(NAV_MENU).filter(
      (l) => !l.permission || hasPermission(l.permission),
    );
    return leaves.map((l) => ({
      kind: "page",
      id: l.href,
      href: l.href,
      label: intl.formatMessage({ id: l.name, defaultMessage: l.name }),
      hint: intl.formatMessage({ id: "search.hint.navigate", defaultMessage: "Go to page" }),
      icon: l.icon,
      tint: "violet",
    }));
  }, [hasPermission, intl]);

  // Debounced query for live search.
  const debouncedQuery = useDebounced(query, 220);

  // Live queries for each entity. We only fire when query is long enough
  // and we don't gate on permission here — tRPC will reject unauthorized
  // calls and react-query will simply show no results.
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

  // Build merged result list (nav pages filter live; entity results
  // come from tRPC).
  const results = useMemo<SearchResult[]>(() => {
    const q = normalize(query);
    if (!q) return navPages.slice(0, 10);

    const filteredPages = navPages.filter(
      (r) => r.label.toLowerCase().includes(q) || r.href.toLowerCase().includes(q),
    );

    const customerItems = (
      (customerQuery.data?.data as unknown as Array<{
        id: string;
        name: string;
        code?: string | null;
        _count?: { outlets?: number };
      }> | undefined) ?? []
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
      (skuQuery.data?.data as unknown as Array<{
        id: string;
        name: string;
        code?: string | null;
      }> | undefined) ?? []
    ).map<SearchResult>((s) => ({
      kind: "sku",
      id: s.id,
      href: `/sku/${s.id}`,
      label: s.name,
      hint: s.code ?? "",
      tint: "orange",
    }));

    const soItems = (
      (salesOrderQuery.data?.data as unknown as Array<{
        id: string;
        documentNumber?: string | null;
        grandTotal?: number | null;
        customer?: { name?: string | null } | null;
      }> | undefined) ?? []
    ).map<SearchResult>((so) => ({
      kind: "sales-order",
      id: so.id,
      href: `/sales-order/${so.id}`,
      label: so.documentNumber ?? so.id,
      hint: `${so.customer?.name ?? "—"} · ${formatCurrency(Number(so.grandTotal ?? 0))}`,
      tint: "blue",
    }));

    return [...filteredPages, ...customerItems, ...skuItems, ...soItems].slice(0, 20);
  }, [query, navPages, customerQuery.data, skuQuery.data, salesOrderQuery.data]);

  // Keep activeIndex in range when results shrink.
  useEffect(() => {
    if (activeIndex >= results.length) setActiveIndex(0);
  }, [results.length, activeIndex]);

  // Global Cmd/Ctrl+K + Escape handlers.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isCmdK) {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  // Focus the input + reset state when opened.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      // Focus after the modal mounts.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // In-palette keyboard navigation.
  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = results[activeIndex];
      if (target) {
        navigate(target.href);
        setOpen(false);
      }
    }
  };

  // Auto-scroll active item into view.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-result-index="${activeIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  return (
    <div
      className="ios-search"
      role="dialog"
      aria-modal="true"
      aria-label={intl.formatMessage({ id: "search.title", defaultMessage: "Search" })}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="ios-search__backdrop" aria-hidden="true" />
      <div className="ios-search__panel" role="document">
        <div className="ios-search__input-row">
          <span className="ios-search__input-icon" aria-hidden="true">
            <img src={ICONS.ui.search} alt="" />
          </span>
          <input
            ref={inputRef}
            className="ios-search__input"
            type="text"
            placeholder={intl.formatMessage({
              id: "search.placeholder",
              defaultMessage: "Search pages, customers, SKUs, sales orders…",
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
          <span className="ios-search__esc" aria-hidden="true">esc</span>
        </div>

        <div className="ios-search__list" ref={listRef} role="listbox">
          {results.length === 0 ? (
            <div className="ios-search__empty">
              <span className="ios-search__empty-title">
                {intl.formatMessage({ id: "search.empty.title", defaultMessage: "No results" })}
              </span>
              <span className="ios-search__empty-text">
                {intl.formatMessage({
                  id: "search.empty.text",
                  defaultMessage: "Try a different keyword or check your spelling.",
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
                className={`ios-search__result ${i === activeIndex ? "ios-search__result--active" : ""}`}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => {
                  navigate(r.href);
                  setOpen(false);
                }}
              >
                <span
                  className="ios-search__result-icon"
                  data-tint={r.tint}
                  aria-hidden="true"
                >
                  {r.icon ? (
                    <img src={r.icon} alt="" />
                  ) : (
                    <span className="ios-search__result-glyph">
                      {r.kind === "customer" ? "👤" : r.kind === "sku" ? "📦" : r.kind === "sales-order" ? "📄" : "•"}
                    </span>
                  )}
                </span>
                <span className="ios-search__result-text">
                  <span className="ios-search__result-label">
                    <HighlightedText text={r.label} query={query} />
                  </span>
                  {r.hint ? (
                    <span className="ios-search__result-hint">
                      <HighlightedText text={r.hint} query={query} />
                    </span>
                  ) : null}
                </span>
                <span className="ios-search__result-kind" aria-hidden="true">
                  {r.kind === "page"
                    ? intl.formatMessage({ id: "search.kind.page", defaultMessage: "Page" })
                    : r.kind === "customer"
                    ? intl.formatMessage({ id: "search.kind.customer", defaultMessage: "Customer" })
                    : r.kind === "sku"
                    ? intl.formatMessage({ id: "search.kind.sku", defaultMessage: "SKU" })
                    : intl.formatMessage({ id: "search.kind.salesOrder", defaultMessage: "Sales order" })}
                </span>
              </button>
            ))
          )}
        </div>

        <footer className="ios-search__footer">
          <span className="ios-search__hint">
            <kbd className="ios-search__kbd">↑</kbd>
            <kbd className="ios-search__kbd">↓</kbd>
            {intl.formatMessage({ id: "search.hint.navigate", defaultMessage: "navigate" })}
          </span>
          <span className="ios-search__hint">
            <kbd className="ios-search__kbd">↵</kbd>
            {intl.formatMessage({ id: "search.hint.open", defaultMessage: "open" })}
          </span>
          <span className="ios-search__hint">
            <kbd className="ios-search__kbd">esc</kbd>
            {intl.formatMessage({ id: "search.hint.close", defaultMessage: "close" })}
          </span>
        </footer>
      </div>
    </div>
  );
};

/* ---------- Highlight matched substring ---------- */

const HighlightedText = ({ text, query }: { text: string; query: string }) => {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="ios-search__mark">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
};

/* ---------- Tiny useDebounce hook ---------- */

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

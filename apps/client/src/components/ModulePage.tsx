import type { ReactNode } from "react";

/* ============================================================
 * ModulePage — universal page wrapper for all CRUD modules.
 *
 * Sets the accent CSS custom properties on the root element.
 * All child components use m- classes which inherit these props.
 *
 * Usage:
 *   <ModulePage accent="#007AFF" accentEnd="#5856D6" aiContext={{ section: "region-index", ... }}>
 *     <ModuleHero ... />
 *     ...
 *   </ModulePage>
 * ============================================================ */

interface ModulePageProps {
  children: ReactNode;
  accent: string;
  accentEnd: string;
  aiContext: Record<string, unknown>;
}

export const ModulePage = ({ children, accent, accentEnd, aiContext }: ModulePageProps) => (
  <section
    className="m-page"
    style={{ "--m-accent": accent, "--m-accent-end": accentEnd } as React.CSSProperties}
    data-ai-context={JSON.stringify(aiContext)}
  >
    {children}
  </section>
);

/* ============================================================
 * ModuleHero — gradient hero header.
 *
 * Slots: kicker, title, subtitle, cta (button), stats[]
 * ============================================================ */

interface ModuleHeroStat {
  value: ReactNode;
  label: string;
  color?: "success" | "info" | "warning" | "danger" | "muted";
}

interface ModuleHeroProps {
  kicker: string;
  title: string;
  subtitle?: string;
  cta?: { label: string; icon: ReactNode; onClick: () => void };
  stats?: ModuleHeroStat[];
}

export const ModuleHero = ({ kicker, title, subtitle, cta, stats }: ModuleHeroProps) => (
  <header className="m-hero">
    <div className="m-hero__top">
      <div className="m-hero__text">
        <span className="m-hero__kicker">{kicker}</span>
        <h1 className="m-hero__title">{title}</h1>
        {subtitle && <p className="m-hero__sub">{subtitle}</p>}
      </div>
      {cta && (
        <button type="button" className="m-hero__cta" onClick={cta.onClick}>
          {cta.icon}
          {cta.label}
        </button>
      )}
    </div>
    {stats && stats.length > 0 && (
      <div className="m-hero__stats">
        {stats.map((s, i) => (
          <div className="m-hero__stat" key={i}>
            <span className={`m-hero__stat-value${s.color ? ` m-hero__stat-value--${s.color}` : ""}`}>{s.value}</span>
            <span className="m-hero__stat-label">{s.label}</span>
          </div>
        )).flatMap((node, i) => i === 0 ? [node] : [<span className="m-hero__divider" aria-hidden="true" key={`d${i}`} />, node])}
      </div>
    )}
  </header>
);

/* ============================================================
 * ModuleSearch — pill-shaped search bar with clear button.
 * ============================================================ */

interface ModuleSearchProps {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  searchIcon: ReactNode;
  clearIcon: ReactNode;
  clearLabel: string;
}

export const ModuleSearch = ({ value, onChange, placeholder, searchIcon, clearIcon, clearLabel }: ModuleSearchProps) => (
  <div className="m-search">
    <span className="m-search__icon" aria-hidden="true">{searchIcon}</span>
    <input
      className="m-search__input"
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      style={{
        flex: "1 1 auto", minWidth: 0, width: "100%", height: "100%", minHeight: 0,
        padding: "0 0.5rem", background: "transparent", border: 0, outline: "none",
        fontSize: "0.9375rem", color: "var(--color-foreground)",
      }}
    />
    {value && (
      <button type="button" className="m-search__clear" onClick={() => onChange("")} aria-label={clearLabel}>
        {clearIcon}
      </button>
    )}
  </div>
);

/* ============================================================
 * ModuleTable — card with table, loading, empty, and pagination.
 *
 * Renders a TanStack Table instance.
 * ============================================================ */

import type { Table as TanStackTable } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import { Pagination } from "../ui/Pagination";
import { Spinner } from "../ui/Spinner";

interface ModuleTableProps<T> {
  table: TanStackTable<T>;
  totalRows: number;
  totalPages: number;
  isLoading: boolean;
  onRowClick?: (row: T) => void;
  pageIndex: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  emptyState: ReactNode;
  paginationLabel: string;
}

export function ModuleTable<T>({
  table, totalPages, isLoading, onRowClick, pageIndex, onPageChange, pageSize, emptyState, paginationLabel,
}: ModuleTableProps<T>) {
  const rows = table.getRowModel().rows;

  if (isLoading) {
    return (
      <div className="m-state m-state--loading">
        <Spinner size="lg" />
        <span className="m-state__title">Loading…</span>
      </div>
    );
  }

  if (rows.length === 0) {
    return emptyState;
  }

  return (
    <div className="m-table-card">
      <table className="m-table">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th key={h.id} style={h.column.getCanSort() ? { cursor: "pointer", userSelect: "none" } : undefined} onClick={h.column.getToggleSortingHandler()}>
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  {{ asc: " ▲", desc: " ▼" }[h.column.getIsSorted() as string] ?? null}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="m-row" onClick={() => onRowClick?.(row.original)}>
              {row.getVisibleCells().map((c) => (
                <td key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="m-pagination">
        <span className="m-pagination__info">{paginationLabel}</span>
        <Pagination page={pageIndex + 1} totalPages={totalPages} onChange={(p) => onPageChange(p - 1)} />
      </div>
    </div>
  );
}

/* ============================================================
 * ModuleEmpty — empty state with illustration, title, text, and CTA.
 * Matches the iOS golden-rule .m-state structure.
 * ============================================================ */

const DefaultEmptyIllustration = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="30" width="80" height="70" rx="8" fill="var(--ios-card-bg)" stroke="var(--ios-card-border)" strokeWidth="2" />
    <rect x="30" y="45" width="60" height="8" rx="4" fill="var(--color-slate-300)" />
    <rect x="30" y="60" width="45" height="8" rx="4" fill="var(--color-slate-300)" />
    <rect x="30" y="75" width="50" height="8" rx="4" fill="var(--color-slate-300)" />
    <circle cx="90" cy="30" r="15" fill="var(--ios-state-info-bg)" opacity="0.6" />
    <path d="M85 30L88 33L95 26" stroke="var(--ios-state-info)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

interface ModuleEmptyProps {
  icon?: ReactNode;
  title: string;
  description: string;
  cta?: { label: string; icon: ReactNode; onClick: () => void };
}

export const ModuleEmpty = ({ icon, title, description, cta }: ModuleEmptyProps) => (
  <div className="m-state">
    <div className="m-state__illustration">{icon ?? <DefaultEmptyIllustration />}</div>
    <span className="m-state__title">{title}</span>
    <span className="m-state__text">{description}</span>
    {cta && (
      <button type="button" className="m-state__cta" onClick={cta.onClick}>
        {cta.icon}
        {cta.label}
      </button>
    )}
  </div>
);

/* ============================================================
 * ModuleDetailHero — detail page hero header.
 * ============================================================ */

interface ModuleDetailHeroProps {
  kicker: string;
  title: string;
  subtitle?: string;
  actions: ReactNode;
}

export const ModuleDetailHero = ({ kicker, title, subtitle, actions }: ModuleDetailHeroProps) => (
  <header className="m-detail-hero">
    <div className="m-detail-hero__top">
      <div className="m-detail-hero__text">
        <span className="m-detail-hero__kicker">{kicker}</span>
        <h1 className="m-detail-hero__title">{title}</h1>
        {subtitle && <p className="m-detail-hero__sub">{subtitle}</p>}
      </div>
      <div className="m-detail-hero__actions">{actions}</div>
    </div>
  </header>
);

/* ============================================================
 * ModuleDetailSummary — detail page summary grid.
 * ============================================================ */

interface ModuleDetailSummaryProps {
  fields: { label: string; value: ReactNode }[];
}

export const ModuleDetailSummary = ({ fields }: ModuleDetailSummaryProps) => (
  <div className="m-detail__summary">
    <div className="m-detail__summary-grid">
      {fields.map((f, i) => (
        <div className="m-detail__field" key={i}>
          <span className="m-detail__field-label">{f.label}</span>
          <span className="m-detail__field-value">{f.value}</span>
        </div>
      ))}
    </div>
  </div>
);

/* ============================================================
 * ModuleRelatedList — related items list (e.g., areas in region).
 * ============================================================ */

interface ModuleRelatedItem {
  id: string;
  name: string;
  code?: string | null;
}

interface ModuleRelatedListProps {
  title: string;
  count: number;
  icon: ReactNode;
  items: ModuleRelatedItem[];
  emptyTitle: string;
  emptyIcon: ReactNode;
  onItemClick: (item: ModuleRelatedItem) => void;
}

export const ModuleRelatedList = ({ title, count, icon, items, emptyTitle, emptyIcon, onItemClick }: ModuleRelatedListProps) => (
  <div className="m-detail__related">
    <div className="m-detail__related-header">
      <h2 className="m-detail__related-title">{title}</h2>
      <span className="m-badge">{count}</span>
    </div>
    {items.length === 0 ? (
      <div className="m-empty" style={{ padding: "2rem 1rem" }}>
        {emptyIcon}
        <h3 className="m-empty__title">{emptyTitle}</h3>
      </div>
    ) : (
      <div className="m-detail__related-list">
        {items.map((item) => (
          <div key={item.id} className="m-detail__related-item" onClick={() => onItemClick(item)}>
            <span className="m-detail__related-icon">{icon}</span>
            <span className="m-detail__related-text">
              <span className="m-detail__related-name">{item.name}</span>
              <span className="m-detail__related-code">{item.code ?? "—"}</span>
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </div>
        ))}
      </div>
    )}
  </div>
);

/* ============================================================
 * ModuleFormPage — form page wrapper with hero + form card.
 * ============================================================ */

interface ModuleFormPageProps {
  kicker: string;
  title: string;
  backTo: string;
  backIcon: ReactNode;
  backLabel: string;
  children: ReactNode;
  onSubmit: (e: React.FormEvent) => void;
}

export const ModuleFormPage = ({ kicker, title, backTo, backIcon, backLabel, children, onSubmit }: ModuleFormPageProps) => (
  <header className="m-hero">
    <div className="m-hero__top">
      <div className="m-hero__text">
        <span className="m-hero__kicker">{kicker}</span>
        <h1 className="m-hero__title">{title}</h1>
      </div>
      <button type="button" className="btn btn-ghost" onClick={() => window.location.href = backTo}>
        {backIcon}
        {backLabel}
      </button>
    </div>
  </header>
);

/* We don't export ModuleFormPage; form pages are too varied. Instead, export the building blocks. */
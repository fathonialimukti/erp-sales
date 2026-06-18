/* eslint-disable react-refresh/only-export-components */
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import type { inferProcedureInput } from "@trpc/server";
import type { AppRouter } from "../../lib/trpc";
import { trpcClient } from "../../lib/trpc";
import { useAiFillForm } from "../../components/AiAssistant/useAiFillForm";
import "./SalesOrderFormPage.css";

/* ----------------------------------------------------------------
 * Types
 * ---------------------------------------------------------------- */

interface LineItem {
  skuId: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number | null;
  taxPercent: number | null;
  lineTotal: number;
  notes?: string;
}

interface FormValues {
  customerId: string;
  outletId: string;
  areaId: string;
  currency: string;
  paymentTerms: string;
  expectedDeliveryDate: string;
  notes: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  items: LineItem[];
}

interface DetailData {
  id: string;
  customer: { id: string };
  outlet: { id: string } | null;
  area: { id: string };
  currency: string;
  paymentTerms: string | null;
  expectedDeliveryDate: string | null;
  notes: string | null;
  subtotal: number | null;
  discountTotal: number | null;
  taxTotal: number | null;
  grandTotal: number | null;
  items: {
    sku: { id: string };
    quantity: number;
    unitPrice: number;
    discountPercent: number | null;
    taxPercent: number | null;
    lineTotal: number;
    notes: string | null;
  }[];
}

const emptyItem = (): LineItem => ({
  skuId: "",
  quantity: 1,
  unitPrice: 0,
  discountPercent: null,
  taxPercent: null,
  lineTotal: 0,
  notes: "",
});

const defaults = (): FormValues => ({
  customerId: "",
  outletId: "",
  areaId: "",
  currency: "IDR",
  paymentTerms: "",
  expectedDeliveryDate: "",
  notes: "",
  subtotal: 0,
  discountTotal: 0,
  taxTotal: 0,
  grandTotal: 0,
  items: [emptyItem()],
});

const recalcTotals = (items: LineItem[]) => {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;
  items.forEach((it) => {
    const lineSub = it.quantity * it.unitPrice;
    const disc = lineSub * ((it.discountPercent ?? 0) / 100);
    const tax = (lineSub - disc) * ((it.taxPercent ?? 0) / 100);
    subtotal += lineSub;
    discountTotal += disc;
    taxTotal += tax;
  });
  return {
    subtotal: Math.round(subtotal),
    discountTotal: Math.round(discountTotal),
    taxTotal: Math.round(taxTotal),
    grandTotal: Math.round(subtotal - discountTotal + taxTotal),
  };
};

const fromDetail = (d: DetailData): FormValues => ({
  customerId: d.customer.id,
  outletId: d.outlet?.id ?? "",
  areaId: d.area.id,
  currency: d.currency,
  paymentTerms: d.paymentTerms ?? "",
  expectedDeliveryDate: d.expectedDeliveryDate
    ? new Date(d.expectedDeliveryDate).toISOString().slice(0, 10)
    : "",
  notes: d.notes ?? "",
  subtotal: d.subtotal ?? 0,
  discountTotal: d.discountTotal ?? 0,
  taxTotal: d.taxTotal ?? 0,
  grandTotal: d.grandTotal ?? 0,
  items: d.items.map((it) => ({
    skuId: it.sku.id,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    discountPercent: it.discountPercent,
    taxPercent: it.taxPercent,
    lineTotal: it.lineTotal,
    notes: it.notes ?? "",
  })),
});

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
};

const HUE_PALETTE = [
  "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b",
  "#ef4444", "#14b8a6", "#6366f1", "#84cc16", "#f97316",
];
const colorFromId = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return HUE_PALETTE[Math.abs(hash) % HUE_PALETTE.length];
};

/* ----------------------------------------------------------------
 * Icons (inline SVG — no external icon font)
 * ---------------------------------------------------------------- */

const Icon = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);

const IconCaret = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const IconSearch = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconCheck = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconCalendar = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconCheckCircle = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="10" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const IconAlertCircle = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const IconPlus = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconTrash = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    <path d="M5 6v14a2 2 0 002 2h10a2 2 0 002-2V6" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const IconUser = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconBuilding = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <line x1="9" y1="6" x2="9" y2="6.01" />
    <line x1="15" y1="6" x2="15" y2="6.01" />
    <line x1="9" y1="10" x2="9" y2="10.01" />
    <line x1="15" y1="10" x2="15" y2="10.01" />
    <line x1="9" y1="14" x2="9" y2="14.01" />
    <line x1="15" y1="14" x2="15" y2="14.01" />
    <path d="M10 22v-4h4v4" />
  </svg>
);

const IconBox = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const IconArrowLeft = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

/* ----------------------------------------------------------------
 * Custom SelectSearch — built fresh with regular CSS
 * ---------------------------------------------------------------- */

interface SearchOption {
  id: string;
  name: string;
  description?: string | null;
}

interface SelectSearchProps {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: SearchOption[];
  isLoading?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  loadingLabel?: string;
  getDescription?: (opt: SearchOption) => string | undefined;
  showInitial?: boolean;
}

const SelectSearch = ({
  label,
  value,
  onChange,
  options,
  isLoading,
  isRequired,
  isInvalid,
  errorMessage,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyLabel = "No options",
  loadingLabel = "Loading…",
  getDescription,
  showInitial = true,
}: SelectSearchProps) => {
  const autoId = useId();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlight, setHighlight] = useState(0);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return options;
    return options.filter((o) => o.name.toLowerCase().includes(term));
  }, [options, searchTerm]);

  const selected = options.find((o) => o.id === value) ?? null;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
      setHighlight(0);
    }
  }, [open]);

  const select = (id: string) => {
    onChange(id);
    setOpen(false);
    setSearchTerm("");
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[highlight];
      if (opt) select(opt.id);
    }
  };

  return (
    <div className="so-field" style={{ position: "relative" }}>
      {label && (
        <label className="so-field__label" htmlFor={autoId}>
          {label}
          {isRequired && <span className="so-field__required">*</span>}
        </label>
      )}
      <div className="so-select" ref={wrapRef}>
        <button
          id={autoId}
          type="button"
          className={`so-select__trigger ${isInvalid ? "so-select__trigger--error" : ""} ${
            !selected ? "so-select__trigger--placeholder" : ""
          }`}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
            }
          }}
        >
          {selected && showInitial && (
            <span className="so-select__initial" style={{ background: colorFromId(selected.id) }}>
              {initials(selected.name)}
            </span>
          )}
          <span className="so-select__value">{selected ? selected.name : placeholder}</span>
          <span className="so-select__caret">
            <IconCaret />
          </span>
        </button>
        {open && (
          <div className="so-select__popover" role="listbox">
            <div className="so-select__search">
              <div className="so-select__search-wrap">
                <span className="so-select__search-icon">
                  <IconSearch />
                </span>
                <input
                  ref={inputRef}
                  type="search"
                  className="so-select__search-input"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setHighlight(0);
                  }}
                  onKeyDown={onKey}
                />
              </div>
            </div>
            <ul className="so-select__list">
              {isLoading ? (
                <li className="so-select__empty">{loadingLabel}</li>
              ) : filtered.length === 0 ? (
                <li className="so-select__empty">{emptyLabel}</li>
              ) : (
                filtered.map((opt, idx) => {
                  const isSelected = opt.id === value;
                  const isHighlighted = idx === highlight;
                  const desc = getDescription?.(opt);
                  return (
                    <li
                      key={opt.id}
                      role="option"
                      aria-selected={isSelected}
                      className={`so-select__item ${isHighlighted ? "so-select__item--highlighted" : ""} ${
                        isSelected ? "so-select__item--selected" : ""
                      }`}
                      onMouseEnter={() => setHighlight(idx)}
                      onClick={() => select(opt.id)}
                    >
                      {showInitial && (
                        <span className="so-select__initial" style={{ background: colorFromId(opt.id) }}>
                          {initials(opt.name)}
                        </span>
                      )}
                      <div className="so-select__item-main">
                        <span className="so-select__item-label">{opt.name}</span>
                        {desc && <span className="so-select__item-desc">{desc}</span>}
                      </div>
                      {isSelected && (
                        <span className="so-select__check">
                          <IconCheck />
                        </span>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
            <div className="so-select__footer">
              <span>
                {filtered.length} of {options.length} result{options.length === 1 ? "" : "s"}
              </span>
              <span className="so-select__hint">
                <span className="so-select__kbd">↑↓</span> navigate
                <span className="so-select__kbd">↵</span> select
              </span>
            </div>
          </div>
        )}
      </div>
      {isInvalid && errorMessage && <p className="so-field__error">{errorMessage}</p>}
    </div>
  );
};

/* ----------------------------------------------------------------
 * Page
 * ---------------------------------------------------------------- */

export const SalesOrderFormPage = () => {
  const { id } = useParams();
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);
  const [modalStage, setModalStage] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [resultMessage, setResultMessage] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["salesOrderDetail", id],
    enabled: isEdit,
    queryFn: () => trpcClient.salesOrder.detail.query({ id: id ?? "" }),
  });

  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ["customerSelect"],
    queryFn: () => trpcClient.customer.list.query({ page: 1, limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });
  const { data: areas, isLoading: areasLoading } = useQuery({
    queryKey: ["areaSelect"],
    queryFn: () => trpcClient.area.list.query({ page: 1, limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });
  const { data: skus, isLoading: skusLoading } = useQuery({
    queryKey: ["skuSelect"],
    queryFn: () => trpcClient.sku.list.query({ page: 1, limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const custList = ((customers as { data?: SearchOption[] } | undefined)?.data ?? []) as SearchOption[];
  const areaList = ((areas as { data?: SearchOption[] } | undefined)?.data ?? []) as SearchOption[];
  const skuList = ((skus as { data?: { id: string; name: string; basePrice?: number | null; code?: string | null }[] } | undefined)
    ?.data ?? []) as { id: string; name: string; basePrice?: number | null; code?: string | null }[];

  const createMutation = useMutation<
    { id: string },
    unknown,
    inferProcedureInput<AppRouter["salesOrder"]["create"]>
  >({
    mutationFn: (p) => trpcClient.salesOrder.create.mutate(p),
    onSuccess: async (r) => {
      await queryClient.invalidateQueries({ queryKey: ["salesOrderList"] });
      setResultMessage(intl.formatMessage({ id: "sales_order.form.success.created", defaultMessage: "Order created" }));
      setModalStage("success");
      setTimeout(() => navigate(`/sales-order/${r.id}`), 1200);
    },
    onError: (e) => {
      setResultMessage(e instanceof Error ? e.message : "Failed");
      setModalStage("error");
    },
  });

  const updateMutation = useMutation<
    { id: string },
    unknown,
    inferProcedureInput<AppRouter["salesOrder"]["update"]>
  >({
    mutationFn: (p) => trpcClient.salesOrder.update.mutate(p),
    onSuccess: async (r) => {
      await queryClient.invalidateQueries({ queryKey: ["salesOrderList"] });
      queryClient.removeQueries({ queryKey: ["salesOrderDetail", id] });
      setResultMessage(intl.formatMessage({ id: "sales_order.form.success.updated", defaultMessage: "Order updated" }));
      setModalStage("success");
      setTimeout(() => navigate(`/sales-order/${r.id}`), 1200);
    },
    onError: (e) => {
      setResultMessage(e instanceof Error ? e.message : "Failed");
      setModalStage("error");
    },
  });

  const form = useForm({
    defaultValues: (isEdit && data ? fromDetail(data as unknown as DetailData) : defaults()) as FormValues,
    onSubmit: async ({ value }) => {
      setModalStage("loading");
      const items = value.items.map((it) => ({
        ...it,
        lineTotal: Math.round(
          it.quantity *
            it.unitPrice *
            (1 - (it.discountPercent ?? 0) / 100) *
            (1 + (it.taxPercent ?? 0) / 100),
        ),
      }));
      const totals = recalcTotals(items);
      const payload = {
        ...value,
        items,
        ...totals,
        outletId: value.outletId || null,
        expectedDeliveryDate: value.expectedDeliveryDate || undefined,
      };
      if (isEdit && id) {
        updateMutation.mutate({ currentId: id, ...payload } as never);
      } else {
        createMutation.mutate(payload as never);
      }
    },
  });

  useAiFillForm({
    customerId: (v: unknown) => form.setFieldValue("customerId" as never, String(v) as never),
    notes: (v: unknown) => form.setFieldValue("notes" as never, String(v) as never),
  });

  // Read directly from form.state.values so the component re-renders
  // when the form store updates. form.getFieldValue() is a snapshot read
  // and does NOT trigger re-renders, which is why the add/remove
  // buttons appeared to do nothing.
  const formValues = form.state.values as FormValues;
  const itemsVal = (formValues.items ?? []) as LineItem[];
  const grandTotal = (formValues.grandTotal as number | undefined) ?? 0;

  const handleAddItem = () => {
    const current = ((form.state.values as FormValues).items ?? []) as LineItem[];
    const next = [...current, emptyItem()];
    form.setFieldValue("items" as never, next as never);
  };

  const handleRemoveItem = (idx: number) => {
    const current = ((form.state.values as FormValues).items ?? []) as LineItem[];
    const next = current.filter((_, i) => i !== idx);
    form.setFieldValue("items" as never, (next.length > 0 ? next : [emptyItem()]) as never);
  };

  const handleItemChange = useCallback(
    (idx: number, field: keyof LineItem, val: LineItem[keyof LineItem]) => {
      const current = ((form.state.values as FormValues).items ?? []) as LineItem[];
      const next = current.map((it, i) => (i === idx ? ({ ...it, [field]: val } as LineItem) : it));
      if (field === "skuId") {
        const sku = skuList.find((s) => s.id === val);
        if (sku?.basePrice) next[idx]!.unitPrice = Number(sku.basePrice);
      }
      const it = next[idx]!;
      next[idx] = {
        ...it,
        lineTotal: Math.round(
          it.quantity * it.unitPrice * (1 - (it.discountPercent ?? 0) / 100) * (1 + (it.taxPercent ?? 0) / 100),
        ),
      };
      form.setFieldValue("items" as never, next as never);
      const totals = recalcTotals(next);
      form.setFieldValue("subtotal" as never, totals.subtotal as never);
      form.setFieldValue("discountTotal" as never, totals.discountTotal as never);
      form.setFieldValue("taxTotal" as never, totals.taxTotal as never);
      form.setFieldValue("grandTotal" as never, totals.grandTotal as never);
    },
    [form, itemsVal, skuList],
  );

  if (isEdit && isLoading) {
    return (
      <div className="so-form">
        <div className="so-loading">
          <span className="so-spinner so-spinner--lg" />
          <span>Loading order…</span>
        </div>
      </div>
    );
  }

  if (isEdit && !data) {
    return (
      <div className="so-form">
        <div className="so-shell" style={{ maxWidth: 480, margin: "60px auto" }}>
          <div className="so-card">
            <div className="so-card__body">
              <p style={{ color: "var(--so-danger)", margin: 0 }}>
                {intl.formatMessage({ id: "sales_order.form.not_found", defaultMessage: "Order not found." })}
              </p>
              <button
                className="so-btn so-btn--ghost"
                style={{ marginTop: 12 }}
                onClick={() => navigate("/sales-order")}
              >
                <IconArrowLeft />
                {intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" })}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const skuOptions: SearchOption[] = skuList.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.basePrice ? formatCurrency(Number(s.basePrice)) : (s.code ?? undefined),
  }));

  return (
    <div
      className="so-form"
      data-ai-context={JSON.stringify({
        section: "sales-order-form",
        mode: isEdit ? "edit" : "create",
        orderId: id ?? null,
        availableCustomers: custList.map((c) => ({ id: c.id, name: c.name })),
        availableAreas: areaList.map((a) => ({ id: a.id, name: a.name })),
        availableSkus: skuList.map((s) => ({ id: s.id, name: s.name, basePrice: s.basePrice })),
      })}
    >
      <form
        className="so-form__shell"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        {/* Header */}
        <div className="so-form__header">
          <div>
            <h1 className="so-form__title">
              {isEdit
                ? intl.formatMessage({ id: "sales_order.form.title_edit", defaultMessage: "Edit sales order" })
                : intl.formatMessage({ id: "sales_order.form.title_create", defaultMessage: "Create sales order" })}
            </h1>
            <p className="so-form__subtitle">
              {isEdit
                ? "Update line items, totals, and customer information"
                : "Create a new sales order with line items and customer details"}
            </p>
          </div>
          <button type="button" className="so-form__back" onClick={() => navigate(isEdit && id ? `/sales-order/${id}` : "/sales-order")}>
            <IconArrowLeft />
            Back
          </button>
        </div>

        {/* Customer & Location */}
        <section className="so-card">
          <div className="so-card__header">
            <h2 className="so-card__title">
              <span className="so-card__icon"><IconUser /></span>
              Customer &amp; Location
            </h2>
            <p className="so-card__hint">Required to identify the order recipient and delivery area</p>
          </div>
          <div className="so-card__body">
            <div className="so-section">
              <form.Field
                name="customerId"
                validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}
              >
                {(f) => (
                  <SelectSearch
                    label="Customer"
                    isRequired
                    isInvalid={Boolean(f.state.meta.errors[0])}
                    errorMessage={String(f.state.meta.errors[0] ?? "")}
                    value={f.state.value}
                    onChange={f.handleChange}
                    options={custList}
                    isLoading={customersLoading}
                    placeholder="Select customer…"
                    searchPlaceholder="Search customers…"
                  />
                )}
              </form.Field>

              <form.Field
                name="areaId"
                validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}
              >
                {(f) => (
                  <SelectSearch
                    label="Area"
                    isRequired
                    isInvalid={Boolean(f.state.meta.errors[0])}
                    errorMessage={String(f.state.meta.errors[0] ?? "")}
                    value={f.state.value}
                    onChange={f.handleChange}
                    options={areaList}
                    isLoading={areasLoading}
                    placeholder="Select area…"
                    searchPlaceholder="Search areas…"
                    showInitial={false}
                  />
                )}
              </form.Field>

              <form.Field name="expectedDeliveryDate">
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">Delivery date</label>
                    <div className="so-datepicker">
                      <div className="so-datepicker__trigger">
                        <input
                          type="date"
                          className="so-datepicker__input"
                          value={f.state.value ?? ""}
                          onChange={(e) => f.handleChange(e.target.value)}
                        />
                        <span className="so-datepicker__icon">
                          <IconCalendar />
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </form.Field>
            </div>
          </div>
        </section>

        {/* Items */}
        <section className="so-card">
          <div className="so-card__header">
            <h2 className="so-card__title">
              <span className="so-card__icon"><IconBox /></span>
              Line items
            </h2>
            <button type="button" className="so-btn so-btn--outline so-btn--sm" onClick={handleAddItem}>
              <IconPlus />
              Add item
            </button>
          </div>
          <div className="so-card__body">
            <div className="so-items">
              <form.Subscribe
                selector={(s) => (s.values.items ?? []) as LineItem[]}
              >
                {(items) => (
                  <>
                  {items.map((item, idx) => (
                <div className="so-item" key={idx}>
                  <div>
                    {idx === 0 && <div className="so-item__label">Product</div>}
                    <SelectSearch
                      value={item.skuId}
                      onChange={(v) => handleItemChange(idx, "skuId", v)}
                      options={skuOptions}
                      isLoading={skusLoading}
                      placeholder="Select SKU…"
                      searchPlaceholder="Search SKUs…"
                      getDescription={(o) => o.description}
                    />
                  </div>
                  <div>
                    {idx === 0 && <div className="so-item__label">Qty</div>}
                    <input
                      className="so-field__input"
                      type="number"
                      min={1}
                      value={String(item.quantity)}
                      onChange={(e) => handleItemChange(idx, "quantity", Number(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    {idx === 0 && <div className="so-item__label">Unit price</div>}
                    <input
                      className="so-field__input"
                      type="number"
                      min={0}
                      value={String(item.unitPrice)}
                      onChange={(e) => handleItemChange(idx, "unitPrice", Number(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    {idx === 0 && <div className="so-item__label">Disc %</div>}
                    <input
                      className="so-field__input"
                      type="number"
                      min={0}
                      value={String(item.discountPercent ?? "")}
                      onChange={(e) =>
                        handleItemChange(idx, "discountPercent", e.target.value ? Number(e.target.value) : null)
                      }
                    />
                  </div>
                  <div>
                    {idx === 0 && <div className="so-item__label">Tax %</div>}
                    <input
                      className="so-field__input"
                      type="number"
                      min={0}
                      value={String(item.taxPercent ?? "")}
                      onChange={(e) =>
                        handleItemChange(idx, "taxPercent", e.target.value ? Number(e.target.value) : null)
                      }
                    />
                  </div>
                  <div>
                    {idx === 0 && <div className="so-item__label">Line total</div>}
                    <div
                      style={{
                        height: 40,
                        display: "flex",
                        alignItems: "center",
                        padding: "0 12px",
                        fontWeight: 600,
                        fontFamily: "var(--so-mono)",
                        color: "var(--so-fg)",
                        background: "var(--so-surface)",
                        border: "1px solid var(--so-border)",
                        borderRadius: "var(--so-radius-sm)",
                      }}
                    >
                      {formatCurrency(item.lineTotal)}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="so-item__remove"
                    aria-label="Remove item"
                    onClick={() => handleRemoveItem(idx)}
                  >
                    <IconTrash />
                  </button>
                </div>
              ))}
                  </>
                )}
              </form.Subscribe>
            </div>

            <div className="so-totals">
              <div className="so-totals__card">
                <p className="so-totals__label">Grand total</p>
                <p className="so-totals__value">{formatCurrency(grandTotal)}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Additional info */}
        <section className="so-card">
          <div className="so-card__header">
            <h2 className="so-card__title">
              <span className="so-card__icon"><IconBuilding /></span>
              Additional information
            </h2>
          </div>
          <div className="so-card__body">
            <div className="so-section so-section--2">
              <form.Field name="paymentTerms">
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">Payment terms</label>
                    <input
                      className="so-field__input"
                      placeholder="e.g. NET 30"
                      value={f.state.value}
                      onChange={(e) => f.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>
              <form.Field name="notes">
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">Notes</label>
                    <textarea
                      className="so-field__input so-field__textarea"
                      placeholder="Add order notes…"
                      value={f.state.value}
                      onChange={(e) => f.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="so-actions">
          <button
            type="button"
            className="so-btn so-btn--ghost"
            onClick={() => navigate(isEdit && id ? `/sales-order/${id}` : "/sales-order")}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="so-btn so-btn--primary"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {(createMutation.isPending || updateMutation.isPending) && <span className="so-spinner" />}
            {isEdit
              ? intl.formatMessage({ id: "common.action.save", defaultMessage: "Save changes" })
              : intl.formatMessage({ id: "common.action.create", defaultMessage: "Create order" })}
          </button>
        </div>
      </form>

      {/* Result modal */}
      {modalStage !== "idle" && (
        <div className="so-modal__backdrop" onClick={() => modalStage !== "loading" && setModalStage("idle")}>
          <div className="so-modal" onClick={(e) => e.stopPropagation()}>
            {modalStage === "loading" && (
              <div className="so-modal__body">
                <div className="so-modal__icon so-modal__icon--success" style={{ background: "var(--so-surface-2)", color: "var(--so-accent)" }}>
                  <span className="so-spinner so-spinner--lg" />
                </div>
                <p className="so-modal__msg">Saving your order…</p>
              </div>
            )}
            {modalStage === "success" && (
              <>
                <div className="so-modal__body">
                  <div className="so-modal__icon so-modal__icon--success">
                    <IconCheckCircle />
                  </div>
                  <h3 className="so-modal__title">Order saved</h3>
                  <p className="so-modal__msg">{resultMessage}</p>
                </div>
                <div className="so-modal__footer">
                  <button className="so-btn so-btn--ghost" onClick={() => setModalStage("idle")}>
                    Close
                  </button>
                </div>
              </>
            )}
            {modalStage === "error" && (
              <>
                <div className="so-modal__header">
                  <h3>Save failed</h3>
                  <button className="so-btn so-btn--ghost so-btn--sm" onClick={() => setModalStage("idle")}>
                    ✕
                  </button>
                </div>
                <div className="so-modal__body">
                  <div className="so-modal__icon so-modal__icon--error">
                    <IconAlertCircle />
                  </div>
                  <h3 className="so-modal__title">Could not save</h3>
                  <p className="so-modal__msg">{resultMessage}</p>
                </div>
                <div className="so-modal__footer">
                  <button className="so-btn so-btn--primary" onClick={() => setModalStage("idle")}>
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

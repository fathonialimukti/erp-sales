/* eslint-disable react-refresh/only-export-components */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useIntl } from "react-intl";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { useAtomValue } from "jotai";
import type { inferProcedureInput } from "@trpc/server";
import type { AppRouter } from "../../lib/trpc";
import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { ButtonGroup } from "../../components/ButtonGroup";
import { DatePicker } from "../../components/DatePicker";
import { SelectSearch } from "../../ui/SelectSearch";
import { SOIcon } from "./SalesOrderIcons";
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
  documentNumber: string;
  outletId: string;
  currency: string;
  paymentTerms: string;
  date: string;
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
  documentNumber: string | null;
  customer: { id: string; name: string } | null;
  outlet: { id: string; name: string };
  area: { id: string; name: string };
  currency: string;
  paymentTerms: string | null;
  date: string | null;
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
  documentNumber: "",
  outletId: "",
  currency: "IDR",
  paymentTerms: "",
  date: new Date().toISOString().slice(0, 10),
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
  documentNumber: d.documentNumber ?? "",
  outletId: d.outlet?.id ?? "",
  currency: d.currency,
  paymentTerms: d.paymentTerms ?? "",
  date: d.date ? new Date(d.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
  expectedDeliveryDate: d.expectedDeliveryDate ? new Date(d.expectedDeliveryDate).toISOString().slice(0, 10) : "",
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
 * Page
 * ---------------------------------------------------------------- */

export const SalesOrderFormPage = () => {
  const { id } = useParams();
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canPropose = hasPermission("sales-order@propose");
  const isEdit = Boolean(id);

  // Modal state machine:
  //   idle                — no modal
  //   draft-confirm       — confirm save as draft
  //   propose-confirm     — confirm propose with message textarea
  //   loading             — mutation in flight
  //   success             — saved, auto-navigating
  //   error               — show error, allow dismiss
  type ModalStage = "idle" | "draft-confirm" | "propose-confirm" | "loading" | "success" | "error";
  type SaveMode = "DRAFT" | "PROPOSED";
  const [modalStage, setModalStage] = useState<ModalStage>("idle");
  const [pendingSaveMode, setPendingSaveMode] = useState<SaveMode>("DRAFT");
  const [proposeMessage, setProposeMessage] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const [formValid, setFormValid] = useState(true);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S → Save as draft
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (modalStage === "idle") {
          setPendingSaveMode("DRAFT");
          setModalStage("draft-confirm");
        }
      }
      // Ctrl+Enter or Cmd+Enter → Propose
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (modalStage === "idle") {
          const formEl = document.querySelector(".so-form__shell") as HTMLFormElement | null;
          formEl?.requestSubmit();
        }
      }
      // Escape → Close modals
      if (e.key === "Escape" && modalStage !== "idle") {
        setModalStage("idle");
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [modalStage]);

  const { data, isLoading } = useQuery({
    queryKey: ["salesOrderDetail", id],
    enabled: isEdit,
    queryFn: () => trpcClient.salesOrder.detail.query({ id: id ?? "" }),
  });

  const form = useForm({
    defaultValues: (isEdit && data ? fromDetail(data as unknown as DetailData) : defaults()) as FormValues,
    onSubmit: async ({ value }) => {
      // Don't mutate yet — open the propose confirmation modal.
      setPendingSaveMode("PROPOSED");
      setProposeMessage("");
      setModalStage("propose-confirm");
    },
  });

  // Read directly from form.state.values so the component re-renders
  // when the form store updates.
  const formValues = form.state.values as FormValues;

  const { data: outlets, isLoading: outletsLoading } = useQuery({
    queryKey: ["outletSelect"],
    queryFn: () => trpcClient.outlet.list.query({ page: 1, limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });
  const { data: skus, isLoading: skusLoading } = useQuery({
    queryKey: ["skuSelect"],
    queryFn: () => trpcClient.sku.list.query({ page: 1, limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const outletList = ((outlets as { data?: { id: string; name: string; customerName?: string; areaName?: string }[] } | undefined)?.data ?? []) as { id: string; name: string; customerName?: string; areaName?: string }[];
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
      if (pendingSaveMode === "PROPOSED" && canPropose) {
        // Chain the propose call after a successful create
        try {
          await trpcClient.salesOrder.propose.mutate({ id: r.id, message: proposeMessage || undefined });
          setResultMessage(
            intl.formatMessage({ id: "sales_order.form.proposed_toast", defaultMessage: "Order proposed for approval" }),
          );
        } catch (e) {
          setResultMessage(e instanceof Error ? e.message : "Failed to propose");
        }
      } else {
        setResultMessage(intl.formatMessage({ id: "sales_order.form.success.created", defaultMessage: "Order created" }));
      }
      await queryClient.invalidateQueries({ queryKey: ["salesOrderList"] });
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
      if (pendingSaveMode === "PROPOSED" && canPropose) {
        try {
          await trpcClient.salesOrder.propose.mutate({ id: r.id, message: proposeMessage || undefined });
          setResultMessage(
            intl.formatMessage({ id: "sales_order.form.proposed_toast", defaultMessage: "Order proposed for approval" }),
          );
        } catch (e) {
          setResultMessage(e instanceof Error ? e.message : "Failed to propose");
        }
      } else {
        setResultMessage(intl.formatMessage({ id: "sales_order.form.success.updated", defaultMessage: "Order updated" }));
      }
      await queryClient.invalidateQueries({ queryKey: ["salesOrderList"] });
      setModalStage("success");
      setTimeout(() => navigate(`/sales-order/${r.id}`), 1200);
    },
    onError: (e) => {
      setResultMessage(e instanceof Error ? e.message : "Failed");
      setModalStage("error");
    },
  });

  // Build the payload once and run the appropriate mutation.
  // `mode` controls whether to also propose after saving.
  const runSave = useCallback(
    (values: FormValues, mode: SaveMode) => {
      setPendingSaveMode(mode);
      setModalStage("loading");
      const items = values.items.map((it) => ({
        skuId: it.skuId,
        quantity: Number(it.quantity) || 0,
        unitPrice: Number(it.unitPrice) || 0,
        discountPercent: it.discountPercent != null ? Number(it.discountPercent) : null,
        taxPercent: it.taxPercent != null ? Number(it.taxPercent) : null,
        lineTotal: Math.round(
          Number(it.quantity) *
            Number(it.unitPrice) *
            (1 - (Number(it.discountPercent) ?? 0) / 100) *
            (1 + (Number(it.taxPercent) ?? 0) / 100),
        ),
        notes: it.notes,
      }));
      const totals = recalcTotals(items);
      const payload = {
        ...values,
        source: 'MANUAL',
        items,
        ...totals,
        outletId: values.outletId || null,
        expectedDeliveryDate: values.expectedDeliveryDate || undefined,
      };
      if (isEdit && id) {
        updateMutation.mutate({ currentId: id, ...payload } as never);
      } else {
        createMutation.mutate(payload as never);
      }
    },
    [createMutation, updateMutation, id, isEdit, canPropose, intl],
  );

  // When the user picks an option in the chooser, run the actual save.
  const handleChooseSaveMode = useCallback(
    (mode: SaveMode) => {
      const values = form.state.values as FormValues;
      runSave(values, mode);
    },
    [form, runSave],
  );

  useAiFillForm({
    notes: (v: unknown) => form.setFieldValue("notes" as never, String(v) as never),
  });

  // Read directly from form.state.values so the component re-renders
  // when the form store updates. form.getFieldValue() is a snapshot read
  // and does NOT trigger re-renders, which is why the add/remove
  // buttons appeared to do nothing.
  const itemsVal = (formValues.items ?? []) as LineItem[];
  // Compute grand total directly from items to ensure it's always in sync
  const computedTotals = recalcTotals(itemsVal);
  const grandTotal = computedTotals.grandTotal;

  // When the user picks an outlet, do NOT auto-fill area (area is selected first)
  const handleOutletChange = useCallback(
    (outletId: string) => {
      form.setFieldValue("outletId" as never, outletId as never);
    },
    [form],
  );

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

  // Track which line items have auto-filled discounts (by index).
  // Keyed by item index → { programName, discountPercent }.
  const [autoDiscounts, setAutoDiscounts] = useState<Record<number, { programName: string; discountPercent: number }>>({});

  const handleItemChange = useCallback(
    (idx: number, field: keyof LineItem, val: LineItem[keyof LineItem]) => {
      const current = ((form.state.values as FormValues).items ?? []) as LineItem[];
      const next = current.map((it, i) => (i === idx ? ({ ...it, [field]: val } as LineItem) : it));
      if (field === "skuId") {
        const sku = skuList.find((s) => s.id === val);
        if (sku?.basePrice) next[idx]!.unitPrice = Number(sku.basePrice);

        // Look up the best discount from Action Programs.
        const fv = form.state.values as FormValues;
        const outletId = fv.outletId;
        const orderDate = fv.expectedDeliveryDate || new Date().toISOString().slice(0, 10);
        if (outletId && val) {
          trpcClient.salesOrder.lookupDiscount
            .query({ skuId: val as string, outletId, date: orderDate })
            .then((discount) => {
              if (discount && typeof discount.discountPercent === "number") {
                // Apply the auto-filled discount.
                const items = ((form.state.values as FormValues).items ?? []) as LineItem[];
                const updated = items.map((it, i) => {
                  if (i !== idx) return it;
                  const lineSub = it.quantity * it.unitPrice;
                  const newLineTotal = Math.round(
                    lineSub * (1 - discount.discountPercent / 100) * (1 + (it.taxPercent ?? 0) / 100),
                  );
                  return { ...it, discountPercent: discount.discountPercent, lineTotal: newLineTotal };
                });
                form.setFieldValue("items" as never, updated as never);
                const totals = recalcTotals(updated);
                form.setFieldValue("subtotal" as never, totals.subtotal as never);
                form.setFieldValue("discountTotal" as never, totals.discountTotal as never);
                form.setFieldValue("taxTotal" as never, totals.taxTotal as never);
                form.setFieldValue("grandTotal" as never, totals.grandTotal as never);
                setAutoDiscounts((prev) => ({
                  ...prev,
                  [idx]: { programName: discount.actionProgramName, discountPercent: discount.discountPercent },
                }));
              }
            })
            .catch(() => {
              // Discount lookup failed — leave the field editable.
              setAutoDiscounts((prev) => {
                const next = { ...prev };
                delete next[idx];
                return next;
              });
            });
        }
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

  // Validation warnings
  const validationWarnings = useMemo(() => {
    const warnings: string[] = [];
    
    // Check delivery date
    if (formValues.expectedDeliveryDate) {
      const deliveryDate = new Date(formValues.expectedDeliveryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (deliveryDate < today) {
        warnings.push("Delivery date is in the past");
      }
    }
    
    // Check order total
    if (grandTotal > 0 && grandTotal < 100000) {
      warnings.push("Order total is very small (< Rp 100.000)");
    }
    if (grandTotal > 100000000) {
      warnings.push("Order total is very large (> Rp 100.000.000) - may require manual review");
    }
    
    // Check item prices vs base price
    itemsVal.forEach((item, idx) => {
      const sku = skuList.find(s => s.id === item.skuId);
      if (sku?.basePrice && item.unitPrice > 0) {
        const diff = Math.abs(item.unitPrice - Number(sku.basePrice)) / Number(sku.basePrice);
        if (diff > 0.3) {
          warnings.push(`Item ${idx + 1}: Price differs ${Math.round(diff * 100)}% from base price`);
        }
      }
    });
    
    return warnings;
  }, [formValues.expectedDeliveryDate, grandTotal, itemsVal, skuList]);

  return (
    <div
      className="so-form"
      data-ai-context={JSON.stringify({
        section: "sales-order-form",
        mode: isEdit ? "edit" : "create",
        orderId: id ?? null,
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

        {/* Validation Warnings */}
        {validationWarnings.length > 0 && (
          <div className="so-validation-warnings">
            <div className="so-validation-warnings__header">
              <SOIcon name="alert" size={16} />
              <span>Validation Warnings</span>
            </div>
            <ul className="so-validation-warnings__list">
              {validationWarnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Outlet & Location */}
        <section className="so-card">
          <div className="so-card__header">
            <h2 className="so-card__title">
              <span className="so-card__icon"><IconUser /></span>
              Outlet &amp; Location
            </h2>
            <p className="so-card__hint">Select outlet to auto-fill customer and area</p>
          </div>
          <div className="so-card__body">
            <div className="so-section">
              {/* Document Number */}
              <form.Field name="documentNumber">
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">Document Number</label>
                    <input
                      className="so-field__input"
                      type="text"
                      value={f.state.value ?? ""}
                      onChange={(e) => f.handleChange(e.target.value)}
                      placeholder="Auto-generated if empty"
                    />
                  </div>
                )}
              </form.Field>

              {/* Outlet - shows customer name and area */}
              <form.Field
                name="outletId"
                validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}
              >
                {(f) => (
                  <SelectSearch
                    label="Outlet"
                    isRequired
                    isInvalid={Boolean(f.state.meta.errors[0])}
                    errorMessage={String(f.state.meta.errors[0] ?? "")}
                    value={f.state.value}
                    onChange={(v) => handleOutletChange(Array.isArray(v) ? v[0] ?? "" : v)}
                    sourceData={async () => outletList}
                    optionsKey="id"
                    queryKeyBase="outletSelect"
                    getOptionLabel={(o) => o.name}
                    getOptionDescription={(o) => `${o.customerName} • ${o.areaName}`}
                    placeholder="Select outlet…"
                    searchPlaceholder="Search outlets…"
                    isLoading={outletsLoading}
                  />
                )}
              </form.Field>

              {/* Order Date */}
              <form.Field name="date">
                {(f) => (
                  <DatePicker
                    label="Order date"
                    value={f.state.value ?? ""}
                    onChange={(v) => f.handleChange(v as string)}
                    placeholder="Select order date"
                  />
                )}
              </form.Field>

              {/* ETA */}
              <form.Field name="expectedDeliveryDate">
                {(f) => (
                  <DatePicker
                    label="ETA"
                    value={f.state.value ?? ""}
                    onChange={(v) => f.handleChange(v as string)}
                    placeholder="Select delivery date"
                    min={f.state.value || undefined}
                  />
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
                      onChange={(v) => handleItemChange(idx, "skuId", Array.isArray(v) ? v[0] ?? "" : v)}
                      sourceData={async () => skuList}
                      optionsKey="id"
                      queryKeyBase="skuSelect"
                      getOptionLabel={(o) => o.name}
                      getOptionDescription={(o) => o.code ?? undefined}
                      placeholder="Select SKU…"
                      searchPlaceholder="Search SKUs…"
                      isLoading={skusLoading}
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
                      className={`so-field__input ${autoDiscounts[idx] ? "so-field__input--auto" : ""}`}
                      type="number"
                      min={0}
                      value={String(item.discountPercent ?? "")}
                      onChange={(e) =>
                        handleItemChange(idx, "discountPercent", e.target.value ? Number(e.target.value) : null)
                      }
                      readOnly={Boolean(autoDiscounts[idx])}
                      title={
                        autoDiscounts[idx]
                          ? intl.formatMessage(
                              { id: "sales_order.form.discount_auto_filled", defaultMessage: "Auto-filled from {program}" },
                              { program: autoDiscounts[idx].programName },
                            )
                          : undefined
                      }
                    />
                    {autoDiscounts[idx] && (
                      <span className="so-item__auto-badge" title={`${autoDiscounts[idx].programName} - ${autoDiscounts[idx].discountPercent}%`}>
                        <SOIcon name="check" size={12} />
                        {intl.formatMessage({ id: "sales_order.form.discount_auto_filled_short", defaultMessage: "Auto" })}
                      </span>
                    )}
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
              <form.Subscribe
                selector={(s) => (s.values.items ?? []) as LineItem[]}
              >
                {(items) => {
                  const totals = recalcTotals(items);
                  return (
                    <div className="so-totals__card">
                      <p className="so-totals__label">Grand total</p>
                      <p className="so-totals__value">{formatCurrency(totals.grandTotal)}</p>
                    </div>
                  );
                }}
              </form.Subscribe>
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
          <ButtonGroup
            items={[
              {
                key: "draft",
                label: intl.formatMessage({ id: "sales_order.form.save_draft", defaultMessage: "Save as draft" }),
                icon: <SOIcon name="check" size={14} />,
                onClick: () => {
                  setPendingSaveMode("DRAFT");
                  setModalStage("draft-confirm");
                },
                disabled: createMutation.isPending || updateMutation.isPending,
                isLoading: createMutation.isPending || updateMutation.isPending,
                variant: "primary",
              },
              {
                key: "submit",
                label: intl.formatMessage({ id: "sales_order.form.propose", defaultMessage: "Propose" }),
                icon: <SOIcon name="propose" size={14} />,
                onClick: () => {
                  const form = document.querySelector(".so-form__shell") as HTMLFormElement | null;
                  form?.requestSubmit();
                },
                disabled: createMutation.isPending || updateMutation.isPending,
                isLoading: createMutation.isPending || updateMutation.isPending,
                variant: "warning",
              },
            ]}
          />
        </div>
      </form>

      {/* Result modal — rendered into a portal at the document root so
          position:fixed anchors to the viewport regardless of any
          ancestor's overflow or transform (the form lives inside a
          scrollable container). */}
      {modalStage !== "idle" && createPortal(
        <div
          className="so-modal__backdrop"
          onClick={() => modalStage !== "loading" && modalStage !== "propose-confirm" && modalStage !== "draft-confirm" && setModalStage("idle")}
        >
          <div
            className={`so-modal ${modalStage === "propose-confirm" || modalStage === "draft-confirm" ? "so-modal--choose" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            {modalStage === "draft-confirm" && (
              <>
                <div className="so-modal__header">
                  <h3>
                    {intl.formatMessage({
                      id: "sales_order.form.draft_title",
                      defaultMessage: "Save as draft",
                    })}
                  </h3>
                  <button
                    className="so-btn so-btn--ghost so-btn--sm"
                    onClick={() => setModalStage("idle")}
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
                <div className="so-modal__body">
                  <div className="so-modal__icon so-modal__icon--success">
                    <IconCheckCircle />
                  </div>
                  <h3 className="so-modal__title">
                    {intl.formatMessage({
                      id: "sales_order.form.draft_confirm",
                      defaultMessage: "Save this order as draft?",
                    })}
                  </h3>
                  <p className="so-modal__msg so-modal__msg--lead">
                    {intl.formatMessage({
                      id: "sales_order.form.draft_body",
                      defaultMessage:
                        "You can continue editing this order later. It will not be submitted for approval.",
                    })}
                  </p>
                </div>
                <div className="so-modal__footer">
                  <button
                    className="so-btn so-btn--ghost"
                    onClick={() => setModalStage("idle")}
                  >
                    {intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}
                  </button>
                  <button
                    className="so-btn so-btn--primary"
                    onClick={() => {
                      const values = form.state.values as FormValues;
                      runSave(values, "DRAFT");
                    }}
                  >
                    {intl.formatMessage({ id: "sales_order.form.save_draft", defaultMessage: "Save as draft" })}
                  </button>
                </div>
              </>
            )}
            {modalStage === "propose-confirm" && (
              <>
                <div className="so-modal__header">
                  <h3>
                    {intl.formatMessage({
                      id: "sales_order.form.propose_title",
                      defaultMessage: "Propose order",
                    })}
                  </h3>
                  <button
                    className="so-btn so-btn--ghost so-btn--sm"
                    onClick={() => setModalStage("idle")}
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
                <div className="so-modal__body">
                  <p className="so-modal__msg so-modal__msg--lead">
                    {intl.formatMessage({
                      id: "sales_order.form.propose_body",
                      defaultMessage:
                        "This will submit the order for AI validation. Add an optional message for the approval history.",
                    })}
                  </p>
                  <div style={{ width: "100%", marginTop: "1rem" }}>
                    <label className="so-field__label" htmlFor="propose-message">
                      {intl.formatMessage({
                        id: "sales_order.form.propose_message_label",
                        defaultMessage: "Message (optional)",
                      })}
                    </label>
                    <textarea
                      id="propose-message"
                      className="so-field__input so-field__textarea"
                      placeholder={intl.formatMessage({
                        id: "sales_order.form.propose_message_placeholder",
                        defaultMessage: "Add a note about this submission…",
                      })}
                      value={proposeMessage}
                      onChange={(e) => setProposeMessage(e.target.value)}
                      rows={4}
                    />
                  </div>
                </div>
                <div className="so-modal__footer">
                  <button
                    className="so-btn so-btn--ghost"
                    onClick={() => setModalStage("idle")}
                  >
                    {intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}
                  </button>
                  <button
                    className="so-btn so-btn--primary"
                    onClick={() => {
                      const values = form.state.values as FormValues;
                      runSave(values, "PROPOSED");
                    }}
                  >
                    {intl.formatMessage({ id: "sales_order.form.propose", defaultMessage: "Propose" })}
                  </button>
                </div>
              </>
            )}
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
        </div>,
        document.body,
      )}
    </div>
  );
};

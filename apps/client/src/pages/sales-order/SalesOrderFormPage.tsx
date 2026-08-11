/* eslint-disable react-refresh/only-export-components */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { useAtomValue } from "jotai";
import type { inferProcedureInput } from "@trpc/server";
import { AlertTriangle, Loader2, Plus, Save, Send, Sparkles, Trash2 } from "lucide-react";
import type { AppRouter } from "../../lib/trpc";
import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { DatePicker } from "../../components/DatePicker";
import { NavButtonGroup } from "../../components/NavButtonGroup";
import { PageHeader } from "../../components/PageHeader";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { FormSection } from "@/components/FormSection";
import { SelectSearch } from "../../components/SelectSearch";
import { useAiFillForm } from "../../components/AiAssistant/useAiFillForm";
import { AiFillButton } from '@/components/AiFillButton';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [searchParams] = useSearchParams();
  const visitLogId = searchParams.get("visitLogId");

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
          const formEl = document.querySelector("[data-so-form]") as HTMLFormElement | null;
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
    outletId: (v: unknown) => form.setFieldValue("outletId" as never, String(v) as never),
    currency: (v: unknown) => form.setFieldValue("currency" as never, String(v) as never),
    paymentTerms: (v: unknown) => form.setFieldValue("paymentTerms" as never, String(v) as never),
    expectedDeliveryDate: (v: unknown) => form.setFieldValue("expectedDeliveryDate" as never, String(v) as never),
    notes: (v: unknown) => form.setFieldValue("notes" as never, String(v) as never),
    items: (v: unknown) => {
      if (Array.isArray(v)) {
        form.setFieldValue("items" as never, v as never);
      }
    },
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
      <section
        className="flex flex-col gap-3 pt-1 pb-6"
        data-ai-context={JSON.stringify({ section: "sales-order-form", loading: true })}
      >
        <Skeleton className="h-12 w-full max-w-xl" />
        <Skeleton className="h-36 w-full" />
      </section>
    );
  }

  if (isEdit && !data) {
    return (
      <section
        className="flex flex-col gap-3 pt-1 pb-6"
        data-ai-context={JSON.stringify({ section: "sales-order-form", notFound: true })}
      >
        <NavButtonGroup className="self-end" onBack={() => navigate("/sales-order")} />
        <PageHeader
          module="order"
          title={intl.formatMessage({ id: "sales_order.form.not_found", defaultMessage: "Order not found." })}
        />
      </section>
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
    <section
      className="flex flex-col gap-3 pt-1 pb-6"
      data-ai-context={JSON.stringify({
        section: "sales-order-form",
        mode: isEdit ? "edit" : "create",
        orderId: id ?? null,
        availableSkus: skuList.map((s) => ({ id: s.id, name: s.name, basePrice: s.basePrice })),
      })}
    >
      <NavButtonGroup
        className="self-end"
        onBack={() =>
          navigate(isEdit && id ? `/sales-order/${id}` : "/sales-order")
        }
      />

      <PageHeader
          module="order"
          eyebrow={intl.formatMessage({ id: "nav.sales", defaultMessage: "Sales" })}
          title={
          isEdit
            ? intl.formatMessage({ id: "sales_order.form.title_edit", defaultMessage: "Edit sales order" })
            : intl.formatMessage({ id: "sales_order.form.title_create", defaultMessage: "Create sales order" })
        }
        description={
          isEdit
            ? intl.formatMessage({
                id: "sales_order.form.subtitle_edit",
                defaultMessage: "Update line items, totals, and customer information",
              })
            : intl.formatMessage({
                id: "sales_order.form.subtitle_create",
                defaultMessage: "Create a new sales order with line items and customer details",
              })
        }
      />

      <form
        data-so-form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        {/* Validation Warnings */}
        {validationWarnings.length > 0 ? (
          <div className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-warning">
              <AlertTriangle className="size-3.5" />
              Validation Warnings
            </div>
            <ul className="list-disc space-y-0.5 pl-4 text-xs text-warning">
              {validationWarnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Prefilled from visit log banner */}
        {visitLogId ? (
          <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Sparkles className="size-3.5" />
              {intl.formatMessage({
                id: "sales_order.form.prefilled_from_visit",
                defaultMessage: "Order prefilled from visit log",
              })}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {intl.formatMessage({
                id: "sales_order.form.prefilled_from_visit_hint",
                defaultMessage: "Review the extracted items below, then save or propose.",
              })}
            </p>
          </div>
        ) : null}

        <FormSection
          title="Outlet & Location"
          description="Select outlet to auto-fill customer and area"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <form.Field name="documentNumber">
              {(f) => (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium">Document Number</label>
                  <input
                    className="flex h-8 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs"
                    type="text"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    placeholder="Auto-generated if empty"
                  />
                </div>
              )}
            </form.Field>

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
        </FormSection>

        <FormSection
          title="Line items"
          action={
            <Button type="button" variant="outline" size="sm" className="h-7" onClick={handleAddItem}>
              <Plus className="size-3.5" />
              Add item
            </Button>
          }
        >
          <div className="space-y-2">
            <form.Subscribe selector={(s) => (s.values.items ?? []) as LineItem[]}>
              {(items) => (
                <>
                  {items.map((item, idx) => (
                    <div
                      className="grid gap-2 rounded-md border border-border/70 bg-card p-2 lg:grid-cols-[1.4fr_0.6fr_0.8fr_0.6fr_0.6fr_0.9fr_auto]"
                      key={idx}
                    >
                      <div>
                        {idx === 0 && (
                          <div className="mb-0.5 text-[11px] font-medium text-muted-foreground">
                            Product
                          </div>
                        )}
                        <SelectSearch
                          value={item.skuId}
                          onChange={(v) =>
                            handleItemChange(idx, "skuId", Array.isArray(v) ? v[0] ?? "" : v)
                          }
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
                        {idx === 0 && (
                          <div className="mb-0.5 text-[11px] font-medium text-muted-foreground">
                            Qty
                          </div>
                        )}
                        <input
                          className="flex h-8 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs"
                          type="number"
                          min={1}
                          value={String(item.quantity)}
                          onChange={(e) =>
                            handleItemChange(idx, "quantity", Number(e.target.value) || 1)
                          }
                        />
                      </div>
                      <div>
                        {idx === 0 && (
                          <div className="mb-0.5 text-[11px] font-medium text-muted-foreground">
                            Unit price
                          </div>
                        )}
                        <input
                          className="flex h-8 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs"
                          type="number"
                          min={0}
                          value={String(item.unitPrice)}
                          onChange={(e) =>
                            handleItemChange(idx, "unitPrice", Number(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div>
                        {idx === 0 && (
                          <div className="mb-0.5 text-[11px] font-medium text-muted-foreground">
                            Disc %
                          </div>
                        )}
                        <input
                          className={`flex h-8 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs ${autoDiscounts[idx] ? "bg-success/10" : ""}`}
                          type="number"
                          min={0}
                          value={String(item.discountPercent ?? "")}
                          onChange={(e) =>
                            handleItemChange(
                              idx,
                              "discountPercent",
                              e.target.value ? Number(e.target.value) : null,
                            )
                          }
                          readOnly={Boolean(autoDiscounts[idx])}
                          title={
                            autoDiscounts[idx]
                              ? intl.formatMessage(
                                  {
                                    id: "sales_order.form.discount_auto_filled",
                                    defaultMessage: "Auto-filled from {program}",
                                  },
                                  { program: autoDiscounts[idx].programName },
                                )
                              : undefined
                          }
                        />
                        {autoDiscounts[idx] ? (
                          <span
                            className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-success"
                            title={`${autoDiscounts[idx].programName} - ${autoDiscounts[idx].discountPercent}%`}
                          >
                            <span>✓</span>
                            {intl.formatMessage({
                              id: "sales_order.form.discount_auto_filled_short",
                              defaultMessage: "Auto",
                            })}
                          </span>
                        ) : null}
                      </div>
                      <div>
                        {idx === 0 && (
                          <div className="mb-0.5 text-[11px] font-medium text-muted-foreground">
                            Tax %
                          </div>
                        )}
                        <input
                          className="flex h-8 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs"
                          type="number"
                          min={0}
                          value={String(item.taxPercent ?? "")}
                          onChange={(e) =>
                            handleItemChange(
                              idx,
                              "taxPercent",
                              e.target.value ? Number(e.target.value) : null,
                            )
                          }
                        />
                      </div>
                      <div>
                        {idx === 0 && (
                          <div className="mb-0.5 text-[11px] font-medium text-muted-foreground">
                            Line total
                          </div>
                        )}
                        <div className="flex h-8 items-center rounded-md border border-input bg-card px-2.5 text-sm font-semibold tabular-nums">
                          {formatCurrency(item.lineTotal)}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="inline-flex size-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
                        aria-label="Remove item"
                        onClick={() => handleRemoveItem(idx)}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </form.Subscribe>
          </div>

          <div className="flex justify-end">
            <form.Subscribe selector={(s) => (s.values.items ?? []) as LineItem[]}>
              {(items) => {
                const totals = recalcTotals(items);
                return (
                  <div className="rounded-md border border-border/70 bg-card px-3 py-2 text-right">
                    <p className="text-[11px] text-muted-foreground">Grand total</p>
                    <p className="text-base font-semibold tabular-nums text-module-order">
                      {formatCurrency(totals.grandTotal)}
                    </p>
                  </div>
                );
              }}
            </form.Subscribe>
          </div>
        </FormSection>

        <FormSection title="Additional information">
          <div className="grid gap-3 sm:grid-cols-2">
            <form.Field name="paymentTerms">
              {(f) => (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium">Payment terms</label>
                  <input
                    className="flex h-8 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs"
                    placeholder="e.g. NET 30"
                    value={f.state.value}
                    onChange={(e) => f.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="notes">
              {(f) => (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium">Notes</label>
                  <textarea
                    className="flex min-h-16 w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm shadow-xs"
                    placeholder="Add order notes…"
                    value={f.state.value}
                    onChange={(e) => f.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>
          </div>
        </FormSection>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-3">
          <AiFillButton
            section="sales-order-form"
            context={{ isEdit, id: id ?? null, ...formValues }}
            options={{
              outletList: outletList.map((o) => ({ id: o.id, name: o.name })),
              skuList: skuList.map((s) => ({ id: s.id, name: s.name, code: s.code })),
              currencyList: ["IDR", "USD", "SGD", "MYR"].map((c) => ({ value: c })),
              paymentTermsList: ["COD", "NET 7", "NET 14", "NET 30", "NET 60"].map((t) => ({ value: t })),
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 px-2.5"
            onClick={() => {
              setPendingSaveMode("DRAFT");
              setModalStage("draft-confirm");
            }}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            <Save className="size-3.5" />
            {intl.formatMessage({ id: "sales_order.form.save_draft", defaultMessage: "Save as draft" })}
          </Button>
          <Button
            type="submit"
            size="sm"
            className="h-8 gap-1.5 px-2.5"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            <Send className="size-3.5" />
            {intl.formatMessage({ id: "sales_order.form.propose", defaultMessage: "Propose" })}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={modalStage === "draft-confirm"}
        onOpenChange={(open) => {
          if (!open) setModalStage("idle");
        }}
        title={intl.formatMessage({
          id: "sales_order.form.draft_title",
          defaultMessage: "Save as draft",
        })}
        description={intl.formatMessage({
          id: "sales_order.form.draft_body",
          defaultMessage:
            "You can continue editing this order later. It will not be submitted for approval.",
        })}
        confirmLabel={intl.formatMessage({
          id: "sales_order.form.save_draft",
          defaultMessage: "Save as draft",
        })}
        onConfirm={() => {
          const values = form.state.values as FormValues;
          runSave(values, "DRAFT");
        }}
      />

      <Dialog
        open={modalStage === "propose-confirm"}
        onOpenChange={(open) => {
          if (!open) setModalStage("idle");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {intl.formatMessage({
                id: "sales_order.form.propose_title",
                defaultMessage: "Propose order",
              })}
            </DialogTitle>
            <DialogDescription>
              {intl.formatMessage({
                id: "sales_order.form.propose_body",
                defaultMessage:
                  "This will submit the order for AI validation. Add an optional message for the approval history.",
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="propose-message">
              {intl.formatMessage({
                id: "sales_order.form.propose_message_label",
                defaultMessage: "Message (optional)",
              })}
            </Label>
            <Textarea
              id="propose-message"
              value={proposeMessage}
              onChange={(e) => setProposeMessage(e.target.value)}
              placeholder={intl.formatMessage({
                id: "sales_order.form.propose_message_placeholder",
                defaultMessage: "Add a note about this submission…",
              })}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModalStage("idle")}>
              {intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}
            </Button>
            <Button
              type="button"
              onClick={() => {
                const values = form.state.values as FormValues;
                runSave(values, "PROPOSED");
              }}
            >
              {intl.formatMessage({ id: "sales_order.form.propose", defaultMessage: "Propose" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={modalStage === "loading" || modalStage === "success" || modalStage === "error"}
        onOpenChange={(open) => {
          if (!open && modalStage !== "loading") setModalStage("idle");
        }}
      >
        <DialogContent showCloseButton={modalStage !== "loading"} className="sm:max-w-md">
          {modalStage === "loading" ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="size-8 animate-spin text-foreground" aria-hidden />
              <DialogDescription>Saving your order…</DialogDescription>
            </div>
          ) : null}
          {modalStage === "success" ? (
            <DialogHeader>
              <DialogTitle>Order saved</DialogTitle>
              <DialogDescription>{resultMessage}</DialogDescription>
            </DialogHeader>
          ) : null}
          {modalStage === "error" ? (
            <>
              <DialogHeader>
                <DialogTitle>Save failed</DialogTitle>
                <DialogDescription>{resultMessage}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" onClick={() => setModalStage("idle")}>
                  Close
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
};

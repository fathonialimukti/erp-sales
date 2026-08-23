import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { getFriendlyErrorMessage } from "../../lib/friendlyError";
import { hasPermissionAtom } from "../../lib/atoms";
import { PageHeader } from "../../components/PageHeader";
import { NavButtonGroup } from "../../components/NavButtonGroup";
import { FormSection } from "../../components/FormSection";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { AiFillButton } from '@/components/AiFillButton';
import { useAiFillForm } from "../../components/AiAssistant/useAiFillForm";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CreateEventProposalInput,
  UpdateEventProposalInput,
} from "@repo/schemas/event-proposal";

interface MiscItemRow {
  id?: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
  total: number;
  notes: string;
}

interface VendorPaymentRow {
  paymentDate: string;
  amount: number;
  method: string;
  reference: string;
  notes: string;
}

interface VendorRow {
  id?: string;
  vendorId: string;
  scope: string;
  amount: number;
  notes: string;
  payments: VendorPaymentRow[];
}

interface FormValues {
  name: string;
  eventTypeId: string;
  description: string;
  venue: string;
  eventDate: string;
  eventEndDate: string;
  organizerName: string;
  organizerContact: string;
  areaId: string;
  currency: string;
  budgetLineId: string;
  miscItems: MiscItemRow[];
  vendors: VendorRow[];
}

type ModalStage = "idle" | "confirm" | "loading" | "success" | "error";

const defaults = (): FormValues => ({
  name: "",
  eventTypeId: "",
  description: "",
  venue: "",
  eventDate: "",
  eventEndDate: "",
  organizerName: "",
  organizerContact: "",
  areaId: "",
  currency: "USD",
  budgetLineId: "",
  miscItems: [],
  vendors: [],
});

export const EventProposalFormPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canSave = hasPermission(id ? "eventProposal@update" : "eventProposal@create");

  const isEdit = Boolean(id);
  const [modalStage, setModalStage] = useState<ModalStage>("idle");
  const [resultMessage, setResultMessage] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["eventProposalDetail", id],
    enabled: isEdit && Boolean(id),
    queryFn: () => trpcClient.eventProposal.detail.query({ id: id ?? "" }),
  });

  const { data: areas } = useQuery({
    queryKey: ["areaOptions"],
    queryFn: () => trpcClient.area.list.query({ page: 1, limit: 100 }),
  });

  const { data: eventTypes } = useQuery({
    queryKey: ["eventTypeOptions"],
    queryFn: () => trpcClient.eventType.list.query({ page: 1, limit: 100 }),
  });

  const { data: vendors } = useQuery({
    queryKey: ["vendorOptions"],
    queryFn: () => trpcClient.vendor.list.query({ page: 1, limit: 100 }),
  });

  const form = useForm({
    defaultValues: (isEdit && data
      ? {
          name: data.name,
          eventTypeId: data.eventTypeId ?? "",
          description: data.description ?? "",
          venue: data.venue ?? "",
          eventDate: data.eventDate,
          eventEndDate: data.eventEndDate ?? "",
          organizerName: data.organizerName ?? "",
          organizerContact: data.organizerContact ?? "",
          areaId: data.areaId,
          currency: data.currency,
          budgetLineId: data.budgetLineId ?? "",
          miscItems: (data.miscItems ?? []).map((m) => ({ id: m.id, name: m.name, category: m.category ?? "", quantity: m.quantity, price: m.price, total: m.total, notes: m.notes ?? "" })),
          vendors: (data.vendors ?? []).map((v) => ({ id: v.id, vendorId: v.vendorId, scope: v.scope ?? "", amount: v.amount, notes: v.notes ?? "", payments: (v.payments ?? []).map((p) => ({ paymentDate: p.paymentDate, amount: p.amount, method: p.method ?? "", reference: p.reference ?? "", notes: p.notes ?? "" })) })),
        }
      : defaults()) as FormValues,
    onSubmit: async () => {
      setModalStage("confirm");
    },
  });

  useAiFillForm({
    name: (v: unknown) => form.setFieldValue("name" as never, String(v) as never),
    eventTypeId: (v: unknown) => form.setFieldValue("eventTypeId" as never, String(v) as never),
    description: (v: unknown) => form.setFieldValue("description" as never, String(v) as never),
    venue: (v: unknown) => form.setFieldValue("venue" as never, String(v) as never),
    eventDate: (v: unknown) => form.setFieldValue("eventDate" as never, String(v) as never),
    eventEndDate: (v: unknown) => form.setFieldValue("eventEndDate" as never, String(v) as never),
    organizerName: (v: unknown) => form.setFieldValue("organizerName" as never, String(v) as never),
    organizerContact: (v: unknown) => form.setFieldValue("organizerContact" as never, String(v) as never),
    areaId: (v: unknown) => form.setFieldValue("areaId" as never, String(v) as never),
    currency: (v: unknown) => form.setFieldValue("currency" as never, String(v) as never),
    budgetLineId: (v: unknown) => form.setFieldValue("budgetLineId" as never, String(v) as never),
    miscItems: (v: unknown) => {
      if (Array.isArray(v)) form.setFieldValue("miscItems" as never, v as never);
    },
    vendors: (v: unknown) => {
      if (Array.isArray(v)) form.setFieldValue("vendors" as never, v as never);
    },
  });

  const { data: budgetLines } = useQuery({
    queryKey: ["budgetLineOptions", form.state.values.areaId],
    enabled: Boolean(form.state.values.areaId),
    queryFn: () => trpcClient.budgetLine.list.query({ page: 1, limit: 100, areaId: form.state.values.areaId || undefined }),
  });

  // ponytail: keep original seed-via-defaultValues only (detail query gates render via isLoading)

  const createMutation = useMutation({
    mutationFn: (d: CreateEventProposalInput) => trpcClient.eventProposal.create.mutate(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventProposalList"] });
      setResultMessage(
        intl.formatMessage({
          id: "event_proposal.form.success.created",
          defaultMessage: "Region created",
        }),
      );
      setModalStage("success");
      setTimeout(() => navigate("/event-proposal"), 1200);
    },
    onError: (e) => {
      setResultMessage(getFriendlyErrorMessage(e, "Failed"));
      setModalStage("error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (d: UpdateEventProposalInput) => trpcClient.eventProposal.update.mutate(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventProposalList"] });
      queryClient.invalidateQueries({ queryKey: ["eventProposalDetail", id] });
      setResultMessage(
        intl.formatMessage({
          id: "event_proposal.form.success.updated",
          defaultMessage: "Region updated",
        }),
      );
      setModalStage("success");
      setTimeout(() => navigate(`/event-proposal/${id}`), 1200);
    },
    onError: (e) => {
      setResultMessage(getFriendlyErrorMessage(e, "Failed"));
      setModalStage("error");
    },
  });

  const runSave = () => {
    setModalStage("loading");
    const values = form.state.values as FormValues;
    const payload = {
      name: values.name,
      eventTypeId: values.eventTypeId || undefined,
      description: values.description || undefined,
      venue: values.venue || undefined,
      eventDate: values.eventDate,
      eventEndDate: values.eventEndDate || undefined,
      organizerName: values.organizerName || undefined,
      organizerContact: values.organizerContact || undefined,
      areaId: values.areaId,
      currency: values.currency,
      budgetLineId: values.budgetLineId || undefined,
      miscItems: values.miscItems,
      vendors: values.vendors,
    };
    if (isEdit && id) {
      updateMutation.mutate({ ...payload, currentId: id } as UpdateEventProposalInput);
    } else {
      createMutation.mutate(payload as CreateEventProposalInput);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (modalStage === "idle") form.handleSubmit();
      }
      if (e.key === "Escape" && modalStage !== "idle" && modalStage !== "loading") {
        setModalStage("idle");
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [form, modalStage]);

  if (isLoading) {
    return (
      <section
        className="flex flex-col gap-3 pt-1 pb-6"
        data-ai-context={JSON.stringify({ section: "event-proposal-form", loading: true })}
      >
        <Skeleton className="h-16 w-full max-w-xl" />
        <Skeleton className="h-48 w-full" />
      </section>
    );
  }

  return (
    <section
      className="flex flex-col gap-3 pt-1 pb-6"
      data-ai-context={JSON.stringify({
        section: "event-proposal-form",
        isEdit,
        id: id ?? null,
      })}
    >
      <NavButtonGroup
        className="self-end"
        onBack={() => navigate(isEdit && id ? `/event-proposal/${id}` : "/event-proposal")}
      />

      <PageHeader
          module="event"
          title={
            isEdit
              ? intl.formatMessage({
                  id: "event_proposal.form.title_edit",
                  defaultMessage: "Edit eventProposal",
                })
              : intl.formatMessage({
                  id: "event_proposal.form.title_create",
                  defaultMessage: "New eventProposal",
                })
          }
          description={
            isEdit
              ? intl.formatMessage({
                  id: "event_proposal.form.subtitle_edit",
                  defaultMessage: "Update eventProposal details",
                })
              : intl.formatMessage({
                  id: "event_proposal.form.subtitle_create",
                  defaultMessage: "Create a new geographical eventProposal",
                })
          }
        />

      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <AiFillButton
          section="event-proposal-form"
          context={{ isEdit, id: id ?? null }}
          options={{
            areaList: ((areas?.data ?? []) as { id: string; name: string }[]).map((a) => ({ id: a.id, name: a.name })),
            eventTypeList: ((eventTypes?.data ?? []) as { id: string; code: string; name: string }[]).map((et) => ({ id: et.id, code: et.code, name: et.name })),
            vendorList: ((vendors?.data ?? []) as { id: string; name: string }[]).map((vd) => ({ id: vd.id, name: vd.name })),
            budgetLineList: ((budgetLines?.data ?? []) as { id: string; budgetType: { name: string } | null; period: { name: string } | null; scope: string; summary: { remaining: number } | null }[]).map((bl) => ({ id: bl.id, budgetType: bl.budgetType, period: bl.period, scope: bl.scope, remaining: bl.summary?.remaining ?? 0 })),
            currencyList: ["IDR", "USD", "SGD", "MYR"].map((c) => ({ value: c })),
          }}
        />

        <FormSection
          title={intl.formatMessage({
            id: "event_proposal.form.section_basic",
            defaultMessage: "Basic information",
          })}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <form.Field
              name="name"
              validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}
            >
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ep-name">
                    {intl.formatMessage({
                      id: "event_proposal.form.field_name",
                      defaultMessage: "Event name",
                    })}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="ep-name"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    aria-invalid={f.state.meta.errors.length > 0}
                  />
                  {f.state.meta.errors.length > 0 ? (
                    <p className="text-xs text-destructive">{String(f.state.meta.errors[0])}</p>
                  ) : null}
                </div>
              )}
            </form.Field>

            <form.Field name="eventTypeId">
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ep-eventTypeId">
                    {intl.formatMessage({
                      id: "event_proposal.form.field_event_type",
                      defaultMessage: "Event type",
                    })}
                  </Label>
                  <Select
                    value={f.state.value ?? ""}
                    onValueChange={(value) => f.handleChange(value)}
                  >
                    <SelectTrigger
                      id="ep-eventTypeId"
                      size="default"
                      aria-label={intl.formatMessage({ id: "event_proposal.form.field_event_type", defaultMessage: "Event type" })}
                    >
                      <SelectValue placeholder="Select event type…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(eventTypes?.data ?? []).map((et) => (
                        <SelectItem key={et.id} value={et.id}>
                          {et.code} - {et.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            <form.Field name="description">
              {(f) => (
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="ep-description">
                    {intl.formatMessage({
                      id: "event_proposal.form.field_description",
                      defaultMessage: "Description",
                    })}
                  </Label>
                  <Textarea
                    id="ep-description"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="venue">
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ep-venue">
                    {intl.formatMessage({
                      id: "event_proposal.form.field_venue",
                      defaultMessage: "Venue",
                    })}
                  </Label>
                  <Input
                    id="ep-venue"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>

            <form.Field
              name="eventDate"
              validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}
            >
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ep-date">
                    {intl.formatMessage({
                      id: "event_proposal.form.field_event_date",
                      defaultMessage: "Event date",
                    })}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="ep-date"
                    type="date"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    aria-invalid={f.state.meta.errors.length > 0}
                  />
                  {f.state.meta.errors.length > 0 ? (
                    <p className="text-xs text-destructive">{String(f.state.meta.errors[0])}</p>
                  ) : null}
                </div>
              )}
            </form.Field>

            <form.Field name="eventEndDate">
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ep-end">
                    {intl.formatMessage({
                      id: "event_proposal.form.field_event_end_date",
                      defaultMessage: "Event end date",
                    })}
                  </Label>
                  <Input
                    id="ep-end"
                    type="date"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="organizerName">
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ep-org-name">
                    {intl.formatMessage({
                      id: "event_proposal.form.field_organizer_name",
                      defaultMessage: "Organizer name",
                    })}
                  </Label>
                  <Input
                    id="ep-org-name"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="organizerContact">
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ep-org-contact">
                    {intl.formatMessage({
                      id: "event_proposal.form.field_organizer_contact",
                      defaultMessage: "Organizer contact",
                    })}
                  </Label>
                  <Input
                    id="ep-org-contact"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>

            <form.Field
              name="areaId"
              validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}
            >
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ep-area">
                    {intl.formatMessage({
                      id: "event_proposal.form.field_area",
                      defaultMessage: "Area",
                    })}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={f.state.value ?? ""}
                    onValueChange={(value) => f.handleChange(value)}
                    aria-invalid={f.state.meta.errors.length > 0}
                  >
                    <SelectTrigger
                      id="ep-area"
                      size="default"
                      aria-label={intl.formatMessage({ id: "event_proposal.form.field_area", defaultMessage: "Area" })}
                    >
                      <SelectValue placeholder={intl.formatMessage({ id: "event_proposal.form.field_area_placeholder", defaultMessage: "Select area" })} />
                    </SelectTrigger>
                    <SelectContent>
                      {(areas?.data ?? []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {f.state.meta.errors.length > 0 ? (
                    <p className="text-xs text-destructive">{String(f.state.meta.errors[0])}</p>
                  ) : null}
                </div>
              )}
            </form.Field>

            <form.Field name="budgetLineId">
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ep-budgetLine">
                    Budget Line
                  </Label>
                  <Select
                    value={f.state.value ?? ""}
                    onValueChange={(value) => f.handleChange(value)}
                  >
                    <SelectTrigger
                      id="ep-budgetLine"
                      size="default"
                      aria-label="Budget Line"
                    >
                      <SelectValue placeholder="Select budget line…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(budgetLines?.data ?? []).map((bl) => (
                        <SelectItem key={bl.id} value={bl.id}>
                          {bl.budgetType?.name} / {bl.period?.name} / {bl.scope} / remaining {bl.summary?.remaining ?? 0}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            <form.Field name="currency">
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ep-currency">
                    {intl.formatMessage({
                      id: "event_proposal.form.field_currency",
                      defaultMessage: "Currency",
                    })}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="ep-currency"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>
          </div>
        </FormSection>

        {/* Misc Items */}
        <FormSection
          title="Miscellaneous Items"
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => {
                const current = (form.state.values as FormValues).miscItems ?? [];
                form.setFieldValue("miscItems" as never, [...current, { name: "", category: "", quantity: 1, price: 0, total: 0, notes: "" }] as never);
              }}
            >
              <Plus className="size-3.5" />
              Add item
            </Button>
          }
        >
          <form.Field name="miscItems">
            {(f) => {
              const items = (f.state.value ?? []) as MiscItemRow[];
              const updateItem = (idx: number, field: keyof MiscItemRow, val: string | number) => {
                const next = items.map((it, i) => {
                  if (i !== idx) return it;
                  const updated = { ...it, [field]: val };
                  if (field === "quantity" || field === "price") {
                    updated.total = (field === "quantity" ? Number(val) : it.quantity) * (field === "price" ? Number(val) : it.price);
                  }
                  return updated;
                });
                f.handleChange(next);
              };
              return (
                <div className="space-y-2">
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No miscellaneous items. Click "Add item" to add one.</p>
                  ) : null}
                  {items.map((item, idx) => (
                    <div key={idx} className="grid gap-2 rounded-md border border-border/70 bg-card p-2 lg:grid-cols-[1.2fr_0.8fr_0.5fr_0.6fr_0.7fr_auto]">
                      <div className="flex flex-col gap-1">
                        {idx === 0 && <span className="text-[11px] font-medium text-muted-foreground">Name</span>}
                        <Input value={item.name} onChange={(e) => updateItem(idx, "name", e.target.value)} placeholder="Item name" />
                      </div>
                      <div className="flex flex-col gap-1">
                        {idx === 0 && <span className="text-[11px] font-medium text-muted-foreground">Category</span>}
                        <Select value={item.category} onValueChange={(v) => updateItem(idx, "category", v)}>
                          <SelectTrigger size="default">
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RENT">Rent</SelectItem>
                            <SelectItem value="FOOD">Food</SelectItem>
                            <SelectItem value="MATERIAL">Material</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-1">
                        {idx === 0 && <span className="text-[11px] font-medium text-muted-foreground">Qty</span>}
                        <Input type="number" min={1} value={String(item.quantity)} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value) || 1)} />
                      </div>
                      <div className="flex flex-col gap-1">
                        {idx === 0 && <span className="text-[11px] font-medium text-muted-foreground">Price</span>}
                        <Input type="number" min={0} value={String(item.price)} onChange={(e) => updateItem(idx, "price", Number(e.target.value) || 0)} />
                      </div>
                      <div className="flex flex-col gap-1">
                        {idx === 0 && <span className="text-[11px] font-medium text-muted-foreground">Total</span>}
                        <div className="flex h-8 items-center rounded-md border border-input bg-card px-2.5 text-sm font-semibold tabular-nums">
                          {item.total}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="inline-flex size-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
                        aria-label="Remove item"
                        onClick={() => f.handleChange(items.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              );
            }}
          </form.Field>
        </FormSection>

        {/* Vendors */}
        <FormSection
          title="Vendors"
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => {
                const current = (form.state.values as FormValues).vendors ?? [];
                form.setFieldValue("vendors" as never, [...current, { vendorId: "", scope: "", amount: 0, notes: "", payments: [] }] as never);
              }}
            >
              <Plus className="size-3.5" />
              Add vendor
            </Button>
          }
        >
          <form.Field name="vendors">
            {(f) => {
              const vendorRows = (f.state.value ?? []) as VendorRow[];
              const updateVendor = (idx: number, field: keyof VendorRow, val: unknown) => {
                const next = vendorRows.map((v, i) => (i === idx ? { ...v, [field]: val } : v));
                f.handleChange(next);
              };
              const updatePayment = (vIdx: number, pIdx: number, field: keyof VendorPaymentRow, val: string | number) => {
                const next = vendorRows.map((v, i) => {
                  if (i !== vIdx) return v;
                  const payments = v.payments.map((p, j) => (j === pIdx ? { ...p, [field]: val } : p));
                  return { ...v, payments };
                });
                f.handleChange(next);
              };
              const addPayment = (vIdx: number) => {
                const next = vendorRows.map((v, i) => {
                  if (i !== vIdx) return v;
                  return { ...v, payments: [...v.payments, { paymentDate: "", amount: 0, method: "", reference: "", notes: "" }] };
                });
                f.handleChange(next);
              };
              const removePayment = (vIdx: number, pIdx: number) => {
                const next = vendorRows.map((v, i) => {
                  if (i !== vIdx) return v;
                  return { ...v, payments: v.payments.filter((_, j) => j !== pIdx) };
                });
                f.handleChange(next);
              };
              return (
                <div className="space-y-3">
                  {vendorRows.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No vendors. Click "Add vendor" to add one.</p>
                  ) : null}
                  {vendorRows.map((vendor, vIdx) => (
                    <div key={vIdx} className="rounded-md border border-border/70 bg-card p-3">
                      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_0.7fr_auto]">
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] font-medium text-muted-foreground">Vendor</span>
                          <Select value={vendor.vendorId} onValueChange={(v) => updateVendor(vIdx, "vendorId", v)}>
                            <SelectTrigger size="default">
                              <SelectValue placeholder="Select vendor…" />
                            </SelectTrigger>
                            <SelectContent>
                              {(vendors?.data ?? []).map((vd) => (
                                <SelectItem key={vd.id} value={vd.id}>{vd.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] font-medium text-muted-foreground">Scope</span>
                          <Input value={vendor.scope} onChange={(e) => updateVendor(vIdx, "scope", e.target.value)} placeholder="Scope…" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] font-medium text-muted-foreground">Amount</span>
                          <Input type="number" min={0} value={String(vendor.amount)} onChange={(e) => updateVendor(vIdx, "amount", Number(e.target.value) || 0)} />
                        </div>
                        <button
                          type="button"
                          className="inline-flex size-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
                          aria-label="Remove vendor"
                          onClick={() => f.handleChange(vendorRows.filter((_, i) => i !== vIdx))}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                      <div className="mt-2 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-muted-foreground">Payments</span>
                          <Button type="button" variant="outline" size="sm" className="h-6 gap-1 px-2" onClick={() => addPayment(vIdx)}>
                            <Plus className="size-3" />
                            Add payment
                          </Button>
                        </div>
                        {vendor.payments.map((payment, pIdx) => (
                          <div key={pIdx} className="grid grid-cols-[1fr_0.8fr_0.8fr_0.8fr_auto] items-end gap-2 rounded border border-border/50 bg-muted/30 p-1.5">
                            <div className="flex flex-col gap-0.5">
                              {pIdx === 0 && <span className="text-[10px] font-medium text-muted-foreground">Date</span>}
                              <Input type="date" value={payment.paymentDate} onChange={(e) => updatePayment(vIdx, pIdx, "paymentDate", e.target.value)} />
                            </div>
                            <div className="flex flex-col gap-0.5">
                              {pIdx === 0 && <span className="text-[10px] font-medium text-muted-foreground">Amount</span>}
                              <Input type="number" min={0} value={String(payment.amount)} onChange={(e) => updatePayment(vIdx, pIdx, "amount", Number(e.target.value) || 0)} />
                            </div>
                            <div className="flex flex-col gap-0.5">
                              {pIdx === 0 && <span className="text-[10px] font-medium text-muted-foreground">Method</span>}
                              <Input value={payment.method} onChange={(e) => updatePayment(vIdx, pIdx, "method", e.target.value)} placeholder="Method" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                              {pIdx === 0 && <span className="text-[10px] font-medium text-muted-foreground">Reference</span>}
                              <Input value={payment.reference} onChange={(e) => updatePayment(vIdx, pIdx, "reference", e.target.value)} placeholder="Reference" />
                            </div>
                            <button
                              type="button"
                              className="inline-flex size-7 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
                              aria-label="Remove payment"
                              onClick={() => removePayment(vIdx, pIdx)}
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            }}
          </form.Field>
        </FormSection>
      
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-3">
          <Button
            size="sm"
            className="h-8 gap-1.5 px-2.5"
            type="submit"
              disabled={!canSave || createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Save className="size-3.5" aria-hidden />
              )}
              {intl.formatMessage({
                id: "event_proposal.form.save_button",
                defaultMessage: "Save",
              })}
            </Button>
        </div>
</form>

      <ConfirmDialog
        open={modalStage === "confirm"}
        onOpenChange={(open) => {
          if (!open) setModalStage("idle");
        }}
        title={intl.formatMessage({
          id: "event_proposal.form.modal.confirm_title",
          defaultMessage: "Confirm save",
        })}
        description={intl.formatMessage({
          id: "event_proposal.form.modal.confirm_body",
          defaultMessage: "Save changes to this eventProposal?",
        })}
        confirmLabel={intl.formatMessage({
          id: "common.action.confirm",
          defaultMessage: "Confirm",
        })}
        onConfirm={runSave}
      />

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
              <DialogDescription>
                {intl.formatMessage({ id: "common.loading", defaultMessage: "Saving…" })}
              </DialogDescription>
            </div>
          ) : null}
          {modalStage === "success" ? (
            <DialogHeader>
              <DialogTitle>
                {intl.formatMessage({
                  id: "event_proposal.form.modal.success",
                  defaultMessage: "Success!",
                })}
              </DialogTitle>
              <DialogDescription>{resultMessage}</DialogDescription>
            </DialogHeader>
          ) : null}
          {modalStage === "error" ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {intl.formatMessage({
                    id: "event_proposal.form.modal.error_title",
                    defaultMessage: "Error",
                  })}
                </DialogTitle>
                <DialogDescription>{resultMessage}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setModalStage("idle")}>
                  {intl.formatMessage({ id: "common.action.close", defaultMessage: "Close" })}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
};

import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { PageHeader } from "../../components/PageHeader";
import { NavButtonGroup } from "../../components/NavButtonGroup";
import { FormSection } from "../../components/FormSection";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { SelectSearch } from "../../components/SelectSearch";
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

interface OutletRow {
  outletId: string;
  explanation: string;
  cost: number;
}

interface FormValues {
  name: string;
  actionTypeId: string;
  description: string;
  startDate: string;
  endDate: string;
  budgetCurrency: string;
  areaId: string;
  picId: string;
  outlets: OutletRow[];
  budgetLineId: string;
}

type ModalStage = "idle" | "confirm" | "loading" | "success" | "error";

const defaults = (): FormValues => ({
  name: "",
  actionTypeId: "",
  description: "",
  startDate: "",
  endDate: "",
  budgetCurrency: "USD",
  areaId: "",
  picId: "",
  outlets: [{ outletId: "", explanation: "", cost: 0 }],
  budgetLineId: "",
});

export const ActionProgramFormPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canSave = hasPermission(id ? "actionProgram@update" : "actionProgram@create");

  const isEdit = Boolean(id);
  const [modalStage, setModalStage] = useState<ModalStage>("idle");
  const [resultMessage, setResultMessage] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["actionProgramDetail", id],
    enabled: isEdit && Boolean(id),
    queryFn: () => trpcClient.actionProgram.detail.query({ id: id ?? "" }),
  });

  const { data: areas } = useQuery({
    queryKey: ["areaOptions"],
    queryFn: () => trpcClient.area.list.query({ page: 1, limit: 100 }),
  });

  const { data: users } = useQuery({
    queryKey: ["userOptions"],
    queryFn: () => trpcClient.user.list.query({ page: 1, limit: 100 }),
  });

  const { data: outlets, isLoading: outletsLoading } = useQuery({
    queryKey: ["outletOptions"],
    queryFn: () => trpcClient.outlet.list.query({ page: 1, limit: 100 }),
  });

  const { data: actionTypes } = useQuery({
    queryKey: ["actionTypeOptions"],
    queryFn: () => trpcClient.actionType.list.query({ page: 1, limit: 100 }),
  });

  const form = useForm({
    defaultValues: (isEdit && data
      ? {
          name: data.name,
          actionTypeId: data.actionTypeId ?? "",
          description: data.description ?? "",
          startDate: data.startDate,
          endDate: data.endDate,
          budgetCurrency: data.budgetCurrency,
          areaId: data.areaId,
          picId: data.picId,
          outlets: data.outlets?.map((o) => ({ outletId: o.outletId, explanation: o.explanation ?? "", cost: o.cost ?? 0 })) ?? [{ outletId: "", explanation: "", cost: 0 }],
          budgetLineId: data.budgetLineId ?? "",
        }
      : defaults()) as FormValues,
    onSubmit: async () => {
      setModalStage("confirm");
    },
  });

  useAiFillForm({
    name: (v: unknown) => form.setFieldValue("name" as never, String(v) as never),
    actionTypeId: (v: unknown) => form.setFieldValue("actionTypeId" as never, String(v) as never),
    description: (v: unknown) => form.setFieldValue("description" as never, String(v) as never),
    startDate: (v: unknown) => form.setFieldValue("startDate" as never, String(v) as never),
    endDate: (v: unknown) => form.setFieldValue("endDate" as never, String(v) as never),
    budgetCurrency: (v: unknown) => form.setFieldValue("budgetCurrency" as never, String(v) as never),
    areaId: (v: unknown) => form.setFieldValue("areaId" as never, String(v) as never),
    picId: (v: unknown) => form.setFieldValue("picId" as never, String(v) as never),
    outlets: (v: unknown) => {
      if (Array.isArray(v)) form.setFieldValue("outlets" as never, v as never);
    },
    budgetLineId: (v: unknown) => form.setFieldValue("budgetLineId" as never, String(v) as never),
  });

  const { data: budgetLines } = useQuery({
    queryKey: ["budgetLineOptions", form.state.values.areaId],
    enabled: Boolean(form.state.values.areaId),
    queryFn: () => trpcClient.budgetLine.list.query({ page: 1, limit: 100, areaId: form.state.values.areaId || undefined }),
  });

  // ponytail: keep original seed-via-defaultValues only (detail query gates render via isLoading)

  const createMutation = useMutation({
    mutationFn: (d: FormValues) => trpcClient.actionProgram.create.mutate({
      name: d.name,
      actionTypeId: d.actionTypeId,
      description: d.description || undefined,
      startDate: d.startDate,
      endDate: d.endDate,
      budgetCurrency: d.budgetCurrency,
      areaId: d.areaId,
      picId: d.picId,
      outlets: d.outlets,
      budgetLineId: d.budgetLineId || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["actionProgramList"] });
      setResultMessage(
        intl.formatMessage({
          id: "action_program.form.success.created",
          defaultMessage: "Region created",
        }),
      );
      setModalStage("success");
      setTimeout(() => navigate("/action-program"), 1200);
    },
    onError: (e) => {
      setResultMessage(e instanceof Error ? e.message : "Failed");
      setModalStage("error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (d: FormValues & { currentId: string }) =>
      trpcClient.actionProgram.update.mutate({
        currentId: d.currentId,
        name: d.name,
        actionTypeId: d.actionTypeId,
        description: d.description || undefined,
        startDate: d.startDate,
        endDate: d.endDate,
        budgetCurrency: d.budgetCurrency,
        areaId: d.areaId,
        picId: d.picId,
        outlets: d.outlets,
        budgetLineId: d.budgetLineId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["actionProgramList"] });
      queryClient.invalidateQueries({ queryKey: ["actionProgramDetail", id] });
      setResultMessage(
        intl.formatMessage({
          id: "action_program.form.success.updated",
          defaultMessage: "Region updated",
        }),
      );
      setModalStage("success");
      setTimeout(() => navigate(`/action-program/${id}`), 1200);
    },
    onError: (e) => {
      setResultMessage(e instanceof Error ? e.message : "Failed");
      setModalStage("error");
    },
  });

  const runSave = () => {
    setModalStage("loading");
    const values = form.state.values as FormValues;
    if (isEdit && id) {
      updateMutation.mutate({ ...values, currentId: id });
    } else {
      createMutation.mutate(values);
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
        data-ai-context={JSON.stringify({ section: "action-program-form", loading: true })}
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
        section: "action-program-form",
        isEdit,
        id: id ?? null,
      })}
    >
      <NavButtonGroup
        className="self-end"
        onBack={() => navigate(isEdit && id ? `/action-program/${id}` : "/action-program")}
      />

      <PageHeader
          module="planning"
          title={
            isEdit
              ? intl.formatMessage({
                  id: "action_program.form.title_edit",
                  defaultMessage: "Edit actionProgram",
                })
              : intl.formatMessage({
                  id: "action_program.form.title_create",
                  defaultMessage: "New actionProgram",
                })
          }
          description={
            isEdit
              ? intl.formatMessage({
                  id: "action_program.form.subtitle_edit",
                  defaultMessage: "Update actionProgram details",
                })
              : intl.formatMessage({
                  id: "action_program.form.subtitle_create",
                  defaultMessage: "Create a new geographical actionProgram",
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
          section="action-program-form"
          context={{ isEdit, id: id ?? null }}
          options={{
            areaList: ((areas?.data ?? []) as { id: string; name: string }[]).map((a) => ({ id: a.id, name: a.name })),
            picList: ((users?.data ?? []) as { id: string; name: string | null }[]).map((u) => ({ id: u.id, name: u.name ?? "" })),
            outletList: ((outlets?.data ?? []) as { id: string; name: string }[]).map((o) => ({ id: o.id, name: o.name })),
            actionTypeList: ((actionTypes?.data ?? []) as { id: string; code: string; name: string }[]).map((at) => ({ id: at.id, code: at.code, name: at.name })),
            budgetLineList: ((budgetLines?.data ?? []) as { id: string; budgetType: { name: string } | null; period: { name: string } | null; scope: string; summary: { remaining: number } | null }[]).map((bl) => ({ id: bl.id, budgetType: bl.budgetType, period: bl.period, scope: bl.scope, remaining: bl.summary?.remaining ?? 0 })),
            currencyList: ["IDR", "USD", "SGD", "MYR"].map((c) => ({ value: c })),
          }}
        />

        <FormSection
          title={intl.formatMessage({
            id: "action_program.form.section_basic",
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
                  <Label htmlFor="ap-name">
                    {intl.formatMessage({
                      id: "action_program.form.field_name",
                      defaultMessage: "Program name",
                    })}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="ap-name"
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

            <form.Field
              name="actionTypeId"
              validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}
            >
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ap-actionTypeId">
                    {intl.formatMessage({
                      id: "action_program.form.field_type",
                      defaultMessage: "Type",
                    })}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={f.state.value ?? ""}
                    onValueChange={(value) => f.handleChange(value)}
                    aria-invalid={f.state.meta.errors.length > 0}
                  >
                    <SelectTrigger
                      id="ap-actionTypeId"
                      size="default"
                      aria-label={intl.formatMessage({ id: "action_program.form.field_type", defaultMessage: "Type" })}
                    >
                      <SelectValue placeholder={intl.formatMessage({ id: "action_program.form.field_type_placeholder", defaultMessage: "Select action type" })} />
                    </SelectTrigger>
                    <SelectContent>
                      {(actionTypes?.data ?? []).map((at) => (
                        <SelectItem key={at.id} value={at.id}>
                          {at.code} - {at.name}
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

            <form.Field name="description">
              {(f) => (
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="ap-description">
                    {intl.formatMessage({
                      id: "action_program.form.field_description",
                      defaultMessage: "Description",
                    })}
                  </Label>
                  <Textarea
                    id="ap-description"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>

            <form.Field
              name="startDate"
              validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}
            >
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ap-start">
                    {intl.formatMessage({
                      id: "action_program.form.field_start_date",
                      defaultMessage: "Start date",
                    })}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="ap-start"
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

            <form.Field
              name="endDate"
              validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}
            >
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ap-end">
                    {intl.formatMessage({
                      id: "action_program.form.field_end_date",
                      defaultMessage: "End date",
                    })}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="ap-end"
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

            <form.Field name="budgetCurrency">
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ap-currency">
                    {intl.formatMessage({
                      id: "action_program.form.field_currency",
                      defaultMessage: "Currency",
                    })}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="ap-currency"
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
                  <Label htmlFor="ap-area">
                    {intl.formatMessage({
                      id: "action_program.form.field_area",
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
                      id="ap-area"
                      size="default"
                      aria-label={intl.formatMessage({ id: "action_program.form.field_area", defaultMessage: "Area" })}
                    >
                      <SelectValue placeholder={intl.formatMessage({ id: "action_program.form.field_area_placeholder", defaultMessage: "Select area" })} />
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

            <form.Field
              name="picId"
              validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}
            >
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ap-pic">
                    {intl.formatMessage({
                      id: "action_program.form.field_pic",
                      defaultMessage: "PIC",
                    })}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={f.state.value ?? ""}
                    onValueChange={(value) => f.handleChange(value)}
                    aria-invalid={f.state.meta.errors.length > 0}
                  >
                    <SelectTrigger
                      id="ap-pic"
                      size="default"
                      aria-label={intl.formatMessage({ id: "action_program.form.field_pic", defaultMessage: "PIC" })}
                    >
                      <SelectValue placeholder={intl.formatMessage({ id: "action_program.form.field_pic_placeholder", defaultMessage: "Select PIC" })} />
                    </SelectTrigger>
                    <SelectContent>
                      {(users?.data ?? []).map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
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

            <form.Field
              name="outlets"
              validators={{
                onChange: ({ value }) => (value.length === 0 ? "Required" : undefined),
              }}
            >
              {(f) => {
                const rows = (f.state.value ?? []) as OutletRow[];
                const updateRow = (idx: number, field: keyof OutletRow, val: string | number) => {
                  const next = rows.map((r, i) => (i === idx ? { ...r, [field]: val } : r));
                  f.handleChange(next);
                };
                const addRow = () => f.handleChange([...rows, { outletId: "", explanation: "", cost: 0 }]);
                const removeRow = (idx: number) => {
                  const next = rows.filter((_, i) => i !== idx);
                  f.handleChange(next.length > 0 ? next : [{ outletId: "", explanation: "", cost: 0 }]);
                };
                return (
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label>
                      Outlets
                      <span className="text-destructive">*</span>
                    </Label>
                    <div className="space-y-2">
                      {rows.map((row, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_1fr_0.7fr_auto] items-end gap-2 rounded-md border border-border/70 bg-card p-2">
                          <div className="flex flex-col gap-1">
                            {idx === 0 && <span className="text-[11px] font-medium text-muted-foreground">Outlet</span>}
                            <Select
                              value={row.outletId}
                              onValueChange={(v) => updateRow(idx, "outletId", v)}
                            >
                              <SelectTrigger size="default">
                                <SelectValue placeholder="Select outlet…" />
                              </SelectTrigger>
                              <SelectContent>
                                {(outlets?.data ?? []).map((o) => (
                                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-col gap-1">
                            {idx === 0 && <span className="text-[11px] font-medium text-muted-foreground">Explanation</span>}
                            <Input
                              value={row.explanation}
                              onChange={(e) => updateRow(idx, "explanation", e.target.value)}
                              placeholder="Explanation…"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            {idx === 0 && <span className="text-[11px] font-medium text-muted-foreground">Cost</span>}
                            <Input
                              type="number"
                              min={0}
                              value={String(row.cost)}
                              onChange={(e) => updateRow(idx, "cost", Number(e.target.value) || 0)}
                            />
                          </div>
                          <button
                            type="button"
                            className="inline-flex size-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
                            aria-label="Remove outlet"
                            onClick={() => removeRow(idx)}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <Button type="button" variant="outline" size="sm" className="h-7 w-fit gap-1" onClick={addRow}>
                      <Plus className="size-3.5" />
                      Add outlet
                    </Button>
                    {f.state.meta.errors.length > 0 ? (
                      <p className="text-xs text-destructive">{String(f.state.meta.errors[0])}</p>
                    ) : null}
                  </div>
                );
              }}
            </form.Field>

            <form.Field name="budgetLineId">
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ap-budgetLine">
                    Budget Line
                  </Label>
                  <Select
                    value={f.state.value ?? ""}
                    onValueChange={(value) => f.handleChange(value)}
                  >
                    <SelectTrigger
                      id="ap-budgetLine"
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
          </div>
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
                id: "action_program.form.save_button",
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
          id: "action_program.form.modal.confirm_title",
          defaultMessage: "Confirm save",
        })}
        description={intl.formatMessage({
          id: "action_program.form.modal.confirm_body",
          defaultMessage: "Save changes to this actionProgram?",
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
                  id: "action_program.form.modal.success",
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
                    id: "action_program.form.modal.error_title",
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

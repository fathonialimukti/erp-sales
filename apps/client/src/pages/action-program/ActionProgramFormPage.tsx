import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { Loader2, Save } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { PageHeader } from "../../components/PageHeader";
import { NavButtonGroup } from "../../components/NavButtonGroup";
import { FormSection } from "../../components/FormSection";
import { ConfirmDialog } from "../../components/ConfirmDialog";
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

interface FormValues {
  name: string;
  type: string;
  description: string;
  startDate: string;
  endDate: string;
  budgetCurrency: string;
  areaId: string;
  picId: string;
  outletIds: string[];
}

type ModalStage = "idle" | "confirm" | "loading" | "success" | "error";

const defaults = (): FormValues => ({
  name: "",
  type: "",
  description: "",
  startDate: "",
  endDate: "",
  budgetCurrency: "IDR",
  areaId: "",
  picId: "",
  outletIds: [],
});

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

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

  const { data: outlets } = useQuery({
    queryKey: ["outletOptions"],
    queryFn: () => trpcClient.outlet.list.query({ page: 1, limit: 100 }),
  });

  const form = useForm({
    defaultValues: (isEdit && data
      ? {
          name: data.name,
          type: data.type,
          description: data.description ?? "",
          startDate: data.startDate,
          endDate: data.endDate,
          budgetCurrency: data.budgetCurrency,
          areaId: data.areaId,
          picId: data.picId,
          outletIds: data.outlets?.map((o) => o.outletId) ?? [],
        }
      : defaults()) as FormValues,
    onSubmit: async () => {
      setModalStage("confirm");
    },
  });

  // ponytail: keep original seed-via-defaultValues only (detail query gates render via isLoading)

  const createMutation = useMutation({
    mutationFn: (d: FormValues) => trpcClient.actionProgram.create.mutate(d),
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
      trpcClient.actionProgram.update.mutate(d),
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
              name="type"
              validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}
            >
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ap-type">
                    {intl.formatMessage({
                      id: "action_program.form.field_type",
                      defaultMessage: "Type",
                    })}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="ap-type"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    placeholder={intl.formatMessage({
                      id: "action_program.form.field_type_placeholder",
                      defaultMessage: "e.g. PROMO",
                    })}
                    aria-invalid={f.state.meta.errors.length > 0}
                  />
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
                  <select
                    id="ap-area"
                    className={selectClass}
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    aria-invalid={f.state.meta.errors.length > 0}
                  >
                    <option value="">
                      {intl.formatMessage({
                        id: "action_program.form.field_area_placeholder",
                        defaultMessage: "Select area",
                      })}
                    </option>
                    {(areas?.data ?? []).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
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
                  <select
                    id="ap-pic"
                    className={selectClass}
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    aria-invalid={f.state.meta.errors.length > 0}
                  >
                    <option value="">
                      {intl.formatMessage({
                        id: "action_program.form.field_pic_placeholder",
                        defaultMessage: "Select PIC",
                      })}
                    </option>
                    {(users?.data ?? []).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                  {f.state.meta.errors.length > 0 ? (
                    <p className="text-xs text-destructive">{String(f.state.meta.errors[0])}</p>
                  ) : null}
                </div>
              )}
            </form.Field>

            <form.Field
              name="outletIds"
              validators={{
                onChange: ({ value }) => (value.length === 0 ? "Required" : undefined),
              }}
            >
              {(f) => (
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="ap-outlets">
                    {intl.formatMessage({
                      id: "action_program.form.field_outlets",
                      defaultMessage: "Outlets",
                    })}
                    <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="ap-outlets"
                    className={`${selectClass} min-h-28 py-2`}
                    multiple
                    value={f.state.value ?? []}
                    onChange={(e) =>
                      f.handleChange(Array.from(e.target.selectedOptions).map((o) => o.value))
                    }
                    aria-invalid={f.state.meta.errors.length > 0}
                  >
                    {(outlets?.data ?? []).map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                  {f.state.meta.errors.length > 0 ? (
                    <p className="text-xs text-destructive">{String(f.state.meta.errors[0])}</p>
                  ) : null}
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
              <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
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

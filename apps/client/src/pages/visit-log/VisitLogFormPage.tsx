import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { Loader2, Save } from "lucide-react";

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

interface FormValues {
  salesmanId: string;
  outletId: string;
  date: string;
  purpose: string;
  notes: string;
}

type ModalStage = "idle" | "confirm" | "loading" | "success" | "error";

const defaults = (): FormValues => ({
  salesmanId: "",
  outletId: "",
  date: "",
  purpose: "",
  notes: "",
});

export const VisitLogFormPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canSave = hasPermission(id ? "visitLog@update" : "visitLog@create");

  const isEdit = Boolean(id);
  const [modalStage, setModalStage] = useState<ModalStage>("idle");
  const [resultMessage, setResultMessage] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["visitLogDetail", id],
    enabled: isEdit && Boolean(id),
    queryFn: () => trpcClient.visitLog.detail.query({ id: id ?? "" }),
  });

  const { data: salesmen } = useQuery({
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
          salesmanId: data.salesmanId,
          outletId: data.outletId,
          date: data.date,
          purpose: data.purpose ?? "",
          notes: data.notes ?? "",
        }
      : defaults()) as FormValues,
    onSubmit: async () => {
      setModalStage("confirm");
    },
  });

  useAiFillForm({
    salesmanId: (v: unknown) => form.setFieldValue("salesmanId" as never, String(v) as never),
    outletId: (v: unknown) => form.setFieldValue("outletId" as never, String(v) as never),
    date: (v: unknown) => form.setFieldValue("date" as never, String(v) as never),
    purpose: (v: unknown) => form.setFieldValue("purpose" as never, String(v) as never),
    notes: (v: unknown) => form.setFieldValue("notes" as never, String(v) as never),
  });

  // ponytail: keep original seed-via-defaultValues only (detail query gates render via isLoading)

  const createMutation = useMutation({
    mutationFn: (d: FormValues) => trpcClient.visitLog.create.mutate(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitLogList"] });
      setResultMessage(
        intl.formatMessage({
          id: "visit_log.form.success.created",
          defaultMessage: "Region created",
        }),
      );
      setModalStage("success");
      setTimeout(() => navigate("/visit-log"), 1200);
    },
    onError: (e) => {
      setResultMessage(getFriendlyErrorMessage(e, "Failed"));
      setModalStage("error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (d: FormValues & { currentId: string }) => trpcClient.visitLog.update.mutate(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitLogList"] });
      queryClient.invalidateQueries({ queryKey: ["visitLogDetail", id] });
      setResultMessage(
        intl.formatMessage({
          id: "visit_log.form.success.updated",
          defaultMessage: "Region updated",
        }),
      );
      setModalStage("success");
      setTimeout(() => navigate(`/visit-log/${id}`), 1200);
    },
    onError: (e) => {
      setResultMessage(getFriendlyErrorMessage(e, "Failed"));
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
        data-ai-context={JSON.stringify({ section: "visit-log-form", loading: true })}
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
        section: "visit-log-form",
        isEdit,
        id: id ?? null,
      })}
    >
      <NavButtonGroup
        className="self-end"
        onBack={() => navigate(isEdit && id ? `/visit-log/${id}` : "/visit-log")}
      />

      <PageHeader
          module="visit"
          title={
            isEdit
              ? intl.formatMessage({
                  id: "visit_log.form.title_edit",
                  defaultMessage: "Edit visitLog",
                })
              : intl.formatMessage({
                  id: "visit_log.form.title_create",
                  defaultMessage: "New visitLog",
                })
          }
          description={
            isEdit
              ? intl.formatMessage({
                  id: "visit_log.form.subtitle_edit",
                  defaultMessage: "Update visitLog details",
                })
              : intl.formatMessage({
                  id: "visit_log.form.subtitle_create",
                  defaultMessage: "Create a new geographical visitLog",
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
          section="visit-log-form"
          context={{ isEdit, id: id ?? null }}
          options={{
            salesmanList: ((salesmen?.data ?? []) as { id: string; name: string | null }[]).map((u) => ({ id: u.id, name: u.name ?? "" })),
            outletList: ((outlets?.data ?? []) as { id: string; name: string }[]).map((o) => ({ id: o.id, name: o.name })),
          }}
        />

        <FormSection
          title={intl.formatMessage({
            id: "visit_log.form.section_basic",
            defaultMessage: "Basic information",
          })}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <form.Field
              name="salesmanId"
              validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}
            >
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="visit-salesman">
                    {intl.formatMessage({
                      id: "visitLog.form.field_salesman",
                      defaultMessage: "Salesman",
                    })}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={f.state.value ?? ""}
                    onValueChange={(value) => f.handleChange(value)}
                    aria-invalid={f.state.meta.errors.length > 0}
                  >
                    <SelectTrigger
                      id="visit-salesman"
                      size="default"
                      aria-label={intl.formatMessage({ id: "visitLog.form.field_salesman", defaultMessage: "Salesman" })}
                    >
                      <SelectValue placeholder={intl.formatMessage({ id: "visitLog.form.field_salesman_placeholder", defaultMessage: "Select salesman" })} />
                    </SelectTrigger>
                    <SelectContent>
                      {(salesmen?.data ?? []).map((u) => (
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
              name="outletId"
              validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}
            >
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="visit-outlet">
                    {intl.formatMessage({
                      id: "visitLog.form.field_outlet",
                      defaultMessage: "Outlet",
                    })}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={f.state.value ?? ""}
                    onValueChange={(value) => f.handleChange(value)}
                    aria-invalid={f.state.meta.errors.length > 0}
                  >
                    <SelectTrigger
                      id="visit-outlet"
                      size="default"
                      aria-label={intl.formatMessage({ id: "visitLog.form.field_outlet", defaultMessage: "Outlet" })}
                    >
                      <SelectValue placeholder={intl.formatMessage({ id: "visitLog.form.field_outlet_placeholder", defaultMessage: "Select outlet" })} />
                    </SelectTrigger>
                    <SelectContent>
                      {(outlets?.data ?? []).map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
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
              name="date"
              validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}
            >
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="visit-date">
                    {intl.formatMessage({
                      id: "visitLog.form.field_date",
                      defaultMessage: "Date",
                    })}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="visit-date"
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

            <form.Field name="purpose">
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="visit-purpose">
                    {intl.formatMessage({
                      id: "visitLog.form.field_purpose",
                      defaultMessage: "Purpose",
                    })}
                  </Label>
                  <Input
                    id="visit-purpose"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    placeholder={intl.formatMessage({
                      id: "visitLog.form.field_purpose_placeholder",
                      defaultMessage: "Optional",
                    })}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="notes">
              {(f) => (
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="visit-notes">
                    {intl.formatMessage({
                      id: "visitLog.form.field_notes",
                      defaultMessage: "Notes",
                    })}
                  </Label>
                  <Textarea
                    id="visit-notes"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    placeholder={intl.formatMessage({
                      id: "visitLog.form.field_notes_placeholder",
                      defaultMessage: "Optional",
                    })}
                  />
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
              {intl.formatMessage({ id: "visit_log.form.save_button", defaultMessage: "Save" })}
            </Button>
        </div>
</form>

      <ConfirmDialog
        open={modalStage === "confirm"}
        onOpenChange={(open) => {
          if (!open) setModalStage("idle");
        }}
        title={intl.formatMessage({
          id: "visit_log.form.modal.confirm_title",
          defaultMessage: "Confirm save",
        })}
        description={intl.formatMessage({
          id: "visit_log.form.modal.confirm_body",
          defaultMessage: "Save changes to this visitLog?",
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
                  id: "visit_log.form.modal.success",
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
                    id: "visit_log.form.modal.error_title",
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

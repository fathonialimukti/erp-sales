import { useCallback, useEffect, useState } from "react";
import { useIntl } from "react-intl";

import { useRequiredMessage } from "@/lib/form-validation";import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useStore } from "@tanstack/react-form";
import { Loader2, Save, Footprints, Store, UserRound, CalendarDays, Target } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { getFriendlyErrorMessage } from "../../lib/friendlyError";
import { hasPermissionAtom } from "../../lib/atoms";
import { PageHeader } from "../../components/PageHeader";
import { NavButtonGroup } from "../../components/NavButtonGroup";
import { FormSection } from "../../components/FormSection";
import { FormLayout } from "../../components/FormLayout";
import { FormFooter } from "../../components/FormFooter";
import { FormField } from "../../components/FormField";
import { FormPreview } from "../../components/FormPreview";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { AiFillButton } from '@/components/AiFillButton';
import { useAiFillForm } from "../../components/AiAssistant/useAiFillForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const requiredMessage = useRequiredMessage();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canSave = hasPermission(id ? "visitLog@update" : "visitLog@create");

  const isEdit = Boolean(id);
  const DRAFT_KEY = `visit-log-form-draft:${isEdit ? `edit:${id}` : "new"}`;
  const [modalStage, setModalStage] = useState<ModalStage>("idle");
  const [resultMessage, setResultMessage] = useState("");
  const [lastSaved, setLastSaved] = useState<Date | undefined>(() => {
    try {
      const ts = localStorage.getItem(`${DRAFT_KEY}:ts`);
      return ts ? new Date(ts) : undefined;
    } catch {
      return undefined;
    }
  });

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

  // Live values drive the preview rail — re-renders on every keystroke.
  const live = useStore(form.store, (s) => s.values) as FormValues;
  const filled = [live.salesmanId, live.outletId, live.date, live.purpose].filter(
    (v) => String(v ?? "").trim().length > 0,
  ).length;
  const salesmanName =
    (salesmen?.data ?? []).find((u) => u.id === live.salesmanId)?.name ?? "";
  const outletName =
    (outlets?.data ?? []).find((o) => o.id === live.outletId)?.name ?? "";

  // LocalStorage draft autosave — debounced via FormFooter's 1.5s timer.
  // Content guard: don't persist a completely empty new-form draft.
  const hasDraftContent = Boolean(live.salesmanId) || Boolean(live.outletId) || Boolean(live.date);
  const saveDraft = useCallback(() => {
    if (!hasDraftContent) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form.state.values));
      const now = new Date();
      localStorage.setItem(`${DRAFT_KEY}:ts`, now.toISOString());
      setLastSaved(now);
    } catch {
      // Private mode / quota exceeded — autosave is a safety net, never a blocker.
    }
  }, [DRAFT_KEY, form.state.values, hasDraftContent]);

  // Restore draft on mount for new forms only (edit mode uses server data).
  useEffect(() => {
    if (isEdit) return;
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<FormValues>;
      (Object.keys(parsed) as (keyof FormValues)[]).forEach((k) => {
        if (parsed[k] != null && String(parsed[k]).trim() !== "")
          form.setFieldValue(k as never, parsed[k] as never);
      });
    } catch {
      // ignore corrupted draft
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      <FormLayout
        mode="complex"
        sidebar={
          <FormPreview
            module="visit"
            icon={Footprints}
            title={outletName || live.purpose}
            subtitle={
              live.date ||
              intl.formatMessage({ id: "visit_log.preview.title", defaultMessage: "Field visit" })
            }
            status={!isEdit ? "DRAFT" : undefined}
            filled={filled}
            total={4}
            rows={[
              {
                icon: UserRound,
                label: intl.formatMessage({
                  id: "visitLog.form.field_salesman",
                  defaultMessage: "Salesman",
                }),
                value: salesmanName,
              },
              {
                icon: Store,
                label: intl.formatMessage({
                  id: "visitLog.form.field_outlet",
                  defaultMessage: "Outlet",
                }),
                value: outletName,
              },
              {
                icon: CalendarDays,
                label: intl.formatMessage({ id: "visitLog.form.field_date", defaultMessage: "Date" }),
                value: live.date,
              },
              {
                icon: Target,
                label: intl.formatMessage({
                  id: "visitLog.form.field_purpose",
                  defaultMessage: "Purpose",
                }),
                value: live.purpose,
              },
            ]}
          />
        }
      >
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
          icon={Footprints}
          step={1}
          tone="visit"
          completed={filled >= 4}
          title={intl.formatMessage({
            id: "visit_log.form.section_basic",
            defaultMessage: "Basic information",
          })}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <form.Field
              name="salesmanId"
              validators={{ onChange: ({ value }) => (!value ? requiredMessage : undefined) }}
            >
              {(f) => (
                <FormField
                  id="visit-salesman"
                  label={intl.formatMessage({
                    id: "visitLog.form.field_salesman",
                    defaultMessage: "Salesman",
                  })}
                  hint={intl.formatMessage({
                    id: "visitLog.form.field_salesman_hint",
                    defaultMessage: "Select the salesman making this visit",
                  })}
                  isRequired
                  showValid
                  error={f.state.meta.errors.length > 0 ? String(f.state.meta.errors[0]) : undefined}
                >
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
                </FormField>
              )}
            </form.Field>

            <form.Field
              name="outletId"
              validators={{ onChange: ({ value }) => (!value ? requiredMessage : undefined) }}
            >
              {(f) => (
                <FormField
                  id="visit-outlet"
                  label={intl.formatMessage({
                    id: "visitLog.form.field_outlet",
                    defaultMessage: "Outlet",
                  })}
                  hint={intl.formatMessage({
                    id: "visitLog.form.field_outlet_hint",
                    defaultMessage: "Select the outlet being visited",
                  })}
                  isRequired
                  showValid
                  error={f.state.meta.errors.length > 0 ? String(f.state.meta.errors[0]) : undefined}
                >
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
                </FormField>
              )}
            </form.Field>

            <form.Field
              name="date"
              validators={{ onChange: ({ value }) => (!value ? requiredMessage : undefined) }}
            >
              {(f) => (
                <FormField
                  id="visit-date"
                  label={intl.formatMessage({
                    id: "visitLog.form.field_date",
                    defaultMessage: "Date",
                  })}
                  hint={intl.formatMessage({
                    id: "visitLog.form.field_date_hint",
                    defaultMessage: "Date of the visit",
                  })}
                  isRequired
                  showValid
                  error={f.state.meta.errors.length > 0 ? String(f.state.meta.errors[0]) : undefined}
                >
                  <Input
                    id="visit-date"
                    type="date"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    aria-invalid={f.state.meta.errors.length > 0}
                  />
                </FormField>
              )}
            </form.Field>

            <form.Field name="purpose">
              {(f) => (
                <FormField
                  id="visit-purpose"
                  label={intl.formatMessage({
                    id: "visitLog.form.field_purpose",
                    defaultMessage: "Purpose",
                  })}
                  hint={intl.formatMessage({
                    id: "visitLog.form.field_purpose_hint",
                    defaultMessage: "Brief description of the visit purpose",
                  })}
                >
                  <Input
                    id="visit-purpose"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    placeholder={intl.formatMessage({
                      id: "visitLog.form.field_purpose_placeholder",
                      defaultMessage: "Optional",
                    })}
                  />
                </FormField>
              )}
            </form.Field>

            <form.Field name="notes">
              {(f) => (
                <FormField
                  id="visit-notes"
                  label={intl.formatMessage({
                    id: "visitLog.form.field_notes",
                    defaultMessage: "Notes",
                  })}
                  hint={intl.formatMessage({
                    id: "visitLog.form.field_notes_hint",
                    defaultMessage: "Additional observations or notes",
                  })}
                  className="sm:col-span-2"
                >
                  <Textarea
                    id="visit-notes"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    placeholder={intl.formatMessage({
                      id: "visitLog.form.field_notes_placeholder",
                      defaultMessage: "Optional",
                    })}
                  />
                </FormField>
              )}
            </form.Field>
          </div>
        </FormSection>
      
        <FormFooter
          autosave={{
            enabled: true,
            lastSaved,
            onSave: saveDraft,
          }}
        >
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
        </FormFooter>
      </form>
      </FormLayout>

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

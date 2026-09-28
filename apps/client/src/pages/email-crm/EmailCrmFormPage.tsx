import { useCallback, useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useStore } from "@tanstack/react-form";
import { Loader2, Save, Mail, UserRound, Tags, Flame } from "lucide-react";

import { useRequiredMessage } from "@/lib/form-validation";
import { trpcClient } from "../../lib/trpc";
import { getFriendlyErrorMessage } from "../../lib/friendlyError";
import { hasPermissionAtom } from "../../lib/atoms";
import { PageHeader } from "../../components/PageHeader";
import { NavButtonGroup } from "../../components/NavButtonGroup";
import { FormSection } from "../../components/FormSection";
import { FormLayout } from "../../components/FormLayout";
import { FormFooter } from "../../components/FormFooter";
import { FormPreview } from "../../components/FormPreview";
import { FormField } from "../../components/FormField";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { AiFillButton } from '@/components/AiFillButton';
import { useAiFillForm } from "../../components/AiAssistant/useAiFillForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  email: string;
  subject: string;
  status: "OPEN" | "PENDING" | "RESOLVED" | "SPAM";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  tags: string;
  customerId: string;
}

type EmailCrmDetail = {
  email?: string;
  subject?: string | null;
  status?: string;
  priority?: string;
  tags?: unknown;
  customer?: { id: string } | null;
};

type ModalStage = "idle" | "confirm" | "loading" | "success" | "error";

const STATUS_OPTIONS = ["OPEN", "PENDING", "RESOLVED", "SPAM"] as const;
const PRIORITY_OPTIONS = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

const defaultFormValues = (): FormValues => ({
  email: "",
  subject: "",
  status: "OPEN",
  priority: "NORMAL",
  tags: "",
  customerId: "",
});

const tagsFromDetail = (tags: unknown) => {
  if (!Array.isArray(tags)) return "";
  return tags.filter((t): t is string => typeof t === "string").join(", ");
};

const transformDetailToFormValues = (detail: EmailCrmDetail): FormValues => ({
  email: detail.email ?? "",
  subject: detail.subject ?? "",
  status: (detail.status as FormValues["status"]) || "OPEN",
  priority: (detail.priority as FormValues["priority"]) || "NORMAL",
  tags: tagsFromDetail(detail.tags),
  customerId: detail.customer?.id ?? "",
});

const parseTags = (raw: string) =>
  raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

interface InnerFormProps {
  initialValues: FormValues;
  isEdit: boolean;
  conversationId?: string;
}

const InnerForm = ({ initialValues, isEdit, conversationId }: InnerFormProps) => {
  const intl = useIntl();
  const requiredMessage = useRequiredMessage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canSave = hasPermission(isEdit ? "email-crm@update" : "email-crm@create");

  const [modalStage, setModalStage] = useState<ModalStage>("idle");
  const [resultMessage, setResultMessage] = useState("");

  const { data: customerList } = useQuery({
    queryKey: ["customerList", "all"],
    queryFn: () => trpcClient.customer.list.query({ page: 1, limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const customers = (customerList?.data ?? []) as {
    id: string;
    name: string;
    code: string | null;
  }[];

  // ponytail: mount only after detail is ready so defaultValues are correct on first render
  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async () => {
      setModalStage("confirm");
    },
  });

  useAiFillForm({
    email: (v: unknown) => form.setFieldValue("email" as never, String(v) as never),
    subject: (v: unknown) => form.setFieldValue("subject" as never, String(v) as never),
    status: (v: unknown) => form.setFieldValue("status" as never, String(v) as never),
    priority: (v: unknown) => form.setFieldValue("priority" as never, String(v) as never),
    tags: (v: unknown) => {
      if (Array.isArray(v)) form.setFieldValue("tags" as never, v.join(", ") as never);
      else if (typeof v === "string") form.setFieldValue("tags" as never, v as never);
    },
    customerId: (v: unknown) => form.setFieldValue("customerId" as never, String(v) as never),
  });

  // Live values drive the preview rail — re-renders on every keystroke.
  const live = useStore(form.store, (s) => s.values) as FormValues;
  const filled = [live.email, live.subject, live.customerId].filter(
    (v) => String(v ?? "").trim().length > 0,
  ).length;
  const customerName =
    customers.find((c) => c.id === live.customerId)?.name ?? "";

  // Section completion: the single section is "completed" once the required
  // email field is filled with a valid address.
  const sectionCompleted = live.email.trim().length > 0;

  // LocalStorage draft autosave — debounced via FormFooter's 1.5s timer.
  const DRAFT_KEY = `email-crm-form-draft:${isEdit ? `edit:${conversationId}` : "new"}`;
  const [lastSaved, setLastSaved] = useState<Date | undefined>(() => {
    try {
      const ts = localStorage.getItem(`${DRAFT_KEY}:ts`);
      return ts ? new Date(ts) : undefined;
    } catch {
      return undefined;
    }
  });

  // Content guard: don't persist a completely empty new-form draft.
  const hasDraftContent = live.email.trim().length > 0;
  const autosaveOnSave = useCallback(() => {
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

  const createMutation = useMutation({
    mutationFn: (d: FormValues) =>
      trpcClient.emailCrm.create.mutate({
        email: d.email.trim(),
        subject: d.subject.trim() || undefined,
        status: d.status,
        priority: d.priority,
        tags: parseTags(d.tags).length ? parseTags(d.tags) : undefined,
        customerId: d.customerId || null,
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["emailCrmList"] });
      setResultMessage(
        intl.formatMessage({
          id: "emailCrm.form.success.created",
          defaultMessage: "Conversation created",
        }),
      );
      setModalStage("success");
      setTimeout(() => navigate(`/email-crm/${created.id}`), 1200);
    },
    onError: (e) => {
      setResultMessage(getFriendlyErrorMessage(e, "Failed"));
      setModalStage("error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (d: FormValues & { currentId: string }) =>
      trpcClient.emailCrm.update.mutate({
        currentId: d.currentId,
        email: d.email.trim() || undefined,
        subject: d.subject.trim() || null,
        status: d.status,
        priority: d.priority,
        tags: parseTags(d.tags),
        customerId: d.customerId || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailCrmList"] });
      queryClient.invalidateQueries({ queryKey: ["emailCrmDetail", conversationId] });
      setResultMessage(
        intl.formatMessage({
          id: "emailCrm.form.success.updated",
          defaultMessage: "Conversation updated",
        }),
      );
      setModalStage("success");
      setTimeout(() => navigate(`/email-crm/${conversationId}`), 1200);
    },
    onError: (e) => {
      setResultMessage(getFriendlyErrorMessage(e, "Failed"));
      setModalStage("error");
    },
  });

  const runSave = () => {
    setModalStage("loading");
    const values = form.state.values as FormValues;
    if (isEdit && conversationId) {
      updateMutation.mutate({ ...values, currentId: conversationId });
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

  return (
    <section
      className="flex flex-col gap-3 pt-1 pb-6"
      data-ai-context={JSON.stringify({
        section: "email-crm-form",
        isEdit,
        id: conversationId ?? null,
      })}
    >
      <NavButtonGroup
        className="self-end"
        onBack={() =>
          navigate(isEdit && conversationId ? `/email-crm/${conversationId}` : "/email-crm")
        }
      />

      <PageHeader
          module="email"
          title={
            isEdit
              ? intl.formatMessage({
                  id: "emailCrm.form.title_edit",
                  defaultMessage: "Edit conversation",
                })
              : intl.formatMessage({
                  id: "emailCrm.form.title_create",
                  defaultMessage: "New conversation",
                })
          }
          description={
            isEdit
              ? intl.formatMessage({
                  id: "emailCrm.form.subtitle_edit",
                  defaultMessage: "Update conversation metadata",
                })
              : intl.formatMessage({
                  id: "emailCrm.form.subtitle_create",
                  defaultMessage: "Create a conversation thread",
                })
          }
        />

      <FormLayout
        mode="complex"
        sidebar={
          <FormPreview
            module="email"
            icon={Mail}
            title={live.subject || live.email}
            subtitle={live.subject && live.email ? live.email : undefined}
            status={live.status}
            filled={filled}
            total={3}
            rows={[
              {
                icon: Flame,
                label: intl.formatMessage({
                  id: "emailCrm.form.priority",
                  defaultMessage: "Priority",
                }),
                value: live.priority,
              },
              {
                icon: UserRound,
                label: intl.formatMessage({
                  id: "emailCrm.form.customer",
                  defaultMessage: "Customer",
                }),
                value: customerName,
              },
              {
                icon: Tags,
                label: intl.formatMessage({ id: "emailCrm.form.tags", defaultMessage: "Tags" }),
                value: live.tags,
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
          section="email-crm-form"
          context={{ isEdit, id: conversationId ?? null }}
          options={{
            customerList: customers.map((c) => ({ id: c.id, name: c.name })),
            statusList: STATUS_OPTIONS.map((s) => ({ value: s })),
            priorityList: PRIORITY_OPTIONS.map((p) => ({ value: p })),
          }}
        />

        <FormSection
          icon={Mail}
          step={1}
          tone="email"
          completed={sectionCompleted}
          title={intl.formatMessage({
            id: "emailCrm.form.section_basic",
            defaultMessage: "Conversation",
          })}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <form.Field
              name="email"
              validators={{
                onChange: ({ value }) => {
                  if (!value?.trim()) return requiredMessage;
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
                    return intl.formatMessage({
                      id: "emailCrm.form.error_invalid_email",
                      defaultMessage: "Invalid email",
                    });
                  }
                  return undefined;
                },
              }}
            >
              {(f) => (
                <FormField
                  id="email-crm-email"
                  label={intl.formatMessage({ id: "emailCrm.form.email", defaultMessage: "Email" })}
                  hint={intl.formatMessage({
                    id: "emailCrm.form.email_hint",
                    defaultMessage: "Primary contact address for this thread",
                  })}
                  error={f.state.meta.errors.length > 0 ? String(f.state.meta.errors[0]) : undefined}
                  isRequired
                  showValid
                >
                  <Input
                    id="email-crm-email"
                    type="email"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    aria-invalid={f.state.meta.errors.length > 0}
                    placeholder={intl.formatMessage({
                      id: "emailCrm.form.email_placeholder",
                      defaultMessage: "buyer@example.com",
                    })}
                  />
                </FormField>
              )}
            </form.Field>

            <form.Field name="subject">
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="email-crm-subject">
                    {intl.formatMessage({ id: "emailCrm.form.subject", defaultMessage: "Subject" })}
                  </Label>
                  <Input
                    id="email-crm-subject"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    placeholder={intl.formatMessage({
                      id: "emailCrm.form.subject_placeholder",
                      defaultMessage: "Optional subject",
                    })}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="status">
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="email-crm-status">
                    {intl.formatMessage({ id: "emailCrm.form.status", defaultMessage: "Status" })}
                  </Label>
                  <Select
                    value={f.state.value}
                    onValueChange={(value) => f.handleChange(value as FormValues["status"])}
                  >
                    <SelectTrigger
                      id="email-crm-status"
                      size="default"
                      aria-label={intl.formatMessage({ id: "emailCrm.form.status", defaultMessage: "Status" })}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            <form.Field name="priority">
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="email-crm-priority">
                    {intl.formatMessage({
                      id: "emailCrm.form.priority",
                      defaultMessage: "Priority",
                    })}
                  </Label>
                  <Select
                    value={f.state.value}
                    onValueChange={(value) => f.handleChange(value as FormValues["priority"])}
                  >
                    <SelectTrigger
                      id="email-crm-priority"
                      size="default"
                      aria-label={intl.formatMessage({ id: "emailCrm.form.priority", defaultMessage: "Priority" })}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            <form.Field name="customerId">
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="email-crm-customer">
                    {intl.formatMessage({
                      id: "emailCrm.form.customer",
                      defaultMessage: "Customer",
                    })}
                  </Label>
                  <Select
                    value={f.state.value ?? ""}
                    onValueChange={(value) => f.handleChange(value)}
                  >
                    <SelectTrigger
                      id="email-crm-customer"
                      size="default"
                      aria-label={intl.formatMessage({ id: "emailCrm.form.customer", defaultMessage: "Customer" })}
                    >
                      <SelectValue placeholder={intl.formatMessage({ id: "emailCrm.form.select_customer", defaultMessage: "No customer linked" })} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">
                        {intl.formatMessage({ id: "emailCrm.form.select_customer", defaultMessage: "No customer linked" })}
                      </SelectItem>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                          {c.code ? ` (${c.code})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            <form.Field name="tags">
              {(f) => (
                <FormField
                  id="email-crm-tags"
                  label={intl.formatMessage({ id: "emailCrm.form.tags", defaultMessage: "Tags" })}
                  hint={intl.formatMessage({
                    id: "emailCrm.form.tags_hint",
                    defaultMessage: "Categorize with comma-separated labels",
                  })}
                >
                  <Input
                    id="email-crm-tags"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    placeholder={intl.formatMessage({
                      id: "emailCrm.form.tags_placeholder",
                      defaultMessage: "Comma-separated tags",
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
            onSave: autosaveOnSave,
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
              {intl.formatMessage({ id: "emailCrm.common.save", defaultMessage: "Save" })}
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
          id: "emailCrm.form.modal.confirm_title",
          defaultMessage: "Confirm save",
        })}
        description={intl.formatMessage({
          id: "emailCrm.form.modal.confirm_body",
          defaultMessage: "Save changes to this conversation?",
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
                  id: "emailCrm.form.modal.success",
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
                    id: "emailCrm.form.modal.error_title",
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

export const EmailCrmFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const intl = useIntl();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const { data, isLoading } = useQuery({
    queryKey: ["emailCrmDetail", id],
    enabled: isEdit && Boolean(id),
    queryFn: () => trpcClient.emailCrm.detail.query({ id: id ?? "" }),
  });

  if (isEdit && isLoading) {
    return (
      <section
        className="flex flex-col gap-3 pt-1 pb-6"
        data-ai-context={JSON.stringify({ section: "email-crm-form", loading: true })}
      >
        <Skeleton className="h-16 w-full max-w-xl" />
        <Skeleton className="h-48 w-full" />
      </section>
    );
  }

  if (isEdit && !data) {
    return (
      <section
        className="flex flex-col gap-3 pt-1 pb-6"
        data-ai-context={JSON.stringify({ section: "email-crm-form", notFound: true })}
      >
        <PageHeader
          module="email"
          title={intl.formatMessage({
            id: "emailCrm.form.not_found",
            defaultMessage: "Conversation not found.",
          })}
        />
      </section>
    );
  }

  const initialValues =
    isEdit && data ? transformDetailToFormValues(data as EmailCrmDetail) : defaultFormValues();

  return (
    <InnerForm
      key={isEdit ? (id ?? "new") : "new"}
      initialValues={initialValues}
      isEdit={isEdit}
      conversationId={id}
    />
  );
};

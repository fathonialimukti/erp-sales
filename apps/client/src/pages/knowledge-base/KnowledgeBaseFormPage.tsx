import { useCallback, useEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useStore } from "@tanstack/react-form";
import { Loader2, Save, BookOpen, BookMarked, FileText } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { getFriendlyErrorMessage } from "../../lib/friendlyError";
import { hasPermissionAtom } from "../../lib/atoms";
import { useToast } from "../../components/useToast";
import { PageHeader } from "../../components/PageHeader";
import { NavButtonGroup } from "../../components/NavButtonGroup";
import { FormSection } from "../../components/FormSection";
import { FormLayout } from "../../components/FormLayout";
import { FormField } from "../../components/FormField";
import { FormFooter } from "../../components/FormFooter";
import { FormPreview } from "../../components/FormPreview";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { AiFillButton } from '@/components/AiFillButton';
import { AiKbWriter } from "@/components/AiKbWriter";
import { useAiFillForm } from "../../components/AiAssistant/useAiFillForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
  title: string;
  content: string;
  source: string;
}

type ModalStage = "idle" | "confirm" | "loading" | "success" | "error";

const defaults = (): FormValues => ({ title: "", content: "", source: "" });

export const KnowledgeBaseFormPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canSave = hasPermission(id ? "knowledge-base@update" : "knowledge-base@create");

  const isEdit = Boolean(id);
  const DRAFT_KEY = `knowledge-base-form-draft:${isEdit ? `edit:${id}` : "new"}`;
  const [modalStage, setModalStage] = useState<ModalStage>("idle");
  const [resultMessage, setResultMessage] = useState("");
  // Tracks the id whose embedding status we are polling after a successful save.
  // Null = not polling. Set on mutation success; cleared on terminal status / navigation.
  const [pollingId, setPollingId] = useState<string | null>(null);
  // Wall-clock timestamp when polling started; used to enforce the 30s ceiling
  // (dataUpdatedAt resets on every refetch, so it can't be used for the timeout).
  const pollingStartedAtRef = useRef<number | null>(null);
  // Ticks to force the terminal-status effect to re-evaluate the timeout when status
  // stays `pending` past 30s (otherwise the effect would never re-run).
  const [pollingTick, setPollingTick] = useState(0);
  const [lastSaved, setLastSaved] = useState<Date | undefined>(() => {
    try {
      const ts = localStorage.getItem(`${DRAFT_KEY}:ts`);
      return ts ? new Date(ts) : undefined;
    } catch {
      return undefined;
    }
  });
  const toast = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["knowledgeBaseDetail", id],
    enabled: isEdit && Boolean(id),
    queryFn: () => trpcClient.knowledgeBase.detail.query({ id: id ?? "" }),
  });

  const form = useForm({
    defaultValues: (isEdit && data
      ? { title: data.title, content: data.content, source: data.source }
      : defaults()) as FormValues,
    onSubmit: async () => {
      setModalStage("confirm");
    },
  });

  useAiFillForm({
    title: (v: unknown) => form.setFieldValue("title" as never, String(v) as never),
    content: (v: unknown) => form.setFieldValue("content" as never, String(v) as never),
    source: (v: unknown) => form.setFieldValue("source" as never, String(v) as never),
  });

  // Live values drive the preview rail — re-renders on every keystroke.
  const live = useStore(form.store, (s) => s.values) as FormValues;
  const filled = [live.title, live.content, live.source].filter(
    (v) => String(v ?? "").trim().length > 0,
  ).length;
  const excerpt = (live.content ?? "").trim().replace(/\s+/g, " ").slice(0, 140);

  // LocalStorage draft autosave — debounced via FormFooter's 1.5s timer.
  // Content guard: don't persist a completely empty new-form draft.
  const hasDraftContent = live.title.trim().length > 0 || live.content.trim().length > 0;
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

  useEffect(() => {
    if (isEdit && data) {
      form.setFieldValue("title", data.title);
      form.setFieldValue("content", data.content);
      form.setFieldValue("source", data.source);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, data]);

  const createMutation = useMutation({
    mutationFn: (d: FormValues) => trpcClient.knowledgeBase.create.mutate(d),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["knowledgeBaseList"] });
      setResultMessage(
        intl.formatMessage({
          id: "knowledgeBase.form.success.created",
          defaultMessage: "Knowledge entry created",
        }),
      );
      setModalStage("success");
      // Begin polling the created entry's embedding status instead of navigating away.
      pollingStartedAtRef.current = Date.now();
      setPollingId(created.id);
    },
    onError: (e) => {
      setResultMessage(getFriendlyErrorMessage(e, "Failed"));
      setModalStage("error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (d: FormValues & { currentId: string }) =>
      trpcClient.knowledgeBase.update.mutate(d),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["knowledgeBaseList"] });
      queryClient.invalidateQueries({ queryKey: ["knowledgeBaseDetail", id] });
      setResultMessage(
        intl.formatMessage({
          id: "knowledgeBase.form.success.updated",
          defaultMessage: "Knowledge entry updated",
        }),
      );
      setModalStage("success");
      // Begin polling the updated entry's embedding status instead of navigating away.
      pollingStartedAtRef.current = Date.now();
      setPollingId(updated.id);
    },
    onError: (e) => {
      setResultMessage(getFriendlyErrorMessage(e, "Failed"));
      setModalStage("error");
    },
  });

  // Poll the saved entry's embedding status while it is `pending`.
  // refetchInterval stops automatically once status leaves `pending` (returns false).
  // The 30s ceiling (15 polls × 2s) is enforced in the terminal-status effect below
  // using a wall-clock timestamp, since dataUpdatedAt resets on every refetch.
  const pollingQuery = useQuery({
    queryKey: ["knowledgeBaseDetail", pollingId],
    enabled: Boolean(pollingId),
    queryFn: () => trpcClient.knowledgeBase.detail.query({ id: pollingId ?? "" }),
    refetchInterval: (query) => {
      const status = query.state.data?.embeddingStatus;
      // Keep polling only while pending; stop on done/failed/none or when data is absent.
      return status === "pending" ? 2000 : false;
    },
    refetchIntervalInBackground: true,
  });

  // React to terminal embedding statuses (or polling timeout) — toast + navigate once.
  useEffect(() => {
    if (!pollingId) return;
    const status = pollingQuery.data?.embeddingStatus;
    const startedAt = pollingStartedAtRef.current;
    const timedOut = startedAt !== null && Date.now() - startedAt > 30_000;

    if (status === "done") {
      const targetId = pollingId;
      setPollingId(null);
      pollingStartedAtRef.current = null;
      toast.success(
        intl.formatMessage({
          id: "knowledgeBase.form.embedding_done",
          defaultMessage: "Embedded",
        }),
      );
      navigate(`/knowledge-base/${targetId}`);
    } else if (status === "failed") {
      const targetId = pollingId;
      setPollingId(null);
      pollingStartedAtRef.current = null;
      toast.warning(
        intl.formatMessage({
          id: "knowledgeBase.form.embedding_failed",
          defaultMessage: "Embedding failed — entry saved",
        }),
      );
      navigate(`/knowledge-base/${targetId}`);
    } else if (status === "none" || timedOut) {
      const targetId = pollingId;
      setPollingId(null);
      pollingStartedAtRef.current = null;
      toast.warning(
        intl.formatMessage({
          id: "knowledgeBase.form.embedding_skipped",
          defaultMessage: "Embedding skipped — entry saved",
        }),
      );
      navigate(`/knowledge-base/${targetId}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollingId, pollingQuery.data?.embeddingStatus, pollingTick]);

  // Force a re-check of the timeout when polling is active. Without this, if status
  // stays `pending` for 30s the effect above never re-runs and the user is stuck.
  useEffect(() => {
    if (!pollingId) return;
    const timer = setTimeout(() => setPollingTick((t) => t + 1), 30_500);
    return () => clearTimeout(timer);
  }, [pollingId]);

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
        data-ai-context={JSON.stringify({ section: "knowledge-base-form", loading: true })}
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
        section: "knowledge-base-form",
        isEdit,
        id: id ?? null,
      })}
    >
      <NavButtonGroup
        className="self-end"
        onBack={() => navigate(isEdit && id ? `/knowledge-base/${id}` : "/knowledge-base")}
      />

      <PageHeader
          module="knowledge"
          title={
            isEdit
              ? intl.formatMessage({
                  id: "knowledgeBase.form.title_edit",
                  defaultMessage: "Edit knowledge entry",
                })
              : intl.formatMessage({
                  id: "knowledgeBase.form.title_create",
                  defaultMessage: "New knowledge entry",
                })
          }
          description={
            isEdit
              ? intl.formatMessage({
                  id: "knowledgeBase.form.subtitle_edit",
                  defaultMessage: "Update the knowledge snippet used by the assistant",
                })
              : intl.formatMessage({
                  id: "knowledgeBase.form.subtitle_create",
                  defaultMessage: "Create a new knowledge snippet for the assistant",
                })
          }
        />

      <FormLayout
        mode="complex"
        sidebar={
          <FormPreview
            module="knowledge"
            icon={BookOpen}
            title={live.title}
            status={!isEdit ? "DRAFT" : undefined}
            filled={filled}
            total={3}
            rows={[
              {
                icon: BookMarked,
                label: intl.formatMessage({
                  id: "knowledgeBase.form.field_source",
                  defaultMessage: "Source",
                }),
                value: live.source,
              },
              {
                icon: FileText,
                label: intl.formatMessage({
                  id: "knowledgeBase.form.field_content",
                  defaultMessage: "Content",
                }),
                value: excerpt.length > 0 ? `${excerpt}${(live.content ?? "").trim().length > 140 ? "…" : ""}` : "",
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
          section="knowledge-base-form"
          context={{ isEdit, id: id ?? null }}
        />

        <FormSection
          icon={BookOpen}
          step={1}
          tone="knowledge"
          completed={filled >= 3}
          title={intl.formatMessage({
            id: "knowledgeBase.form.section_basic",
            defaultMessage: "Basic information",
          })}
        >
          <div className="grid gap-3">
            <form.Field
              name="title"
              validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}
            >
              {(f) => (
                <FormField
                  id="kb-title"
                  label={intl.formatMessage({
                    id: "knowledgeBase.form.field_title",
                    defaultMessage: "Title",
                  })}
                  isRequired
                  showValid
                  hint={intl.formatMessage({
                    id: "knowledgeBase.form.field_title_hint",
                    defaultMessage: "A short, descriptive title for this knowledge entry",
                  })}
                  error={f.state.meta.errors.length > 0 ? String(f.state.meta.errors[0]) : undefined}
                >
                  <Input
                    id="kb-title"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    aria-invalid={f.state.meta.errors.length > 0}
                    placeholder={intl.formatMessage({
                      id: "knowledgeBase.form.field_title_placeholder",
                      defaultMessage: "Short title",
                    })}
                  />
                </FormField>
              )}
            </form.Field>

            <form.Field
              name="source"
              validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}
            >
              {(f) => (
                <FormField
                  id="kb-source"
                  label={intl.formatMessage({
                    id: "knowledgeBase.form.field_source",
                    defaultMessage: "Source",
                  })}
                  isRequired
                  showValid
                  hint={intl.formatMessage({
                    id: "knowledgeBase.form.field_source_hint",
                    defaultMessage: "Where this knowledge comes from — e.g. Policy, FAQ, SOP",
                  })}
                  error={f.state.meta.errors.length > 0 ? String(f.state.meta.errors[0]) : undefined}
                >
                  <Input
                    id="kb-source"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    aria-invalid={f.state.meta.errors.length > 0}
                    placeholder={intl.formatMessage({
                      id: "knowledgeBase.form.field_source_placeholder",
                      defaultMessage: "Policy, FAQ, SOP…",
                    })}
                  />
                </FormField>
              )}
            </form.Field>

            <form.Field
              name="content"
              validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}
            >
              {(f) => (
                <FormField
                  id="kb-content"
                  label={intl.formatMessage({
                    id: "knowledgeBase.form.field_content",
                    defaultMessage: "Content",
                  })}
                  isRequired
                  showValid
                  hint={intl.formatMessage({
                    id: "knowledgeBase.form.field_content_hint",
                    defaultMessage: "The full text that the assistant will reference",
                  })}
                  error={f.state.meta.errors.length > 0 ? String(f.state.meta.errors[0]) : undefined}
                >
                  <Textarea
                    id="kb-content"
                    rows={10}
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    aria-invalid={f.state.meta.errors.length > 0}
                    placeholder={intl.formatMessage({
                      id: "knowledgeBase.form.field_content_placeholder",
                      defaultMessage: "Paste the knowledge text here",
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
          <AiKbWriter />
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
                id: "knowledgeBase.form.save_button",
                defaultMessage: "Save",
              })}
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
          id: "knowledgeBase.form.modal.confirm_title",
          defaultMessage: "Confirm save",
        })}
        description={intl.formatMessage({
          id: "knowledgeBase.form.modal.confirm_body",
          defaultMessage: "Save this knowledge entry?",
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
        <DialogContent showCloseButton={modalStage !== "loading" && !pollingId} className="sm:max-w-md">
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
                  id: "knowledgeBase.form.modal.success",
                  defaultMessage: "Success!",
                })}
              </DialogTitle>
              <DialogDescription>{resultMessage}</DialogDescription>
              {pollingId ? (
                <div className="flex flex-col gap-2 pt-2" data-ai-context={JSON.stringify({ section: "knowledge-base-form", polling: true })}>
                  <Progress value={100} className="animate-pulse" aria-label={intl.formatMessage({ id: "knowledgeBase.form.embedding_in_progress", defaultMessage: "Embedding…" })} />
                  <p className="text-xs text-muted-foreground">
                    {intl.formatMessage({
                      id: "knowledgeBase.form.embedding_in_progress",
                      defaultMessage: "Embedding…",
                    })}
                  </p>
                </div>
              ) : null}
            </DialogHeader>
          ) : null}
          {modalStage === "error" ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {intl.formatMessage({
                    id: "knowledgeBase.form.modal.error_title",
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

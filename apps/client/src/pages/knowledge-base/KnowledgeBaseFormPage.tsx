import { useEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { Loader2, Save } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { useToast } from "../../components/useToast";
import { PageHeader } from "../../components/PageHeader";
import { NavButtonGroup } from "../../components/NavButtonGroup";
import { FormSection } from "../../components/FormSection";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { AiFillButton } from '@/components/AiFillButton';
import { AiKbWriter } from "@/components/AiKbWriter";
import { useAiFillForm } from "../../components/AiAssistant/useAiFillForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      setResultMessage(e instanceof Error ? e.message : "Failed");
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
      setResultMessage(e instanceof Error ? e.message : "Failed");
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
                <div className="flex flex-col gap-1">
                  <Label htmlFor="kb-title">
                    {intl.formatMessage({
                      id: "knowledgeBase.form.field_title",
                      defaultMessage: "Title",
                    })}
                    <span className="text-destructive">*</span>
                  </Label>
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
                  {f.state.meta.errors.length > 0 ? (
                    <p className="text-xs text-destructive">{String(f.state.meta.errors[0])}</p>
                  ) : null}
                </div>
              )}
            </form.Field>

            <form.Field
              name="source"
              validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}
            >
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="kb-source">
                    {intl.formatMessage({
                      id: "knowledgeBase.form.field_source",
                      defaultMessage: "Source",
                    })}
                    <span className="text-destructive">*</span>
                  </Label>
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
                  {f.state.meta.errors.length > 0 ? (
                    <p className="text-xs text-destructive">{String(f.state.meta.errors[0])}</p>
                  ) : null}
                </div>
              )}
            </form.Field>

            <form.Field
              name="content"
              validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}
            >
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="kb-content">
                    {intl.formatMessage({
                      id: "knowledgeBase.form.field_content",
                      defaultMessage: "Content",
                    })}
                    <span className="text-destructive">*</span>
                  </Label>
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
                  {f.state.meta.errors.length > 0 ? (
                    <p className="text-xs text-destructive">{String(f.state.meta.errors[0])}</p>
                  ) : null}
                </div>
              )}
            </form.Field>
          </div>
        </FormSection>
      
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-3">
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
        </div>
</form>

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

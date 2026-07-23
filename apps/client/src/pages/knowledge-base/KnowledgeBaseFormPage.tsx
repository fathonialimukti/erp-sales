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
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledgeBaseList"] });
      setResultMessage(
        intl.formatMessage({
          id: "knowledgeBase.form.success.created",
          defaultMessage: "Knowledge entry created",
        }),
      );
      setModalStage("success");
      setTimeout(() => navigate("/knowledge-base"), 1200);
    },
    onError: (e) => {
      setResultMessage(e instanceof Error ? e.message : "Failed");
      setModalStage("error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (d: FormValues & { currentId: string }) =>
      trpcClient.knowledgeBase.update.mutate(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledgeBaseList"] });
      queryClient.invalidateQueries({ queryKey: ["knowledgeBaseDetail", id] });
      setResultMessage(
        intl.formatMessage({
          id: "knowledgeBase.form.success.updated",
          defaultMessage: "Knowledge entry updated",
        }),
      );
      setModalStage("success");
      setTimeout(() => navigate(`/knowledge-base/${id}`), 1200);
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
        className="flex flex-col gap-6 pt-2 pb-8"
        data-ai-context={JSON.stringify({ section: "knowledge-base-form", loading: true })}
      >
        <Skeleton className="h-16 w-full max-w-xl" />
        <Skeleton className="h-48 w-full" />
      </section>
    );
  }

  return (
    <section
      className="flex flex-col gap-6 pt-2 pb-8"
      data-ai-context={JSON.stringify({
        section: "knowledge-base-form",
        isEdit,
        id: id ?? null,
      })}
    >
      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
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
          onBack={() => navigate(isEdit && id ? `/knowledge-base/${id}` : "/knowledge-base")}
          actions={
            <Button
              type="submit"
              disabled={!canSave || createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Save className="size-4" aria-hidden />
              )}
              {intl.formatMessage({
                id: "knowledgeBase.form.save_button",
                defaultMessage: "Save",
              })}
            </Button>
          }
        />

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-base">
              {intl.formatMessage({
                id: "knowledgeBase.form.section_basic",
                defaultMessage: "Basic information",
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <form.Field
              name="title"
              validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}
            >
              {(f) => (
                <div className="flex flex-col gap-1.5">
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
                <div className="flex flex-col gap-1.5">
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
                <div className="flex flex-col gap-1.5">
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
          </CardContent>
        </Card>
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
                  id: "knowledgeBase.form.modal.success",
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

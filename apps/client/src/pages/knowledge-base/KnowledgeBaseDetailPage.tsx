import { useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Pencil, Trash2 } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { useToast } from "../../components/useToast";
import { NavButtonGroup } from "../../components/NavButtonGroup";
import { PageHeader } from "../../components/PageHeader";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

type EmbeddingStatus = "pending" | "done" | "failed" | "none";

type KnowledgeBaseDetail = {
  id: string;
  title: string;
  content: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  embeddingStatus: EmbeddingStatus;
  embeddingUpdatedAt: string | null;
  embeddingModel: string | null;
};

export const KnowledgeBaseDetailPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canUpdate = hasPermission("knowledge-base@update");
  const canDelete = hasPermission("knowledge-base@delete");
  const toast = useToast();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["knowledgeBaseDetail", id],
    enabled: Boolean(id),
    queryFn: () => trpcClient.knowledgeBase.detail.query({ id: id ?? "" }),
    refetchInterval: (query) => {
      const status = (query.state.data as KnowledgeBaseDetail | undefined)?.embeddingStatus;
      return status === "pending" ? 2000 : false;
    },
  });

  const entry = data as KnowledgeBaseDetail | undefined;

  const handleDelete = async () => {
    if (!entry || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.knowledgeBase.delete.mutate({ id: entry.id });
      await queryClient.invalidateQueries({ queryKey: ["knowledgeBaseList"] });
      setDeleteModalOpen(false);
      toast.success(
        intl.formatMessage({
          id: "knowledgeBase.detail.delete_success",
          defaultMessage: "Knowledge entry deleted",
        }),
      );
      navigate("/knowledge-base");
    } catch (e) {
      toast.error(e, "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <section
        className="flex flex-col gap-6 pt-2 pb-8"
        data-ai-context={JSON.stringify({ section: "knowledge-base-detail", loading: true })}
      >
        <Skeleton className="h-16 w-full max-w-xl" />
        <Skeleton className="h-48 w-full" />
      </section>
    );
  }

  if (!entry) {
    return (
      <section
        className="flex flex-col gap-6 pt-2 pb-8"
        data-ai-context={JSON.stringify({ section: "knowledge-base-detail", notFound: true })}
      >
        <div className="flex flex-col gap-3">
          <NavButtonGroup className="self-end" onBack={() => navigate("/knowledge-base")} />
          <PageHeader
            module="knowledge"
            title={intl.formatMessage({
              id: "knowledgeBase.detail.not_found",
              defaultMessage: "Knowledge entry not found",
            })}
          />
        </div>
      </section>
    );
  }

  return (
    <section
      className="flex flex-col gap-6 pt-2 pb-8"
      data-ai-context={JSON.stringify({
        section: "knowledge-base-detail",
        id: entry.id,
        name: entry.title,
        source: entry.source,
      })}
    >
      <div className="flex flex-col gap-3">
        <NavButtonGroup className="self-end" onBack={() => navigate("/knowledge-base")}>
          {canUpdate ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/knowledge-base/${entry.id}/edit`)}
              className="h-8 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
            >
              <Pencil className="size-3.5" aria-hidden />
              {intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" })}
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDeleteModalOpen(true)}
              className="h-8 gap-1.5 px-2.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-3.5" aria-hidden />
              {intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
            </Button>
          ) : null}
        </NavButtonGroup>

        <PageHeader
          module="knowledge"
          eyebrow={intl.formatMessage({ id: "nav.administration", defaultMessage: "Administration" })}
          title={entry.title}
          description={entry.source}
        />
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-knowledge)_8%,transparent)] text-[var(--module-knowledge)]">
              <BookOpen className="size-4" aria-hidden />
            </span>
            {intl.formatMessage({
              id: "knowledgeBase.detail.summary",
              defaultMessage: "Summary",
            })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({
                  id: "knowledgeBase.detail.source_label",
                  defaultMessage: "Source",
                })}
              </dt>
              <dd className="flex items-center gap-2">
                <Badge variant="secondary">{entry.source}</Badge>
                {entry.embeddingStatus === "pending" ? (
                  <div className="flex items-center gap-2">
                    <Progress
                      value={50}
                      className="h-1.5 w-20"
                      aria-label={intl.formatMessage({
                        id: "knowledgeBase.detail.embedding_in_progress",
                        defaultMessage: "Embedding…",
                      })}
                    />
                    <Badge
                      variant="outline"
                      className="border-transparent bg-muted text-muted-foreground"
                    >
                      {intl.formatMessage({
                        id: "knowledgeBase.detail.embedding_in_progress",
                        defaultMessage: "Embedding…",
                      })}
                    </Badge>
                  </div>
                ) : entry.embeddingStatus === "done" ? (
                  <Badge
                    variant="outline"
                    title={entry.embeddingModel ?? undefined}
                    className="border-transparent bg-success/15 text-success"
                  >
                    {intl.formatMessage({
                      id: "knowledgeBase.detail.embedding_embedded",
                      defaultMessage: "Embedded",
                    })}
                  </Badge>
                ) : entry.embeddingStatus === "failed" ? (
                  <Badge
                    variant="outline"
                    className="border-transparent bg-destructive/10 text-destructive"
                  >
                    {intl.formatMessage({
                      id: "knowledgeBase.detail.embedding_failed",
                      defaultMessage: "Embedding failed",
                    })}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-transparent bg-muted text-muted-foreground"
                  >
                    {intl.formatMessage({
                      id: "knowledgeBase.detail.embedding_none",
                      defaultMessage: "Not embedded",
                    })}
                  </Badge>
                )}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({
                  id: "knowledgeBase.detail.updated_label",
                  defaultMessage: "Updated",
                })}
              </dt>
              <dd className="text-sm font-normal tabular-nums text-foreground">
                {new Date(entry.updatedAt).toLocaleString()}
              </dd>
            </div>
          </dl>
          <div className="space-y-1">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {intl.formatMessage({
                id: "knowledgeBase.detail.content_label",
                defaultMessage: "Content",
              })}
            </p>
            <div className="whitespace-pre-wrap rounded-lg bg-card p-4 text-sm leading-relaxed text-foreground">
              {entry.content}
            </div>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title={intl.formatMessage({
          id: "knowledgeBase.detail.delete_title",
          defaultMessage: "Delete knowledge entry",
        })}
        description={intl.formatMessage(
          {
            id: "knowledgeBase.index.delete_confirm_body",
            defaultMessage: 'Delete "{name}"? This action cannot be undone.',
          },
          { name: entry.title },
        )}
        confirmLabel={intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </section>
  );
};

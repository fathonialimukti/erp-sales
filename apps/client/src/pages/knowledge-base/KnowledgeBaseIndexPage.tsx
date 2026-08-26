import { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef, type PaginationState } from "@tanstack/react-table";
import { Eye, Loader2, MoreHorizontal, Pencil, Plus, RotateCw, Trash2 } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { useToast } from "../../components/useToast";
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";
import { DataTable } from "../../components/DataTable";
import { EmptyState } from "../../components/EmptyState";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "../../components/Pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type KnowledgeBaseRow = {
  id: string;
  title: string;
  source: string;
  content: string;
  embeddingStatus: "pending" | "done" | "failed" | "none";
  embeddingUpdatedAt: string | null;
  embeddingModel: string | null;
};

export const KnowledgeBaseIndexPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission("knowledge-base@create");
  const canUpdate = hasPermission("knowledge-base@update");
  const canDelete = hasPermission("knowledge-base@delete");
  const toast = useToast();

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<KnowledgeBaseRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reembeddingId, setReembeddingId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["knowledgeBaseList", pagination.pageIndex, pagination.pageSize, search],
    queryFn: () =>
      trpcClient.knowledgeBase.list.query({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: search || undefined,
      }),
    refetchInterval: (query) => {
      const rows = query.state.data?.data;
      return Array.isArray(rows) && rows.some((r) => r?.embeddingStatus === "pending")
        ? 5000
        : false;
    },
  });

  const rows = (data?.data ?? []) as KnowledgeBaseRow[];
  const totalPages = data?.meta?.totalPages ?? 1;
  const totalRows = data?.meta?.total ?? 0;

  const columns = useMemo<ColumnDef<KnowledgeBaseRow>[]>(
    () => [
      {
        id: "title",
        header: intl.formatMessage({
          id: "knowledgeBase.index.header_title",
          defaultMessage: "Title",
        }),
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.title}</span>
        ),
      },
      {
        id: "source",
        header: intl.formatMessage({
          id: "knowledgeBase.index.header_source",
          defaultMessage: "Source",
        }),
        cell: ({ row }) => <Badge variant="secondary">{row.original.source}</Badge>,
      },
      {
        id: "content",
        header: intl.formatMessage({
          id: "knowledgeBase.index.header_content",
          defaultMessage: "Content",
        }),
        cell: ({ row }) => (
          <span className="line-clamp-1 text-sm text-muted-foreground">
            {row.original.content.slice(0, 100)}
            {row.original.content.length > 100 ? "…" : ""}
          </span>
        ),
      },
      {
        id: "embedding",
        header: intl.formatMessage({
          id: "knowledgeBase.index.header_embedding",
          defaultMessage: "Embedding",
        }),
        cell: ({ row }) => {
          const status = row.original.embeddingStatus;
          if (status === "pending") {
            return (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                {intl.formatMessage({
                  id: "knowledgeBase.index.embedding_in_progress",
                  defaultMessage: "Embedding…",
                })}
              </span>
            );
          }
          if (status === "failed") {
            return (
              <Badge
                variant="outline"
                className="border-transparent bg-destructive/10 text-destructive"
              >
                {intl.formatMessage({
                  id: "knowledgeBase.index.embedding_failed",
                  defaultMessage: "Failed",
                })}
              </Badge>
            );
          }
          if (status === "done") {
            return (
              <Badge
                variant="outline"
                title={row.original.embeddingModel ?? undefined}
                className="border-transparent bg-success/15 text-success"
              >
                {intl.formatMessage({
                  id: "knowledgeBase.detail.embedding_embedded",
                  defaultMessage: "Embedded",
                })}
              </Badge>
            );
          }
          return (
            <Badge
              variant="outline"
              className="border-transparent bg-muted text-muted-foreground"
            >
              {intl.formatMessage({
                id: "knowledgeBase.detail.embedding_none",
                defaultMessage: "Not embedded",
              })}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={intl.formatMessage({
                    id: "common.action.actions",
                    defaultMessage: "Actions",
                  })}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/knowledge-base/${row.original.id}`)}>
                  <Eye className="size-4" />
                  {intl.formatMessage({ id: "common.action.view", defaultMessage: "View" })}
                </DropdownMenuItem>
                {canUpdate ? (
                  <DropdownMenuItem
                    onClick={() => navigate(`/knowledge-base/${row.original.id}/edit`)}
                  >
                    <Pencil className="size-4" />
                    {intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" })}
                  </DropdownMenuItem>
                ) : null}
                {canUpdate && row.original.embeddingStatus !== "pending" ? (
                  <DropdownMenuItem
                    disabled={reembeddingId === row.original.id}
                    onClick={async () => {
                      if (reembeddingId === row.original.id) return;
                      setReembeddingId(row.original.id);
                      try {
                        await trpcClient.knowledgeBase.reembed.mutate({ id: row.original.id });
                        await queryClient.invalidateQueries({ queryKey: ["knowledgeBaseList"] });
                        toast.success(
                          intl.formatMessage({
                            id: "knowledgeBase.index.reembed_success",
                            defaultMessage: "Re-embedding started",
                          }),
                        );
                      } catch (e) {
                        toast.error(e, "Failed to re-embed");
                      } finally {
                        setReembeddingId(null);
                      }
                    }}
                  >
                    {reembeddingId === row.original.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RotateCw className="size-4" />
                    )}
                    {intl.formatMessage({
                      id: "knowledgeBase.index.reembed",
                      defaultMessage: "Re-embed",
                    })}
                  </DropdownMenuItem>
                ) : null}
                {canDelete ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => {
                        setItemToDelete(row.original);
                        setDeleteModalOpen(true);
                      }}
                    >
                      <Trash2 className="size-4" />
                      {intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [intl, navigate, queryClient, toast, canUpdate, canDelete, reembeddingId],
  );

  const handleDelete = async () => {
    if (!itemToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.knowledgeBase.delete.mutate({ id: itemToDelete.id });
      await queryClient.invalidateQueries({ queryKey: ["knowledgeBaseList"] });
      setDeleteModalOpen(false);
      setItemToDelete(null);
      toast.success(
        intl.formatMessage({
          id: "knowledgeBase.index.delete_success",
          defaultMessage: "Knowledge entry deleted",
        }),
      );
    } catch (e) {
      toast.error(e, "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section
      className="flex flex-col gap-6 pt-2 pb-8"
      data-ai-context={JSON.stringify({
        section: "knowledge-base-index",
        itemCount: totalRows,
        page: pagination.pageIndex + 1,
        search,
      })}
    >
      <PageHeader
        module="knowledge"
        eyebrow={intl.formatMessage({ id: "nav.administration", defaultMessage: "Administration" })}
        title={intl.formatMessage({
          id: "knowledgeBase.index.title",
          defaultMessage: "Knowledge base",
        })}
        description={intl.formatMessage({
          id: "knowledgeBase.index.subtitle",
          defaultMessage: "Manage knowledge snippets that feed the AI assistant.",
        })}
        actions={
          canCreate ? (
            <Button type="button" onClick={() => navigate("/knowledge-base/create")}>
              <Plus className="size-4" />
              {intl.formatMessage({
                id: "knowledgeBase.index.create_button",
                defaultMessage: "New entry",
              })}
            </Button>
          ) : undefined
        }
      />

      <DataTable
        density="crm"
        columns={columns}
        data={rows}
        isLoading={isLoading}
        isError={isError}
        onRowClick={(row) => navigate(`/knowledge-base/${row.id}`)}
        toolbar={
          <FilterBar
            search={searchInput}
            onSearchChange={setSearchInput}
            searchPlaceholder={intl.formatMessage({
              id: "knowledgeBase.index.search_placeholder",
              defaultMessage: "Search entries…",
            })}
            countLabel={intl.formatMessage(
              {
                id: "knowledgeBase.index.count_label",
                defaultMessage: "{count, plural, one {# entry} other {# entries}}",
              },
              { count: totalRows },
            )}
          />
        }
        empty={
          <EmptyState
            module="knowledge"
            title={
              search
                ? intl.formatMessage({
                    id: "knowledgeBase.index.empty_search",
                    defaultMessage: "No entries found",
                  })
                : intl.formatMessage({
                    id: "knowledgeBase.index.empty_title",
                    defaultMessage: "No knowledge entries yet",
                  })
            }
            description={
              search
                ? intl.formatMessage({
                    id: "knowledgeBase.index.empty_search_sub",
                    defaultMessage: "Try adjusting your search terms.",
                  })
                : intl.formatMessage({
                    id: "knowledgeBase.index.empty_desc",
                    defaultMessage: "Create your first knowledge entry to improve the AI assistant.",
                  })
            }
            action={
              canCreate && !search ? (
                <Button type="button" onClick={() => navigate("/knowledge-base/create")}>
                  <Plus className="size-4" />
                  {intl.formatMessage({
                    id: "knowledgeBase.index.create_button",
                    defaultMessage: "New entry",
                  })}
                </Button>
              ) : undefined
            }
          />
        }
        footer={
          totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {intl.formatMessage(
                  { id: "common.pagination_info", defaultMessage: "Page {page} of {total}" },
                  { page: pagination.pageIndex + 1, total: Math.max(totalPages, 1) },
                )}
              </p>
              <Pagination
                page={pagination.pageIndex + 1}
                totalPages={totalPages}
                onChange={(p) => setPagination({ pageIndex: p - 1, pageSize: pagination.pageSize })}
              />
            </div>
          ) : null
        }
      />

      <ConfirmDialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title={intl.formatMessage({
          id: "knowledgeBase.index.delete_title",
          defaultMessage: "Delete knowledge entry",
        })}
        description={intl.formatMessage(
          {
            id: "knowledgeBase.index.delete_confirm_body",
            defaultMessage: 'Delete "{name}"? This action cannot be undone.',
          },
          { name: itemToDelete?.title ?? "" },
        )}
        confirmLabel={intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </section>
  );
};

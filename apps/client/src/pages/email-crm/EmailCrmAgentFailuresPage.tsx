import { useCallback, useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef, type PaginationState } from "@tanstack/react-table";
import { Eye, MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { useToast } from "../../components/useToast";
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";
import { DataTable } from "../../components/DataTable";
import { EmptyState } from "../../components/EmptyState";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { StatusChip } from "../../components/StatusChip";
import { Button } from "@/components/ui/button";
import { Pagination } from "../../components/Pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type EmailCrmRow = {
  id: string;
  email: string;
  subject: string | null;
  agentStatus: string;
  agentError: string | null;
  lastMessageAt: string | Date | null;
  customer: { id: string; name: string; code: string | null } | null;
};

const formatDateTime = (value: string | Date | null) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

export const EmailCrmAgentFailuresPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canDelete = hasPermission("email-crm@delete");
  const toast = useToast();

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<EmailCrmRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const queryKey = useMemo(
    () => ["emailCrmList", "agent-failures", pagination.pageIndex, pagination.pageSize, search],
    [pagination.pageIndex, pagination.pageSize, search],
  );

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () =>
      trpcClient.emailCrm.list.query({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: search || undefined,
        agentStatus: "FAILED",
      }),
  });

  const rows = (data?.data ?? []) as EmailCrmRow[];
  const totalPages = data?.meta?.totalPages ?? 1;
  const totalRows = data?.meta?.total ?? 0;

  const retryAgentMutation = useMutation({
    mutationFn: (conversationId: string) =>
      trpcClient.emailCrm.retryAgent.mutate({ conversationId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      toast.success(
        intl.formatMessage({
          id: "emailCrm.agentFailures.retry_success",
          defaultMessage: "Agent retry enqueued",
        }),
      );
    },
    onError: (e) => toast.error(e, "Failed to retry agent"),
  });

  const handleRetry = useCallback(
    (conversationId: string) => {
      retryAgentMutation.mutate(conversationId);
    },
    [retryAgentMutation],
  );

  const handleDelete = async () => {
    if (!itemToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.emailCrm.delete.mutate({ id: itemToDelete.id });
      await queryClient.invalidateQueries({ queryKey });
      setDeleteModalOpen(false);
      setItemToDelete(null);
      toast.success(
        intl.formatMessage({
          id: "emailCrm.index.delete_success",
          defaultMessage: "Conversation deleted",
        }),
      );
    } catch (e) {
      toast.error(e, "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  const statusFailedLabel = intl.formatMessage({
    id: "emailCrm.agentFailures.status_failed",
    defaultMessage: "Failed",
  });

  const columns = useMemo<ColumnDef<EmailCrmRow>[]>(
    () => [
      {
        id: "email",
        header: intl.formatMessage({
          id: "emailCrm.agentFailures.col_email",
          defaultMessage: "Email",
        }),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">{row.original.email}</span>
        ),
      },
      {
        id: "subject",
        header: intl.formatMessage({
          id: "emailCrm.agentFailures.col_subject",
          defaultMessage: "Subject",
        }),
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.subject ?? "—"}</span>
        ),
      },
      {
        id: "agentError",
        header: intl.formatMessage({
          id: "emailCrm.agentFailures.col_failure_reason",
          defaultMessage: "Failure reason",
        }),
        cell: ({ row }) => (
          <span className="text-xs text-destructive">{row.original.agentError ?? "—"}</span>
        ),
      },
      {
        id: "lastMessageAt",
        header: intl.formatMessage({
          id: "emailCrm.agentFailures.col_last_message",
          defaultMessage: "Last message",
        }),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDateTime(row.original.lastMessageAt)}
          </span>
        ),
      },
      {
        id: "customer",
        header: intl.formatMessage({
          id: "emailCrm.agentFailures.col_customer",
          defaultMessage: "Customer",
        }),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.customer?.name ?? "—"}</span>
        ),
      },
      {
        id: "status",
        header: intl.formatMessage({
          id: "emailCrm.index.col_status",
          defaultMessage: "Status",
        }),
        cell: () => <StatusChip status="FAILED" label={statusFailedLabel} />,
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
                <DropdownMenuItem onClick={() => navigate(`/email-crm/${row.original.id}`)}>
                  <Eye className="size-4" />
                  {intl.formatMessage({ id: "common.action.view", defaultMessage: "View" })}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRetry(row.original.id)}>
                  <RefreshCw className="size-4" />
                  {intl.formatMessage({
                    id: "emailCrm.agentFailures.retry",
                    defaultMessage: "Retry agent",
                  })}
                </DropdownMenuItem>
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
                      {intl.formatMessage({
                        id: "common.action.delete",
                        defaultMessage: "Delete",
                      })}
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [intl, navigate, canDelete, handleRetry, statusFailedLabel],
  );

  return (
    <section
      className="flex flex-col gap-6 pt-2 pb-8"
      data-ai-context={JSON.stringify({
        section: "email-crm-agent-failures",
        itemCount: totalRows,
        page: pagination.pageIndex + 1,
        search,
      })}
    >
      <PageHeader
        module="email"
        eyebrow={intl.formatMessage({ id: "nav.sales", defaultMessage: "Sales" })}
        title={intl.formatMessage({
          id: "emailCrm.agentFailures.title",
          defaultMessage: "Agent failures",
        })}
        description={intl.formatMessage({
          id: "emailCrm.agentFailures.subtitle",
          defaultMessage: "Email conversations where the AI concierge failed to respond.",
        })}
      />

      <DataTable
        density="crm"
        columns={columns}
        data={rows}
        isLoading={isLoading}
        isError={isError}
        onRowClick={(row) => navigate(`/email-crm/${row.id}`)}
        toolbar={
          <FilterBar
            search={searchInput}
            onSearchChange={setSearchInput}
            searchPlaceholder={intl.formatMessage({
              id: "emailCrm.agentFailures.search",
              defaultMessage: "Search failed conversations…",
            })}
            countLabel={intl.formatMessage(
              {
                id: "emailCrm.agentFailures.count_label",
                defaultMessage:
                  "{count, plural, one {# failed conversation} other {# failed conversations}}",
              },
              { count: totalRows },
            )}
          />
        }
        empty={
          <EmptyState
            module="email"
            title={intl.formatMessage({
              id: "emailCrm.agentFailures.empty",
              defaultMessage: "No agent failures",
            })}
            description={intl.formatMessage({
              id: "emailCrm.agentFailures.empty_desc",
              defaultMessage:
                "All email conversations were handled successfully by the AI concierge.",
            })}
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
          id: "emailCrm.common.delete",
          defaultMessage: "Delete conversation",
        })}
        description={intl.formatMessage(
          {
            id: "emailCrm.common.delete_confirm",
            defaultMessage: 'Delete conversation with "{email}"? This action cannot be undone.',
          },
          { email: itemToDelete?.email ?? "" },
        )}
        confirmLabel={intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </section>
  );
};

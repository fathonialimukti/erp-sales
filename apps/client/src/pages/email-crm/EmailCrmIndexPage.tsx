import { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef, type PaginationState } from "@tanstack/react-table";
import { Eye, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";

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
  status: string;
  priority: string;
  lastMessageAt: string | Date | null;
  customer: { id: string; name: string; code: string | null } | null;
  _count: { messages: number; salesOrders: number };
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

export const EmailCrmIndexPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission("email-crm@create");
  const canUpdate = hasPermission("email-crm@update");
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

  const { data, isLoading, isError } = useQuery({
    queryKey: ["emailCrmList", pagination.pageIndex, pagination.pageSize, search],
    queryFn: () =>
      trpcClient.emailCrm.list.query({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: search || undefined,
      }),
  });

  const rows = (data?.data ?? []) as EmailCrmRow[];
  const totalPages = data?.meta?.totalPages ?? 1;
  const totalRows = data?.meta?.total ?? 0;

  const columns = useMemo<ColumnDef<EmailCrmRow>[]>(
    () => {
      const statusLabel = (status: string) => {
        const s = status.toUpperCase();
        if (s === "OPEN")
          return intl.formatMessage({ id: "emailCrm.index.status_open", defaultMessage: "Open" });
        if (s === "PENDING")
          return intl.formatMessage({
            id: "emailCrm.index.status_pending",
            defaultMessage: "Pending",
          });
        if (s === "RESOLVED")
          return intl.formatMessage({
            id: "emailCrm.index.status_resolved",
            defaultMessage: "Resolved",
          });
        if (s === "SPAM")
          return intl.formatMessage({ id: "emailCrm.index.status_spam", defaultMessage: "Spam" });
        return status;
      };
      const priorityLabel = (priority: string) => {
        const p = priority.toUpperCase();
        if (p === "LOW")
          return intl.formatMessage({ id: "emailCrm.index.priority_low", defaultMessage: "Low" });
        if (p === "NORMAL")
          return intl.formatMessage({
            id: "emailCrm.index.priority_normal",
            defaultMessage: "Normal",
          });
        if (p === "HIGH")
          return intl.formatMessage({ id: "emailCrm.index.priority_high", defaultMessage: "High" });
        if (p === "URGENT")
          return intl.formatMessage({
            id: "emailCrm.index.priority_urgent",
            defaultMessage: "Urgent",
          });
        return priority;
      };

      return [
        {
          id: "email",
          header: intl.formatMessage({ id: "emailCrm.index.col_email", defaultMessage: "Email" }),
          cell: ({ row }) => (
            <span className="font-mono text-xs text-muted-foreground">{row.original.email}</span>
          ),
        },
        {
          id: "subject",
          header: intl.formatMessage({
            id: "emailCrm.index.col_subject",
            defaultMessage: "Subject",
          }),
          cell: ({ row }) => (
            <span className="font-medium text-foreground">{row.original.subject ?? "—"}</span>
          ),
        },
        {
          id: "status",
          header: intl.formatMessage({
            id: "emailCrm.index.col_status",
            defaultMessage: "Status",
          }),
          cell: ({ row }) => (
            <StatusChip status={row.original.status} label={statusLabel(row.original.status)} />
          ),
        },
        {
          id: "priority",
          header: intl.formatMessage({
            id: "emailCrm.index.col_priority",
            defaultMessage: "Priority",
          }),
          cell: ({ row }) => (
            <StatusChip
              status={row.original.priority}
              label={priorityLabel(row.original.priority)}
            />
          ),
        },
        {
          id: "customer",
          header: intl.formatMessage({
            id: "emailCrm.index.col_customer",
            defaultMessage: "Customer",
          }),
          cell: ({ row }) => (
            <span className="text-muted-foreground">{row.original.customer?.name ?? "—"}</span>
          ),
        },
        {
          id: "lastMessageAt",
          header: intl.formatMessage({
            id: "emailCrm.index.col_last_message",
            defaultMessage: "Last message",
          }),
          cell: ({ row }) => (
            <span className="text-xs text-muted-foreground">
              {formatDateTime(row.original.lastMessageAt)}
            </span>
          ),
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
                  {canUpdate ? (
                    <DropdownMenuItem
                      onClick={() => navigate(`/email-crm/${row.original.id}/edit`)}
                    >
                      <Pencil className="size-4" />
                      {intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" })}
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
      ];
    },
    [intl, navigate, canUpdate, canDelete],
  );

  const handleDelete = async () => {
    if (!itemToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.emailCrm.delete.mutate({ id: itemToDelete.id });
      await queryClient.invalidateQueries({ queryKey: ["emailCrmList"] });
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

  return (
    <section
      className="flex flex-col gap-6 pt-2 pb-8"
      data-ai-context={JSON.stringify({
        section: "email-crm-index",
        itemCount: totalRows,
        page: pagination.pageIndex + 1,
        search,
      })}
    >
      <PageHeader
        module="email"
        eyebrow={intl.formatMessage({ id: "nav.sales", defaultMessage: "Sales" })}
        title={intl.formatMessage({ id: "emailCrm.index.title", defaultMessage: "Email CRM" })}
        description={intl.formatMessage({
          id: "emailCrm.index.subtitle",
          defaultMessage: "Manage inbound email conversations and replies.",
        })}
        actions={
          canCreate ? (
            <Button type="button" onClick={() => navigate("/email-crm/create")}>
              <Plus className="size-4" />
              {intl.formatMessage({
                id: "emailCrm.index.create_button",
                defaultMessage: "New conversation",
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
        onRowClick={(row) => navigate(`/email-crm/${row.id}`)}
        toolbar={
          <FilterBar
            search={searchInput}
            onSearchChange={setSearchInput}
            searchPlaceholder={intl.formatMessage({
              id: "emailCrm.index.search",
              defaultMessage: "Search conversations…",
            })}
            countLabel={intl.formatMessage(
              {
                id: "emailCrm.index.count_label",
                defaultMessage: "{count, plural, one {# conversation} other {# conversations}}",
              },
              { count: totalRows },
            )}
          />
        }
        empty={
          <EmptyState
            module="email"
            title={
              search
                ? intl.formatMessage({
                    id: "emailCrm.index.empty_search",
                    defaultMessage: "No conversations found",
                  })
                : intl.formatMessage({
                    id: "emailCrm.index.empty",
                    defaultMessage: "No conversations yet",
                  })
            }
            description={
              search
                ? intl.formatMessage({
                    id: "emailCrm.index.empty_search_sub",
                    defaultMessage: "Try adjusting your search terms.",
                  })
                : intl.formatMessage({
                    id: "emailCrm.index.empty_desc",
                    defaultMessage: "Create a conversation or wait for inbound email.",
                  })
            }
            action={
              canCreate && !search ? (
                <Button type="button" onClick={() => navigate("/email-crm/create")}>
                  <Plus className="size-4" />
                  {intl.formatMessage({
                    id: "emailCrm.index.create_button",
                    defaultMessage: "New conversation",
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

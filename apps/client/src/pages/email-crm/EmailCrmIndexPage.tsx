import { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ColumnDef,
  type PaginationState,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { Chip } from "../../ui/Chip";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../ui/Modal";
import { Spinner } from "../../ui/Spinner";
import { useToast } from "../../ui/useToast";
import { RowActions } from "../../components/RowActions";
import { ModulePage, ModuleHero, ModuleSearch, ModuleTable, ModuleEmpty } from "../../components/ModulePage";
import { EmailCrmIcon } from "./EmailCrmIcons";

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

const STATUS_TONE: Record<string, "neutral" | "info" | "success" | "warning" | "danger"> = {
  OPEN: "info",
  PENDING: "warning",
  RESOLVED: "success",
  SPAM: "neutral",
};

const PRIORITY_TONE: Record<string, "neutral" | "info" | "success" | "warning" | "danger"> = {
  LOW: "neutral",
  NORMAL: "info",
  HIGH: "warning",
  URGENT: "danger",
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

  const { data, isLoading } = useQuery({
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
        if (s === "OPEN") return intl.formatMessage({ id: "emailCrm.index.status_open", defaultMessage: "Open" });
        if (s === "PENDING") return intl.formatMessage({ id: "emailCrm.index.status_pending", defaultMessage: "Pending" });
        if (s === "RESOLVED") return intl.formatMessage({ id: "emailCrm.index.status_resolved", defaultMessage: "Resolved" });
        if (s === "SPAM") return intl.formatMessage({ id: "emailCrm.index.status_spam", defaultMessage: "Spam" });
        return status;
      };
      const priorityLabel = (priority: string) => {
        const p = priority.toUpperCase();
        if (p === "LOW") return intl.formatMessage({ id: "emailCrm.index.priority_low", defaultMessage: "Low" });
        if (p === "NORMAL") return intl.formatMessage({ id: "emailCrm.index.priority_normal", defaultMessage: "Normal" });
        if (p === "HIGH") return intl.formatMessage({ id: "emailCrm.index.priority_high", defaultMessage: "High" });
        if (p === "URGENT") return intl.formatMessage({ id: "emailCrm.index.priority_urgent", defaultMessage: "Urgent" });
        return priority;
      };

      return [
      {
        id: "email",
        header: intl.formatMessage({ id: "emailCrm.index.col_email", defaultMessage: "Email" }),
        cell: ({ row }) => (
          <span className="m-doc">
            <span className="m-doc__text">
              <span className="m-doc__code">{row.original.email}</span>
            </span>
          </span>
        ),
      },
      {
        id: "subject",
        header: intl.formatMessage({ id: "emailCrm.index.col_subject", defaultMessage: "Subject" }),
        cell: ({ row }) => (
          <span className="m-cell m-cell--single">
            <span className="m-cell__primary">{row.original.subject ?? "—"}</span>
          </span>
        ),
      },
      {
        id: "status",
        header: intl.formatMessage({ id: "emailCrm.index.col_status", defaultMessage: "Status" }),
        cell: ({ row }) => (
          <Chip tone={STATUS_TONE[row.original.status] ?? "neutral"} size="sm">
            {statusLabel(row.original.status)}
          </Chip>
        ),
      },
      {
        id: "priority",
        header: intl.formatMessage({ id: "emailCrm.index.col_priority", defaultMessage: "Priority" }),
        cell: ({ row }) => (
          <Chip tone={PRIORITY_TONE[row.original.priority] ?? "neutral"} size="sm">
            {priorityLabel(row.original.priority)}
          </Chip>
        ),
      },
      {
        id: "customer",
        header: intl.formatMessage({ id: "emailCrm.index.col_customer", defaultMessage: "Customer" }),
        cell: ({ row }) => (
          <span className="m-cell m-cell--single">
            <span className="m-cell__primary">{row.original.customer?.name ?? "—"}</span>
          </span>
        ),
      },
      {
        id: "lastMessageAt",
        header: intl.formatMessage({ id: "emailCrm.index.col_last_message", defaultMessage: "Last message" }),
        cell: ({ row }) => (
          <span className="m-cell m-cell--single">
            <span className="m-cell__primary">{formatDateTime(row.original.lastMessageAt)}</span>
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <RowActions
            ariaLabel={intl.formatMessage({ id: "common.action.actions", defaultMessage: "Actions" })}
            items={[
              {
                key: "view",
                label: intl.formatMessage({ id: "common.action.view", defaultMessage: "View" }),
                icon: <EmailCrmIcon name="eye" size={16} />,
                onClick: () => navigate(`/email-crm/${row.original.id}`),
              },
              ...(canUpdate
                ? [
                    {
                      key: "edit",
                      label: intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" }),
                      icon: <EmailCrmIcon name="edit" size={16} />,
                      onClick: () => navigate(`/email-crm/${row.original.id}/edit`),
                    },
                  ]
                : []),
              ...(canDelete
                ? [
                    {
                      key: "delete",
                      label: intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" }),
                      icon: <EmailCrmIcon name="delete" size={16} />,
                      tone: "danger" as const,
                      separator: true,
                      onClick: () => {
                        setItemToDelete(row.original);
                        setDeleteModalOpen(true);
                      },
                    },
                  ]
                : []),
            ]}
          />
        ),
      },
    ];
    },
    [intl, navigate, canUpdate, canDelete],
  );

  const table = useReactTable({
    data: rows,
    columns,
    pageCount: totalPages,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  const handleDelete = async () => {
    if (!itemToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.emailCrm.delete.mutate({ id: itemToDelete.id });
      await queryClient.invalidateQueries({ queryKey: ["emailCrmList"] });
      setDeleteModalOpen(false);
      setItemToDelete(null);
      toast.success(
        intl.formatMessage({ id: "emailCrm.index.delete_success", defaultMessage: "Conversation deleted" }),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ModulePage
      accent="#0A84FF"
      accentEnd="#5E5CE6"
      aiContext={{
        section: "email-crm-index",
        itemCount: totalRows,
        page: pagination.pageIndex + 1,
        search,
      }}
    >
      <ModuleHero
        kicker={intl.formatMessage({ id: "nav.sales", defaultMessage: "Sales" })}
        title={intl.formatMessage({ id: "emailCrm.index.title", defaultMessage: "Email CRM" })}
        subtitle={intl.formatMessage({
          id: "emailCrm.index.subtitle",
          defaultMessage: "Manage inbound email conversations and replies.",
        })}
        cta={
          canCreate
            ? {
                label: intl.formatMessage({ id: "emailCrm.index.create_button", defaultMessage: "New conversation" }),
                icon: <EmailCrmIcon name="plus" size={18} />,
                onClick: () => navigate("/email-crm/create"),
              }
            : undefined
        }
        stats={[
          {
            value: totalRows,
            label: intl.formatMessage({ id: "emailCrm.hero.total", defaultMessage: "Total" }),
          },
        ]}
      />

      <div className="m-toolbar">
        <ModuleSearch
          value={searchInput}
          onChange={setSearchInput}
          placeholder={intl.formatMessage({
            id: "emailCrm.index.search",
            defaultMessage: "Search conversations…",
          })}
          searchIcon={<EmailCrmIcon name="search" size={16} />}
          clearIcon={<EmailCrmIcon name="close" size={12} />}
          clearLabel={intl.formatMessage({ id: "common.action.clear", defaultMessage: "Clear" })}
        />
        <span className="m-count">
          {intl.formatMessage(
            {
              id: "emailCrm.index.count_label",
              defaultMessage: "{count, plural, one {# conversation} other {# conversations}}",
            },
            { count: totalRows },
          )}
        </span>
      </div>

      <ModuleTable
        density="crm"
        table={table}
        totalRows={totalRows}
        totalPages={totalPages}
        isLoading={isLoading}
        pageIndex={pagination.pageIndex}
        pageSize={pagination.pageSize}
        onPageChange={(p) => setPagination({ pageIndex: p, pageSize: pagination.pageSize })}
        onRowClick={(row) => navigate(`/email-crm/${row.id}`)}
        paginationLabel={intl.formatMessage(
          { id: "common.pagination_info", defaultMessage: "Page {page} of {total}" },
          { page: pagination.pageIndex + 1, total: Math.max(totalPages, 1) },
        )}
        emptyState={
          <ModuleEmpty
            title={
              search
                ? intl.formatMessage({ id: "emailCrm.index.empty_search", defaultMessage: "No conversations found" })
                : intl.formatMessage({ id: "emailCrm.index.empty", defaultMessage: "No conversations yet" })
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
            cta={
              canCreate && !search
                ? {
                    label: intl.formatMessage({
                      id: "emailCrm.index.create_button",
                      defaultMessage: "New conversation",
                    }),
                    icon: <EmailCrmIcon name="plus" size={16} />,
                    onClick: () => navigate("/email-crm/create"),
                  }
                : undefined
            }
          />
        }
      />

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} size="sm">
        <ModalHeader>
          {intl.formatMessage({ id: "emailCrm.common.delete", defaultMessage: "Delete conversation" })}
        </ModalHeader>
        <ModalBody>
          {intl.formatMessage(
            {
              id: "emailCrm.common.delete_confirm",
              defaultMessage: 'Delete conversation with "{email}"? This action cannot be undone.',
            },
            { email: itemToDelete?.email ?? "" },
          )}
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setDeleteModalOpen(false)}
            disabled={isDeleting}
          >
            {intl.formatMessage({ id: "emailCrm.common.cancel", defaultMessage: "Cancel" })}
          </button>
          <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? (
              <Spinner size="sm" />
            ) : (
              intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })
            )}
          </button>
        </ModalFooter>
      </Modal>
    </ModulePage>
  );
};

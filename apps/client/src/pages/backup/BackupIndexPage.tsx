import { useMemo, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef, type PaginationState } from "@tanstack/react-table";
import {
  DatabaseBackup,
  Download,
  Loader2,
  MoreHorizontal,
  RotateCcw,
  Trash2,
  Upload,
  type LucideIcon,
} from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { getFriendlyErrorMessage } from "../../lib/friendlyError";
import { useToast } from "../../components/useToast";
import { useMeta } from "../../lib/useMeta";
import { PageHeader } from "../../components/PageHeader";
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

// Same resolution as lib/trpc.ts — the upload endpoint lives on the API server
// origin (next to /trpc), not the client's own origin.
const API_BASE_URL: string =
  import.meta.env.VITE_TRPC_URL ??
  import.meta.env.VITE_API_BASE_URL ??
  "http://localhost:10022";

interface BackupRow {
  id: string;
  filename: string;
  sizeBytes: number;
  tableCounts: Record<string, number> | null;
  schemaVersion: string;
  source: "CREATED" | "UPLOADED";
  note: string | null;
  createdAt: string | Date;
  createdBy?: { id: string; name: string } | null;
}

/** 1536 → "1.5 KB" — human-readable byte size (B/KB/MB/GB/TB). */
const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = -1;
  do {
    value /= 1024;
    unitIndex += 1;
  } while (value >= 1024 && unitIndex < units.length - 1);
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[unitIndex]}`;
};

const formatDateTime = (value: string | Date): string =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

/** Source chip — soft plate + icon + label (design law: never color alone). */
const SOURCE_CHIP: Record<BackupRow["source"], { icon: LucideIcon; className: string }> = {
  CREATED: {
    icon: DatabaseBackup,
    className: "border-primary/25 bg-primary/12 text-primary",
  },
  UPLOADED: {
    icon: Upload,
    className: "border-border/70 bg-muted text-foreground",
  },
};

export const BackupIndexPage = () => {
  const intl = useIntl();

  useMeta({
    title: intl.formatMessage({ id: "backup.title", defaultMessage: "Backup & Restore" }),
    description: intl.formatMessage({
      id: "backup.description",
      defaultMessage: "Create, download, upload and restore database backups.",
    }),
  });

  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission("backup@create");
  const canRead = hasPermission("backup@read");
  const canRestore = hasPermission("backup@restore");
  const canDelete = hasPermission("backup@delete");
  const toast = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [itemToRestore, setItemToRestore] = useState<BackupRow | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [uploadConfirmOpen, setUploadConfirmOpen] = useState(false);
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<BackupRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["backupList", pagination.pageIndex, pagination.pageSize],
    queryFn: () =>
      trpcClient.backup.list.query({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      }),
  });

  // `unknown` bridge: Prisma's recursive JsonValue in the tRPC output makes a
  // direct `as BackupRow[]` instantiation-excessively-deep (TS2589).
  const rows = (data?.data ?? []) as unknown as BackupRow[];
  const totalPages = data?.meta?.totalPages ?? 1;
  const totalRows = data?.meta?.total ?? 0;

  const handleCreate = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      await trpcClient.backup.create.mutate({});
      await queryClient.invalidateQueries({ queryKey: ["backupList"] });
      toast.success(
        intl.formatMessage({ id: "backup.createSuccess", defaultMessage: "Backup created" }),
      );
    } catch (e) {
      toast.error(e);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      const text = await file.text();
      const res = await fetch(`${API_BASE_URL}/api/backups/upload`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-backup-filename": file.name,
        },
        body: text,
      });
      if (!res.ok) {
        // Parse the server's JSON error body so the toast carries the reason.
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(
          body?.error === "INVALID_BACKUP_FILE"
            ? intl.formatMessage({
                id: "backup.uploadInvalidFile",
                defaultMessage: "The file is not a valid backup.",
              })
            : getFriendlyErrorMessage(body?.error ?? null),
        );
      }
      await queryClient.invalidateQueries({ queryKey: ["backupList"] });
      toast.success(
        intl.formatMessage({ id: "backup.uploadSuccess", defaultMessage: "Backup uploaded" }),
      );
    } catch (e) {
      toast.error(
        `${intl.formatMessage({ id: "backup.uploadFailed", defaultMessage: "Upload failed" })}: ${getFriendlyErrorMessage(e)}`,
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (!pendingUploadFile || isUploading) return;
    await handleUploadFile(pendingUploadFile);
    setUploadConfirmOpen(false);
    setPendingUploadFile(null);
  };

  const handleDownload = async (row: BackupRow) => {
    if (downloadingId) return;
    setDownloadingId(row.id);
    try {
      const { filename, content } = await trpcClient.backup.download.query({ id: row.id });
      const blob = new Blob([content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRestore = async () => {
    if (!itemToRestore || isRestoring) return;
    setIsRestoring(true);
    try {
      await trpcClient.backup.restore.mutate({ id: itemToRestore.id });
      await queryClient.invalidateQueries({ queryKey: ["backupList"] });
      setRestoreOpen(false);
      setItemToRestore(null);
      toast.success(
        intl.formatMessage({
          id: "backup.restoreSuccess",
          defaultMessage: "Database restored from backup",
        }),
      );
    } catch (e) {
      toast.error(
        `${intl.formatMessage({ id: "backup.restoreFailed", defaultMessage: "Restore failed" })}: ${getFriendlyErrorMessage(e)}`,
      );
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.backup.delete.mutate({ id: itemToDelete.id });
      await queryClient.invalidateQueries({ queryKey: ["backupList"] });
      setDeleteOpen(false);
      setItemToDelete(null);
      toast.success(
        intl.formatMessage({ id: "backup.deleteSuccess", defaultMessage: "Backup deleted" }),
      );
    } catch (e) {
      toast.error(e);
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = useMemo<ColumnDef<BackupRow>[]>(
    () => [
      {
        id: "filename",
        accessorKey: "filename",
        enableSorting: true,
        header: intl.formatMessage({ id: "backup.colFilename", defaultMessage: "File" }),
        cell: ({ row }) => (
          <span className="font-medium break-all text-foreground">{row.original.filename}</span>
        ),
      },
      {
        id: "source",
        accessorKey: "source",
        enableSorting: true,
        header: intl.formatMessage({ id: "backup.colSource", defaultMessage: "Source" }),
        cell: ({ row }) => {
          const chip = SOURCE_CHIP[row.original.source] ?? SOURCE_CHIP.UPLOADED;
          const ChipIcon = chip.icon;
          return (
            <Badge variant="outline" className="gap-1 font-semibold shadow-sm">
              <ChipIcon className="size-3" aria-hidden />
              {intl.formatMessage({
                id: row.original.source === "CREATED" ? "backup.sourceCreated" : "backup.sourceUploaded",
                defaultMessage: row.original.source === "CREATED" ? "Created" : "Uploaded",
              })}
            </Badge>
          );
        },
      },
      {
        id: "size",
        accessorKey: "sizeBytes",
        enableSorting: true,
        header: intl.formatMessage({ id: "backup.colSize", defaultMessage: "Size" }),
        cell: ({ row }) => (
          <span className="block text-right tabular-nums text-foreground">
            {formatBytes(row.original.sizeBytes)}
          </span>
        ),
      },
      {
        id: "tables",
        accessorFn: (row) => Object.keys(row.tableCounts ?? {}).length,
        enableSorting: true,
        header: intl.formatMessage({ id: "backup.colTables", defaultMessage: "Tables" }),
        cell: ({ row }) => {
          const counts = row.original.tableCounts ?? {};
          const tableCount = Object.keys(counts).length;
          const totalRowCount = Object.values(counts).reduce((sum, n) => sum + n, 0);
          return (
            <div className="flex flex-col">
              <span className="tabular-nums text-foreground">
                {tableCount > 0
                  ? intl.formatMessage(
                      {
                        id: "backup.tableCount",
                        defaultMessage: "{count, plural, one {# table} other {# tables}}",
                      },
                      { count: tableCount },
                    )
                  : "—"}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {totalRowCount.toLocaleString()}
              </span>
            </div>
          );
        },
      },
      {
        id: "createdBy",
        accessorFn: (row) => row.createdBy?.name ?? "",
        enableSorting: true,
        header: intl.formatMessage({ id: "backup.colCreatedBy", defaultMessage: "Created by" }),
        cell: ({ row }) => (
          <span className="text-foreground">{row.original.createdBy?.name ?? "—"}</span>
        ),
      },
      {
        id: "createdAt",
        accessorFn: (row) => new Date(row.createdAt).getTime(),
        enableSorting: true,
        header: intl.formatMessage({ id: "backup.colCreatedAt", defaultMessage: "Date" }),
        cell: ({ row }) => (
          <span className="tabular-nums text-foreground">{formatDateTime(row.original.createdAt)}</span>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        header: intl.formatMessage({ id: "backup.colActions", defaultMessage: "Actions" }),
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={intl.formatMessage({ id: "backup.colActions", defaultMessage: "Actions" })}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canRestore ? (
                  <DropdownMenuItem
                    onClick={() => {
                      setItemToRestore(row.original);
                      setRestoreOpen(true);
                    }}
                  >
                    <RotateCcw className="size-4" />
                    {intl.formatMessage({ id: "backup.restore", defaultMessage: "Restore" })}
                  </DropdownMenuItem>
                ) : null}
                {canRead ? (
                  <DropdownMenuItem
                    disabled={downloadingId === row.original.id}
                    onClick={() => void handleDownload(row.original)}
                  >
                    {downloadingId === row.original.id ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Download className="size-4" />
                    )}
                    {intl.formatMessage({ id: "backup.download", defaultMessage: "Download" })}
                  </DropdownMenuItem>
                ) : null}
                {canDelete ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => {
                        setItemToDelete(row.original);
                        setDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="size-4" />
                      {intl.formatMessage({ id: "backup.delete", defaultMessage: "Delete" })}
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [intl, canRead, canRestore, canDelete, downloadingId],
  );

  return (
    <section
      className="flex flex-col gap-6 pt-2 pb-8"
      data-ai-context={JSON.stringify({
        section: "backup-index",
        itemCount: totalRows,
        page: pagination.pageIndex + 1,
      })}
    >
      <PageHeader
        title={intl.formatMessage({ id: "backup.title", defaultMessage: "Backup & Restore" })}
        description={intl.formatMessage({
          id: "backup.description",
          defaultMessage: "Create, download, upload and restore database backups.",
        })}
        actions={
          <>
            {canRestore ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Upload className="size-4" />
                )}
                {intl.formatMessage({ id: "backup.upload", defaultMessage: "Upload backup" })}
              </Button>
            ) : null}
            {canCreate ? (
              <Button type="button" onClick={() => void handleCreate()} disabled={isCreating}>
                {isCreating ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <DatabaseBackup className="size-4" />
                )}
                {intl.formatMessage({ id: "backup.create", defaultMessage: "Create backup" })}
              </Button>
            ) : null}
          </>
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Reset first so re-selecting the same file re-triggers onChange,
          // whether the pending confirm is accepted or cancelled.
          e.target.value = "";
          if (file) {
            setPendingUploadFile(file);
            setUploadConfirmOpen(true);
          }
        }}
      />

      <DataTable
        density="crm"
        columns={columns}
        data={rows}
        isLoading={isLoading}
        isError={isError}
        empty={
          <EmptyState
            icon={<DatabaseBackup className="size-6" />}
            title={intl.formatMessage({
              id: "backup.empty",
              defaultMessage: "No backups yet. Create your first backup to get started.",
            })}
            action={
              canCreate ? (
                <Button type="button" onClick={() => void handleCreate()} disabled={isCreating}>
                  {isCreating ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <DatabaseBackup className="size-4" />
                  )}
                  {intl.formatMessage({ id: "backup.create", defaultMessage: "Create backup" })}
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
                  { id: "common.pagination.page_of", defaultMessage: "Page {page} of {totalPages}" },
                  { page: pagination.pageIndex + 1, totalPages: Math.max(totalPages, 1) },
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
        open={uploadConfirmOpen}
        onOpenChange={(open) => {
          setUploadConfirmOpen(open);
          if (!open) setPendingUploadFile(null);
        }}
        title={intl.formatMessage({
          id: "backup.uploadConfirmTitle",
          defaultMessage: "Upload this backup file?",
        })}
        description={intl.formatMessage({
          id: "backup.uploadConfirmDescription",
          defaultMessage:
            "It will be added to the backup list. Restoring it is a separate, confirmed action.",
        })}
        confirmLabel={intl.formatMessage({ id: "backup.upload", defaultMessage: "Upload backup" })}
        loading={isUploading}
        onConfirm={handleConfirmUpload}
      />

      <ConfirmDialog
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
        title={intl.formatMessage({
          id: "backup.restoreConfirmTitle",
          defaultMessage: "Restore this backup?",
        })}
        description={intl.formatMessage({
          id: "backup.restoreConfirmDescription",
          defaultMessage:
            "This will erase all current data and replace it with the content of this backup. This action cannot be undone.",
        })}
        confirmLabel={intl.formatMessage({ id: "backup.restore", defaultMessage: "Restore" })}
        variant="destructive"
        loading={isRestoring}
        onConfirm={handleRestore}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={intl.formatMessage({
          id: "backup.deleteConfirmTitle",
          defaultMessage: "Delete this backup?",
        })}
        description={intl.formatMessage({
          id: "backup.deleteConfirmDescription",
          defaultMessage: "The backup file will be permanently removed. This action cannot be undone.",
        })}
        confirmLabel={intl.formatMessage({ id: "backup.delete", defaultMessage: "Delete" })}
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </section>
  );
};

export default BackupIndexPage;

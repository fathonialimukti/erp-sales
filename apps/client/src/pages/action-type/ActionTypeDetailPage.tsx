import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Trash2, AlertCircle, Tag } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { useToast } from "../../components/useToast";
import { useMeta } from "../../lib/useMeta";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ActionTypeDetail = {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  actionPrograms: Array<{
    id: string;
    name: string;
    approvalStatus: string;
  }>;
  _count: { actionPrograms: number };
};

export const ActionTypeDetailPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canUpdate = hasPermission("action-type@update");
  const canDelete = hasPermission("action-type@delete");
  const toast = useToast();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["actionTypeDetail", id],
    queryFn: () => trpcClient.actionType.detail.query({ id: id! }),
    enabled: !!id,
  });

  const actionType = data as ActionTypeDetail | undefined;

  useMeta({
    title: actionType?.name ?? intl.formatMessage({ id: "action_type.detail.title", defaultMessage: "Action Type Detail" }),
    description: actionType?.description ?? "",
  });

  const handleDelete = async () => {
    if (!id || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.actionType.delete.mutate({ id });
      toast.success(intl.formatMessage({ id: "common.toast.deleted", defaultMessage: "Deleted successfully" }));
      navigate("/action-type");
    } catch (error) {
      toast.error(error, intl.formatMessage({ id: "common.toast.delete_failed", defaultMessage: "Failed to delete" }));
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED": return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success text-success-foreground">{intl.formatMessage({ id: "common.status.approved", defaultMessage: "Approved" })}</span>;
      case "DRAFT": return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">{intl.formatMessage({ id: "common.status.draft", defaultMessage: "Draft" })}</span>;
      case "VALIDATING": return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">{intl.formatMessage({ id: "common.status.validating", defaultMessage: "Validating" })}</span>;
      default: return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">{status}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isError || !actionType) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="size-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">
            {intl.formatMessage({ id: "common.error.not_found", defaultMessage: "Action type not found" })}
          </h3>
          <Button variant="outline" onClick={() => navigate("/action-type")} className="mt-4">
            <ArrowLeft className="size-4 mr-2" />
            {intl.formatMessage({ id: "common.action.back", defaultMessage: "Back to list" })}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        module="actionType"
        eyebrow={intl.formatMessage({ id: "nav.master_data", defaultMessage: "Master Data" })}
        title={actionType.name}
        description={actionType.description ?? intl.formatMessage({ id: "common.no_description", defaultMessage: "No description" })}
        actions={
          <>
            {canUpdate && (
              <Button variant="outline" onClick={() => navigate(`/action-type/${actionType.id}/edit`)}>
                <Pencil className="size-4 mr-2" />
                {intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" })}
              </Button>
            )}
            {canDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="size-4 mr-2" />
                    {intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDeleteModalOpen(true)}
                  >
                    <Trash2 className="size-4" />
                    {intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        }
      />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Tag className="size-4" />
              {intl.formatMessage({ id: "action_type.detail.code", defaultMessage: "Code" })}
            </div>
            <div className="mt-1 font-medium text-foreground font-mono">{actionType.code ?? "—"}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Tag className="size-4" />
              {intl.formatMessage({ id: "action_type.detail.programs", defaultMessage: "Programs" })}
            </div>
            <div className="mt-1 font-medium text-foreground">{actionType._count.actionPrograms}</div>
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="border-b p-4">
            <h3 className="text-lg font-semibold text-foreground">
              {intl.formatMessage({ id: "action_type.detail.programs_title", defaultMessage: "Action Programs" })}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {intl.formatMessage({ id: "action_type.detail.program_name", defaultMessage: "Name" })}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {intl.formatMessage({ id: "action_type.detail.program_status", defaultMessage: "Status" })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {actionType.actionPrograms.map((program) => (
                  <tr key={program.id} className="border-b hover:bg-muted/30">
                    <td className="p-4">
                      <Button variant="ghost" className="p-0 h-auto text-left" onClick={() => navigate(`/action-program/${program.id}`)}>
                        {program.name}
                      </Button>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(program.approvalStatus)}
                    </td>
                  </tr>
                ))}
                {actionType.actionPrograms.length === 0 && (
                  <tr>
                    <td colSpan={2} className="p-8 text-center text-muted-foreground">
                      {intl.formatMessage({ id: "action_type.detail.no_programs", defaultMessage: "No action programs using this type" })}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title={intl.formatMessage({ id: "common.confirm.delete_title", defaultMessage: "Delete action type?" })}
        description={intl.formatMessage({ id: "common.confirm.delete_description", defaultMessage: "This action cannot be undone." })}
        confirmLabel={intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
        onConfirm={handleDelete}
        loading={isDeleting}
      />
    </div>
  );
};
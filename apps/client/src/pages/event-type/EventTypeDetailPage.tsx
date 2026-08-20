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
import { StatusChip } from "../../components/StatusChip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type EventTypeDetail = {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  eventProposals: Array<{
    id: string;
    name: string;
    approvalStatus: string;
  }>;
  _count: { eventProposals: number };
};

export const EventTypeDetailPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canUpdate = hasPermission("event-type@update");
  const canDelete = hasPermission("event-type@delete");
  const toast = useToast();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["eventTypeDetail", id],
    queryFn: () => trpcClient.eventType.detail.query({ id: id! }),
    enabled: !!id,
  });

  const eventType = data as EventTypeDetail | undefined;

  useMeta({
    title: eventType?.name ?? intl.formatMessage({ id: "event_type.detail.title", defaultMessage: "Event Type Detail" }),
    description: eventType?.description ?? "",
  });

  const handleDelete = async () => {
    if (!id || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.eventType.delete.mutate({ id });
      toast.success(intl.formatMessage({ id: "common.toast.deleted", defaultMessage: "Deleted successfully" }));
      navigate("/event-type");
    } catch (error) {
      toast.error(intl.formatMessage({ id: "common.toast.delete_failed", defaultMessage: "Failed to delete" }));
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => <StatusChip status={status} />;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isError || !eventType) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="size-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">
            {intl.formatMessage({ id: "common.error.not_found", defaultMessage: "Event type not found" })}
          </h3>
          <Button variant="outline" onClick={() => navigate("/event-type")} className="mt-4">
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
        title={eventType.name}
        description={eventType.description ?? intl.formatMessage({ id: "common.no_description", defaultMessage: "No description" })}
        actions={
          <>
            {canUpdate && (
              <Button variant="outline" onClick={() => navigate(`/event-type/${eventType.id}/edit`)}>
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
              {intl.formatMessage({ id: "event_type.detail.code", defaultMessage: "Code" })}
            </div>
            <div className="mt-1 font-medium text-foreground font-mono">{eventType.code ?? "—"}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Tag className="size-4" />
              {intl.formatMessage({ id: "event_type.detail.proposals", defaultMessage: "Proposals" })}
            </div>
            <div className="mt-1 font-medium text-foreground">{eventType._count.eventProposals}</div>
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="border-b p-4">
            <h3 className="text-lg font-semibold text-foreground">
              {intl.formatMessage({ id: "event_type.detail.proposals_title", defaultMessage: "Event Proposals" })}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {intl.formatMessage({ id: "event_type.detail.proposal_name", defaultMessage: "Name" })}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {intl.formatMessage({ id: "event_type.detail.proposal_status", defaultMessage: "Status" })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {eventType.eventProposals.map((proposal) => (
                  <tr key={proposal.id} className="border-b hover:bg-muted/30">
                    <td className="p-4">
                      <Button variant="ghost" className="p-0 h-auto text-left" onClick={() => navigate(`/event-proposal/${proposal.id}`)}>
                        {proposal.name}
                      </Button>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(proposal.approvalStatus)}
                    </td>
                  </tr>
                ))}
                {eventType.eventProposals.length === 0 && (
                  <tr>
                    <td colSpan={2} className="p-8 text-center text-muted-foreground">
                      {intl.formatMessage({ id: "event_type.detail.no_proposals", defaultMessage: "No event proposals using this type" })}
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
        title={intl.formatMessage({ id: "common.confirm.delete_title", defaultMessage: "Delete event type?" })}
        description={intl.formatMessage({ id: "common.confirm.delete_description", defaultMessage: "This action cannot be undone." })}
        confirmLabel={intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
        onConfirm={handleDelete}
        loading={isDeleting}
      />
    </div>
  );
};
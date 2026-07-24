import { useState } from "react";
import { useIntl } from "react-intl";
import { useNavigate, useParams } from "react-router";
import { useAtomValue } from "jotai";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Shield, Trash2, UserRound } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { useToast } from "../../components/useToast";
import { PageHeader } from "../../components/PageHeader";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { EntityPhoto } from "../../components/EntityPhoto";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type UserDetail = {
  id: string;
  name: string | null;
  email: string;
  photo?: string | null;
  phone?: string | null;
  role: { id: string; name: string; description: string | null } | null;
  permissions?: string[];
  createdAt: string;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export const UserDetailPage = () => {
  const { id } = useParams();
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canUpdate = hasPermission("user@update");
  const canDelete = hasPermission("user@delete");
  const toast = useToast();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["userDetail", id],
    enabled: Boolean(id),
    queryFn: () => trpcClient.user.detail.query({ id: id ?? "" }),
  });

  const record = data as UserDetail | undefined;

  const handleDelete = async () => {
    if (!record || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.user.delete.mutate({ id: record.id });
      await queryClient.invalidateQueries({ queryKey: ["userList"] });
      queryClient.removeQueries({ queryKey: ["userDetail", record.id] });
      setDeleteModalOpen(false);
      navigate("/users");
      toast.success(
        intl.formatMessage({ id: "users.detail.delete_success", defaultMessage: "User deleted" }),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <section
        className="flex flex-col gap-6 pt-2 pb-8"
        data-ai-context={JSON.stringify({ section: "user-detail", loading: true })}
      >
        <Skeleton className="h-16 w-full max-w-xl" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </section>
    );
  }

  if (!record) {
    return (
      <section
        className="flex flex-col gap-6 pt-2 pb-8"
        data-ai-context={JSON.stringify({ section: "user-detail", notFound: true })}
      >
        <PageHeader
          module="user"
          title={intl.formatMessage({
            id: "users.detail.not_found",
            defaultMessage: "User not found.",
          })}
          onBack={() => navigate("/users")}
        />
      </section>
    );
  }

  return (
    <section
      className="flex flex-col gap-6 pt-2 pb-8"
      data-ai-context={JSON.stringify({
        section: "user-detail",
        id: record.id,
        email: record.email,
        roleId: record.role?.id,
      })}
    >
      <PageHeader
        module="user"
        eyebrow={intl.formatMessage({ id: "nav.administration", defaultMessage: "Administration" })}
        title={record.name ?? record.email}
        description={record.email}
        onBack={() => navigate("/users")}
        actions={
          <>
            {canUpdate ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/users/${record.id}/edit`)}
              >
                <Pencil className="size-4" />
                {intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" })}
              </Button>
            ) : null}
            {canDelete ? (
              <Button type="button" variant="destructive" onClick={() => setDeleteModalOpen(true)}>
                <Trash2 className="size-4" />
                {intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
              </Button>
            ) : null}
          </>
        }
      />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-user)_14%,transparent)] text-[var(--module-user)]">
              <UserRound className="size-4" aria-hidden />
            </span>
            {intl.formatMessage({
              id: "users.detail.info",
              defaultMessage: "Account information",
            })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex items-center gap-4">
            <EntityPhoto src={record.photo} alt={record.name ?? record.email} />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground">
                {record.name ?? "—"}
              </p>
              <p className="truncate text-sm text-muted-foreground">{record.email}</p>
            </div>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "users.detail.name", defaultMessage: "Name" })}
              </dt>
              <dd className="text-sm font-medium text-foreground">{record.name ?? "—"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "users.detail.email", defaultMessage: "Email" })}
              </dt>
              <dd className="text-sm text-foreground">{record.email}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "users.detail.phone", defaultMessage: "Phone" })}
              </dt>
              <dd className="text-sm text-foreground">{record.phone ?? "—"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "users.detail.role", defaultMessage: "Role" })}
              </dt>
              <dd className="text-sm font-medium text-foreground">{record.role?.name ?? "—"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "users.detail.created", defaultMessage: "Created" })}
              </dt>
              <dd className="text-sm tabular-nums text-foreground">
                {formatDate(record.createdAt)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-user)_14%,transparent)] text-[var(--module-user)]">
              <Shield className="size-4" aria-hidden />
            </span>
            {intl.formatMessage({ id: "users.detail.role", defaultMessage: "Role" })}
          </CardTitle>
          <CardDescription>{record.role?.name ?? "—"}</CardDescription>
        </CardHeader>
        <CardContent>
          {record.role?.description ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {record.role.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {intl.formatMessage({
                id: "users.detail.no_permissions",
                defaultMessage: "No role description available.",
              })}
            </p>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title={intl.formatMessage({
          id: "users.detail.delete_title",
          defaultMessage: "Delete user",
        })}
        description={intl.formatMessage(
          {
            id: "users.detail.delete_confirm",
            defaultMessage: 'Delete "{name}"? This action cannot be undone.',
          },
          { name: record.name ?? record.email },
        )}
        confirmLabel={intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </section>
  );
};

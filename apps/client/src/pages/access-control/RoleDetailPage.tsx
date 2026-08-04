import { useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, KeyRound, Pencil, Shield, Trash2, Users } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { useToast } from "../../components/useToast";
import { NavButtonGroup } from "../../components/NavButtonGroup";
import { PageHeader } from "../../components/PageHeader";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";

type RolePermission = { permission: { id: string; name: string; description: string | null } };
type RoleUser = { id: string; name: string; email: string };
type RoleDetail = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: RolePermission[];
  users: RoleUser[];
};

export const RoleDetailPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canUpdate = hasPermission("role@update");
  const canDelete = hasPermission("role@delete");
  const toast = useToast();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["roleDetail", id],
    enabled: Boolean(id),
    queryFn: () => trpcClient.accessControl.role.detail.query({ id: id ?? "" }),
  });

  const role = data as unknown as RoleDetail | undefined;

  const handleDelete = async () => {
    if (!role || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.accessControl.role.delete.mutate({ id: role.id });
      await queryClient.invalidateQueries({ queryKey: ["rolesList"] });
      setDeleteModalOpen(false);
      toast.success(
        intl.formatMessage({ id: "roles.detail.delete_success", defaultMessage: "Role deleted" }),
      );
      navigate("/access-control");
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
        data-ai-context={JSON.stringify({ section: "role-detail", loading: true })}
      >
        <Skeleton className="h-16 w-full max-w-xl" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
      </section>
    );
  }

  if (!role) {
    return (
      <section
        className="flex flex-col gap-6 pt-2 pb-8"
        data-ai-context={JSON.stringify({ section: "role-detail", notFound: true })}
      >
        <div className="flex flex-col gap-3">
          <NavButtonGroup className="self-end" onBack={() => navigate("/access-control")} />
          <PageHeader
            module="user"
            title={intl.formatMessage({
              id: "roles.detail.not_found",
              defaultMessage: "Role not found",
            })}
          />
        </div>
      </section>
    );
  }

  const permGroups = new Map<string, string[]>();
  for (const p of role.permissions) {
    const [resource, action] = p.permission.name.split("@");
    const group = permGroups.get(resource) ?? [];
    group.push(action ?? p.permission.name);
    permGroups.set(resource, group);
  }
  const groupedPermissions = Array.from(permGroups.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return (
    <section
      className="flex flex-col gap-6 pt-2 pb-8"
      data-ai-context={JSON.stringify({
        section: "role-detail",
        id: role.id,
        name: role.name,
        permissionCount: role.permissions.length,
        userCount: role.users.length,
      })}
    >
      <div className="flex flex-col gap-3">
        <NavButtonGroup className="self-end" onBack={() => navigate("/access-control")}>
          {canUpdate && !role.isSystem ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/access-control/${role.id}/edit`)}
              className="h-8 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
            >
              <Pencil className="size-3.5" aria-hidden />
              {intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" })}
            </Button>
          ) : null}
          {canDelete && !role.isSystem ? (
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
          module="user"
          eyebrow={intl.formatMessage({ id: "nav.administration", defaultMessage: "Administration" })}
          title={role.name}
          description={role.description ?? undefined}
        />
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-user)_8%,transparent)] text-module-user">
              <Shield className="size-4" aria-hidden />
            </span>
            {intl.formatMessage({ id: "roles.detail.summary", defaultMessage: "Summary" })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "roles.detail.name", defaultMessage: "Name" })}
              </dt>
              <dd className="text-sm font-normal text-foreground">{role.name}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({
                  id: "roles.detail.description",
                  defaultMessage: "Description",
                })}
              </dt>
              <dd className="text-sm font-normal text-foreground">{role.description ?? "—"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "roles.detail.users_count", defaultMessage: "Users" })}
              </dt>
              <dd className="text-sm font-normal tabular-nums text-foreground">{role.users.length}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({
                  id: "roles.detail.permissions_count",
                  defaultMessage: "Permissions",
                })}
              </dt>
              <dd className="text-sm font-normal tabular-nums text-foreground">{role.permissions.length}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-user)_8%,transparent)] text-module-user">
              <KeyRound className="size-4" aria-hidden />
            </span>
            {intl.formatMessage({ id: "roles.detail.permissions", defaultMessage: "Permissions" })}
          </CardTitle>
          <CardDescription>
            {intl.formatMessage(
              {
                id: "roles.detail.permissions_selected",
                defaultMessage: "{count} selected",
              },
              { count: role.permissions.length },
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {groupedPermissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {intl.formatMessage({
                id: "roles.detail.no_permissions",
                defaultMessage: "No permissions assigned.",
              })}
            </p>
          ) : (
            groupedPermissions.map(([resource, actions]) => (
              <div key={resource} className="rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{resource}</p>
                  <Badge variant="secondary">All</Badge>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {actions.map((action) => (
                    <label key={action} className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Checkbox checked disabled />
                      <span>{action}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-user)_8%,transparent)] text-module-user">
              <Users className="size-4" aria-hidden />
            </span>
            {intl.formatMessage({
              id: "roles.detail.assigned_users",
              defaultMessage: "Assigned Users",
            })}
          </CardTitle>
          <CardDescription>{role.users.length}</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {role.users.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              {intl.formatMessage({
                id: "roles.detail.no_users",
                defaultMessage: "No users assigned to this role.",
              })}
            </p>
          ) : (
            <ul className="divide-y">
              {role.users.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/users/${user.id}`)}
                    className="flex w-full cursor-pointer items-center gap-3 px-6 py-3 text-left transition-colors duration-150 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {user.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title={intl.formatMessage({
          id: "roles.index.delete_modal_title",
          defaultMessage: "Delete Role",
        })}
        description={intl.formatMessage(
          {
            id: "roles.index.delete_modal_body",
            defaultMessage:
              "Are you sure you want to delete role {roleName}? This action cannot be undone.",
          },
          { roleName: role.name },
        )}
        confirmLabel={intl.formatMessage({
          id: "roles.index.delete_confirm",
          defaultMessage: "Delete",
        })}
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </section>
  );
};

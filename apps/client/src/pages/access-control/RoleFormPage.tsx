import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useIntl } from "react-intl";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Loader2, Save } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { getFriendlyErrorMessage } from "../../lib/friendlyError";
import { PageHeader } from "../../components/PageHeader";
import { NavButtonGroup } from "../../components/NavButtonGroup";
import { FormSection } from "../../components/FormSection";
import { AiFillButton } from '@/components/AiFillButton';
import { useAiFillForm } from "../../components/AiAssistant/useAiFillForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type RoleFormValues = { name: string; description: string; permissions: string[] };
type RoleDetail = {
  id: string;
  name: string;
  description: string | null;
  permissions: { permission: { id: string; name: string; description: string | null } }[];
};

type ModalStage = "idle" | "loading" | "success" | "error";

const defaultFormValues = (): RoleFormValues => ({ name: "", description: "", permissions: [] });
const transformDetailToFormValues = (detail: RoleDetail): RoleFormValues => ({
  name: detail.name,
  description: detail.description ?? "",
  permissions: detail.permissions.map((p) => p.permission.name),
});

const InnerForm = ({
  initialValues,
  isEdit,
  roleId,
}: {
  initialValues: RoleFormValues;
  isEdit: boolean;
  roleId?: string;
}) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [modalStage, setModalStage] = useState<ModalStage>("idle");
  const [resultMessage, setResultMessage] = useState("");
  const successRedirectIdRef = useRef<string | null>(null);
  const resultTimerRef = useRef<number | null>(null);
  const [formState, setFormState] = useState<RoleFormValues>(initialValues);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const toggleGroupOpen = (resource: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(resource)) next.delete(resource);
      else next.add(resource);
      return next;
    });
  };

  const clearResultTimer = () => {
    if (resultTimerRef.current !== null) {
      window.clearTimeout(resultTimerRef.current);
      resultTimerRef.current = null;
    }
  };
  useEffect(() => () => clearResultTimer(), []);

  const handleModalClose = () => {
    if (modalStage === "loading") return;
    clearResultTimer();
    const redirectId = successRedirectIdRef.current;
    successRedirectIdRef.current = null;
    setModalStage("idle");
    if (redirectId) navigate("/access-control");
  };

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; description?: string; permissionIds: string[] }) =>
      trpcClient.accessControl.role.create.mutate(payload),
    onSuccess: async (created: { id: string }) => {
      await queryClient.invalidateQueries({ queryKey: ["rolesList"] });
      successRedirectIdRef.current = created.id;
      setResultMessage(
        intl.formatMessage({
          id: "roles.form.success_created",
          defaultMessage: "Role created successfully.",
        }),
      );
      setModalStage("success");
      resultTimerRef.current = window.setTimeout(handleModalClose, 1500);
    },
    onError: (e) => {
      setResultMessage(getFriendlyErrorMessage(e, "Failed to create role."));
      setModalStage("error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: {
      currentId: string;
      name?: string;
      description?: string;
      permissionIds?: string[];
    }) => trpcClient.accessControl.role.update.mutate(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rolesList"] });
      successRedirectIdRef.current = roleId ?? null;
      setResultMessage(
        intl.formatMessage({
          id: "roles.form.success_updated",
          defaultMessage: "Role updated successfully.",
        }),
      );
      setModalStage("success");
      resultTimerRef.current = window.setTimeout(handleModalClose, 1500);
    },
    onError: (e) => {
      setResultMessage(getFriendlyErrorMessage(e, "Failed to update role."));
      setModalStage("error");
    },
  });

  const { data: permissionsData } = useQuery({
    queryKey: ["permissionsList"],
    queryFn: () => trpcClient.accessControl.permission.list.query({ page: 1, limit: 100 }),
  });

  const allPermissions = (permissionsData?.data ?? []) as {
    id: string;
    name: string;
    description: string | null;
  }[];

  const grouped = useMemo(() => {
    const map = new Map<string, { id: string; name: string; description: string | null }[]>();
    for (const p of allPermissions) {
      const [resource] = p.name.split("@");
      const group = map.get(resource) ?? [];
      group.push(p);
      map.set(resource, group);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [allPermissions]);

  useEffect(() => {
    if (grouped.length > 0) {
      setOpenGroups(new Set(grouped.map(([resource]) => resource)));
    }
  }, [grouped]);

  const isPending = createMutation.isPending || updateMutation.isPending;
  const nameError = !formState.name.trim()
    ? intl.formatMessage({
        id: "roles.form.error_name_required",
        defaultMessage: "Role name is required.",
      })
    : null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (nameError) return;
    const selectedIds = allPermissions
      .filter((p) => formState.permissions.includes(p.name))
      .map((p) => p.id);
    setModalStage("loading");
    if (isEdit && roleId) {
      updateMutation.mutate({
        currentId: roleId,
        name: formState.name,
        description: formState.description || undefined,
        permissionIds: selectedIds,
      });
    } else {
      createMutation.mutate({
        name: formState.name,
        description: formState.description || undefined,
        permissionIds: selectedIds,
      });
    }
  };

  const togglePermission = (name: string, checked: boolean) => {
    setFormState((prev) => ({
      ...prev,
      permissions: checked
        ? Array.from(new Set([...prev.permissions, name]))
        : prev.permissions.filter((p) => p !== name),
    }));
  };

  const toggleGroup = (names: string[], checked: boolean) => {
    setFormState((prev) => ({
      ...prev,
      permissions: checked
        ? Array.from(new Set([...prev.permissions, ...names]))
        : prev.permissions.filter((p) => !names.includes(p)),
    }));
  };

  useAiFillForm({
    name: (v: unknown) => setFormState((prev) => ({ ...prev, name: String(v) })),
    description: (v: unknown) => setFormState((prev) => ({ ...prev, description: String(v) })),
    permissions: (v: unknown) => {
      if (Array.isArray(v)) {
        setFormState((prev) => ({
          ...prev,
          permissions: v.map((p) => String(p)),
        }));
      }
    },
  });

  return (
    <section
      className="flex flex-col gap-3 pt-1 pb-6"
      data-ai-context={JSON.stringify({
        section: "access-control-form",
        isEdit,
        id: roleId ?? null,
      })}
    >
      <NavButtonGroup
        className="self-end"
        onBack={() => navigate("/access-control")}
      />

      <PageHeader
          module="user"
          title={
            isEdit
              ? intl.formatMessage({ id: "roles.form.title_edit", defaultMessage: "Edit role" })
              : intl.formatMessage({
                  id: "roles.form.title_create",
                  defaultMessage: "Create role",
                })
          }
          description={
            isEdit
              ? intl.formatMessage({
                  id: "roles.form.subtitle_edit",
                  defaultMessage: "Update role details",
                })
              : intl.formatMessage({
                  id: "roles.form.subtitle_create",
                  defaultMessage: "Create a new role with permissions",
                })
          }
        />

        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <AiFillButton
          section="access-control-form"
          context={{ isEdit, id: roleId ?? null }}
          options={{
            permissionList: allPermissions.map((p) => ({ name: p.name, description: p.description })),
          }}
        />

        <FormSection
          title={intl.formatMessage({ id: "roles.form.identity", defaultMessage: "Identity" })}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="role-name">
                {intl.formatMessage({ id: "roles.form.name", defaultMessage: "Name" })}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="role-name"
                value={formState.name}
                onChange={(e) => setFormState((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Sales Manager"
                aria-invalid={Boolean(nameError)}
              />
              {nameError ? <p className="text-xs text-destructive">{nameError}</p> : null}
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="role-description">
                {intl.formatMessage({
                  id: "roles.form.description",
                  defaultMessage: "Description",
                })}
              </Label>
              <Input
                id="role-description"
                value={formState.description}
                onChange={(e) => setFormState((p) => ({ ...p, description: e.target.value }))}
                placeholder="What does this role do?"
              />
            </div>
          </div>
        </FormSection>

        <FormSection
          title={intl.formatMessage({
            id: "roles.form.permissions",
            defaultMessage: "Permissions",
          })}
          description={
            <>
              <strong>{formState.permissions.length}</strong> / {allPermissions.length} permissions
            </>
          }
          action={
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7"
                onClick={() =>
                  setFormState((p) => ({
                    ...p,
                    permissions: allPermissions.map((perm) => perm.name),
                  }))
                }
              >
                Select all
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7"
                onClick={() => setFormState((p) => ({ ...p, permissions: [] }))}
              >
                Clear
              </Button>
            </>
          }
        >
          <div className="space-y-2">
            {grouped.map(([resource, perms]) => {
              const selectedInGroup = perms.filter((p) => formState.permissions.includes(p.name));
              const selectedCount = selectedInGroup.length;
              const allChecked = selectedCount === perms.length && perms.length > 0;
              const someChecked = selectedCount > 0 && !allChecked;
              const isOpen = openGroups.has(resource);
              return (
                <div key={resource} className="rounded-md border border-border/70">
                  <div className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{resource}</p>
                      <Badge variant={allChecked ? "default" : selectedCount > 0 ? "secondary" : "outline"}>
                        {allChecked ? "All" : `${selectedCount}/${perms.length}`}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={allChecked ? true : someChecked ? "indeterminate" : false}
                        onCheckedChange={(checked) =>
                          toggleGroup(
                            perms.map((p) => p.name),
                            checked === true,
                          )
                        }
                        aria-label={`Select all ${resource} permissions`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => toggleGroupOpen(resource)}
                        aria-expanded={isOpen}
                        aria-label={`${isOpen ? "Collapse" : "Expand"} ${resource} permissions`}
                      >
                        <ChevronDown
                          className={cn(
                            "size-4 transition-transform duration-150",
                            isOpen ? "rotate-0" : "-rotate-90",
                          )}
                        />
                      </Button>
                    </div>
                  </div>
                  {isOpen ? (
                    <div className="grid gap-2 border-t px-3 py-2 sm:grid-cols-2 lg:grid-cols-3">
                      {perms.map((p) => (
                        <label
                          key={p.id}
                          className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-foreground"
                        >
                          <Checkbox
                            checked={formState.permissions.includes(p.name)}
                            onCheckedChange={(checked) =>
                              togglePermission(p.name, checked === true)
                            }
                          />
                          <span>{p.name.split("@")[1] ?? p.name}</span>
                        </label>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </FormSection>
      
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-3">
          <Button size="sm" className="h-8 gap-1.5 px-2.5" type="submit" disabled={isPending || Boolean(nameError)}>
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Save className="size-3.5" aria-hidden />
              )}
              {isEdit
                ? intl.formatMessage({ id: "common.action.save", defaultMessage: "Save" })
                : intl.formatMessage({ id: "common.action.create", defaultMessage: "Create" })}
            </Button>
        </div>
</form>

      <Dialog
        open={modalStage === "loading" || modalStage === "success" || modalStage === "error"}
        onOpenChange={(open) => {
          if (!open && modalStage !== "loading") handleModalClose();
        }}
      >
        <DialogContent showCloseButton={modalStage !== "loading"} className="sm:max-w-md">
          {modalStage === "loading" ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="size-8 animate-spin text-foreground" aria-hidden />
              <DialogDescription>
                {intl.formatMessage({ id: "common.loading", defaultMessage: "Saving…" })}
              </DialogDescription>
            </div>
          ) : null}
          {modalStage === "success" ? (
            <DialogHeader>
              <DialogTitle>
                {intl.formatMessage({
                  id: "roles.form.modal.success",
                  defaultMessage: "Success!",
                })}
              </DialogTitle>
              <DialogDescription>{resultMessage}</DialogDescription>
            </DialogHeader>
          ) : null}
          {modalStage === "error" ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {intl.formatMessage({ id: "common.error", defaultMessage: "Error" })}
                </DialogTitle>
                <DialogDescription>{resultMessage}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleModalClose}>
                  {intl.formatMessage({ id: "common.action.close", defaultMessage: "Close" })}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export const RoleFormPage = () => {
  const { id } = useParams();
  const intl = useIntl();
  const isEdit = Boolean(id);

  const { data, isLoading } = useQuery({
    queryKey: ["roleDetail", id],
    enabled: isEdit,
    queryFn: () => trpcClient.accessControl.role.detail.query({ id: id ?? "" }),
  });

  if (isEdit && isLoading) {
    return (
      <section
        className="flex flex-col gap-3 pt-1 pb-6"
        data-ai-context={JSON.stringify({ section: "access-control-form", loading: true })}
      >
        <Skeleton className="h-16 w-full max-w-xl" />
        <Skeleton className="h-48 w-full" />
      </section>
    );
  }

  const initialValues =
    isEdit && data ? transformDetailToFormValues(data as RoleDetail) : defaultFormValues();

  return (
    <InnerForm
      key={isEdit ? (id ?? "new") : "new"}
      initialValues={initialValues}
      isEdit={isEdit}
      roleId={id}
    />
  );
};

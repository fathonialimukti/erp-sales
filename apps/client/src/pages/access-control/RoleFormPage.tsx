import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useIntl } from "react-intl";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { trpcClient } from "../../lib/trpc";
import { Spinner } from "../../ui/Spinner";
import { Checkbox } from "../../ui/Checkbox";
import { ModulePage } from "../../components/ModulePage";

type RoleFormValues = { name: string; description: string; permissions: string[] };
type RoleDetail = { id: string; name: string; description: string | null; permissions: { permission: { id: string; name: string; description: string | null } }[] };

const defaultFormValues = (): RoleFormValues => ({ name: "", description: "", permissions: [] });
const transformDetailToFormValues = (detail: RoleDetail): RoleFormValues => ({
  name: detail.name,
  description: detail.description ?? "",
  permissions: detail.permissions.map((p) => p.permission.name),
});

const BackIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
);
const CheckIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const ChevronIcon = () => (
  <svg className="m-perm-group__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const InnerForm = ({ initialValues, isEdit, roleId }: { initialValues: RoleFormValues; isEdit: boolean; roleId?: string }) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [modalStage, setModalStage] = useState<"idle" | "loading" | "success" | "error">("idle");
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

  const clearResultTimer = () => { if (resultTimerRef.current !== null) { window.clearTimeout(resultTimerRef.current); resultTimerRef.current = null; } };
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
    mutationFn: (payload: { name: string; description?: string; permissionIds: string[] }) => trpcClient.role.create.mutate(payload),
    onSuccess: async (created: { id: string }) => {
      await queryClient.invalidateQueries({ queryKey: ["rolesList"] });
      successRedirectIdRef.current = created.id;
      setResultMessage(intl.formatMessage({ id: "roles.form.success_created", defaultMessage: "Role created successfully." }));
      setModalStage("success");
      resultTimerRef.current = window.setTimeout(handleModalClose, 1500);
    },
    onError: (e) => { setResultMessage(e instanceof Error ? e.message : "Failed to create role."); setModalStage("error"); },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { currentId: string; name?: string; description?: string; permissionIds?: string[] }) => trpcClient.role.update.mutate(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rolesList"] });
      successRedirectIdRef.current = roleId ?? null;
      setResultMessage(intl.formatMessage({ id: "roles.form.success_updated", defaultMessage: "Role updated successfully." }));
      setModalStage("success");
      resultTimerRef.current = window.setTimeout(handleModalClose, 1500);
    },
    onError: (e) => { setResultMessage(e instanceof Error ? e.message : "Failed to update role."); setModalStage("error"); },
  });

  const { data: permissionsData } = useQuery({
    queryKey: ["permissionsList"],
    queryFn: () => trpcClient.permission.list.query({ page: 1, limit: 100 }),
  });

  const allPermissions = (permissionsData?.data ?? []) as { id: string; name: string; description: string | null }[];

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

  // Expand all permission groups by default once data is loaded.
  useEffect(() => {
    if (grouped.length > 0) {
      setOpenGroups(new Set(grouped.map(([resource]) => resource)));
    }
  }, [grouped]);

  const isPending = createMutation.isPending || updateMutation.isPending;
  const nameError = !formState.name.trim() ? intl.formatMessage({ id: "roles.form.error_name_required", defaultMessage: "Role name is required." }) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameError) return;
    const selectedIds = allPermissions.filter((p) => formState.permissions.includes(p.name)).map((p) => p.id);
    setModalStage("loading");
    if (isEdit && roleId) {
      updateMutation.mutate({ currentId: roleId, name: formState.name, description: formState.description || undefined, permissionIds: selectedIds });
    } else {
      createMutation.mutate({ name: formState.name, description: formState.description || undefined, permissionIds: selectedIds });
    }
  };

  const togglePermission = (name: string, checked: boolean) => {
    setFormState((prev) => ({ ...prev, permissions: checked ? Array.from(new Set([...prev.permissions, name])) : prev.permissions.filter((p) => p !== name) }));
  };

  const toggleGroup = (names: string[], checked: boolean) => {
    setFormState((prev) => ({ ...prev, permissions: checked ? Array.from(new Set([...prev.permissions, ...names])) : prev.permissions.filter((p) => !names.includes(p)) }));
  };

  return (
    <ModulePage accent="#22D3EE" accentEnd="#0E7490" aiContext={{ section: "access-control-form", isEdit, id: roleId ?? null }}>
      <form className="m-form" onSubmit={handleSubmit}>
        <div className="m-form__header">
          <div>
            <h1 className="m-form__title">{isEdit ? intl.formatMessage({ id: "roles.form.title_edit", defaultMessage: "Edit role" }) : intl.formatMessage({ id: "roles.form.title_create", defaultMessage: "Create role" })}</h1>
            <p className="m-form__subtitle">{isEdit ? "Update role details" : "Create a new role with permissions"}</p>
          </div>
          <button type="button" className="m-form__back" onClick={() => navigate("/access-control")}>
            <BackIcon />
            {intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" })}
          </button>
        </div>

        <section className="m-card">
          <div className="m-card__header">
            <h2 className="m-card__title">{intl.formatMessage({ id: "roles.form.identity", defaultMessage: "Identity" })}</h2>
          </div>
          <div className="m-card__body">
            <div className="m-section">
              <div className="m-field">
                <label className="m-field__label">{intl.formatMessage({ id: "roles.form.name", defaultMessage: "Name" })} *</label>
                <input className="m-field__input" type="text" value={formState.name} onChange={(e) => setFormState((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Sales Manager" />
                {nameError ? <span className="m-field__error">{nameError}</span> : null}
              </div>
              <div className="m-field">
                <label className="m-field__label">{intl.formatMessage({ id: "roles.form.description", defaultMessage: "Description" })}</label>
                <input className="m-field__input" type="text" value={formState.description} onChange={(e) => setFormState((p) => ({ ...p, description: e.target.value }))} placeholder="What does this role do?" />
              </div>
            </div>
          </div>
        </section>

        <section className="m-card">
          <div className="m-card__header">
            <h2 className="m-card__title">{intl.formatMessage({ id: "roles.form.permissions", defaultMessage: "Permissions" })}</h2>
            <p className="m-card__hint">{formState.permissions.length} selected</p>
          </div>
          <div className="m-card__body">
            <div className="m-perms-toolbar">
              <span className="m-perms-toolbar__count">
                <strong>{formState.permissions.length}</strong> / {allPermissions.length} permissions
              </span>
              <div className="m-perms-toolbar__actions">
                <button
                  type="button"
                  className="m-perms-toolbar__btn m-perms-toolbar__btn--primary"
                  onClick={() => setFormState((p) => ({ ...p, permissions: allPermissions.map((perm) => perm.name) }))}
                >
                  Select all
                </button>
                <button
                  type="button"
                  className="m-perms-toolbar__btn"
                  onClick={() => setFormState((p) => ({ ...p, permissions: [] }))}
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="m-perms">
              {grouped.map(([resource, perms]) => {
                const selectedInGroup = perms.filter((p) => formState.permissions.includes(p.name));
                const selectedCount = selectedInGroup.length;
                const allChecked = selectedCount === perms.length;
                const someChecked = selectedCount > 0 && !allChecked;
                const isOpen = openGroups.has(resource);
                return (
                  <div key={resource} className={`m-perm-group${isOpen ? " m-perm-group--open" : ""}`}>
                    <div className="m-perm-group__head">
                      <span className="m-perm-group__head-left">
                        <span className="m-perm-group__title">{resource}</span>
                        <span className={`m-perm-group__count${selectedCount > 0 ? " m-perm-group__count--active" : ""}${allChecked ? " m-perm-group__count--full" : ""}`}>
                          {allChecked ? "All" : `${selectedCount}/${perms.length}`}
                        </span>
                      </span>
                      <span className="m-perm-group__head-right">
                        <Checkbox
                          checked={allChecked}
                          indeterminate={someChecked}
                          onChange={(checked) => toggleGroup(perms.map((p) => p.name), checked)}
                          aria-label={`Select all ${resource} permissions`}
                        />
                        <button
                          type="button"
                          className="m-perm-group__toggle"
                          onClick={() => toggleGroupOpen(resource)}
                          aria-expanded={isOpen}
                          aria-label={`${isOpen ? "Collapse" : "Expand"} ${resource} permissions`}
                        >
                          <ChevronIcon />
                        </button>
                      </span>
                    </div>
                    <div className="m-perm-group__body">
                      <div className="m-perm-group__body-inner">
                        <div className="m-perm-grid">
                          {perms.map((p) => (
                            <Checkbox
                              key={p.id}
                              checked={formState.permissions.includes(p.name)}
                              onChange={(checked) => togglePermission(p.name, checked)}
                              label={p.name.split("@")[1] ?? p.name}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="m-actions">
          <button type="submit" className="m-btn m-btn--primary" disabled={isPending || !!nameError}>
            {isPending ? <span className="m-spinner" /> : null}
            {isEdit ? intl.formatMessage({ id: "common.action.save", defaultMessage: "Save" }) : intl.formatMessage({ id: "common.action.create", defaultMessage: "Create" })}
          </button>
        </div>
      </form>

      {modalStage !== "idle" && createPortal(
        <div className="m-modal__backdrop" onClick={() => modalStage !== "loading" && handleModalClose()}>
          <div className="m-modal" onClick={(e) => e.stopPropagation()}>
            {modalStage === "loading" && (
              <div className="m-modal__body">
                <div className="m-modal__icon m-modal__icon--success">
                  <span className="m-spinner m-spinner--lg" />
                </div>
                <p className="m-modal__msg">{intl.formatMessage({ id: "common.loading", defaultMessage: "Saving…" })}</p>
              </div>
            )}
            {modalStage === "success" && (
              <div className="m-modal__body">
                <div className="m-modal__icon m-modal__icon--success"><CheckIcon /></div>
                <h3 className="m-modal__title">{intl.formatMessage({ id: "roles.form.modal.success", defaultMessage: "Success!" })}</h3>
                <p className="m-modal__msg">{resultMessage}</p>
              </div>
            )}
            {modalStage === "error" && (
              <>
                <div className="m-modal__header">
                  <h3>{intl.formatMessage({ id: "common.error", defaultMessage: "Error" })}</h3>
                  <button className="m-btn m-btn--ghost m-btn--sm" onClick={handleModalClose} aria-label="Close"><CloseIcon /></button>
                </div>
                <div className="m-modal__body">
                  <p className="m-modal__msg">{resultMessage}</p>
                </div>
                <div className="m-modal__footer">
                  <button className="m-btn m-btn--ghost" onClick={handleModalClose}>{intl.formatMessage({ id: "common.action.close", defaultMessage: "Close" })}</button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
    </ModulePage>
  );
};

export const RoleFormPage = () => {
  const { id } = useParams();
  const intl = useIntl();
  const isEdit = Boolean(id);

  const { data, isLoading } = useQuery({
    queryKey: ["roleDetail", id],
    enabled: isEdit,
    queryFn: () => trpcClient.role.detail.query({ id: id ?? "" }),
  });

  if (isEdit && isLoading) {
    return (
      <ModulePage accent="#22D3EE" accentEnd="#0E7490" aiContext={{ section: "access-control-form", loading: true }}>
        <div className="m-state m-state--loading">
          <Spinner size="lg" />
          <span className="m-state__title">{intl.formatMessage({ id: "common.loading", defaultMessage: "Loading…" })}</span>
        </div>
      </ModulePage>
    );
  }

  const initialValues = isEdit && data ? transformDetailToFormValues(data as RoleDetail) : defaultFormValues();

  return <InnerForm key={isEdit ? (id ?? "new") : "new"} initialValues={initialValues} isEdit={isEdit} roleId={id} />;
};

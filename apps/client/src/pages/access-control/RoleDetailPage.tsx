import { useState } from "react";
import { createPortal } from "react-dom";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { ButtonGroup } from "../../components/ButtonGroup";
import { Spinner } from "../../ui/Spinner";
import { useToast } from "../../ui/useToast";
import { ModulePage, ModuleDetailHero, ModuleDetailSummary } from "../../components/ModulePage";

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

const BackIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
);
const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9 M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4z" />
  </svg>
);
const DeleteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

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
      toast.success(intl.formatMessage({ id: "roles.detail.delete_success", defaultMessage: "Role deleted" }));
      navigate("/access-control");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <ModulePage accent="#22D3EE" accentEnd="#0E7490" aiContext={{ section: "role-detail", loading: true }}>
        <div className="m-state m-state--loading">
          <Spinner size="lg" />
          <span className="m-state__title">{intl.formatMessage({ id: "common.loading", defaultMessage: "Loading…" })}</span>
        </div>
      </ModulePage>
    );
  }

  if (!role) {
    return (
      <ModulePage accent="#22D3EE" accentEnd="#0E7490" aiContext={{ section: "role-detail", notFound: true }}>
        <div className="m-state">
          <span className="m-state__title">{intl.formatMessage({ id: "roles.detail.not_found", defaultMessage: "Role not found" })}</span>
          <button type="button" className="m-state__cta" onClick={() => navigate("/access-control")}>
            <BackIcon />
            {intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" })}
          </button>
        </div>
      </ModulePage>
    );
  }

  // Group permissions by resource for display
  const permGroups = new Map<string, string[]>();
  for (const p of role.permissions) {
    const [resource, action] = p.permission.name.split("@");
    const group = permGroups.get(resource) ?? [];
    group.push(action ?? p.permission.name);
    permGroups.set(resource, group);
  }
  const groupedPermissions = Array.from(permGroups.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <ModulePage accent="#22D3EE" accentEnd="#0E7490" aiContext={{ section: "role-detail", id: role.id, name: role.name, permissionCount: role.permissions.length, userCount: role.users.length }}>
      <ModuleDetailHero
        kicker={intl.formatMessage({ id: "nav.administration", defaultMessage: "Administration" })}
        title={role.name}
        subtitle={role.description ?? undefined}
        actions={
          <ButtonGroup
            size="md"
            items={[
              { key: "back", label: intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" }), icon: <BackIcon />, to: "/access-control" },
              ...(canUpdate && !role.isSystem ? [{ key: "edit", label: intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" }), icon: <EditIcon />, to: `/access-control/${role.id}/edit` }] : []),
              ...(canDelete && !role.isSystem ? [{ key: "delete", label: intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" }), icon: <DeleteIcon />, onClick: () => setDeleteModalOpen(true), variant: "danger" as const }] : []),
            ]}
          />
        }
      />

      <ModuleDetailSummary
        fields={[
          { label: intl.formatMessage({ id: "roles.detail.name", defaultMessage: "Name" }), value: role.name },
          { label: intl.formatMessage({ id: "roles.detail.description", defaultMessage: "Description" }), value: role.description ?? "—" },
          { label: intl.formatMessage({ id: "roles.detail.users_count", defaultMessage: "Users" }), value: role.users.length },
          { label: intl.formatMessage({ id: "roles.detail.permissions_count", defaultMessage: "Permissions" }), value: role.permissions.length },
        ]}
      />

      {/* Permissions */}
      <section className="m-card">
        <div className="m-card__header">
          <h2 className="m-card__title">{intl.formatMessage({ id: "roles.detail.permissions", defaultMessage: "Permissions" })}</h2>
          <p className="m-card__hint">{role.permissions.length} selected</p>
        </div>
        <div className="m-card__body">
          {groupedPermissions.length === 0 ? (
            <p className="m-card__hint">{intl.formatMessage({ id: "roles.detail.no_permissions", defaultMessage: "No permissions assigned." })}</p>
          ) : (
            <div className="m-perms">
              {groupedPermissions.map(([resource, actions]) => (
                <div key={resource} className="m-perm-group m-perm-group--open">
                  <div className="m-perm-group__head">
                    <span className="m-perm-group__head-left">
                      <span className="m-perm-group__title">{resource}</span>
                      <span className="m-perm-group__count m-perm-group__count--active m-perm-group__count--full">All</span>
                    </span>
                  </div>
                  <div className="m-perm-group__body">
                    <div className="m-perm-group__body-inner">
                      <div className="m-perm-grid">
                        {actions.map((action) => (
                          <div key={action} className="chk-wrapper">
                            <label className="chk-label">
                              <input className="chk-input" type="checkbox" checked readOnly />
                              <span className="chk-box" aria-hidden="true" />
                              <span className="chk-text">
                                <span className="chk-text__label">{action}</span>
                              </span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Assigned users */}
      <section className="m-card">
        <div className="m-card__header">
          <h2 className="m-card__title">{intl.formatMessage({ id: "roles.detail.assigned_users", defaultMessage: "Assigned Users" })}</h2>
          <p className="m-card__hint">{role.users.length}</p>
        </div>
        <div className="m-card__body">
          {role.users.length === 0 ? (
            <p className="m-card__hint">{intl.formatMessage({ id: "roles.detail.no_users", defaultMessage: "No users assigned to this role." })}</p>
          ) : (
            <div className="m-table-card" style={{ background: "transparent", border: "none", boxShadow: "none", backdropFilter: "none", padding: 0 }}>
              <table className="m-table">
                <thead>
                  <tr>
                    <th>{intl.formatMessage({ id: "roles.detail.user_name", defaultMessage: "Name" })}</th>
                    <th>{intl.formatMessage({ id: "roles.detail.user_email", defaultMessage: "Email" })}</th>
                  </tr>
                </thead>
                <tbody>
                  {role.users.map((user) => (
                    <tr key={user.id} className="m-row" style={{ cursor: "pointer" }} onClick={() => navigate(`/users/${user.id}`)}>
                      <td><span className="m-doc"><span className="m-doc__text"><span className="m-doc__code">{user.name}</span></span></span></td>
                      <td><span className="m-cell"><span className="m-cell__primary m-cell__primary--muted">{user.email}</span></span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {deleteModalOpen && createPortal(
        <div className="m-modal__backdrop" onClick={() => !isDeleting && setDeleteModalOpen(false)}>
          <div className="m-modal" onClick={(e) => e.stopPropagation()}>
            <div className="m-modal__header">
              <h3>{intl.formatMessage({ id: "roles.index.delete_modal_title", defaultMessage: "Delete Role" })}</h3>
              <button className="m-btn m-btn--ghost m-btn--sm" onClick={() => setDeleteModalOpen(false)} aria-label="Close" disabled={isDeleting}><CloseIcon /></button>
            </div>
            <div className="m-modal__body">
              <p className="m-modal__msg">{intl.formatMessage({ id: "roles.index.delete_modal_body", defaultMessage: "Are you sure you want to delete role {roleName}? This action cannot be undone." }, { roleName: role.name })}</p>
            </div>
            <div className="m-modal__footer">
              <button className="m-btn m-btn--ghost" onClick={() => setDeleteModalOpen(false)} disabled={isDeleting}>{intl.formatMessage({ id: "roles.index.delete_cancel", defaultMessage: "Cancel" })}</button>
              <button className="m-btn m-btn--danger" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? <span className="m-spinner" /> : null}
                {isDeleting ? intl.formatMessage({ id: "roles.index.delete_deleting", defaultMessage: "Deleting..." }) : intl.formatMessage({ id: "roles.index.delete_confirm", defaultMessage: "Delete" })}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </ModulePage>
  );
};

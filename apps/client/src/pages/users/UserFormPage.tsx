import { useEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { Loader2, Save } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { PageHeader } from "../../components/PageHeader";
import { NavButtonGroup } from "../../components/NavButtonGroup";
import { FormSection } from "../../components/FormSection";
import { ImageUploadField } from "../../components/ImageUploadField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

type UserFormValues = {
  name: string;
  email: string;
  password: string;
  roleId: string;
  photo: string;
};

type UserDetail = {
  id: string;
  name: string | null;
  email: string;
  photo?: string | null;
  role: { id: string; name: string } | null;
};

type ModalStage = "idle" | "loading" | "success" | "error";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

const defaultFormValues = (): UserFormValues => ({
  name: "",
  email: "",
  password: "",
  roleId: "",
  photo: "",
});

const transformDetailToFormValues = (detail: UserDetail): UserFormValues => ({
  name: detail.name ?? "",
  email: detail.email,
  password: "",
  roleId: detail.role?.id ?? "",
  photo: detail.photo ?? "",
});

const InnerForm = ({
  initialValues,
  isEdit,
  userId,
}: {
  initialValues: UserFormValues;
  isEdit: boolean;
  userId?: string;
}) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [modalStage, setModalStage] = useState<ModalStage>("idle");
  const [resultMessage, setResultMessage] = useState("");
  const successRedirectIdRef = useRef<string | null>(null);
  const resultTimerRef = useRef<number | null>(null);

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
    if (redirectId) navigate(`/users/${redirectId}`);
  };

  const createMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      email: string;
      password: string;
      roleId: string;
      photo?: string;
    }) => trpcClient.user.create.mutate(payload),
    onSuccess: async (created: { id: string }) => {
      await queryClient.invalidateQueries({ queryKey: ["userList"] });
      queryClient.removeQueries({ queryKey: ["userDetail", created.id] });
      successRedirectIdRef.current = created.id;
      setResultMessage(
        intl.formatMessage({
          id: "users.form.success_created",
          defaultMessage: "User created successfully.",
        }),
      );
      setModalStage("success");
      resultTimerRef.current = window.setTimeout(handleModalClose, 1500);
    },
    onError: (e) => {
      setResultMessage(e instanceof Error ? e.message : "Failed to create user.");
      setModalStage("error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      name?: string;
      email?: string;
      password?: string;
      roleId?: string;
      photo?: string;
    }) => trpcClient.user.update.mutate(payload),
    onSuccess: async (updated: { id: string }) => {
      await queryClient.invalidateQueries({ queryKey: ["userList"] });
      await queryClient.invalidateQueries({ queryKey: ["userDetail", updated.id] });
      successRedirectIdRef.current = updated.id;
      setResultMessage(
        intl.formatMessage({
          id: "users.form.success_updated",
          defaultMessage: "User updated successfully.",
        }),
      );
      setModalStage("success");
      resultTimerRef.current = window.setTimeout(handleModalClose, 1500);
    },
    onError: (e) => {
      setResultMessage(e instanceof Error ? e.message : "Failed to update user.");
      setModalStage("error");
    },
  });

  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      setModalStage("loading");
      const photo = value.photo || undefined;
      if (isEdit && userId) {
        updateMutation.mutate({
          id: userId,
          name: value.name,
          email: value.email,
          roleId: value.roleId,
          ...(value.password ? { password: value.password } : {}),
          ...(photo ? { photo } : {}),
        });
      } else {
        createMutation.mutate({
          name: value.name,
          email: value.email,
          password: value.password,
          roleId: value.roleId,
          photo,
        });
      }
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const { data: rolesData } = useQuery({
    queryKey: ["rolesListForSelect"],
    queryFn: () => trpcClient.accessControl.role.list.query({ page: 1, limit: 100 }),
  });

  const roleOptions = (rolesData?.data ?? []) as { id: string; name: string }[];

  return (
    <section
      className="flex flex-col gap-3 pt-1 pb-6"
      data-ai-context={JSON.stringify({
        section: "user-form",
        isEdit,
        id: userId ?? null,
      })}
    >
      <NavButtonGroup
        onBack={() => navigate(isEdit && userId ? `/users/${userId}` : "/users")}
      />

      <PageHeader
        module="user"
          title={
            isEdit
              ? intl.formatMessage({ id: "users.form.title_edit", defaultMessage: "Edit user" })
              : intl.formatMessage({
                  id: "users.form.title_create",
                  defaultMessage: "Create user",
                })
          }
          description={
            isEdit
              ? intl.formatMessage({
                  id: "users.form.subtitle_edit",
                  defaultMessage: "Update user account details",
                })
              : intl.formatMessage({
                  id: "users.form.subtitle_create",
                  defaultMessage: "Create a new system user",
                })
          }
        />

        <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <FormSection
          title={intl.formatMessage({ id: "users.form.identity", defaultMessage: "Identity" })}
          description={intl.formatMessage({
            id: "users.form.identity_description",
            defaultMessage: "Display name and contact details.",
          })}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <form.Field
              name="name"
              validators={{
                onChange: ({ value }) =>
                  value && value.trim().length > 0 ? undefined : "Name is required.",
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="user-name">
                    {intl.formatMessage({ id: "users.form.name", defaultMessage: "Name" })}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="user-name"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                  {field.state.meta.errors.map((error, i) => (
                    <p key={i} className="text-xs text-destructive">
                      {String(error)}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>

            <form.Field
              name="email"
              validators={{
                onChange: ({ value }) =>
                  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value ?? "")
                    ? undefined
                    : "Invalid email address.",
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="user-email">
                    {intl.formatMessage({ id: "users.form.email", defaultMessage: "Email" })}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="user-email"
                    type="email"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                  {field.state.meta.errors.map((error, i) => (
                    <p key={i} className="text-xs text-destructive">
                      {String(error)}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>

            <form.Field
              name="password"
              validators={{
                onChange: ({ value }) => {
                  if (isEdit) return undefined;
                  if (!value || value.length < 6) return "Password must be at least 6 characters.";
                  return undefined;
                },
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="user-password">
                    {intl.formatMessage({ id: "users.form.password", defaultMessage: "Password" })}
                    {!isEdit ? <span className="text-destructive">*</span> : null}
                  </Label>
                  <Input
                    id="user-password"
                    type="password"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder={isEdit ? "Leave blank to keep current" : ""}
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                  {field.state.meta.errors.map((error, i) => (
                    <p key={i} className="text-xs text-destructive">
                      {String(error)}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>

            <form.Field
              name="roleId"
              validators={{
                onChange: ({ value }) => (value ? undefined : "Role is required."),
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="user-role">
                    {intl.formatMessage({ id: "users.form.role", defaultMessage: "Role" })}
                    <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="user-role"
                    className={selectClass}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={field.state.meta.errors.length > 0}
                  >
                    <option value="">
                      {intl.formatMessage({
                        id: "users.form.select_role",
                        defaultMessage: "Select a role…",
                      })}
                    </option>
                    {roleOptions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  {field.state.meta.errors.map((error, i) => (
                    <p key={i} className="text-xs text-destructive">
                      {String(error)}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>
          </div>
        </FormSection>

        <FormSection
          title={intl.formatMessage({ id: "users.form.photo", defaultMessage: "Profile photo" })}
          description={intl.formatMessage({
            id: "users.form.photo_description",
            defaultMessage: "Square image, at least 256×256px.",
          })}
        >
          <form.Field name="photo">
            {(field) => (
              <ImageUploadField
                value={field.state.value}
                onChange={(v) => field.handleChange(v ?? "")}
              />
            )}
          </form.Field>
        </FormSection>
      
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-3">
          <Button size="sm" type="submit" disabled={isPending}>
              {isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Save className="size-4" aria-hidden />
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
              <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
              <DialogDescription>
                {intl.formatMessage({ id: "common.loading", defaultMessage: "Saving…" })}
              </DialogDescription>
            </div>
          ) : null}
          {modalStage === "success" ? (
            <DialogHeader>
              <DialogTitle>
                {intl.formatMessage({ id: "common.success", defaultMessage: "Success!" })}
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

const UserFormPage = () => {
  const { id } = useParams();
  const intl = useIntl();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["userDetail", id],
    enabled: isEdit,
    queryFn: () => trpcClient.user.detail.query({ id: id ?? "" }),
  });

  if (isEdit) {
    if (isLoading) {
      return (
        <section
          className="flex flex-col gap-3 pt-1 pb-6"
          data-ai-context={JSON.stringify({ section: "user-form", loading: true })}
        >
          <Skeleton className="h-16 w-full max-w-xl" />
          <Skeleton className="h-48 w-full" />
        </section>
      );
    }
    if (isError) {
      return (
        <section
          className="flex flex-col gap-3 pt-1 pb-6"
          data-ai-context={JSON.stringify({ section: "user-form", error: true })}
        >
          <PageHeader
        module="user"
            title={error instanceof Error ? error.message : "Failed to load user."}
        />
        </section>
      );
    }
    if (!data) {
      return (
        <section
          className="flex flex-col gap-3 pt-1 pb-6"
          data-ai-context={JSON.stringify({ section: "user-form", notFound: true })}
        >
          <PageHeader
        module="user"
            title={intl.formatMessage({
              id: "users.form.not_found",
              defaultMessage: "User not found.",
            })}
        />
        </section>
      );
    }
  }

  const initialValues =
    isEdit && data ? transformDetailToFormValues(data as UserDetail) : defaultFormValues();

  return (
    <InnerForm
      key={isEdit ? (id ?? "new") : "new"}
      initialValues={initialValues}
      isEdit={isEdit}
      userId={id}
    />
  );
};

export { UserFormPage };

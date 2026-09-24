import { useEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useStore } from "@tanstack/react-form";
import { Loader2, Save, UserRound, Mail, ShieldCheck, ImagePlus } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { getFriendlyErrorMessage } from "../../lib/friendlyError";
import { PageHeader } from "../../components/PageHeader";
import { NavButtonGroup } from "../../components/NavButtonGroup";
import { FormSection } from "../../components/FormSection";
import { FormLayout } from "../../components/FormLayout";
import { FormField } from "../../components/FormField";
import { FormFooter } from "../../components/FormFooter";
import { FormPreview } from "../../components/FormPreview";
import { ImageUploadField } from "../../components/ImageUploadField";
import { AiFillButton } from '@/components/AiFillButton';
import { useAiFillForm } from "../../components/AiAssistant/useAiFillForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
      setResultMessage(getFriendlyErrorMessage(e, "Failed to create user."));
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
      setResultMessage(getFriendlyErrorMessage(e, "Failed to update user."));
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

  useAiFillForm({
    name: (v: unknown) => form.setFieldValue("name" as never, String(v) as never),
    email: (v: unknown) => form.setFieldValue("email" as never, String(v) as never),
    password: (v: unknown) => form.setFieldValue("password" as never, String(v) as never),
    roleId: (v: unknown) => form.setFieldValue("roleId" as never, String(v) as never),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const { data: rolesData } = useQuery({
    queryKey: ["rolesListForSelect"],
    queryFn: () => trpcClient.accessControl.role.list.query({ page: 1, limit: 100 }),
  });

  const roleOptions = (rolesData?.data ?? []) as { id: string; name: string }[];

  // Live values drive the preview rail — re-renders on every keystroke.
  const live = useStore(form.store, (s) => s.values) as UserFormValues;
  const filled = [live.name, live.email, live.roleId].filter(
    (v) => String(v ?? "").trim().length > 0,
  ).length;
  const roleName = roleOptions.find((r) => r.id === live.roleId)?.name ?? "";

  // Identity section completion: all required fields valid
  const identityCompleted =
    live.name.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(live.email) &&
    Boolean(live.roleId) &&
    (isEdit || live.password.length >= 6);

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
        className="self-end"
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

      <FormLayout
        mode="standard"
        sidebar={
          <FormPreview
            module="user"
            icon={UserRound}
            title={live.name}
            status={isEdit ? "ENABLED" : "DRAFT"}
            filled={filled}
            total={3}
            rows={[
              {
                icon: Mail,
                label: intl.formatMessage({ id: "users.form.email", defaultMessage: "Email" }),
                value: live.email,
              },
              {
                icon: ShieldCheck,
                label: intl.formatMessage({ id: "users.form.role", defaultMessage: "Role" }),
                value: roleName,
              },
            ]}
          />
        }
      >
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <AiFillButton
          section="user-form"
          context={{ isEdit, id: userId ?? null }}
          options={{
            roleList: roleOptions.map((r) => ({ id: r.id, name: r.name })),
          }}
        />

        <FormSection
          icon={UserRound}
          step={1}
          tone="user"
          title={intl.formatMessage({ id: "users.form.identity", defaultMessage: "Identity" })}
          description={intl.formatMessage({
            id: "users.form.identity_description",
            defaultMessage: "Display name and contact details.",
          })}
          completed={identityCompleted}
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
                <FormField
                  id="user-name"
                  label={intl.formatMessage({ id: "users.form.name", defaultMessage: "Name" })}
                  isRequired
                  showValid={field.state.meta.errors.length === 0 && field.state.value.trim().length > 0}
                  error={field.state.meta.errors[0] ?? undefined}
                  hint={intl.formatMessage({
                    id: "users.form.name_hint",
                    defaultMessage: "Full display name shown across the system",
                  })}
                >
                  <Input
                    id="user-name"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                </FormField>
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
                <FormField
                  id="user-email"
                  label={intl.formatMessage({ id: "users.form.email", defaultMessage: "Email" })}
                  isRequired
                  showValid={field.state.meta.errors.length === 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.state.value)}
                  error={field.state.meta.errors[0] ?? undefined}
                  hint={intl.formatMessage({
                    id: "users.form.email_hint",
                    defaultMessage: "Used for login and notifications",
                  })}
                >
                  <Input
                    id="user-email"
                    type="email"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                </FormField>
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
                <FormField
                  id="user-password"
                  label={intl.formatMessage({ id: "users.form.password", defaultMessage: "Password" })}
                  isRequired={!isEdit}
                  showValid={
                    !isEdit
                      ? field.state.meta.errors.length === 0 && field.state.value.length >= 6
                      : field.state.value.length > 0 && field.state.meta.errors.length === 0
                  }
                  error={field.state.meta.errors[0] ?? undefined}
                  hint={
                    isEdit
                      ? intl.formatMessage({
                          id: "users.form.password_hint_edit",
                          defaultMessage: "Leave blank to keep the current password",
                        })
                      : intl.formatMessage({
                          id: "users.form.password_hint_create",
                          defaultMessage: "At least 6 characters",
                        })
                  }
                >
                  <Input
                    id="user-password"
                    type="password"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder={isEdit ? "Leave blank to keep current" : ""}
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                </FormField>
              )}
            </form.Field>

            <form.Field
              name="roleId"
              validators={{
                onChange: ({ value }) => (value ? undefined : "Role is required."),
              }}
            >
              {(field) => (
                <FormField
                  id="user-role"
                  label={intl.formatMessage({ id: "users.form.role", defaultMessage: "Role" })}
                  isRequired
                  showValid={field.state.meta.errors.length === 0 && Boolean(field.state.value)}
                  error={field.state.meta.errors[0] ?? undefined}
                  hint={intl.formatMessage({
                    id: "users.form.role_hint",
                    defaultMessage: "Determines permissions and access level",
                  })}
                >
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => field.handleChange(value)}
                    aria-invalid={field.state.meta.errors.length > 0}
                  >
                    <SelectTrigger
                      id="user-role"
                      size="default"
                      aria-label={intl.formatMessage({ id: "users.form.role", defaultMessage: "Role" })}
                    >
                      <SelectValue placeholder={intl.formatMessage({ id: "users.form.select_role", defaultMessage: "Select a role…" })} />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            </form.Field>
          </div>
        </FormSection>

        <FormSection
          icon={ImagePlus}
          step={2}
          tone="user"
          title={intl.formatMessage({ id: "users.form.photo", defaultMessage: "Profile photo" })}
          description={intl.formatMessage({
            id: "users.form.photo_description",
            defaultMessage: "Square image, at least 256×256px.",
          })}
          completed={Boolean(live.photo)}
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
      
        <FormFooter>
          <Button size="sm" className="h-8 gap-1.5 px-2.5" type="submit" disabled={isPending}>
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Save className="size-3.5" aria-hidden />
              )}
              {isEdit
                ? intl.formatMessage({ id: "common.action.save", defaultMessage: "Save" })
                : intl.formatMessage({ id: "common.action.create", defaultMessage: "Create" })}
            </Button>
        </FormFooter>
      </form>
      </FormLayout>

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
            title={getFriendlyErrorMessage(error, "Failed to load user.")}
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

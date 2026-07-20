import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { Spinner } from "../../ui/Spinner";
import { ButtonGroup } from "../../components/ButtonGroup";
import { ModulePage } from "../../components/ModulePage";
import { EmailCrmIcon } from "./EmailCrmIcons";

interface FormValues {
  email: string;
  subject: string;
  status: "OPEN" | "PENDING" | "RESOLVED" | "SPAM";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  tags: string;
  customerId: string;
}

type EmailCrmDetail = {
  email?: string;
  subject?: string | null;
  status?: string;
  priority?: string;
  tags?: unknown;
  customer?: { id: string } | null;
};

type ModalStage = "idle" | "confirm" | "loading" | "success" | "error";

const STATUS_OPTIONS = ["OPEN", "PENDING", "RESOLVED", "SPAM"] as const;
const PRIORITY_OPTIONS = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

const defaultFormValues = (): FormValues => ({
  email: "",
  subject: "",
  status: "OPEN",
  priority: "NORMAL",
  tags: "",
  customerId: "",
});

const tagsFromDetail = (tags: unknown) => {
  if (!Array.isArray(tags)) return "";
  return tags.filter((t): t is string => typeof t === "string").join(", ");
};

const transformDetailToFormValues = (detail: EmailCrmDetail): FormValues => ({
  email: detail.email ?? "",
  subject: detail.subject ?? "",
  status: (detail.status as FormValues["status"]) || "OPEN",
  priority: (detail.priority as FormValues["priority"]) || "NORMAL",
  tags: tagsFromDetail(detail.tags),
  customerId: detail.customer?.id ?? "",
});

const parseTags = (raw: string) =>
  raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

interface InnerFormProps {
  initialValues: FormValues;
  isEdit: boolean;
  conversationId?: string;
}

const InnerForm = ({ initialValues, isEdit, conversationId }: InnerFormProps) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canSave = hasPermission(isEdit ? "email-crm@update" : "email-crm@create");

  const [modalStage, setModalStage] = useState<ModalStage>("idle");
  const [resultMessage, setResultMessage] = useState("");

  const { data: customerList } = useQuery({
    queryKey: ["customerList", "all"],
    queryFn: () => trpcClient.customer.list.query({ page: 1, limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const customers = (customerList?.data ?? []) as { id: string; name: string; code: string | null }[];

  // ponytail: mount only after detail is ready so defaultValues are correct on first render
  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async () => {
      setModalStage("confirm");
    },
  });

  const createMutation = useMutation({
    mutationFn: (d: FormValues) =>
      trpcClient.emailCrm.create.mutate({
        email: d.email.trim(),
        subject: d.subject.trim() || undefined,
        status: d.status,
        priority: d.priority,
        tags: parseTags(d.tags).length ? parseTags(d.tags) : undefined,
        customerId: d.customerId || null,
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["emailCrmList"] });
      setResultMessage(
        intl.formatMessage({ id: "emailCrm.form.success.created", defaultMessage: "Conversation created" }),
      );
      setModalStage("success");
      setTimeout(() => navigate(`/email-crm/${created.id}`), 1200);
    },
    onError: (e) => {
      setResultMessage(e instanceof Error ? e.message : "Failed");
      setModalStage("error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (d: FormValues & { currentId: string }) =>
      trpcClient.emailCrm.update.mutate({
        currentId: d.currentId,
        email: d.email.trim() || undefined,
        subject: d.subject.trim() || null,
        status: d.status,
        priority: d.priority,
        tags: parseTags(d.tags),
        customerId: d.customerId || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailCrmList"] });
      queryClient.invalidateQueries({ queryKey: ["emailCrmDetail", conversationId] });
      setResultMessage(
        intl.formatMessage({ id: "emailCrm.form.success.updated", defaultMessage: "Conversation updated" }),
      );
      setModalStage("success");
      setTimeout(() => navigate(`/email-crm/${conversationId}`), 1200);
    },
    onError: (e) => {
      setResultMessage(e instanceof Error ? e.message : "Failed");
      setModalStage("error");
    },
  });

  const runSave = () => {
    setModalStage("loading");
    const values = form.state.values as FormValues;
    if (isEdit && conversationId) {
      updateMutation.mutate({ ...values, currentId: conversationId });
    } else {
      createMutation.mutate(values);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (modalStage === "idle") form.handleSubmit();
      }
      if (e.key === "Escape" && modalStage !== "idle") setModalStage("idle");
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [form, modalStage]);

  return (
    <ModulePage
      accent="#0A84FF"
      accentEnd="#5E5CE6"
      aiContext={{ section: "email-crm-form", isEdit, id: conversationId ?? null }}
    >
      <form
        className="m-page"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        style={{ gap: "1.25rem" }}
      >
        <div className="so-form__header">
          <div>
            <h1 className="so-form__title">
              {isEdit
                ? intl.formatMessage({ id: "emailCrm.form.title_edit", defaultMessage: "Edit conversation" })
                : intl.formatMessage({ id: "emailCrm.form.title_create", defaultMessage: "New conversation" })}
            </h1>
            <p className="so-form__subtitle">
              {isEdit
                ? intl.formatMessage({
                    id: "emailCrm.form.subtitle_edit",
                    defaultMessage: "Update conversation metadata",
                  })
                : intl.formatMessage({
                    id: "emailCrm.form.subtitle_create",
                    defaultMessage: "Create a conversation thread",
                  })}
            </p>
          </div>
          <button
            type="button"
            className="so-form__back"
            onClick={() =>
              navigate(isEdit && conversationId ? `/email-crm/${conversationId}` : "/email-crm")
            }
          >
            <EmailCrmIcon name="back" size={14} />
            {intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" })}
          </button>
        </div>

        <section className="so-card">
          <div className="so-card__header">
            <h2 className="so-card__title">
              <span className="so-card__icon">
                <EmailCrmIcon name="inbox" size={14} />
              </span>
              {intl.formatMessage({ id: "emailCrm.form.section_basic", defaultMessage: "Conversation" })}
            </h2>
          </div>
          <div className="so-card__body">
            <div className="so-section">
              <form.Field
                name="email"
                validators={{
                  onChange: ({ value }) => {
                    if (!value?.trim()) return "Required";
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return "Invalid email";
                    return undefined;
                  },
                }}
              >
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "emailCrm.form.email", defaultMessage: "Email" })} *
                    </label>
                    <input
                      className={`so-field__input${f.state.meta.errors.length ? " so-field__input--invalid" : ""}`}
                      type="email"
                      value={f.state.value ?? ""}
                      onChange={(e) => f.handleChange(e.target.value)}
                      placeholder={intl.formatMessage({
                        id: "emailCrm.form.email_placeholder",
                        defaultMessage: "buyer@example.com",
                      })}
                    />
                    {f.state.meta.errors.length > 0 && (
                      <span className="so-field__error">{f.state.meta.errors[0]}</span>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="subject">
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "emailCrm.form.subject", defaultMessage: "Subject" })}
                    </label>
                    <input
                      className="so-field__input"
                      type="text"
                      value={f.state.value ?? ""}
                      onChange={(e) => f.handleChange(e.target.value)}
                      placeholder={intl.formatMessage({
                        id: "emailCrm.form.subject_placeholder",
                        defaultMessage: "Optional subject",
                      })}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="status">
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "emailCrm.form.status", defaultMessage: "Status" })}
                    </label>
                    <select
                      className="so-field__input"
                      value={f.state.value}
                      onChange={(e) => f.handleChange(e.target.value as FormValues["status"])}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </form.Field>

              <form.Field name="priority">
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "emailCrm.form.priority", defaultMessage: "Priority" })}
                    </label>
                    <select
                      className="so-field__input"
                      value={f.state.value}
                      onChange={(e) => f.handleChange(e.target.value as FormValues["priority"])}
                    >
                      {PRIORITY_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </form.Field>

              <form.Field name="customerId">
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "emailCrm.form.customer", defaultMessage: "Customer" })}
                    </label>
                    <select
                      className="so-field__input"
                      value={f.state.value ?? ""}
                      onChange={(e) => f.handleChange(e.target.value)}
                    >
                      <option value="">
                        {intl.formatMessage({
                          id: "emailCrm.form.select_customer",
                          defaultMessage: "No customer linked",
                        })}
                      </option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                          {c.code ? ` (${c.code})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </form.Field>

              <form.Field name="tags">
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "emailCrm.form.tags", defaultMessage: "Tags" })}
                    </label>
                    <input
                      className="so-field__input"
                      type="text"
                      value={f.state.value ?? ""}
                      onChange={(e) => f.handleChange(e.target.value)}
                      placeholder={intl.formatMessage({
                        id: "emailCrm.form.tags_placeholder",
                        defaultMessage: "Comma-separated tags",
                      })}
                    />
                  </div>
                )}
              </form.Field>
            </div>
          </div>
        </section>

        <div className="so-actions">
          <ButtonGroup
            items={[
              {
                key: "save",
                label: intl.formatMessage({ id: "emailCrm.common.save", defaultMessage: "Save" }),
                icon: <EmailCrmIcon name="check" size={14} />,
                onClick: () => {
                  form.handleSubmit();
                },
                disabled: !canSave || createMutation.isPending || updateMutation.isPending,
                isLoading: createMutation.isPending || updateMutation.isPending,
                variant: "primary",
              },
            ]}
          />
        </div>
      </form>

      {modalStage !== "idle" &&
        createPortal(
          <div
            className="so-modal__backdrop"
            onClick={() => modalStage !== "loading" && modalStage !== "confirm" && setModalStage("idle")}
          >
            <div className="so-modal" onClick={(e) => e.stopPropagation()}>
              {modalStage === "confirm" && (
                <>
                  <div className="so-modal__header">
                    <h3>
                      {intl.formatMessage({
                        id: "emailCrm.form.modal.confirm_title",
                        defaultMessage: "Confirm save",
                      })}
                    </h3>
                    <button
                      className="so-btn so-btn--ghost so-btn--sm"
                      onClick={() => setModalStage("idle")}
                      aria-label="Close"
                    >
                      <EmailCrmIcon name="close" size={14} />
                    </button>
                  </div>
                  <div className="so-modal__body">
                    <div className="so-modal__icon so-modal__icon--success">
                      <EmailCrmIcon name="check" size={28} />
                    </div>
                    <h3 className="so-modal__title">
                      {intl.formatMessage({
                        id: "emailCrm.form.modal.confirm_body",
                        defaultMessage: "Save changes to this conversation?",
                      })}
                    </h3>
                  </div>
                  <div className="so-modal__footer">
                    <button className="so-btn so-btn--ghost" onClick={() => setModalStage("idle")}>
                      {intl.formatMessage({ id: "emailCrm.common.cancel", defaultMessage: "Cancel" })}
                    </button>
                    <button className="so-btn so-btn--primary" onClick={runSave}>
                      {intl.formatMessage({ id: "common.action.confirm", defaultMessage: "Confirm" })}
                    </button>
                  </div>
                </>
              )}

              {modalStage === "loading" && (
                <div className="so-modal__body">
                  <div
                    className="so-modal__icon so-modal__icon--success"
                    style={{ background: "var(--so-surface-2)", color: "var(--so-accent)" }}
                  >
                    <span className="so-spinner so-spinner--lg" />
                  </div>
                  <p className="so-modal__msg">
                    {intl.formatMessage({ id: "common.loading", defaultMessage: "Saving…" })}
                  </p>
                </div>
              )}

              {modalStage === "success" && (
                <div className="so-modal__body">
                  <div className="so-modal__icon so-modal__icon--success">
                    <EmailCrmIcon name="check" size={28} />
                  </div>
                  <h3 className="so-modal__title">
                    {intl.formatMessage({ id: "emailCrm.form.modal.success", defaultMessage: "Success!" })}
                  </h3>
                  <p className="so-modal__msg">{resultMessage}</p>
                </div>
              )}

              {modalStage === "error" && (
                <>
                  <div className="so-modal__header">
                    <h3>
                      {intl.formatMessage({ id: "emailCrm.form.modal.error_title", defaultMessage: "Error" })}
                    </h3>
                    <button
                      className="so-btn so-btn--ghost so-btn--sm"
                      onClick={() => setModalStage("idle")}
                      aria-label="Close"
                    >
                      <EmailCrmIcon name="close" size={14} />
                    </button>
                  </div>
                  <div className="so-modal__body">
                    <div className="so-modal__icon so-modal__icon--error">
                      <EmailCrmIcon name="close" size={28} />
                    </div>
                    <p className="so-modal__msg">{resultMessage}</p>
                  </div>
                  <div className="so-modal__footer">
                    <button className="so-btn so-btn--ghost" onClick={() => setModalStage("idle")}>
                      {intl.formatMessage({ id: "common.action.close", defaultMessage: "Close" })}
                    </button>
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

export const EmailCrmFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const intl = useIntl();
  const isEdit = Boolean(id);

  const { data, isLoading } = useQuery({
    queryKey: ["emailCrmDetail", id],
    enabled: isEdit && Boolean(id),
    queryFn: () => trpcClient.emailCrm.detail.query({ id: id ?? "" }),
  });

  if (isEdit && isLoading) {
    return (
      <ModulePage accent="#0A84FF" accentEnd="#5E5CE6" aiContext={{ section: "email-crm-form", loading: true }}>
        <div className="m-loading">
          <Spinner size="lg" />
        </div>
      </ModulePage>
    );
  }

  if (isEdit && !data) {
    return (
      <ModulePage accent="#0A84FF" accentEnd="#5E5CE6" aiContext={{ section: "email-crm-form", notFound: true }}>
        <div className="m-page">
          <p>
            {intl.formatMessage({
              id: "emailCrm.form.not_found",
              defaultMessage: "Conversation not found.",
            })}
          </p>
        </div>
      </ModulePage>
    );
  }

  const initialValues =
    isEdit && data ? transformDetailToFormValues(data as EmailCrmDetail) : defaultFormValues();

  return (
    <InnerForm
      key={isEdit ? (id ?? "new") : "new"}
      initialValues={initialValues}
      isEdit={isEdit}
      conversationId={id}
    />
  );
};

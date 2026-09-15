import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useStore } from "@tanstack/react-form";
import { Loader2, Save, Wallet, Hash, FileText } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { getFriendlyErrorMessage } from "../../lib/friendlyError";
import { hasPermissionAtom } from "../../lib/atoms";
import { PageHeader } from "../../components/PageHeader";
import { NavButtonGroup } from "../../components/NavButtonGroup";
import { FormSection } from "../../components/FormSection";
import { FormLayout } from "../../components/FormLayout";
import { FormFooter } from "../../components/FormFooter";
import { FormPreview } from "../../components/FormPreview";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { AiFillButton } from "@/components/AiFillButton";
import { useAiFillForm } from "../../components/AiAssistant/useAiFillForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "../../components/FormField";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface FormValues {
  code: string;
  name: string;
  description: string;
}

type ModalStage = "idle" | "confirm" | "loading" | "success" | "error";

const defaults = (): FormValues => ({ code: "", name: "", description: "" });

export const BudgetTypeFormPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canSave = hasPermission(id ? "budget-type@update" : "budget-type@create");

  const isEdit = Boolean(id);
  const [modalStage, setModalStage] = useState<ModalStage>("idle");
  const [resultMessage, setResultMessage] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["budgetTypeDetail", id],
    enabled: isEdit && Boolean(id),
    queryFn: () => trpcClient.budgetType.detail.query({ id: id ?? "" }),
  });

  const form = useForm({
    defaultValues: (isEdit && data
      ? { code: (data as FormValues).code ?? "", name: (data as FormValues).name, description: (data as FormValues).description ?? "" }
      : defaults()) as FormValues,
    onSubmit: async () => {
      setModalStage("confirm");
    },
  });

  useAiFillForm({
    code: (v: unknown) => form.setFieldValue("code" as never, String(v) as never),
    name: (v: unknown) => form.setFieldValue("name" as never, String(v) as never),
    description: (v: unknown) => form.setFieldValue("description" as never, String(v) as never),
  });

  // Live values drive the preview rail — re-renders on every keystroke.
  const live = useStore(form.store, (s) => s.values) as FormValues;
  const filled = [live.name, live.code, live.description].filter(
    (v) => String(v ?? "").trim().length > 0,
  ).length;

  useEffect(() => {
    if (isEdit && data) {
      form.setFieldValue("code", (data as FormValues).code ?? "");
      form.setFieldValue("name", (data as FormValues).name);
      form.setFieldValue("description", (data as FormValues).description ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, data]);

  const createMutation = useMutation({
    mutationFn: (d: FormValues) => trpcClient.budgetType.create.mutate(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgetTypeList"] });
      setResultMessage(
        intl.formatMessage({ id: "budget_type.form.success.created", defaultMessage: "Budget type created successfully" }),
      );
      setModalStage("success");
      setTimeout(() => navigate("/budget-type"), 1200);
    },
    onError: (e) => {
      setResultMessage(getFriendlyErrorMessage(e, "Failed"));
      setModalStage("error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (d: FormValues & { currentId: string }) => trpcClient.budgetType.update.mutate(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgetTypeList"] });
      queryClient.invalidateQueries({ queryKey: ["budgetTypeDetail", id] });
      setResultMessage(
        intl.formatMessage({ id: "budget_type.form.success.updated", defaultMessage: "Budget type updated successfully" }),
      );
      setModalStage("success");
      setTimeout(() => navigate(`/budget-type/${id}`), 1200);
    },
    onError: (e) => {
      setResultMessage(getFriendlyErrorMessage(e, "Failed"));
      setModalStage("error");
    },
  });

  const runSave = () => {
    setModalStage("loading");
    const values = form.state.values as FormValues;
    if (isEdit && id) {
      updateMutation.mutate({ ...values, currentId: id });
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
      if (e.key === "Escape" && modalStage !== "idle" && modalStage !== "loading") {
        setModalStage("idle");
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [form, modalStage]);

  if (isLoading) {
    return (
      <section
        className="flex flex-col gap-3 pt-1 pb-6"
        data-ai-context={JSON.stringify({ section: "budget-type-form", loading: true })}
      >
        <Skeleton className="h-16 w-full max-w-xl" />
        <Skeleton className="h-48 w-full" />
      </section>
    );
  }

  return (
    <section
      className="flex flex-col gap-3 pt-1 pb-6"
      data-ai-context={JSON.stringify({ section: "budget-type-form", isEdit, id: id ?? null })}
    >
      <NavButtonGroup
        className="self-end"
        onBack={() => navigate(isEdit && id ? `/budget-type/${id}` : "/budget-type")}
      />

      <PageHeader
        module="budgetType"
        eyebrow={intl.formatMessage({ id: "nav.master_data", defaultMessage: "Master Data" })}
        title={
          isEdit
            ? intl.formatMessage({ id: "budget_type.form.title_edit", defaultMessage: "Edit budget type" })
            : intl.formatMessage({ id: "budget_type.form.title_create", defaultMessage: "New budget type" })
        }
        description={
          isEdit
            ? intl.formatMessage({ id: "budget_type.form.subtitle_edit", defaultMessage: "Update budget type details" })
            : intl.formatMessage({ id: "budget_type.form.subtitle_create", defaultMessage: "Create a new budget category" })
        }
      />

      <FormLayout
        sidebar={
          <FormPreview
            module="budgetType"
            icon={Wallet}
            title={live.name}
            status={!isEdit ? "DRAFT" : undefined}
            filled={filled}
            total={3}
            rows={[
              {
                icon: Hash,
                label: intl.formatMessage({ id: "budget_type.form.field_code", defaultMessage: "Code" }),
                value: live.code,
              },
              {
                icon: FileText,
                label: intl.formatMessage({
                  id: "budget_type.form.field_description",
                  defaultMessage: "Description",
                }),
                value: live.description,
              },
            ]}
          />
        }
      >
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <AiFillButton section="budget-type-form" context={{ isEdit, id: id ?? null }} />

        <FormSection
          icon={Wallet}
          step={1}
          tone="budgetType"
          title={intl.formatMessage({ id: "budget_type.form.section_basic", defaultMessage: "Basic information" })}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <form.Field name="code">
              {(f) => (
                <FormField
                  id="budget-type-code"
                  label={intl.formatMessage({ id: "budget_type.form.field_code", defaultMessage: "Code" })}
                >
                  <Input
                    id="budget-type-code"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    placeholder={intl.formatMessage({ id: "budget_type.form.field_code_placeholder", defaultMessage: "Optional" })}
                  />
                </FormField>
              )}
            </form.Field>

            <form.Field
              name="name"
              validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}
            >
              {(f) => (
                <FormField
                  id="budget-type-name"
                  label={intl.formatMessage({ id: "budget_type.form.field_name", defaultMessage: "Name" })}
                  isRequired
                  error={f.state.meta.errors.length > 0 ? String(f.state.meta.errors[0]) : undefined}
                >
                  <Input
                    id="budget-type-name"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    aria-invalid={f.state.meta.errors.length > 0}
                    placeholder={intl.formatMessage({ id: "budget_type.form.field_name_placeholder", defaultMessage: "Budget type name" })}
                  />
                </FormField>
              )}
            </form.Field>

            <form.Field name="description">
              {(f) => (
                <FormField
                  id="budget-type-description"
                  label={intl.formatMessage({ id: "budget_type.form.field_description", defaultMessage: "Description" })}
                  className="sm:col-span-2"
                >
                  <Textarea
                    id="budget-type-description"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    placeholder={intl.formatMessage({ id: "budget_type.form.field_description_placeholder", defaultMessage: "Optional description" })}
                    rows={3}
                  />
                </FormField>
              )}
            </form.Field>
          </div>
        </FormSection>

        <FormFooter>
          <Button
            size="sm"
            className="h-8 gap-1.5 px-2.5 font-semibold"
            type="submit"
            disabled={!canSave || createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Save className="size-3.5" aria-hidden />
            )}
            {intl.formatMessage({ id: "budget_type.form.save_button", defaultMessage: "Save" })}
          </Button>
        </FormFooter>
      </form>
      </FormLayout>

      <ConfirmDialog
        open={modalStage === "confirm"}
        onOpenChange={(open) => {
          if (!open) setModalStage("idle");
        }}
        title={intl.formatMessage({ id: "budget_type.form.modal.confirm_title", defaultMessage: "Confirm save" })}
        description={intl.formatMessage({ id: "budget_type.form.modal.confirm_body", defaultMessage: "Save changes to this budget type?" })}
        confirmLabel={intl.formatMessage({ id: "common.action.confirm", defaultMessage: "Confirm" })}
        onConfirm={runSave}
      />

      <Dialog
        open={modalStage === "loading" || modalStage === "success" || modalStage === "error"}
        onOpenChange={(open) => {
          if (!open && modalStage !== "loading") setModalStage("idle");
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
                {intl.formatMessage({ id: "budget_type.form.modal.success", defaultMessage: "Success!" })}
              </DialogTitle>
              <DialogDescription>{resultMessage}</DialogDescription>
            </DialogHeader>
          ) : null}
          {modalStage === "error" ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {intl.formatMessage({ id: "budget_type.form.modal.error_title", defaultMessage: "Error" })}
                </DialogTitle>
                <DialogDescription>{resultMessage}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setModalStage("idle")}>
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

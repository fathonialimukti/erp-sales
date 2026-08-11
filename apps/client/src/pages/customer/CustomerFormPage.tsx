import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { Loader2, Save } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { useToast } from "../../components/useToast";
import { PageHeader } from "../../components/PageHeader";
import { NavButtonGroup } from "../../components/NavButtonGroup";
import { FormSection } from "../../components/FormSection";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { AiFillButton } from '@/components/AiFillButton';
import { useAiFillForm } from "../../components/AiAssistant/useAiFillForm";
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

interface FormValues {
  code: string;
  name: string;
}

type ModalStage = "idle" | "confirm" | "loading" | "success" | "error";

const defaults = (): FormValues => ({ code: "", name: "" });

export const CustomerFormPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canSave = hasPermission(id ? "customer@update" : "customer@create");
  const toast = useToast();

  const isEdit = Boolean(id);
  const [modalStage, setModalStage] = useState<ModalStage>("idle");
  const [resultMessage, setResultMessage] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["customerDetail", id],
    enabled: isEdit && Boolean(id),
    queryFn: () => trpcClient.customer.detail.query({ id: id ?? "" }),
  });

  const form = useForm({
    defaultValues: (isEdit && data
      ? { code: data.code ?? "", name: data.name }
      : defaults()) as FormValues,
    onSubmit: async () => {
      setModalStage("confirm");
    },
  });

  useAiFillForm({
    code: (v: unknown) => form.setFieldValue("code" as never, String(v) as never),
    name: (v: unknown) => form.setFieldValue("name" as never, String(v) as never),
  });

  // Re-seed defaults once detail loads in edit mode
  useEffect(() => {
    if (isEdit && data) {
      form.setFieldValue("code", data.code ?? "");
      form.setFieldValue("name", data.name);
    }
    // ponytail: only seed when detail arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, data]);

  const createMutation = useMutation({
    mutationFn: (d: FormValues) => trpcClient.customer.create.mutate(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customerList"] });
      setResultMessage(
        intl.formatMessage({
          id: "customer.form.success.created",
          defaultMessage: "Customer created",
        }),
      );
      setModalStage("success");
      setTimeout(() => navigate("/customer"), 1200);
    },
    onError: (e) => {
      setResultMessage(e instanceof Error ? e.message : "Failed");
      setModalStage("error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (d: FormValues & { currentId: string }) =>
      trpcClient.customer.update.mutate(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customerList"] });
      queryClient.invalidateQueries({ queryKey: ["customerDetail", id] });
      setResultMessage(
        intl.formatMessage({
          id: "customer.form.success.updated",
          defaultMessage: "Customer updated",
        }),
      );
      setModalStage("success");
      setTimeout(() => navigate(`/customer/${id}`), 1200);
    },
    onError: (e) => {
      setResultMessage(e instanceof Error ? e.message : "Failed");
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
      <section className="flex flex-col gap-3 pt-1 pb-6" data-ai-context={JSON.stringify({ section: "customer-form", loading: true })}>
        <Skeleton className="h-16 w-full max-w-xl" />
        <Skeleton className="h-48 w-full" />
      </section>
    );
  }

  return (
    <section
      className="flex flex-col gap-3 pt-1 pb-6"
      data-ai-context={JSON.stringify({
        section: "customer-form",
        isEdit,
        id: id ?? null,
      })}
    >
      <NavButtonGroup
        className="self-end"
        onBack={() => navigate(isEdit && id ? `/customer/${id}` : "/customer")}
      />

      <PageHeader
          module="customer"
          title={
            isEdit
              ? intl.formatMessage({
                  id: "customer.form.title_edit",
                  defaultMessage: "Edit customer",
                })
              : intl.formatMessage({
                  id: "customer.form.title_create",
                  defaultMessage: "New customer",
                })
          }
          description={
            isEdit
              ? intl.formatMessage({
                  id: "customer.form.subtitle_edit",
                  defaultMessage: "Update customer details",
                })
              : intl.formatMessage({
                  id: "customer.form.subtitle_create",
                  defaultMessage: "Create a new geographical customer",
                })
          }
        />

      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <FormSection
          title={intl.formatMessage({
            id: "customer.form.section_basic",
            defaultMessage: "Basic information",
          })}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <form.Field name="code">
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="customer-code">
                    {intl.formatMessage({ id: "customer.form.field_code", defaultMessage: "Code" })}
                  </Label>
                  <Input
                    id="customer-code"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    placeholder={intl.formatMessage({
                      id: "customer.form.field_code_placeholder",
                      defaultMessage: "Optional",
                    })}
                  />
                </div>
              )}
            </form.Field>

            <form.Field
              name="name"
              validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}
            >
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="customer-name">
                    {intl.formatMessage({ id: "customer.form.field_name", defaultMessage: "Name" })}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="customer-name"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    aria-invalid={f.state.meta.errors.length > 0}
                    placeholder={intl.formatMessage({
                      id: "customer.form.field_name_placeholder",
                      defaultMessage: "Customer name",
                    })}
                  />
                  {f.state.meta.errors.length > 0 ? (
                    <p className="text-xs text-destructive">{String(f.state.meta.errors[0])}</p>
                  ) : null}
                </div>
              )}
            </form.Field>
          </div>
        </FormSection>
      
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-3">
          <AiFillButton
            section="customer-form"
            context={{ isEdit, id: id ?? null }}
          />
          <Button
            size="sm"
            className="h-8 gap-1.5 px-2.5"
            type="submit"
              disabled={!canSave || createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Save className="size-3.5" aria-hidden />
              )}
              {intl.formatMessage({ id: "customer.form.save_button", defaultMessage: "Save" })}
            </Button>
        </div>
</form>

      <ConfirmDialog
        open={modalStage === "confirm"}
        onOpenChange={(open) => {
          if (!open) setModalStage("idle");
        }}
        title={intl.formatMessage({
          id: "customer.form.modal.confirm_title",
          defaultMessage: "Confirm save",
        })}
        description={intl.formatMessage({
          id: "customer.form.modal.confirm_body",
          defaultMessage: "Save changes to this customer?",
        })}
        confirmLabel={intl.formatMessage({
          id: "common.action.confirm",
          defaultMessage: "Confirm",
        })}
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
            <>
              <DialogHeader>
                <DialogTitle>
                  {intl.formatMessage({
                    id: "customer.form.modal.success",
                    defaultMessage: "Success!",
                  })}
                </DialogTitle>
                <DialogDescription>{resultMessage}</DialogDescription>
              </DialogHeader>
            </>
          ) : null}
          {modalStage === "error" ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {intl.formatMessage({
                    id: "customer.form.modal.error_title",
                    defaultMessage: "Error",
                  })}
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

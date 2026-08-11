import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { Loader2, Save } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CreateSkuInput, UpdateSkuInput } from "@repo/schemas/sku";

interface FormValues {
  code: string;
  name: string;
  description: string;
  categoryId: string;
  basePrice: string;
  baseUnit: string;
  status: string;
}

type ModalStage = "idle" | "confirm" | "loading" | "success" | "error";

const defaults = (): FormValues => ({
  code: "",
  name: "",
  description: "",
  categoryId: "",
  basePrice: "",
  baseUnit: "pcs",
  status: "ACTIVE",
});

export const SkuFormPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canSave = hasPermission(id ? "sku@update" : "sku@create");

  const isEdit = Boolean(id);
  const [modalStage, setModalStage] = useState<ModalStage>("idle");
  const [resultMessage, setResultMessage] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["skuDetail", id],
    enabled: isEdit && Boolean(id),
    queryFn: () => trpcClient.sku.detail.query({ id: id ?? "" }),
  });

  const { data: categories } = useQuery({
    queryKey: ["skuCategoryOptions"],
    queryFn: () => trpcClient.skuCategory.list.query({ page: 1, limit: 100 }),
  });

  const form = useForm({
    defaultValues: (isEdit && data
      ? {
          code: data.code ?? "",
          name: data.name,
          description: data.description ?? "",
          categoryId: data.categoryId ?? "",
          basePrice: data.basePrice != null ? String(data.basePrice) : "",
          baseUnit: data.baseUnit,
          status: data.status,
        }
      : defaults()) as FormValues,
    onSubmit: async () => {
      setModalStage("confirm");
    },
  });

  useAiFillForm({
    code: (v: unknown) => form.setFieldValue("code" as never, String(v) as never),
    name: (v: unknown) => form.setFieldValue("name" as never, String(v) as never),
    description: (v: unknown) => form.setFieldValue("description" as never, String(v) as never),
    categoryId: (v: unknown) => form.setFieldValue("categoryId" as never, String(v) as never),
    basePrice: (v: unknown) => form.setFieldValue("basePrice" as never, String(v) as never),
    baseUnit: (v: unknown) => form.setFieldValue("baseUnit" as never, String(v) as never),
    status: (v: unknown) => form.setFieldValue("status" as never, String(v) as never),
  });

  useEffect(() => {
    if (isEdit && data) {
      form.setFieldValue("code", data.code ?? "");
      form.setFieldValue("name", data.name);
      form.setFieldValue("description", data.description ?? "");
      form.setFieldValue("categoryId", data.categoryId ?? "");
      form.setFieldValue("basePrice", data.basePrice != null ? String(data.basePrice) : "");
      form.setFieldValue("baseUnit", data.baseUnit);
      form.setFieldValue("status", data.status);
    }
    // ponytail: only seed when detail arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, data]);

  const createMutation = useMutation({
    mutationFn: (d: CreateSkuInput) => trpcClient.sku.create.mutate(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skuList"] });
      setResultMessage(
        intl.formatMessage({ id: "sku.form.success.created", defaultMessage: "SKU created" }),
      );
      setModalStage("success");
      setTimeout(() => navigate("/sku"), 1200);
    },
    onError: (e) => {
      setResultMessage(e instanceof Error ? e.message : "Failed");
      setModalStage("error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (d: UpdateSkuInput) => trpcClient.sku.update.mutate(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skuList"] });
      queryClient.invalidateQueries({ queryKey: ["skuDetail", id] });
      setResultMessage(
        intl.formatMessage({ id: "sku.form.success.updated", defaultMessage: "SKU updated" }),
      );
      setModalStage("success");
      setTimeout(() => navigate(`/sku/${id}`), 1200);
    },
    onError: (e) => {
      setResultMessage(e instanceof Error ? e.message : "Failed");
      setModalStage("error");
    },
  });

  const runSave = () => {
    setModalStage("loading");
    const values = form.state.values as FormValues;
    const payload = {
      ...values,
      basePrice: values.basePrice ? Number(values.basePrice) : null,
      categoryId: values.categoryId || null,
    };
    if (isEdit && id) {
      updateMutation.mutate({ ...payload, currentId: id } as UpdateSkuInput);
    } else {
      createMutation.mutate(payload as CreateSkuInput);
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
        data-ai-context={JSON.stringify({ section: "sku-form", loading: true })}
      >
        <Skeleton className="h-16 w-full max-w-xl" />
        <Skeleton className="h-48 w-full" />
      </section>
    );
  }

  return (
    <section
      className="flex flex-col gap-3 pt-1 pb-6"
      data-ai-context={JSON.stringify({ section: "sku-form", isEdit, id: id ?? null })}
    >
      <NavButtonGroup
        className="self-end"
        onBack={() => navigate(isEdit && id ? `/sku/${id}` : "/sku")}
      />

      <PageHeader
          module="sku"
          title={
            isEdit
              ? intl.formatMessage({ id: "sku.form.title_edit", defaultMessage: "Edit SKU" })
              : intl.formatMessage({ id: "sku.form.title_create", defaultMessage: "New SKU" })
          }
          description={
            isEdit
              ? intl.formatMessage({
                  id: "sku.form.subtitle_edit",
                  defaultMessage: "Update product details",
                })
              : intl.formatMessage({
                  id: "sku.form.subtitle_create",
                  defaultMessage: "Create a new product",
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
        <AiFillButton
          section="sku-form"
          context={{ isEdit, id: id ?? null }}
          options={{
            categoryList: (categories?.data ?? []).map((c) => ({ id: c.id, name: c.name })),
            baseUnitList: ["pcs", "box", "pack", "kg", "liter", "unit"].map((u) => ({ value: u })),
            statusList: ["ACTIVE", "INACTIVE"].map((s) => ({ value: s })),
          }}
        />

        <FormSection
          title={intl.formatMessage({
            id: "sku.form.section_basic",
            defaultMessage: "Basic information",
          })}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <form.Field name="code">
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="sku-code">
                    {intl.formatMessage({ id: "sku.form.field_code", defaultMessage: "Code" })}
                  </Label>
                  <Input
                    id="sku-code"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    placeholder={intl.formatMessage({
                      id: "sku.form.field_code_placeholder",
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
                  <Label htmlFor="sku-name">
                    {intl.formatMessage({ id: "sku.form.field_name", defaultMessage: "Name" })}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="sku-name"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    aria-invalid={f.state.meta.errors.length > 0}
                    placeholder={intl.formatMessage({
                      id: "sku.form.field_name_placeholder",
                      defaultMessage: "Product name",
                    })}
                  />
                  {f.state.meta.errors.length > 0 ? (
                    <p className="text-xs text-destructive">{String(f.state.meta.errors[0])}</p>
                  ) : null}
                </div>
              )}
            </form.Field>

            <form.Field name="description">
              {(f) => (
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="sku-description">
                    {intl.formatMessage({
                      id: "sku.form.field_description",
                      defaultMessage: "Description",
                    })}
                  </Label>
                  <Input
                    id="sku-description"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    placeholder={intl.formatMessage({
                      id: "sku.form.field_description_placeholder",
                      defaultMessage: "Optional",
                    })}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="categoryId">
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="sku-category">
                    {intl.formatMessage({
                      id: "sku.form.field_category",
                      defaultMessage: "Category",
                    })}
                  </Label>
                  <Select
                    value={f.state.value ?? ""}
                    onValueChange={(value) => f.handleChange(value)}
                  >
                    <SelectTrigger
                      id="sku-category"
                      size="default"
                      aria-label={intl.formatMessage({ id: "sku.form.field_category", defaultMessage: "Category" })}
                    >
                      <SelectValue placeholder={intl.formatMessage({ id: "sku.form.field_category_placeholder", defaultMessage: "Select category" })} />
                    </SelectTrigger>
                    <SelectContent>
                      {(categories?.data ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            <form.Field name="basePrice">
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="sku-price">
                    {intl.formatMessage({
                      id: "sku.form.field_base_price",
                      defaultMessage: "Base price",
                    })}
                  </Label>
                  <Input
                    id="sku-price"
                    type="number"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    placeholder={intl.formatMessage({
                      id: "sku.form.field_base_price_placeholder",
                      defaultMessage: "Optional",
                    })}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="baseUnit">
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="sku-unit">
                    {intl.formatMessage({
                      id: "sku.form.field_base_unit",
                      defaultMessage: "Base unit",
                    })}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="sku-unit"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    placeholder={intl.formatMessage({
                      id: "sku.form.field_base_unit_placeholder",
                      defaultMessage: "e.g. pcs",
                    })}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="status">
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="sku-status">
                    {intl.formatMessage({ id: "sku.form.field_status", defaultMessage: "Status" })}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={f.state.value ?? ""}
                    onValueChange={(value) => f.handleChange(value)}
                  >
                    <SelectTrigger
                      id="sku-status"
                      size="default"
                      aria-label={intl.formatMessage({ id: "sku.form.field_status", defaultMessage: "Status" })}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                      <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
          </div>
        </FormSection>
      
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-3">
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
              {intl.formatMessage({ id: "sku.form.save_button", defaultMessage: "Save" })}
            </Button>
        </div>
</form>

      <ConfirmDialog
        open={modalStage === "confirm"}
        onOpenChange={(open) => {
          if (!open) setModalStage("idle");
        }}
        title={intl.formatMessage({
          id: "sku.form.modal.confirm_title",
          defaultMessage: "Confirm save",
        })}
        description={intl.formatMessage({
          id: "sku.form.modal.confirm_body",
          defaultMessage: "Save changes to this SKU?",
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
            <DialogHeader>
              <DialogTitle>
                {intl.formatMessage({ id: "sku.form.modal.success", defaultMessage: "Success!" })}
              </DialogTitle>
              <DialogDescription>{resultMessage}</DialogDescription>
            </DialogHeader>
          ) : null}
          {modalStage === "error" ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {intl.formatMessage({
                    id: "sku.form.modal.error_title",
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

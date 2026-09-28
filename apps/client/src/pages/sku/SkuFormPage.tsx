import { useCallback, useEffect, useState } from "react";
import { useIntl } from "react-intl";

import { useRequiredMessage } from "@/lib/form-validation";import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useStore } from "@tanstack/react-form";
import { Loader2, Save, Package, Hash, Tags, BadgeDollarSign, Boxes } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { getFriendlyErrorMessage } from "../../lib/friendlyError";
import { hasPermissionAtom } from "../../lib/atoms";
import { packSizeLabel } from "@/lib/format";
import { PageHeader } from "../../components/PageHeader";
import { NavButtonGroup } from "../../components/NavButtonGroup";
import { FormSection } from "../../components/FormSection";
import { FormLayout } from "../../components/FormLayout";
import { FormField } from "../../components/FormField";
import { FormFooter } from "../../components/FormFooter";
import { FormPreview } from "../../components/FormPreview";
import { ConfirmDialog } from "../../components/ConfirmDialog";
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
import type { CreateSkuInput, UpdateSkuInput } from "@repo/schemas/sku";

interface FormValues {
  code: string;
  name: string;
  description: string;
  categoryId: string;
  basePrice: string;
  baseUnit: string;
  /** pcs per carton — held as a string so the number input owns its own text (SPEC §Client) */
  packSize: string;
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
  packSize: "1",
  status: "ACTIVE",
});

/**
 * Coerce the raw pack-size input to the integer the wire payload expects.
 * Invalid input falls back to piece-only (1) — the field's inline validator
 * blocks submit first, so this only guards the payload shape, never a write.
 */
const packSizeFromInput = (raw: string): number => {
  const parsed = Number(String(raw ?? "").trim());
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
};

export const SkuFormPage = () => {
  const intl = useIntl();
  const requiredMessage = useRequiredMessage();
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
          packSize: data.packSize != null ? String(data.packSize) : "1",
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
    packSize: (v: unknown) => form.setFieldValue("packSize" as never, String(v) as never),
    status: (v: unknown) => form.setFieldValue("status" as never, String(v) as never),
  });

  // Live values drive the preview rail — re-renders on every keystroke.
  const live = useStore(form.store, (s) => s.values) as FormValues;
  const filled = [
    live.name,
    live.code,
    live.categoryId,
    live.basePrice,
    live.baseUnit,
    live.packSize,
  ].filter((v) => String(v ?? "").trim().length > 0).length;
  const categoryName =
    (categories?.data ?? []).find((c) => c.id === live.categoryId)?.name ?? "";

  /* --- LocalStorage draft autosave --- */
  const DRAFT_KEY = `sku-form-draft:${isEdit ? `edit:${id}` : "new"}`;
  const [lastSaved, setLastSaved] = useState<Date | undefined>(() => {
    const ts = localStorage.getItem(`${DRAFT_KEY}:ts`);
    return ts ? new Date(ts) : undefined;
  });

  const saveDraft = useCallback(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form.state.values));
    const now = new Date();
    localStorage.setItem(`${DRAFT_KEY}:ts`, now.toISOString());
    setLastSaved(now);
  }, [DRAFT_KEY, form.state.values]);

  // Restore draft on first mount (only if no server data has loaded yet)
  useEffect(() => {
    if (isEdit && data) return; // server data wins in edit mode
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<FormValues>;
      (Object.keys(parsed) as (keyof FormValues)[]).forEach((k) => {
        if (parsed[k] != null) form.setFieldValue(k as never, parsed[k] as never);
      });
    } catch {
      // ignore corrupted draft
    }
    // ponytail: once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isEdit && data) {
      form.setFieldValue("code", data.code ?? "");
      form.setFieldValue("name", data.name);
      form.setFieldValue("description", data.description ?? "");
      form.setFieldValue("categoryId", data.categoryId ?? "");
      form.setFieldValue("basePrice", data.basePrice != null ? String(data.basePrice) : "");
      form.setFieldValue("baseUnit", data.baseUnit);
      form.setFieldValue("packSize", data.packSize != null ? String(data.packSize) : "1");
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
      setResultMessage(getFriendlyErrorMessage(e, "Failed"));
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
      setResultMessage(getFriendlyErrorMessage(e, "Failed"));
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
      // Always send packSize explicitly: updateSkuSchema.packSize carries a
      // .default(1), so an omitted field silently resets the SKU to piece-only.
      packSize: packSizeFromInput(values.packSize),
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

      <FormLayout
        mode="complex"
        sidebar={
          <FormPreview
            module="sku"
            icon={Package}
            title={live.name}
            subtitle={categoryName || undefined}
            status={live.status}
            filled={filled}
            total={6}
            rows={[
              {
                icon: Hash,
                label: intl.formatMessage({ id: "sku.form.field_code", defaultMessage: "Code" }),
                value: live.code,
              },
              {
                icon: BadgeDollarSign,
                label: intl.formatMessage({
                  id: "sku.form.field_base_price",
                  defaultMessage: "Base price",
                }),
                value: live.basePrice,
                money: true,
              },
              {
                icon: Tags,
                label: intl.formatMessage({
                  id: "sku.form.field_category",
                  defaultMessage: "Category",
                }),
                value: categoryName,
              },
              {
                icon: Boxes,
                label: intl.formatMessage({
                  id: "sku.form.field_pack_size",
                  defaultMessage: "Pack size",
                }),
                value: packSizeLabel(intl, Number(live.packSize)),
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
          icon={Package}
          step={1}
          tone="sku"
          title={intl.formatMessage({
            id: "sku.form.section_basic",
            defaultMessage: "Basic information",
          })}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <form.Field name="code">
              {(f) => (
                <FormField
                  id="sku-code"
                  label={intl.formatMessage({ id: "sku.form.field_code", defaultMessage: "Code" })}
                  hint={intl.formatMessage({
                    id: "sku.form.field_code_hint",
                    defaultMessage: "Optional unique identifier for this product",
                  })}
                  error={f.state.meta.errors[0] ? String(f.state.meta.errors[0]) : undefined}
                >
                  <Input
                    id="sku-code"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    placeholder={intl.formatMessage({
                      id: "sku.form.field_code_placeholder",
                      defaultMessage: "Optional",
                    })}
                  />
                </FormField>
              )}
            </form.Field>

            <form.Field
              name="name"
              validators={{ onChange: ({ value }) => (!value ? requiredMessage : undefined) }}
            >
              {(f) => (
                <FormField
                  id="sku-name"
                  label={intl.formatMessage({ id: "sku.form.field_name", defaultMessage: "Name" })}
                  hint={intl.formatMessage({
                    id: "sku.form.field_name_hint",
                    defaultMessage: "Displayed across catalogs and invoices",
                  })}
                  isRequired
                  showValid
                  error={f.state.meta.errors[0] ? String(f.state.meta.errors[0]) : undefined}
                >
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
                </FormField>
              )}
            </form.Field>

            <form.Field name="description">
              {(f) => (
                <FormField
                  id="sku-description"
                  className="sm:col-span-2"
                  label={intl.formatMessage({
                    id: "sku.form.field_description",
                    defaultMessage: "Description",
                  })}
                  error={f.state.meta.errors[0] ? String(f.state.meta.errors[0]) : undefined}
                >
                  <Input
                    id="sku-description"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    placeholder={intl.formatMessage({
                      id: "sku.form.field_description_placeholder",
                      defaultMessage: "Optional",
                    })}
                  />
                </FormField>
              )}
            </form.Field>

            <form.Field name="categoryId">
              {(f) => (
                <FormField
                  id="sku-category"
                  label={intl.formatMessage({
                    id: "sku.form.field_category",
                    defaultMessage: "Category",
                  })}
                  hint={intl.formatMessage({
                    id: "sku.form.field_category_hint",
                    defaultMessage: "Groups this product in reports",
                  })}
                  error={f.state.meta.errors[0] ? String(f.state.meta.errors[0]) : undefined}
                >
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
                </FormField>
              )}
            </form.Field>

            <form.Field name="basePrice">
              {(f) => (
                <FormField
                  id="sku-price"
                  label={intl.formatMessage({
                    id: "sku.form.field_base_price",
                    defaultMessage: "Base price",
                  })}
                  hint={intl.formatMessage({
                    id: "sku.form.field_base_price_hint",
                    defaultMessage: "Selling price per base unit",
                  })}
                  error={f.state.meta.errors[0] ? String(f.state.meta.errors[0]) : undefined}
                >
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
                </FormField>
              )}
            </form.Field>

            <form.Field name="baseUnit">
              {(f) => (
                <FormField
                  id="sku-unit"
                  label={intl.formatMessage({
                    id: "sku.form.field_base_unit",
                    defaultMessage: "Base unit",
                  })}
                  hint={intl.formatMessage({
                    id: "sku.form.field_base_unit_hint",
                    defaultMessage: "Unit this product is sold in",
                  })}
                  isRequired
                  showValid
                  error={f.state.meta.errors[0] ? String(f.state.meta.errors[0]) : undefined}
                >
                  <Input
                    id="sku-unit"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    placeholder={intl.formatMessage({
                      id: "sku.form.field_base_unit_placeholder",
                      defaultMessage: "e.g. pcs",
                    })}
                  />
                </FormField>
              )}
            </form.Field>

            <form.Field
              name="packSize"
              validators={{
                onChange: ({ value }) => {
                  const raw = String(value ?? "").trim();
                  if (!raw) {
                    return intl.formatMessage({
                      id: "sku.form.field_pack_size_error_min",
                      defaultMessage: "Pack size must be at least 1",
                    });
                  }
                  const parsed = Number(raw);
                  if (!Number.isInteger(parsed)) {
                    return intl.formatMessage({
                      id: "sku.form.field_pack_size_error_integer",
                      defaultMessage: "Pack size must be a whole number",
                    });
                  }
                  if (parsed < 1) {
                    return intl.formatMessage({
                      id: "sku.form.field_pack_size_error_min",
                      defaultMessage: "Pack size must be at least 1",
                    });
                  }
                  return undefined;
                },
              }}
            >
              {(f) => (
                <FormField
                  id="sku-pack-size"
                  label={intl.formatMessage({
                    id: "sku.form.field_pack_size",
                    defaultMessage: "Pack size",
                  })}
                  hint={intl.formatMessage({
                    id: "sku.form.field_pack_size_hint",
                    defaultMessage: "pcs per carton",
                  })}
                  isRequired
                  showValid
                  error={f.state.meta.errors[0] ? String(f.state.meta.errors[0]) : undefined}
                >
                  <Input
                    id="sku-pack-size"
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    aria-invalid={f.state.meta.errors.length > 0}
                    placeholder={intl.formatMessage({
                      id: "sku.form.field_pack_size_placeholder",
                      defaultMessage: "e.g. 20",
                    })}
                  />
                </FormField>
              )}
            </form.Field>

            <form.Field name="status">
              {(f) => (
                <FormField
                  id="sku-status"
                  label={intl.formatMessage({ id: "sku.form.field_status", defaultMessage: "Status" })}
                  hint={intl.formatMessage({
                    id: "sku.form.field_status_hint",
                    defaultMessage: "Inactive products hide from new orders",
                  })}
                  isRequired
                  showValid
                  error={f.state.meta.errors[0] ? String(f.state.meta.errors[0]) : undefined}
                >
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
                </FormField>
              )}
            </form.Field>
          </div>
        </FormSection>
      
        <FormFooter
          autosave={{
            enabled: modalStage === "idle" || modalStage === "confirm",
            lastSaved,
            onSave: saveDraft,
          }}
        >
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
        </FormFooter>
      </form>
      </FormLayout>

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

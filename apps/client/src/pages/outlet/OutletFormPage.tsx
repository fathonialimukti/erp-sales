import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useStore } from "@tanstack/react-form";
import { Loader2, Save, Store, Hash, Building2, MapPinned, MapPin, UserRound, Phone } from "lucide-react";

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

interface FormValues {
  code: string;
  name: string;
  customerId: string;
  areaId: string;
  address: string;
  contactName: string;
  contactPhone: string;
  latitude: number | null;
  longitude: number | null;
}

type ModalStage = "idle" | "confirm" | "loading" | "success" | "error";

const defaults = (): FormValues => ({
  code: "",
  name: "",
  customerId: "",
  areaId: "",
  address: "",
  contactName: "",
  contactPhone: "",
  latitude: null,
  longitude: null,
});

export const OutletFormPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canSave = hasPermission(id ? "outlet@update" : "outlet@create");

  const isEdit = Boolean(id);
  const [modalStage, setModalStage] = useState<ModalStage>("idle");
  const [resultMessage, setResultMessage] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["outletDetail", id],
    enabled: isEdit && Boolean(id),
    queryFn: () => trpcClient.outlet.detail.query({ id: id ?? "" }),
  });

  const { data: customerList } = useQuery({
    queryKey: ["customerList", "all"],
    queryFn: () => trpcClient.customer.list.query({ page: 1, limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: areaList } = useQuery({
    queryKey: ["areaList", "all"],
    queryFn: () => trpcClient.area.list.query({ page: 1, limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const customers = (customerList?.data ?? []) as { id: string; name: string }[];
  const areas = (areaList?.data ?? []) as { id: string; name: string }[];

  const form = useForm({
    defaultValues: (isEdit && data
      ? {
          code: (data as { code?: string }).code ?? "",
          name: (data as { name?: string }).name ?? "",
          customerId: (data as { customer?: { id: string } | null }).customer?.id ?? "",
          areaId: (data as { area?: { id: string } | null }).area?.id ?? "",
          address: (data as { address?: string }).address ?? "",
          contactName: (data as { contactName?: string }).contactName ?? "",
          contactPhone: (data as { contactPhone?: string }).contactPhone ?? "",
          latitude: (data as { latitude?: number | null }).latitude ?? null,
          longitude: (data as { longitude?: number | null }).longitude ?? null,
        }
      : defaults()) as FormValues,
    onSubmit: async () => {
      setModalStage("confirm");
    },
  });

  useAiFillForm({
    code: (v: unknown) => form.setFieldValue("code" as never, String(v) as never),
    name: (v: unknown) => form.setFieldValue("name" as never, String(v) as never),
    customerId: (v: unknown) => form.setFieldValue("customerId" as never, String(v) as never),
    areaId: (v: unknown) => form.setFieldValue("areaId" as never, String(v) as never),
    address: (v: unknown) => form.setFieldValue("address" as never, String(v) as never),
    contactName: (v: unknown) => form.setFieldValue("contactName" as never, String(v) as never),
    contactPhone: (v: unknown) => form.setFieldValue("contactPhone" as never, String(v) as never),
    latitude: (v: unknown) => form.setFieldValue("latitude" as never, Number(v) as never),
    longitude: (v: unknown) => form.setFieldValue("longitude" as never, Number(v) as never),
  });

  // Live values drive the preview rail — re-renders on every keystroke.
  const live = useStore(form.store, (s) => s.values) as FormValues;
  const filled = [
    live.name,
    live.code,
    live.customerId,
    live.areaId,
    live.address,
    live.contactName,
    live.contactPhone,
  ].filter((v) => String(v ?? "").trim().length > 0).length;
  const customerName = customers.find((c) => c.id === live.customerId)?.name ?? "";
  const areaName = areas.find((a) => a.id === live.areaId)?.name ?? "";

  useEffect(() => {
    if (isEdit && data) {
      form.setFieldValue("code", (data as { code?: string }).code ?? "");
      form.setFieldValue("name", (data as { name?: string }).name ?? "");
      form.setFieldValue(
        "customerId",
        (data as { customer?: { id: string } | null }).customer?.id ?? "",
      );
      form.setFieldValue("areaId", (data as { area?: { id: string } | null }).area?.id ?? "");
      form.setFieldValue("address", (data as { address?: string }).address ?? "");
      form.setFieldValue("contactName", (data as { contactName?: string }).contactName ?? "");
      form.setFieldValue("contactPhone", (data as { contactPhone?: string }).contactPhone ?? "");
      form.setFieldValue("latitude", (data as { latitude?: number | null }).latitude ?? null);
      form.setFieldValue("longitude", (data as { longitude?: number | null }).longitude ?? null);
    }
    // ponytail: only seed when detail arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, data]);

  const createMutation = useMutation({
    mutationFn: (d: FormValues) => trpcClient.outlet.create.mutate(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outletList"] });
      setResultMessage(
        intl.formatMessage({ id: "outlet.form.success.created", defaultMessage: "Outlet created" }),
      );
      setModalStage("success");
      setTimeout(() => navigate("/outlet"), 1200);
    },
    onError: (e) => {
      setResultMessage(getFriendlyErrorMessage(e, "Failed"));
      setModalStage("error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (d: FormValues & { currentId: string }) => trpcClient.outlet.update.mutate(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outletList"] });
      queryClient.invalidateQueries({ queryKey: ["outletDetail", id] });
      setResultMessage(
        intl.formatMessage({ id: "outlet.form.success.updated", defaultMessage: "Outlet updated" }),
      );
      setModalStage("success");
      setTimeout(() => navigate(`/outlet/${id}`), 1200);
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
        data-ai-context={JSON.stringify({ section: "outlet-form", loading: true })}
      >
        <Skeleton className="h-16 w-full max-w-xl" />
        <Skeleton className="h-48 w-full" />
      </section>
    );
  }

  return (
    <section
      className="flex flex-col gap-3 pt-1 pb-6"
      data-ai-context={JSON.stringify({ section: "outlet-form", isEdit, id: id ?? null })}
    >
      <NavButtonGroup
        className="self-end"
        onBack={() => navigate(isEdit && id ? `/outlet/${id}` : "/outlet")}
      />

      <PageHeader
          module="outlet"
          title={
            isEdit
              ? intl.formatMessage({ id: "outlet.form.title_edit", defaultMessage: "Edit outlet" })
              : intl.formatMessage({ id: "outlet.form.title_create", defaultMessage: "New outlet" })
          }
          description={
            isEdit
              ? intl.formatMessage({
                  id: "outlet.form.subtitle_edit",
                  defaultMessage: "Update outlet details",
                })
              : intl.formatMessage({
                  id: "outlet.form.subtitle_create",
                  defaultMessage: "Create a new outlet",
                })
          }
        />

      <FormLayout
        sidebar={
          <FormPreview
            module="outlet"
            icon={Store}
            title={live.name}
            status={!isEdit ? "DRAFT" : undefined}
            filled={filled}
            total={7}
            rows={[
              {
                icon: Hash,
                label: intl.formatMessage({ id: "outlet.form.field_code", defaultMessage: "Code" }),
                value: live.code,
              },
              {
                icon: Building2,
                label: intl.formatMessage({
                  id: "outlet.form.field_customer",
                  defaultMessage: "Customer",
                }),
                value: customerName,
              },
              {
                icon: MapPinned,
                label: intl.formatMessage({ id: "outlet.form.field_area", defaultMessage: "Area" }),
                value: areaName,
              },
              {
                icon: MapPin,
                label: intl.formatMessage({
                  id: "outlet.form.field_address",
                  defaultMessage: "Address",
                }),
                value: live.address,
              },
              {
                icon: UserRound,
                label: intl.formatMessage({
                  id: "outlet.form.field_contact_name",
                  defaultMessage: "Contact name",
                }),
                value: live.contactName,
              },
              {
                icon: Phone,
                label: intl.formatMessage({
                  id: "outlet.form.field_contact_phone",
                  defaultMessage: "Contact phone",
                }),
                value: live.contactPhone,
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
          section="outlet-form"
          context={{ isEdit, id: id ?? null }}
          options={{
            customerList: customers.map((c) => ({ id: c.id, name: c.name })),
            areaList: areas.map((a) => ({ id: a.id, name: a.name })),
          }}
        />

        <FormSection
          icon={Store}
          step={1}
          tone="outlet"
          title={intl.formatMessage({
            id: "outlet.form.section_basic",
            defaultMessage: "Basic information",
          })}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <form.Field
              name="customerId"
              validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}
            >
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="outlet-customer">
                    {intl.formatMessage({
                      id: "outlet.form.field_customer",
                      defaultMessage: "Customer",
                    })}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={f.state.value ?? ""}
                    onValueChange={(value) => f.handleChange(value)}
                    aria-invalid={f.state.meta.errors.length > 0}
                  >
                    <SelectTrigger
                      id="outlet-customer"
                      size="default"
                      aria-label={intl.formatMessage({ id: "outlet.form.field_customer", defaultMessage: "Customer" })}
                    >
                      <SelectValue placeholder={intl.formatMessage({ id: "outlet.form.select_customer", defaultMessage: "Select customer" })} />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {f.state.meta.errors.length > 0 ? (
                    <p className="text-xs text-destructive">{String(f.state.meta.errors[0])}</p>
                  ) : null}
                </div>
              )}
            </form.Field>

            <form.Field
              name="areaId"
              validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}
            >
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="outlet-area">
                    {intl.formatMessage({ id: "outlet.form.field_area", defaultMessage: "Area" })}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={f.state.value ?? ""}
                    onValueChange={(value) => f.handleChange(value)}
                    aria-invalid={f.state.meta.errors.length > 0}
                  >
                    <SelectTrigger
                      id="outlet-area"
                      size="default"
                      aria-label={intl.formatMessage({ id: "outlet.form.field_area", defaultMessage: "Area" })}
                    >
                      <SelectValue placeholder={intl.formatMessage({ id: "outlet.form.select_area", defaultMessage: "Select area" })} />
                    </SelectTrigger>
                    <SelectContent>
                      {areas.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {f.state.meta.errors.length > 0 ? (
                    <p className="text-xs text-destructive">{String(f.state.meta.errors[0])}</p>
                  ) : null}
                </div>
              )}
            </form.Field>

            <form.Field name="code">
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="outlet-code">
                    {intl.formatMessage({ id: "outlet.form.field_code", defaultMessage: "Code" })}
                  </Label>
                  <Input
                    id="outlet-code"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    placeholder={intl.formatMessage({
                      id: "outlet.form.field_code_placeholder",
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
                  <Label htmlFor="outlet-name">
                    {intl.formatMessage({ id: "outlet.form.field_name", defaultMessage: "Name" })}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="outlet-name"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    aria-invalid={f.state.meta.errors.length > 0}
                    placeholder={intl.formatMessage({
                      id: "outlet.form.field_name_placeholder",
                      defaultMessage: "Outlet name",
                    })}
                  />
                  {f.state.meta.errors.length > 0 ? (
                    <p className="text-xs text-destructive">{String(f.state.meta.errors[0])}</p>
                  ) : null}
                </div>
              )}
            </form.Field>

            <form.Field name="address">
              {(f) => (
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="outlet-address">
                    {intl.formatMessage({
                      id: "outlet.form.field_address",
                      defaultMessage: "Address",
                    })}
                  </Label>
                  <Input
                    id="outlet-address"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    placeholder={intl.formatMessage({
                      id: "outlet.form.field_address_placeholder",
                      defaultMessage: "Street address",
                    })}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="contactName">
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="outlet-contact-name">
                    {intl.formatMessage({
                      id: "outlet.form.field_contact_name",
                      defaultMessage: "Contact name",
                    })}
                  </Label>
                  <Input
                    id="outlet-contact-name"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    placeholder={intl.formatMessage({
                      id: "outlet.form.field_contact_name_placeholder",
                      defaultMessage: "Primary contact",
                    })}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="contactPhone">
              {(f) => (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="outlet-contact-phone">
                    {intl.formatMessage({
                      id: "outlet.form.field_contact_phone",
                      defaultMessage: "Contact phone",
                    })}
                  </Label>
                  <Input
                    id="outlet-contact-phone"
                    value={f.state.value ?? ""}
                    onChange={(e) => f.handleChange(e.target.value)}
                    placeholder={intl.formatMessage({
                      id: "outlet.form.field_contact_phone_placeholder",
                      defaultMessage: "Phone number",
                    })}
                  />
                </div>
              )}
            </form.Field>
          </div>
        </FormSection>
      
        <FormFooter>
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
              {intl.formatMessage({ id: "outlet.form.save_button", defaultMessage: "Save" })}
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
          id: "outlet.form.modal.confirm_title",
          defaultMessage: "Confirm save",
        })}
        description={intl.formatMessage({
          id: "outlet.form.modal.confirm_body",
          defaultMessage: "Save changes to this outlet?",
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
                {intl.formatMessage({
                  id: "outlet.form.modal.success",
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
                  {intl.formatMessage({
                    id: "outlet.form.modal.error_title",
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

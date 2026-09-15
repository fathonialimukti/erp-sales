import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, X, Truck, Hash, UserRound, Mail, Tags } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { useToast } from "../../components/useToast";
import { useMeta } from "../../lib/useMeta";
import { PageHeader } from "../../components/PageHeader";
import { FormSection } from "../../components/FormSection";
import { FormLayout } from "../../components/FormLayout";
import { FormFooter } from "../../components/FormFooter";
import { FormPreview } from "../../components/FormPreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type VendorFormData = {
  code: string;
  name: string;
  contactName: string;
  contactPhone: string;
  email: string;
  address: string;
  category: string;
  status: string;
};

export const VendorFormPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission("vendor@create");
  const canUpdate = hasPermission("vendor@update");
  const toast = useToast();

  const [formData, setFormData] = useState<VendorFormData>({
    code: "",
    name: "",
    contactName: "",
    contactPhone: "",
    email: "",
    address: "",
    category: "",
    status: "ACTIVE",
  });

  const { data: existingVendor, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["vendorDetail", id],
    queryFn: () => trpcClient.vendor.detail.query({ id: id! }),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingVendor) {
      setFormData({
        code: existingVendor.code ?? "",
        name: existingVendor.name,
        contactName: existingVendor.contactName ?? "",
        contactPhone: existingVendor.contactPhone ?? "",
        email: existingVendor.email ?? "",
        address: existingVendor.address ?? "",
        category: existingVendor.category ?? "",
        status: existingVendor.status,
      });
    }
  }, [existingVendor]);

  const createMutation = useMutation({
    mutationFn: (data: VendorFormData) => trpcClient.vendor.create.mutate(data),
    onSuccess: () => {
      toast.success(intl.formatMessage({ id: "common.toast.created", defaultMessage: "Created successfully" }));
      queryClient.invalidateQueries({ queryKey: ["vendorList"] });
      navigate("/vendor");
    },
    onError: (error) => {
      toast.error(error, intl.formatMessage({ id: "common.toast.create_failed", defaultMessage: "Failed to create" }));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: VendorFormData & { currentId: string }) => trpcClient.vendor.update.mutate(data),
    onSuccess: () => {
      toast.success(intl.formatMessage({ id: "common.toast.updated", defaultMessage: "Updated successfully" }));
      queryClient.invalidateQueries({ queryKey: ["vendorList"] });
      navigate("/vendor");
    },
    onError: (error) => {
      toast.error(error, intl.formatMessage({ id: "common.toast.update_failed", defaultMessage: "Failed to update" }));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error(intl.formatMessage({ id: "common.error.name_required", defaultMessage: "Name is required" }));
      return;
    }

    if (isEdit) {
      updateMutation.mutate({ ...formData, currentId: id! });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleCancel = () => {
    navigate("/vendor");
  };

  useMeta({
    title: isEdit
      ? intl.formatMessage({ id: "vendor.form.edit_title", defaultMessage: "Edit Vendor" })
      : intl.formatMessage({ id: "vendor.form.create_title", defaultMessage: "Create Vendor" }),
    description: isEdit
      ? intl.formatMessage({ id: "vendor.form.edit_subtitle", defaultMessage: "Update vendor information" })
      : intl.formatMessage({ id: "vendor.form.create_subtitle", defaultMessage: "Create a new vendor" }),
  });

  const isLoading = isEdit && isLoadingDetail;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const filled = [
    formData.name,
    formData.code,
    formData.contactName,
    formData.contactPhone,
    formData.email,
    formData.category,
    formData.address,
  ].filter((v) => String(v ?? "").trim().length > 0).length;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        module="vendor"
        eyebrow={intl.formatMessage({ id: "nav.master_data", defaultMessage: "Master Data" })}
        title={isEdit
          ? intl.formatMessage({ id: "vendor.form.edit_title", defaultMessage: "Edit Vendor" })
          : intl.formatMessage({ id: "vendor.form.create_title", defaultMessage: "Create Vendor" })}
        description={isEdit
          ? intl.formatMessage({ id: "vendor.form.edit_subtitle", defaultMessage: "Update vendor information" })
          : intl.formatMessage({ id: "vendor.form.create_subtitle", defaultMessage: "Create a new vendor" })}
        actions={
          <Button variant="outline" onClick={handleCancel}>
            <ArrowLeft className="size-4 mr-2" />
            {intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}
          </Button>
        }
      />
      <div className="flex-1 overflow-auto p-6">
        <FormLayout
          sidebar={
            <FormPreview
              module="vendor"
              icon={Truck}
              title={formData.name}
              status={formData.status}
              filled={filled}
              total={7}
              rows={[
                {
                  icon: Hash,
                  label: intl.formatMessage({ id: "vendor.form.code", defaultMessage: "Code" }),
                  value: formData.code,
                },
                {
                  icon: Tags,
                  label: intl.formatMessage({ id: "vendor.form.category", defaultMessage: "Category" }),
                  value: formData.category,
                },
                {
                  icon: UserRound,
                  label: intl.formatMessage({ id: "vendor.form.contact_name", defaultMessage: "Contact Name" }),
                  value: `${formData.contactName}${formData.contactPhone ? ` · ${formData.contactPhone}` : ""}`,
                },
                {
                  icon: Mail,
                  label: intl.formatMessage({ id: "vendor.form.email", defaultMessage: "Email" }),
                  value: formData.email,
                },
              ]}
            />
          }
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <FormSection
              icon={Truck}
              step={1}
              tone="vendor"
              title={intl.formatMessage({
                id: "vendor.form.basic_info",
                defaultMessage: "Basic Information",
              })}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="code">
                    {intl.formatMessage({ id: "vendor.form.code", defaultMessage: "Code" })}
                  </Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder={intl.formatMessage({ id: "vendor.form.code_placeholder", defaultMessage: "Optional code" })}
                    disabled={isEdit}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="status">
                    {intl.formatMessage({ id: "vendor.form.status", defaultMessage: "Status" })}
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder={intl.formatMessage({ id: "common.select.placeholder", defaultMessage: "Select status" })} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">{intl.formatMessage({ id: "vendor.status.active", defaultMessage: "Active" })}</SelectItem>
                      <SelectItem value="INACTIVE">{intl.formatMessage({ id: "vendor.status.inactive", defaultMessage: "Inactive" })}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="name">
                  {intl.formatMessage({ id: "vendor.form.name", defaultMessage: "Name" })}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={intl.formatMessage({ id: "vendor.form.name_placeholder", defaultMessage: "Enter vendor name" })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="contactName">
                    {intl.formatMessage({ id: "vendor.form.contact_name", defaultMessage: "Contact Name" })}
                  </Label>
                  <Input
                    id="contactName"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    placeholder={intl.formatMessage({ id: "vendor.form.contact_name_placeholder", defaultMessage: "Contact person name" })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="contactPhone">
                    {intl.formatMessage({ id: "vendor.form.contact_phone", defaultMessage: "Contact Phone" })}
                  </Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder={intl.formatMessage({ id: "vendor.form.contact_phone_placeholder", defaultMessage: "Phone number" })}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="email">
                    {intl.formatMessage({ id: "vendor.form.email", defaultMessage: "Email" })}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder={intl.formatMessage({ id: "vendor.form.email_placeholder", defaultMessage: "Email address" })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="category">
                    {intl.formatMessage({ id: "vendor.form.category", defaultMessage: "Category" })}
                  </Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder={intl.formatMessage({ id: "vendor.form.category_placeholder", defaultMessage: "e.g., ORGANIZER, POS_MATERIAL, CATERING" })}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="address">
                  {intl.formatMessage({ id: "vendor.form.address", defaultMessage: "Address" })}
                </Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder={intl.formatMessage({ id: "vendor.form.address_placeholder", defaultMessage: "Vendor address" })}
                  rows={3}
                />
              </div>
            </FormSection>

            <FormFooter>
              <Button type="button" variant="outline" onClick={handleCancel}>
                <X className="size-4 mr-2" />
                {intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                <Save className="size-4 mr-2" />
                {isSubmitting
                  ? intl.formatMessage({ id: "common.action.saving", defaultMessage: "Saving..." })
                  : intl.formatMessage({ id: "common.action.save", defaultMessage: "Save" })}
              </Button>
            </FormFooter>
          </form>
        </FormLayout>
      </div>
    </div>
  );
};
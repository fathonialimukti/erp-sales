import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, X, User, Mail, Phone, MapPin, Tag } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { useToast } from "../../components/useToast";
import { useMeta } from "../../lib/useMeta";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{intl.formatMessage({ id: "vendor.form.basic_info", defaultMessage: "Basic Information" })}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="code">{intl.formatMessage({ id: "vendor.form.code", defaultMessage: "Code" })}</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder={intl.formatMessage({ id: "vendor.form.code_placeholder", defaultMessage: "Optional code" })}
                    disabled={isEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">{intl.formatMessage({ id: "vendor.form.status", defaultMessage: "Status" })}</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={intl.formatMessage({ id: "common.select.placeholder", defaultMessage: "Select status" })} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">{intl.formatMessage({ id: "vendor.status.active", defaultMessage: "Active" })}</SelectItem>
                      <SelectItem value="INACTIVE">{intl.formatMessage({ id: "vendor.status.inactive", defaultMessage: "Inactive" })}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">{intl.formatMessage({ id: "vendor.form.name", defaultMessage: "Name" })} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={intl.formatMessage({ id: "vendor.form.name_placeholder", defaultMessage: "Enter vendor name" })}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contactName">{intl.formatMessage({ id: "vendor.form.contact_name", defaultMessage: "Contact Name" })}</Label>
                  <Input
                    id="contactName"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    placeholder={intl.formatMessage({ id: "vendor.form.contact_name_placeholder", defaultMessage: "Contact person name" })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">{intl.formatMessage({ id: "vendor.form.contact_phone", defaultMessage: "Contact Phone" })}</Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder={intl.formatMessage({ id: "vendor.form.contact_phone_placeholder", defaultMessage: "Phone number" })}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">{intl.formatMessage({ id: "vendor.form.email", defaultMessage: "Email" })}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder={intl.formatMessage({ id: "vendor.form.email_placeholder", defaultMessage: "Email address" })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">{intl.formatMessage({ id: "vendor.form.category", defaultMessage: "Category" })}</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder={intl.formatMessage({ id: "vendor.form.category_placeholder", defaultMessage: "e.g., ORGANIZER, POS_MATERIAL, CATERING" })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">{intl.formatMessage({ id: "vendor.form.address", defaultMessage: "Address" })}</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder={intl.formatMessage({ id: "vendor.form.address_placeholder", defaultMessage: "Vendor address" })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4 pt-4 border-t">
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
          </div>
        </form>
      </div>
    </div>
  );
};
import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, X, Tag } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { useToast } from "../../components/useToast";
import { useMeta } from "../../lib/useMeta";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ActionTypeFormData = {
  code: string;
  name: string;
  description: string;
};

export const ActionTypeFormPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission("action-type@create");
  const canUpdate = hasPermission("action-type@update");
  const toast = useToast();

  const [formData, setFormData] = useState<ActionTypeFormData>({
    code: "",
    name: "",
    description: "",
  });

  const { data: existingType, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["actionTypeDetail", id],
    queryFn: () => trpcClient.actionType.detail.query({ id: id! }),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingType) {
      setFormData({
        code: existingType.code ?? "",
        name: existingType.name,
        description: existingType.description ?? "",
      });
    }
  }, [existingType]);

  const createMutation = useMutation({
    mutationFn: (data: ActionTypeFormData) => trpcClient.actionType.create.mutate(data),
    onSuccess: () => {
      toast.success(intl.formatMessage({ id: "common.toast.created", defaultMessage: "Created successfully" }));
      queryClient.invalidateQueries({ queryKey: ["actionTypeList"] });
      navigate("/action-type");
    },
    onError: () => {
      toast.error(intl.formatMessage({ id: "common.toast.create_failed", defaultMessage: "Failed to create" }));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: ActionTypeFormData & { currentId: string }) => trpcClient.actionType.update.mutate(data),
    onSuccess: () => {
      toast.success(intl.formatMessage({ id: "common.toast.updated", defaultMessage: "Updated successfully" }));
      queryClient.invalidateQueries({ queryKey: ["actionTypeList"] });
      navigate("/action-type");
    },
    onError: () => {
      toast.error(intl.formatMessage({ id: "common.toast.update_failed", defaultMessage: "Failed to update" }));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error(intl.formatMessage({ id: "common.error.name_required", defaultMessage: "Name is required" }));
      return;
    }
    if (!formData.code.trim()) {
      toast.error(intl.formatMessage({ id: "action_type.form.error.code_required", defaultMessage: "Code is required" }));
      return;
    }

    if (isEdit) {
      updateMutation.mutate({ ...formData, currentId: id! });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleCancel = () => {
    navigate("/action-type");
  };

  useMeta({
    title: isEdit
      ? intl.formatMessage({ id: "action_type.form.edit_title", defaultMessage: "Edit Action Type" })
      : intl.formatMessage({ id: "action_type.form.create_title", defaultMessage: "Create Action Type" }),
    description: isEdit
      ? intl.formatMessage({ id: "action_type.form.edit_subtitle", defaultMessage: "Update action type information" })
      : intl.formatMessage({ id: "action_type.form.create_subtitle", defaultMessage: "Create a new action type" }),
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
        title={isEdit
          ? intl.formatMessage({ id: "action_type.form.edit_title", defaultMessage: "Edit Action Type" })
          : intl.formatMessage({ id: "action_type.form.create_title", defaultMessage: "Create Action Type" })}
        description={isEdit
          ? intl.formatMessage({ id: "action_type.form.edit_subtitle", defaultMessage: "Update action type information" })
          : intl.formatMessage({ id: "action_type.form.create_subtitle", defaultMessage: "Create a new action type" })}
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
              <CardTitle>{intl.formatMessage({ id: "action_type.form.basic_info", defaultMessage: "Basic Information" })}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="code">{intl.formatMessage({ id: "action_type.form.code", defaultMessage: "Code" })} *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder={intl.formatMessage({ id: "action_type.form.code_placeholder", defaultMessage: "Enter code (e.g., CASHIER)" })}
                    disabled={isEdit}
                    className="font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">{intl.formatMessage({ id: "action_type.form.name", defaultMessage: "Name" })} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={intl.formatMessage({ id: "action_type.form.name_placeholder", defaultMessage: "Enter action type name" })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{intl.formatMessage({ id: "action_type.form.description", defaultMessage: "Description" })}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={intl.formatMessage({ id: "action_type.form.description_placeholder", defaultMessage: "Optional description" })}
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
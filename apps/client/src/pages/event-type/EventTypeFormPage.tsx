import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, X, CalendarDays } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { useToast } from "../../components/useToast";
import { useMeta } from "../../lib/useMeta";
import { PageHeader } from "../../components/PageHeader";
import { FormSection } from "../../components/FormSection";
import { FormLayout } from "../../components/FormLayout";
import { FormFooter } from "../../components/FormFooter";
import { FormField } from "../../components/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type EventTypeFormData = {
  code: string;
  name: string;
  description: string;
};

export const EventTypeFormPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission("event-type@create");
  const canUpdate = hasPermission("event-type@update");
  const toast = useToast();

  const [formData, setFormData] = useState<EventTypeFormData>({
    code: "",
    name: "",
    description: "",
  });

  const { data: existingType, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["eventTypeDetail", id],
    queryFn: () => trpcClient.eventType.detail.query({ id: id! }),
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
    mutationFn: (data: EventTypeFormData) => trpcClient.eventType.create.mutate(data),
    onSuccess: () => {
      toast.success(intl.formatMessage({ id: "common.toast.created", defaultMessage: "Created successfully" }));
      queryClient.invalidateQueries({ queryKey: ["eventTypeList"] });
      navigate("/event-type");
    },
    onError: (error) => {
      toast.error(error, intl.formatMessage({ id: "common.toast.create_failed", defaultMessage: "Failed to create" }));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: EventTypeFormData & { currentId: string }) => trpcClient.eventType.update.mutate(data),
    onSuccess: () => {
      toast.success(intl.formatMessage({ id: "common.toast.updated", defaultMessage: "Updated successfully" }));
      queryClient.invalidateQueries({ queryKey: ["eventTypeList"] });
      navigate("/event-type");
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
    if (!formData.code.trim()) {
      toast.error(intl.formatMessage({ id: "event_type.form.error.code_required", defaultMessage: "Code is required" }));
      return;
    }

    if (isEdit) {
      updateMutation.mutate({ ...formData, currentId: id! });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleCancel = () => {
    navigate("/event-type");
  };

  useMeta({
    title: isEdit
      ? intl.formatMessage({ id: "event_type.form.edit_title", defaultMessage: "Edit Event Type" })
      : intl.formatMessage({ id: "event_type.form.create_title", defaultMessage: "Create Event Type" }),
    description: isEdit
      ? intl.formatMessage({ id: "event_type.form.edit_subtitle", defaultMessage: "Update event type information" })
      : intl.formatMessage({ id: "event_type.form.create_subtitle", defaultMessage: "Create a new event type" }),
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
    <div
      className="flex flex-col h-full"
      data-ai-context={JSON.stringify({
        section: "event-type-form",
        mode: isEdit ? "edit" : "create",
        id: id ?? null,
      })}
    >
      <PageHeader
        module="eventType"
        eyebrow={intl.formatMessage({ id: "nav.master_data", defaultMessage: "Master Data" })}
        title={isEdit
          ? intl.formatMessage({ id: "event_type.form.edit_title", defaultMessage: "Edit Event Type" })
          : intl.formatMessage({ id: "event_type.form.create_title", defaultMessage: "Create Event Type" })}
        description={isEdit
          ? intl.formatMessage({ id: "event_type.form.edit_subtitle", defaultMessage: "Update event type information" })
          : intl.formatMessage({ id: "event_type.form.create_subtitle", defaultMessage: "Create a new event type" })}
        actions={
          <Button variant="outline" onClick={handleCancel}>
            <ArrowLeft className="size-4 mr-2" />
            {intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}
          </Button>
        }
      />
      <div className="flex-1 overflow-auto p-6">
        <FormLayout mode="simple">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <FormSection
              icon={CalendarDays}
              step={1}
              tone="eventType"
              title={intl.formatMessage({
                id: "event_type.form.basic_info",
                defaultMessage: "Basic Information",
              })}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="code">
                    {intl.formatMessage({ id: "event_type.form.code", defaultMessage: "Code" })}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder={intl.formatMessage({ id: "event_type.form.code_placeholder", defaultMessage: "Enter code (e.g., GRAND_OPENING)" })}
                    disabled={isEdit}
                    className="font-mono"
                  />
                </div>
                <FormField
                  id="name"
                  label={intl.formatMessage({ id: "event_type.form.name", defaultMessage: "Name" })}
                  hint={intl.formatMessage({ id: "event_type.form.name_hint", defaultMessage: "Enter a unique event type name" })}
                  isRequired
                  showValid={!!formData.name.trim()}
                >
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={intl.formatMessage({ id: "event_type.form.name_placeholder", defaultMessage: "Enter event type name" })}
                  />
                </FormField>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <Label htmlFor="description">
                    {intl.formatMessage({ id: "event_type.form.description", defaultMessage: "Description" })}
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={intl.formatMessage({ id: "event_type.form.description_placeholder", defaultMessage: "Optional description" })}
                    rows={3}
                  />
                </div>
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
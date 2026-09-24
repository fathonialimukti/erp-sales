   import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, X, CalendarRange, Hash, CalendarDays } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { useToast } from "../../components/useToast";
import { useMeta } from "../../lib/useMeta";
import { PageHeader } from "../../components/PageHeader";
import { FormSection } from "../../components/FormSection";
import { FormField } from "../../components/FormField";
import { FormLayout } from "../../components/FormLayout";
import { FormFooter } from "../../components/FormFooter";
import { FormPreview } from "../../components/FormPreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type BudgetPeriodFormData = {
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
};

export const BudgetPeriodFormPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission("budget-period@create");
  const canUpdate = hasPermission("budget-period@update");
  const toast = useToast();

  const [formData, setFormData] = useState<BudgetPeriodFormData>({
    code: "",
    name: "",
    startDate: new Date().toISOString().split("T")[0] || "",
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] || "",
    status: "OPEN",
  });

  const { data: existingPeriod, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["budgetPeriodDetail", id],
    queryFn: () => trpcClient.budgetPeriod.detail.query({ id: id! }),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingPeriod) {
      setFormData({
        code: existingPeriod.code ?? "",
        name: existingPeriod.name,
        startDate: new Date(existingPeriod.startDate).toISOString().split("T")[0] || "",
        endDate: new Date(existingPeriod.endDate).toISOString().split("T")[0] || "",
        status: existingPeriod.status,
      });
    }
  }, [existingPeriod]);

  const createMutation = useMutation({
    mutationFn: (data: BudgetPeriodFormData) => trpcClient.budgetPeriod.create.mutate(data),
    onSuccess: () => {
      toast.success(intl.formatMessage({ id: "common.toast.created", defaultMessage: "Created successfully" }));
      queryClient.invalidateQueries({ queryKey: ["budgetPeriodList"] });
      navigate("/budget-period");
    },
    onError: (error) => {
      toast.error(error, intl.formatMessage({ id: "common.toast.create_failed", defaultMessage: "Failed to create" }));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: BudgetPeriodFormData & { currentId: string }) => trpcClient.budgetPeriod.update.mutate(data),
    onSuccess: () => {
      toast.success(intl.formatMessage({ id: "common.toast.updated", defaultMessage: "Updated successfully" }));
      queryClient.invalidateQueries({ queryKey: ["budgetPeriodList"] });
      navigate("/budget-period");
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
    if (!formData.startDate) {
      toast.error(intl.formatMessage({ id: "budget_period.form.error.start_date_required", defaultMessage: "Start date is required" }));
      return;
    }
    if (!formData.endDate) {
      toast.error(intl.formatMessage({ id: "budget_period.form.error.end_date_required", defaultMessage: "End date is required" }));
      return;
    }
    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      toast.error(intl.formatMessage({ id: "budget_period.form.error.date_order", defaultMessage: "Start date must be before end date" }));
      return;
    }

    if (isEdit) {
      updateMutation.mutate({ ...formData, currentId: id! });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleCancel = () => {
    navigate("/budget-period");
  };

  useMeta({
    title: isEdit
      ? intl.formatMessage({ id: "budget_period.form.edit_title", defaultMessage: "Edit Budget Period" })
      : intl.formatMessage({ id: "budget_period.form.create_title", defaultMessage: "Create Budget Period" }),
    description: isEdit
      ? intl.formatMessage({ id: "budget_period.form.edit_subtitle", defaultMessage: "Update budget period information" })
      : intl.formatMessage({ id: "budget_period.form.create_subtitle", defaultMessage: "Create a new budget period" }),
  });

  const isLoading = isEdit && isLoadingDetail;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const filled = [formData.name, formData.code, formData.startDate, formData.endDate].filter(
    (v) => String(v ?? "").trim().length > 0,
  ).length;
  const dateRange =
    formData.startDate && formData.endDate
      ? `${formData.startDate} → ${formData.endDate}`
      : (formData.startDate || formData.endDate || "");
  // Section completion: all required fields filled AND the form's own
  // date-order validation passes — completion is derived from real validation.
  const sectionComplete =
    formData.name.trim().length > 0 &&
    Boolean(formData.startDate) &&
    Boolean(formData.endDate) &&
    new Date(formData.startDate) <= new Date(formData.endDate);

  if (isLoading) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        data-ai-context={JSON.stringify({ section: "budget-period-form", loading: true })}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full"
      data-ai-context={JSON.stringify({ section: "budget-period-form", isEdit, id: id ?? null })}
    >
      <PageHeader
        module="budgetPeriod"
        eyebrow={intl.formatMessage({ id: "nav.master_data", defaultMessage: "Master Data" })}
        title={isEdit
          ? intl.formatMessage({ id: "budget_period.form.edit_title", defaultMessage: "Edit Budget Period" })
          : intl.formatMessage({ id: "budget_period.form.create_title", defaultMessage: "Create Budget Period" })}
        description={isEdit
          ? intl.formatMessage({ id: "budget_period.form.edit_subtitle", defaultMessage: "Update budget period information" })
          : intl.formatMessage({ id: "budget_period.form.create_subtitle", defaultMessage: "Create a new budget period" })}
        actions={
          <Button variant="outline" onClick={handleCancel}>
            <ArrowLeft className="size-4 mr-2" />
            {intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}
          </Button>
        }
      />
      <div className="flex-1 overflow-auto p-6">
        <FormLayout
          mode="standard"
          sidebar={
            <FormPreview
              module="budgetPeriod"
              icon={CalendarRange}
              title={formData.name}
              status={formData.status}
              filled={filled}
              total={4}
              rows={[
                {
                  icon: Hash,
                  label: intl.formatMessage({ id: "budget_period.form.code", defaultMessage: "Code" }),
                  value: formData.code,
                },
                {
                  icon: CalendarDays,
                  label: intl.formatMessage({ id: "budget_period.form.period", defaultMessage: "Period" }),
                  value: dateRange,
                },
              ]}
            />
          }
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <FormSection
              icon={CalendarRange}
              step={1}
              tone="budgetPeriod"
              completed={sectionComplete}
              title={intl.formatMessage({
                id: "budget_period.form.basic_info",
                defaultMessage: "Basic Information",
              })}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="code">
                    {intl.formatMessage({ id: "budget_period.form.code", defaultMessage: "Code" })}
                  </Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder={intl.formatMessage({ id: "budget_period.form.code_placeholder", defaultMessage: "Optional code" })}
                    disabled={isEdit}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="status">
                    {intl.formatMessage({ id: "budget_period.form.status", defaultMessage: "Status" })}
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder={intl.formatMessage({ id: "common.select.placeholder", defaultMessage: "Select status" })} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPEN">{intl.formatMessage({ id: "budget_period.status.open", defaultMessage: "Open" })}</SelectItem>
                      <SelectItem value="CLOSED">{intl.formatMessage({ id: "budget_period.status.closed", defaultMessage: "Closed" })}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <FormField
                  id="name"
                  className="sm:col-span-2"
                  label={intl.formatMessage({ id: "budget_period.form.name", defaultMessage: "Name" })}
                  isRequired
                  hint={intl.formatMessage({
                    id: "budget_period.form.name_hint",
                    defaultMessage: "A clear name like FY 2026 Q1 makes the period easy to pick later",
                  })}
                  showValid={formData.name.trim().length > 0}
                >
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={intl.formatMessage({ id: "budget_period.form.name_placeholder", defaultMessage: "Enter period name" })}
                  />
                </FormField>
                <FormField
                  id="startDate"
                  label={intl.formatMessage({ id: "budget_period.form.start_date", defaultMessage: "Start Date" })}
                  isRequired
                  hint={intl.formatMessage({
                    id: "budget_period.form.start_date_hint",
                    defaultMessage: "First day of the budget period",
                  })}
                  showValid={Boolean(formData.startDate)}
                >
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </FormField>
                <FormField
                  id="endDate"
                  label={intl.formatMessage({ id: "budget_period.form.end_date", defaultMessage: "End Date" })}
                  isRequired
                  hint={intl.formatMessage({
                    id: "budget_period.form.end_date_hint",
                    defaultMessage: "Last day of the period — must be on or after the start date",
                  })}
                  showValid={Boolean(formData.endDate)}
                >
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </FormField>
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
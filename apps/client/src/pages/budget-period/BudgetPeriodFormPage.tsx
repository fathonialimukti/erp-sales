   import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, X, Calendar } from "lucide-react";

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
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{intl.formatMessage({ id: "budget_period.form.basic_info", defaultMessage: "Basic Information" })}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="code">{intl.formatMessage({ id: "budget_period.form.code", defaultMessage: "Code" })}</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder={intl.formatMessage({ id: "budget_period.form.code_placeholder", defaultMessage: "Optional code" })}
                    disabled={isEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">{intl.formatMessage({ id: "budget_period.form.status", defaultMessage: "Status" })}</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={intl.formatMessage({ id: "common.select.placeholder", defaultMessage: "Select status" })} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPEN">{intl.formatMessage({ id: "budget_period.status.open", defaultMessage: "Open" })}</SelectItem>
                      <SelectItem value="CLOSED">{intl.formatMessage({ id: "budget_period.status.closed", defaultMessage: "Closed" })}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">{intl.formatMessage({ id: "budget_period.form.name", defaultMessage: "Name" })} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={intl.formatMessage({ id: "budget_period.form.name_placeholder", defaultMessage: "Enter period name" })}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">{intl.formatMessage({ id: "budget_period.form.start_date", defaultMessage: "Start Date" })} *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">{intl.formatMessage({ id: "budget_period.form.end_date", defaultMessage: "End Date" })} *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
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
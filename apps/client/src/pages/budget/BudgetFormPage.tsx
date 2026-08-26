import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, X, MapPin, AlertCircle } from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { useToast } from "../../components/useToast";
import { useMeta } from "../../lib/useMeta";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type BudgetFormData = {
  budgetTypeId: string;
  periodId: string;
  scope: "REGION" | "AREA";
  regionId: string;
  areaId: string;
  amount: string;
  currency: string;
};

type BudgetTypeOption = { id: string; code: string; name: string };
type BudgetPeriodOption = { id: string; code: string; name: string };
type RegionOption = { id: string; name: string; code?: string | null };
type AreaOption = { id: string; name: string; code?: string | null; regionId: string };

export const BudgetFormPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canCreate = hasPermission("budget-line@create");
  const canUpdate = hasPermission("budget-line@update");
  const toast = useToast();

  const [formData, setFormData] = useState<BudgetFormData>({
    budgetTypeId: "",
    periodId: "",
    scope: "AREA",
    regionId: "",
    areaId: "",
    amount: "",
    currency: "IDR",
  });

  const { data: budgetTypes } = useQuery({
    queryKey: ["budgetTypeList", 0, 100, ""],
    queryFn: () => trpcClient.budgetType.list.query({ page: 1, limit: 100 }),
  });

  const { data: budgetPeriods } = useQuery({
    queryKey: ["budgetPeriodList", 0, 100, ""],
    queryFn: () => trpcClient.budgetPeriod.list.query({ page: 1, limit: 100 }),
  });

  const { data: regions } = useQuery({
    queryKey: ["regionList", 0, 100, ""],
    queryFn: () => trpcClient.region.list.query({ page: 1, limit: 100 }),
  });

  const { data: areas } = useQuery({
    queryKey: ["areaList", 0, 200, ""],
    queryFn: () => trpcClient.area.list.query({ page: 1, limit: 200 }),
  });

  const { data: existingBudget, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["budgetDetail", id],
    queryFn: () => trpcClient.budget.detail.query({ id: id! }),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingBudget) {
      setFormData({
        budgetTypeId: existingBudget.budgetType?.id ?? "",
        periodId: existingBudget.period?.id ?? "",
        scope: existingBudget.scope as "REGION" | "AREA",
        regionId: existingBudget.region?.id ?? "",
        areaId: existingBudget.area?.id ?? "",
        amount: existingBudget.amount.toString(),
        currency: existingBudget.currency,
      });
    }
  }, [existingBudget]);

  // Reset region/area when scope changes
  const handleScopeChange = (scope: "REGION" | "AREA") => {
    setFormData((prev) => ({
      ...prev,
      scope,
      regionId: scope === "REGION" ? prev.regionId : "",
      areaId: scope === "AREA" ? prev.areaId : "",
    }));
  };

  const filteredAreas = areas?.data?.filter((a: AreaOption) =>
    formData.scope === "AREA" && formData.regionId ? a.regionId === formData.regionId : true
  ) || [];

  const createMutation = useMutation({
    mutationFn: (data: BudgetFormData) =>
      trpcClient.budget.create.mutate({
        budgetTypeId: data.budgetTypeId,
        periodId: data.periodId,
        scope: data.scope,
        regionId: data.regionId || undefined,
        areaId: data.areaId || undefined,
        amount: parseFloat(data.amount),
        currency: data.currency,
      }),
    onSuccess: () => {
      toast.success(intl.formatMessage({ id: "common.toast.created", defaultMessage: "Created successfully" }));
      queryClient.invalidateQueries({ queryKey: ["budgetList"] });
      navigate("/budget");
    },
    onError: (error) => {
      toast.error(error, intl.formatMessage({ id: "common.toast.create_failed", defaultMessage: "Failed to create" }));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: BudgetFormData & { currentId: string }) =>
      trpcClient.budget.update.mutate({
        currentId: data.currentId,
        budgetTypeId: data.budgetTypeId,
        periodId: data.periodId,
        scope: data.scope,
        regionId: data.regionId || undefined,
        areaId: data.areaId || undefined,
        amount: parseFloat(data.amount),
        currency: data.currency,
      }),
    onSuccess: () => {
      toast.success(intl.formatMessage({ id: "common.toast.updated", defaultMessage: "Updated successfully" }));
      queryClient.invalidateQueries({ queryKey: ["budgetList"] });
      navigate("/budget");
    },
    onError: (error) => {
      toast.error(error, intl.formatMessage({ id: "common.toast.update_failed", defaultMessage: "Failed to update" }));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.budgetTypeId) {
      toast.error(intl.formatMessage({ id: "budget_line.form.error.type_required", defaultMessage: "Budget type is required" }));
      return;
    }
    if (!formData.periodId) {
      toast.error(intl.formatMessage({ id: "budget_line.form.error.period_required", defaultMessage: "Budget period is required" }));
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error(intl.formatMessage({ id: "budget_line.form.error.amount_required", defaultMessage: "Amount must be positive" }));
      return;
    }
    if (formData.scope === "REGION" && !formData.regionId) {
      toast.error(intl.formatMessage({ id: "budget_line.form.error.region_required", defaultMessage: "Region is required for REGION scope" }));
      return;
    }
    if (formData.scope === "AREA" && !formData.areaId) {
      toast.error(intl.formatMessage({ id: "budget_line.form.error.area_required", defaultMessage: "Area is required for AREA scope" }));
      return;
    }

    if (isEdit) {
      updateMutation.mutate({ ...formData, currentId: id! });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleCancel = () => {
    navigate("/budget");
  };

  useMeta({
    title: isEdit
      ? intl.formatMessage({ id: "budget_line.form.edit_title", defaultMessage: "Edit Budget Line" })
      : intl.formatMessage({ id: "budget_line.form.create_title", defaultMessage: "Create Budget Line" }),
    description: isEdit
      ? intl.formatMessage({ id: "budget_line.form.edit_subtitle", defaultMessage: "Update budget line allocation" })
      : intl.formatMessage({ id: "budget_line.form.create_subtitle", defaultMessage: "Create a new budget line allocation" }),
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
        module="budget"
        eyebrow={intl.formatMessage({ id: "nav.master_data", defaultMessage: "Master Data" })}
        title={isEdit
          ? intl.formatMessage({ id: "budget_line.form.edit_title", defaultMessage: "Edit Budget Line" })
          : intl.formatMessage({ id: "budget_line.form.create_title", defaultMessage: "Create Budget Line" })}
        description={isEdit
          ? intl.formatMessage({ id: "budget_line.form.edit_subtitle", defaultMessage: "Update budget line allocation" })
          : intl.formatMessage({ id: "budget_line.form.create_subtitle", defaultMessage: "Create a new budget line allocation" })}
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
              <CardTitle>{intl.formatMessage({ id: "budget_line.form.basic_info", defaultMessage: "Basic Information" })}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="budgetTypeId">{intl.formatMessage({ id: "budget_line.form.budget_type", defaultMessage: "Budget Type" })} *</Label>
                  <Select
                    value={formData.budgetTypeId}
                    onValueChange={(value) => setFormData({ ...formData, budgetTypeId: value })}
                    disabled={isEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={intl.formatMessage({ id: "common.select.placeholder", defaultMessage: "Select budget type" })} />
                    </SelectTrigger>
                    <SelectContent>
                      {budgetTypes?.data?.map((type: BudgetTypeOption) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.code} - {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="periodId">{intl.formatMessage({ id: "budget_line.form.period", defaultMessage: "Budget Period" })} *</Label>
                  <Select
                    value={formData.periodId}
                    onValueChange={(value) => setFormData({ ...formData, periodId: value })}
                    disabled={isEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={intl.formatMessage({ id: "common.select.placeholder", defaultMessage: "Select budget period" })} />
                    </SelectTrigger>
                    <SelectContent>
                      {budgetPeriods?.data?.map((period: BudgetPeriodOption) => (
                        <SelectItem key={period.id} value={period.id}>
                          {period.code} - {period.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scope">{intl.formatMessage({ id: "budget_line.form.scope", defaultMessage: "Scope" })} *</Label>
                <Select
                  value={formData.scope}
                  onValueChange={(value) => handleScopeChange(value as "REGION" | "AREA")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={intl.formatMessage({ id: "common.select.placeholder", defaultMessage: "Select scope" })} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REGION">
                      {intl.formatMessage({ id: "budget.scope.region", defaultMessage: "Region" })}
                    </SelectItem>
                    <SelectItem value="AREA">
                      {intl.formatMessage({ id: "budget.scope.area", defaultMessage: "Area" })}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="regionId">{intl.formatMessage({ id: "budget_line.form.region", defaultMessage: "Region" })} {formData.scope === "REGION" && <span className="text-destructive">*</span>}</Label>
                  <Select
                    value={formData.regionId}
                    onValueChange={(value) => setFormData({ ...formData, regionId: value })}
                    disabled={formData.scope !== "REGION"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={intl.formatMessage({ id: "common.select.placeholder", defaultMessage: "Select region" })} />
                    </SelectTrigger>
                    <SelectContent>
                      {regions?.data?.map((region: RegionOption) => (
                        <SelectItem key={region.id} value={region.id}>
                          {region.code} - {region.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="areaId">{intl.formatMessage({ id: "budget_line.form.area", defaultMessage: "Area" })} {formData.scope === "AREA" && <span className="text-destructive">*</span>}</Label>
                  <Select
                    value={formData.areaId}
                    onValueChange={(value) => setFormData({ ...formData, areaId: value })}
                    disabled={formData.scope !== "AREA"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={intl.formatMessage({ id: "common.select.placeholder", defaultMessage: "Select area" })} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredAreas.map((area: AreaOption) => (
                        <SelectItem key={area.id} value={area.id}>
                          {area.code} - {area.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="amount">{intl.formatMessage({ id: "budget_line.form.amount", defaultMessage: "Amount" })} *</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder={intl.formatMessage({ id: "budget_line.form.amount_placeholder", defaultMessage: "Enter amount" })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">{intl.formatMessage({ id: "budget_line.form.currency", defaultMessage: "Currency" })}</Label>
                  <Input
                    id="currency"
                    value={formData.currency}
                    readOnly
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
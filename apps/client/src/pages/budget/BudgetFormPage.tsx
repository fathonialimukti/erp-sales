import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, X, MapPin, AlertCircle, Wallet, CalendarRange, MapPinned, Map, BadgeDollarSign } from "lucide-react";

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

  const typeName =
    budgetTypes?.data?.find((t: BudgetTypeOption) => t.id === formData.budgetTypeId)?.name ?? "";
  const periodName =
    budgetPeriods?.data?.find((p: BudgetPeriodOption) => p.id === formData.periodId)?.name ?? "";
  const regionName =
    regions?.data?.find((r: RegionOption) => r.id === formData.regionId)?.name ?? "";
  const areaName =
    areas?.data?.find((a: AreaOption) => a.id === formData.areaId)?.name ?? "";
  const scopeName = intl.formatMessage(
    formData.scope === "REGION"
      ? { id: "budget.scope.region", defaultMessage: "Region" }
      : { id: "budget.scope.area", defaultMessage: "Area" },
  );
  // Validation-derived field states — section completion and the preview
  // meter reflect real validity (amount > 0, scope target selected), not
  // just "a value exists".
  const amountValid = formData.amount.trim().length > 0 && Number(formData.amount) > 0;
  const scopeTargetId = formData.scope === "REGION" ? formData.regionId : formData.areaId;
  const sectionComplete =
    Boolean(formData.budgetTypeId) &&
    Boolean(formData.periodId) &&
    amountValid &&
    Boolean(scopeTargetId);
  const filled = [
    Boolean(formData.budgetTypeId),
    Boolean(formData.periodId),
    amountValid,
    Boolean(scopeTargetId),
  ].filter(Boolean).length;

  if (isLoading) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        data-ai-context={JSON.stringify({ section: "budget-form", loading: true })}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full"
      data-ai-context={JSON.stringify({ section: "budget-form", isEdit, id: id ?? null })}
    >
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
        <FormLayout
          mode="standard"
          sidebar={
            <FormPreview
              module="budget"
              icon={Wallet}
              title={typeName || periodName || scopeName}
              subtitle={periodName || undefined}
              status={!isEdit ? "DRAFT" : undefined}
              filled={filled}
              total={4}
              rows={[
                {
                  icon: MapPin,
                  label: intl.formatMessage({ id: "budget_line.form.scope", defaultMessage: "Scope" }),
                  value: `${scopeName} · ${
                    formData.scope === "REGION" ? regionName : areaName
                  }`,
                },
                {
                  icon: BadgeDollarSign,
                  label: intl.formatMessage({ id: "budget_line.form.amount", defaultMessage: "Amount" }),
                  value: `${formData.currency} ${Number(formData.amount || 0).toLocaleString()}`,
                  money: true,
                },
              ]}
            />
          }
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <FormSection
              icon={Wallet}
              step={1}
              tone="budget"
              completed={sectionComplete}
              title={intl.formatMessage({
                id: "budget_line.form.basic_info",
                defaultMessage: "Basic Information",
              })}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  id="budgetTypeId"
                  label={intl.formatMessage({ id: "budget_line.form.budget_type", defaultMessage: "Budget Type" })}
                  isRequired
                  hint={intl.formatMessage({
                    id: "budget_line.form.budget_type_hint",
                    defaultMessage: "The expense category this allocation belongs to",
                  })}
                  showValid={Boolean(formData.budgetTypeId)}
                >
                  <Select
                    value={formData.budgetTypeId}
                    onValueChange={(value) => setFormData({ ...formData, budgetTypeId: value })}
                    disabled={isEdit}
                  >
                    <SelectTrigger id="budgetTypeId">
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
                </FormField>
                <FormField
                  id="periodId"
                  label={intl.formatMessage({ id: "budget_line.form.period", defaultMessage: "Budget Period" })}
                  isRequired
                  hint={intl.formatMessage({
                    id: "budget_line.form.period_hint",
                    defaultMessage: "The budget period this amount is allocated to",
                  })}
                  showValid={Boolean(formData.periodId)}
                >
                  <Select
                    value={formData.periodId}
                    onValueChange={(value) => setFormData({ ...formData, periodId: value })}
                    disabled={isEdit}
                  >
                    <SelectTrigger id="periodId">
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
                </FormField>
                <FormField
                  id="scope"
                  className="sm:col-span-2"
                  label={intl.formatMessage({ id: "budget_line.form.scope", defaultMessage: "Scope" })}
                  isRequired
                  hint={intl.formatMessage({
                    id: "budget_line.form.scope_hint",
                    defaultMessage: "Allocate to an entire region or to a specific area",
                  })}
                  showValid
                >
                  <Select
                    value={formData.scope}
                    onValueChange={(value) => handleScopeChange(value as "REGION" | "AREA")}
                  >
                    <SelectTrigger id="scope">
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
                </FormField>
                <FormField
                  id="regionId"
                  label={intl.formatMessage({ id: "budget_line.form.region", defaultMessage: "Region" })}
                  isRequired={formData.scope === "REGION"}
                  hint={intl.formatMessage({
                    id: "budget_line.form.region_hint",
                    defaultMessage: "Required when the scope is Region — covers every area inside it",
                  })}
                  showValid={formData.scope === "REGION" && Boolean(formData.regionId)}
                >
                  <Select
                    value={formData.regionId}
                    onValueChange={(value) => setFormData({ ...formData, regionId: value })}
                    disabled={formData.scope !== "REGION"}
                  >
                    <SelectTrigger id="regionId">
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
                </FormField>
                <FormField
                  id="areaId"
                  label={intl.formatMessage({ id: "budget_line.form.area", defaultMessage: "Area" })}
                  isRequired={formData.scope === "AREA"}
                  hint={intl.formatMessage({
                    id: "budget_line.form.area_hint",
                    defaultMessage: "Required when the scope is Area — the specific area receiving the budget",
                  })}
                  showValid={formData.scope === "AREA" && Boolean(formData.areaId)}
                >
                  <Select
                    value={formData.areaId}
                    onValueChange={(value) => setFormData({ ...formData, areaId: value })}
                    disabled={formData.scope !== "AREA"}
                  >
                    <SelectTrigger id="areaId">
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
                </FormField>
                <FormField
                  id="amount"
                  label={intl.formatMessage({ id: "budget_line.form.amount", defaultMessage: "Amount" })}
                  isRequired
                  hint={intl.formatMessage({
                    id: "budget_line.form.amount_hint",
                    defaultMessage: "Total allocated for this scope during the selected period",
                  })}
                  showValid={amountValid}
                >
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder={intl.formatMessage({ id: "budget_line.form.amount_placeholder", defaultMessage: "Enter amount" })}
                    min="0.01"
                    step="0.01"
                  />
                </FormField>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="currency">
                    {intl.formatMessage({ id: "budget_line.form.currency", defaultMessage: "Currency" })}
                  </Label>
                  <Input
                    id="currency"
                    value={formData.currency}
                    readOnly
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
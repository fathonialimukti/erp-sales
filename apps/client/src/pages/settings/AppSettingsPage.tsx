import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import {
  AlertCircle,
  Bot,
  Building2,
  Loader2,
  Mail,
  Save,
  Server,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { useMeta } from "../../lib/useMeta";
import { useToast } from "../../components/useToast";
import { PageHeader } from "../../components/PageHeader";
import { moduleCssVar } from "@/types/module";
import { getMotionProps, pageEnter } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import type { AppSettings } from "@repo/schemas/settings";

/** Exact masked shape returned by `settings.get` (secrets are `{ hasValue }`). */
type MaskedSettings = Awaited<ReturnType<typeof trpcClient.settings.get.query>>;

interface FormValues {
  company: {
    name: string;
    tagline: string;
    address: string;
    taxId: string;
    email: string;
    phone: string;
  };
  general: {
    currencySymbol: string;
    currencyCode: string;
    fiscalYearStartMonth: number;
    defaultPageSize: number;
    passwordMinLength: number;
    auditLogRetentionDays: number;
  };
  ai: {
    baseUrl: string;
    model: string;
    apiKey: string; // write-only: empty = keep existing
  };
  smtp: {
    host: string;
    port: number;
    user: string;
    pass: string; // write-only
    from: string;
    domain: string;
  };
  emailAgent: {
    title: string;
    company: string;
    maxThreadChars: number;
  };
  system: {
    aiSystemEmail: string;
    systemUserId: string;
  };
}

/** Settings module accent — falls back to primary until Task 7 registers the token. */
const settingsAccent = moduleCssVar("settings") ?? "var(--primary)";

const toFormValues = (s: MaskedSettings): FormValues => ({
  company: {
    name: s.company?.name ?? "",
    tagline: s.company?.tagline ?? "",
    address: s.company?.address ?? "",
    taxId: s.company?.taxId ?? "",
    email: s.company?.email ?? "",
    phone: s.company?.phone ?? "",
  },
  general: {
    currencySymbol: s.general?.currencySymbol ?? "$",
    currencyCode: s.general?.currencyCode ?? "USD",
    fiscalYearStartMonth: s.general?.fiscalYearStartMonth ?? 1,
    defaultPageSize: s.general?.defaultPageSize ?? 10,
    passwordMinLength: s.general?.passwordMinLength ?? 6,
    auditLogRetentionDays: s.general?.auditLogRetentionDays ?? 365,
  },
  ai: {
    baseUrl: s.ai?.baseUrl ?? "",
    model: s.ai?.model ?? "",
    apiKey: "",
  },
  smtp: {
    host: s.smtp?.host ?? "",
    port: s.smtp?.port ?? 587,
    user: s.smtp?.user ?? "",
    pass: "",
    from: s.smtp?.from ?? "",
    domain: s.smtp?.domain ?? "",
  },
  emailAgent: {
    title: s.emailAgent?.title ?? "",
    company: s.emailAgent?.company ?? "",
    maxThreadChars: s.emailAgent?.maxThreadChars ?? 12000,
  },
  system: {
    aiSystemEmail: s.system?.aiSystemEmail ?? "",
    systemUserId: s.system?.systemUserId ?? "",
  },
});

/** Build the update patch. Secret fields are omitted when empty (keep existing). */
const buildPatch = (values: FormValues): AppSettings => ({
  company: { ...values.company },
  general: { ...values.general },
  ai: {
    baseUrl: values.ai.baseUrl,
    model: values.ai.model,
    ...(values.ai.apiKey ? { apiKey: values.ai.apiKey } : {}),
  },
  smtp: {
    host: values.smtp.host,
    port: values.smtp.port,
    user: values.smtp.user,
    from: values.smtp.from,
    domain: values.smtp.domain,
    ...(values.smtp.pass ? { pass: values.smtp.pass } : {}),
  },
  emailAgent: { ...values.emailAgent },
  system: { ...values.system },
});

const SectionCard = ({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) => (
  <Card className="shadow-sm">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 font-heading text-base font-bold">
        <span
          className="flex size-8 items-center justify-center rounded-lg"
          style={{
            backgroundColor: `color-mix(in srgb, ${settingsAccent} 8%, transparent)`,
            color: settingsAccent,
          }}
        >
          <Icon className="size-4" aria-hidden />
        </span>
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

const TextField = ({
  id,
  label,
  value,
  type = "text",
  placeholder,
  hint,
  disabled,
  className,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  type?: string;
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
  onChange: (value: string) => void;
}) => (
  <div className={`space-y-1.5 ${className ?? ""}`}>
    <Label htmlFor={id}>{label}</Label>
    <Input
      id={id}
      type={type}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
    {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
  </div>
);

const NumberField = ({
  id,
  label,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) => (
  <div className="space-y-1.5">
    <Label htmlFor={id}>{label}</Label>
    <Input
      id={id}
      type="number"
      min={min}
      max={max}
      value={value}
      disabled={disabled}
      onChange={(e) => {
        const n = Number(e.target.value);
        if (Number.isFinite(n)) onChange(n);
      }}
      onBlur={() => {
        const clamped = Math.min(max, Math.max(min, value));
        if (clamped !== value) onChange(clamped);
      }}
    />
  </div>
);

export const AppSettingsPage = () => {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const toast = useToast();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const reducedMotion = useReducedMotion();
  const enterProps = getMotionProps(reducedMotion);

  const canRead = hasPermission("settings@read");
  const canUpdate = hasPermission("settings@update");

  useMeta({
    title: intl.formatMessage({ id: "settings.app.title", defaultMessage: "App settings" }),
    description: intl.formatMessage({
      id: "settings.app.subtitle",
      defaultMessage: "Organization-wide configuration.",
    }),
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["appSettings"],
    queryFn: () => trpcClient.settings.get.query(),
    enabled: canRead,
  });

  const [form, setForm] = useState<FormValues | null>(null);

  useEffect(() => {
    if (data) setForm(toFormValues(data));
  }, [data]);

  const update = <G extends keyof FormValues, K extends keyof FormValues[G]>(
    group: G,
    key: K,
    value: FormValues[G][K],
  ) => {
    setForm((prev) => {
      if (!prev) return prev;
      const nextGroup = { ...prev[group], [key]: value } as FormValues[G];
      return { ...prev, [group]: nextGroup };
    });
  };

  const isDirty = useMemo(() => {
    if (!form || !data) return false;
    return JSON.stringify(form) !== JSON.stringify(toFormValues(data));
  }, [form, data]);

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) =>
      trpcClient.settings.update.mutate(buildPatch(values)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appSettings"] });
      toast.success(
        intl.formatMessage({ id: "settings.app.saved", defaultMessage: "App settings saved" }),
      );
    },
    onError: (e) => {
      toast.error(e, "Failed to save settings");
    },
  });

  const handleSave = () => {
    if (form) saveMutation.mutate(form);
  };

  const monthLabel = (month: number) =>
    new Intl.DateTimeFormat(intl.locale, { month: "long" }).format(
      new Date(2000, month - 1, 1),
    );

  const secretHint = intl.formatMessage({
    id: "settings.app.secret_hint",
    defaultMessage: "Leave blank to keep the current value.",
  });

  // Secrets are write-only: show a masked placeholder when a value exists.
  const aiKeySet = Boolean(data?.ai?.apiKey?.hasValue);
  const smtpPassSet = Boolean(data?.smtp?.pass?.hasValue);

  if (!canRead) {
    return (
      <section
        className="flex flex-col gap-3 pt-1 pb-6"
        data-ai-context={JSON.stringify({ section: "app-settings", denied: true })}
      >
        <PageHeader
          module="settings"
          title={intl.formatMessage({ id: "settings.app.title", defaultMessage: "App settings" })}
          description={intl.formatMessage({
            id: "settings.app.subtitle",
            defaultMessage: "Organization-wide configuration.",
          })}
        />
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-primary">
              <ShieldAlert className="size-6" aria-hidden />
            </span>
            <p className="text-sm text-foreground">
              {intl.formatMessage({
                id: "settings.app.access_denied",
                defaultMessage: "You do not have permission to view app settings.",
              })}
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (isLoading || !form) {
    return (
      <section
        className="flex flex-col gap-3 pt-1 pb-6"
        data-ai-context={JSON.stringify({ section: "app-settings", loading: true })}
      >
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-40 w-full" />
      </section>
    );
  }

  if (isError) {
    return (
      <section
        className="flex flex-col gap-3 pt-1 pb-6"
        data-ai-context={JSON.stringify({ section: "app-settings", error: true })}
      >
        <PageHeader
          module="settings"
          title={intl.formatMessage({ id: "settings.app.title", defaultMessage: "App settings" })}
          description={intl.formatMessage({
            id: "settings.app.subtitle",
            defaultMessage: "Organization-wide configuration.",
          })}
        />
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertCircle className="size-8 text-destructive" aria-hidden />
            <p className="text-sm text-foreground">
              {intl.formatMessage({
                id: "error_generic",
                defaultMessage: "An unexpected error occurred.",
              })}
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <motion.section
      className="flex flex-col gap-3 pt-1 pb-6"
      variants={pageEnter}
      {...enterProps}
      data-ai-context={JSON.stringify({ section: "app-settings" })}
    >
      <PageHeader
        module="settings"
        title={intl.formatMessage({ id: "settings.app.title", defaultMessage: "App settings" })}
        description={intl.formatMessage({
          id: "settings.app.subtitle",
          defaultMessage: "Organization-wide configuration.",
        })}
      />

      <fieldset disabled={!canUpdate} className="flex flex-col gap-3">
        {/* Company profile */}
        <SectionCard
          icon={Building2}
          title={intl.formatMessage({
            id: "settings.app.section_company",
            defaultMessage: "Company profile",
          })}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <TextField
              id="company-name"
              label={intl.formatMessage({ id: "settings.app.field_name", defaultMessage: "Company name" })}
              value={form.company.name}
              onChange={(v) => update("company", "name", v)}
            />
            <TextField
              id="company-tagline"
              label={intl.formatMessage({ id: "settings.app.field_tagline", defaultMessage: "Tagline" })}
              value={form.company.tagline}
              onChange={(v) => update("company", "tagline", v)}
            />
            <TextField
              id="company-email"
              label={intl.formatMessage({ id: "settings.app.field_email", defaultMessage: "Email" })}
              type="email"
              value={form.company.email}
              onChange={(v) => update("company", "email", v)}
            />
            <TextField
              id="company-phone"
              label={intl.formatMessage({ id: "settings.app.field_phone", defaultMessage: "Phone" })}
              value={form.company.phone}
              onChange={(v) => update("company", "phone", v)}
            />
            <TextField
              id="company-tax-id"
              label={intl.formatMessage({ id: "settings.app.field_tax_id", defaultMessage: "Tax ID" })}
              value={form.company.taxId}
              onChange={(v) => update("company", "taxId", v)}
            />
            <TextField
              id="company-address"
              label={intl.formatMessage({ id: "settings.app.field_address", defaultMessage: "Address" })}
              value={form.company.address}
              onChange={(v) => update("company", "address", v)}
            />
          </div>
        </SectionCard>

        {/* General */}
        <SectionCard
          icon={SlidersHorizontal}
          title={intl.formatMessage({
            id: "settings.app.section_general",
            defaultMessage: "General",
          })}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <TextField
              id="general-currency-symbol"
              label={intl.formatMessage({
                id: "settings.app.field_currency_symbol",
                defaultMessage: "Currency symbol",
              })}
              value={form.general.currencySymbol}
              onChange={(v) => update("general", "currencySymbol", v)}
            />
            <TextField
              id="general-currency-code"
              label={intl.formatMessage({
                id: "settings.app.field_currency_code",
                defaultMessage: "Currency code",
              })}
              value={form.general.currencyCode}
              onChange={(v) => update("general", "currencyCode", v)}
            />
            <div className="space-y-1.5">
              <Label htmlFor="general-fiscal-month">
                {intl.formatMessage({
                  id: "settings.app.field_fiscal_month",
                  defaultMessage: "Fiscal year starts in",
                })}
              </Label>
              <Select
                value={String(form.general.fiscalYearStartMonth)}
                onValueChange={(v) => update("general", "fiscalYearStartMonth", Number(v))}
              >
                <SelectTrigger id="general-fiscal-month" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {monthLabel(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <NumberField
              id="general-page-size"
              label={intl.formatMessage({
                id: "settings.app.field_page_size",
                defaultMessage: "Default page size",
              })}
              value={form.general.defaultPageSize}
              min={5}
              max={100}
              onChange={(v) => update("general", "defaultPageSize", v)}
            />
            <NumberField
              id="general-password-min"
              label={intl.formatMessage({
                id: "settings.app.field_password_min",
                defaultMessage: "Minimum password length",
              })}
              value={form.general.passwordMinLength}
              min={6}
              max={64}
              onChange={(v) => update("general", "passwordMinLength", v)}
            />
            <NumberField
              id="general-audit-retention"
              label={intl.formatMessage({
                id: "settings.app.field_audit_retention",
                defaultMessage: "Audit log retention (days)",
              })}
              value={form.general.auditLogRetentionDays}
              min={1}
              max={3650}
              onChange={(v) => update("general", "auditLogRetentionDays", v)}
            />
          </div>
        </SectionCard>

        {/* AI provider */}
        <SectionCard
          icon={Sparkles}
          title={intl.formatMessage({
            id: "settings.app.section_ai",
            defaultMessage: "AI provider",
          })}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              id="ai-base-url"
              label={intl.formatMessage({
                id: "settings.app.field_ai_base_url",
                defaultMessage: "Base URL",
              })}
              type="url"
              className="sm:col-span-2"
              value={form.ai.baseUrl}
              onChange={(v) => update("ai", "baseUrl", v)}
            />
            <TextField
              id="ai-model"
              label={intl.formatMessage({ id: "settings.app.field_ai_model", defaultMessage: "Model" })}
              value={form.ai.model}
              onChange={(v) => update("ai", "model", v)}
            />
            <TextField
              id="ai-api-key"
              label={intl.formatMessage({
                id: "settings.app.field_ai_api_key",
                defaultMessage: "API key",
              })}
              type="password"
              value={form.ai.apiKey}
              placeholder={aiKeySet ? "••••••" : ""}
              hint={secretHint}
              onChange={(v) => update("ai", "apiKey", v)}
            />
          </div>
        </SectionCard>

        {/* Outbound email (SMTP) */}
        <SectionCard
          icon={Mail}
          title={intl.formatMessage({
            id: "settings.app.section_smtp",
            defaultMessage: "Outbound email (SMTP)",
          })}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <TextField
              id="smtp-host"
              label={intl.formatMessage({ id: "settings.app.field_smtp_host", defaultMessage: "Host" })}
              value={form.smtp.host}
              onChange={(v) => update("smtp", "host", v)}
            />
            <NumberField
              id="smtp-port"
              label={intl.formatMessage({ id: "settings.app.field_smtp_port", defaultMessage: "Port" })}
              value={form.smtp.port}
              min={1}
              max={65535}
              onChange={(v) => update("smtp", "port", v)}
            />
            <TextField
              id="smtp-user"
              label={intl.formatMessage({ id: "settings.app.field_smtp_user", defaultMessage: "Username" })}
              value={form.smtp.user}
              onChange={(v) => update("smtp", "user", v)}
            />
            <TextField
              id="smtp-pass"
              label={intl.formatMessage({ id: "settings.app.field_smtp_pass", defaultMessage: "Password" })}
              type="password"
              value={form.smtp.pass}
              placeholder={smtpPassSet ? "••••••" : ""}
              hint={secretHint}
              onChange={(v) => update("smtp", "pass", v)}
            />
            <TextField
              id="smtp-from"
              label={intl.formatMessage({ id: "settings.app.field_smtp_from", defaultMessage: "From" })}
              value={form.smtp.from}
              onChange={(v) => update("smtp", "from", v)}
            />
            <TextField
              id="smtp-domain"
              label={intl.formatMessage({ id: "settings.app.field_smtp_domain", defaultMessage: "Domain" })}
              value={form.smtp.domain}
              onChange={(v) => update("smtp", "domain", v)}
            />
          </div>
        </SectionCard>

        {/* Email agent */}
        <SectionCard
          icon={Bot}
          title={intl.formatMessage({
            id: "settings.app.section_email_agent",
            defaultMessage: "Email agent",
          })}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              id="agent-title"
              label={intl.formatMessage({ id: "settings.app.field_agent_title", defaultMessage: "Title" })}
              value={form.emailAgent.title}
              onChange={(v) => update("emailAgent", "title", v)}
            />
            <TextField
              id="agent-company"
              label={intl.formatMessage({
                id: "settings.app.field_agent_company",
                defaultMessage: "Company",
              })}
              value={form.emailAgent.company}
              onChange={(v) => update("emailAgent", "company", v)}
            />
            <NumberField
              id="agent-max-thread"
              label={intl.formatMessage({
                id: "settings.app.field_agent_max_thread",
                defaultMessage: "Max thread chars",
              })}
              value={form.emailAgent.maxThreadChars}
              min={1000}
              max={100000}
              onChange={(v) => update("emailAgent", "maxThreadChars", v)}
            />
          </div>
        </SectionCard>

        {/* System identity */}
        <SectionCard
          icon={Server}
          title={intl.formatMessage({
            id: "settings.app.section_system",
            defaultMessage: "System identity",
          })}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              id="system-email"
              label={intl.formatMessage({
                id: "settings.app.field_system_email",
                defaultMessage: "AI system email",
              })}
              type="email"
              value={form.system.aiSystemEmail}
              onChange={(v) => update("system", "aiSystemEmail", v)}
            />
            <TextField
              id="system-user-id"
              label={intl.formatMessage({
                id: "settings.app.field_system_user",
                defaultMessage: "System user ID",
              })}
              value={form.system.systemUserId}
              onChange={(v) => update("system", "systemUserId", v)}
            />
          </div>
        </SectionCard>
      </fieldset>

      <div className="flex justify-end">
        {canUpdate ? (
          <Button
            type="button"
            size="sm"
            disabled={!isDirty || saveMutation.isPending}
            onClick={handleSave}
          >
            {saveMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Save className="size-3.5" aria-hidden />
            )}
            {intl.formatMessage({ id: "settings.app.save", defaultMessage: "Save changes" })}
          </Button>
        ) : null}
      </div>
    </motion.section>
  );
};

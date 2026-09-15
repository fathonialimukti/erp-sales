import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import {
  AlertCircle,
  Bell,
  Bot,
  Loader2,
  Mail,
  Palette,
  Save,
  Server,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { hasPermissionAtom } from "../../lib/atoms";
import { trpcClient } from "../../lib/trpc";
import { useAppSettings, useUpdateAppSettings } from "../../lib/hooks/useSettings";
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
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type {
  AppSettingsInput,
  UpdateAppSettingsInput,
} from "@repo/schemas/settings";
import type { AppSettings } from "@repo/schemas/settings";

/**
 * Local form state. Nullable server fields stay as "" when empty;
 * `allowedLoginMethods` is edited as comma-separated text (same pattern
 * as muted categories on UserSettingsPage) and split on submit.
 */
interface FormValues {
  companyName: string;
  logoUrl: string;
  defaultLanguage: "en" | "id";
  timezone: string;
  dateFormat: string;
  numberFormat: string;
  defaultCurrency: string;
  defaultTheme: "light" | "dark" | "system";
  accentColor: string;
  sidebarCollapsed: boolean;
  emailNotifications: boolean;
  defaultNotificationFrequency: "realtime" | "daily" | "weekly";
  announcement: string;
  sessionTimeout: number;
  minPasswordLength: number;
  enforceTwoFactor: boolean;
  allowedLoginMethods: string;
}

/** Settings module accent for section icon plates (allowed chrome surface). */
const settingsAccent = moduleCssVar("settings") ?? "var(--primary)";

const toFormValues = (s: AppSettingsInput): FormValues => ({
  companyName: s.companyName ?? "",
  logoUrl: s.logoUrl ?? "",
  defaultLanguage: s.defaultLanguage ?? "en",
  timezone: s.timezone ?? "",
  dateFormat: s.dateFormat ?? "",
  numberFormat: s.numberFormat ?? "",
  defaultCurrency: s.defaultCurrency ?? "",
  defaultTheme: s.defaultTheme ?? "system",
  accentColor: s.accentColor ?? "",
  sidebarCollapsed: s.sidebarCollapsed ?? false,
  emailNotifications: s.emailNotifications ?? true,
  defaultNotificationFrequency: s.defaultNotificationFrequency ?? "daily",
  announcement: s.announcement ?? "",
  sessionTimeout: s.sessionTimeout ?? 60,
  minPasswordLength: s.minPasswordLength ?? 8,
  enforceTwoFactor: s.enforceTwoFactor ?? false,
  allowedLoginMethods: (s.allowedLoginMethods ?? []).join(", "),
});

const buildPatch = (values: FormValues): UpdateAppSettingsInput => ({
  companyName: values.companyName,
  logoUrl: values.logoUrl.trim() === "" ? null : values.logoUrl.trim(),
  defaultLanguage: values.defaultLanguage,
  timezone: values.timezone,
  dateFormat: values.dateFormat,
  numberFormat: values.numberFormat,
  defaultCurrency: values.defaultCurrency,
  defaultTheme: values.defaultTheme,
  accentColor: values.accentColor,
  sidebarCollapsed: values.sidebarCollapsed,
  emailNotifications: values.emailNotifications,
  defaultNotificationFrequency: values.defaultNotificationFrequency,
  announcement:
    values.announcement.trim() === "" ? null : values.announcement,
  sessionTimeout: values.sessionTimeout,
  minPasswordLength: values.minPasswordLength,
  enforceTwoFactor: values.enforceTwoFactor,
  allowedLoginMethods: values.allowedLoginMethods
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean),
});

/** Exact masked shape returned by legacy `settings.get` (secrets are `{ hasValue }`). */
type MaskedLegacySettings = Awaited<
  ReturnType<typeof trpcClient.settings.get.query>
>;

/** Canonical encryption modes offered in the UI (legacy aliases normalize into these). */
type SmtpSecure = "none" | "starttls" | "ssl";

/**
 * Legacy AI provider form state (bound to `settings.get`/`settings.update`,
 * NOT the `getApp`/`updateApp` taxonomy above). `globalRpm` stays a string so
 * empty (unlimited → null) is representable; secrets are write-only.
 */
interface AiFormValues {
  baseUrl: string;
  model: string;
  multimodalEnabled: boolean;
  globalRpm: string;
  apiKey: string;
  embeddingBaseUrl: string;
  embeddingModel: string;
  embeddingDimensions: number;
  embeddingApiKey: string;
  smtp: {
    host: string;
    port: string;
    secure: SmtpSecure;
    user: string;
    pass: string;
    from: string;
    domain: string;
  };
  emailAgent: {
    title: string;
    company: string;
    maxThreadChars: string;
  };
  system: {
    aiSystemEmail: string;
    systemUserId: string;
  };
}

/** Ports that speak implicit TLS server-side (mirrors `email-smtp.ts`). */
const IMPLICIT_TLS_PORTS = new Set([465]);

/** Effective mode when `smtp.secure` is unset — mirrors server port inference. */
const inferSecure = (port: number): SmtpSecure =>
  IMPLICIT_TLS_PORTS.has(port) ? "ssl" : "starttls";

/**
 * Normalize the stored `smtp.secure` value into a UI mode. Legacy aliases
 * (`tls`, `start-tls`) collapse to canonical values; unset falls back to the
 * same port heuristic the server uses so the control reflects reality.
 */
export const normalizeSecure = (
  raw: string | undefined,
  port: number,
): SmtpSecure => {
  if (raw === "none" || raw === "starttls" || raw === "ssl") return raw;
  if (raw === "tls") return "ssl";
  if (raw === "start-tls") return "starttls";
  return inferSecure(port);
};

const toAiFormValues = (s: MaskedLegacySettings): AiFormValues => {
  const smtpPort =
    s.smtp?.port == null ? "" : String(s.smtp.port);
  return {
    baseUrl: s.ai?.baseUrl ?? "",
    model: s.ai?.model ?? "",
    multimodalEnabled: Boolean(s.ai?.multimodalEnabled),
    globalRpm: s.ai?.globalRpm == null ? "" : String(s.ai.globalRpm),
    apiKey: "",
    embeddingBaseUrl: s.ai?.embeddingBaseUrl ?? "",
    embeddingModel: s.ai?.embeddingModel ?? "",
    embeddingDimensions: s.ai?.embeddingDimensions ?? 1536,
    embeddingApiKey: "",
    smtp: {
      host: s.smtp?.host ?? "",
      port: smtpPort,
      secure: normalizeSecure(
        s.smtp?.secure,
        smtpPort === "" ? 0 : Number(smtpPort),
      ),
      user: s.smtp?.user ?? "",
      pass: "",
      from: s.smtp?.from ?? "",
      domain: s.smtp?.domain ?? "",
    },
    emailAgent: {
      title: s.emailAgent?.title ?? "",
      company: s.emailAgent?.company ?? "",
      maxThreadChars:
        s.emailAgent?.maxThreadChars == null
          ? ""
          : String(s.emailAgent.maxThreadChars),
    },
    system: {
      aiSystemEmail: s.system?.aiSystemEmail ?? "",
      systemUserId: s.system?.systemUserId ?? "",
    },
  };
};

/** Empty = unlimited (null); otherwise clamp to the schema range 1–600. */
const parseGlobalRpm = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return Math.min(600, Math.max(1, Math.round(n)));
};

/** Empty = omit (keep existing); otherwise clamp to the schema range 1–65535. */
const parseSmtpPort = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return Math.min(65535, Math.max(1, Math.round(n)));
};

/**
 * AI-only patch for legacy `settings.update`. Other groups are sent empty —
 * `setAppSettings` only writes provided keys, so taxonomy state is untouched.
 * Secret fields are omitted when empty (keep existing).
 */
const buildAiPatch = (values: AiFormValues): AppSettings => {
  const smtpPort = parseSmtpPort(values.smtp.port);
  return {
    ai: {
      baseUrl: values.baseUrl,
      model: values.model,
      multimodalEnabled: values.multimodalEnabled,
      globalRpm: parseGlobalRpm(values.globalRpm),
      ...(values.apiKey ? { apiKey: values.apiKey } : {}),
      embeddingBaseUrl: values.embeddingBaseUrl,
      embeddingModel: values.embeddingModel,
      embeddingDimensions: values.embeddingDimensions,
      ...(values.embeddingApiKey
        ? { embeddingApiKey: values.embeddingApiKey }
        : {}),
    },
    smtp: {
      ...(values.smtp.host ? { host: values.smtp.host } : {}),
      ...(smtpPort !== null ? { port: smtpPort } : {}),
      // Always explicit: the selector is authoritative over port inference.
      secure: values.smtp.secure,
      ...(values.smtp.user ? { user: values.smtp.user } : {}),
      ...(values.smtp.pass ? { pass: values.smtp.pass } : {}),
      ...(values.smtp.from ? { from: values.smtp.from } : {}),
      ...(values.smtp.domain ? { domain: values.smtp.domain } : {}),
    },
    emailAgent: {
      ...(values.emailAgent.title
        ? { title: values.emailAgent.title }
        : {}),
      ...(values.emailAgent.company
        ? { company: values.emailAgent.company }
        : {}),
      ...(values.emailAgent.maxThreadChars
        ? {
            maxThreadChars: Math.min(
              100000,
              Math.max(1000, Number(values.emailAgent.maxThreadChars)),
            ),
          }
        : {}),
    },
    system: {
      ...(values.system.aiSystemEmail
        ? { aiSystemEmail: values.system.aiSystemEmail }
        : {}),
      ...(values.system.systemUserId
        ? { systemUserId: values.system.systemUserId }
        : {}),
    },
    company: {},
    general: {},
  };
};

const TextField = ({
  id,
  label,
  value,
  type = "text",
  placeholder,
  hint,
  disabled,
  className,
  autoComplete,
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
  autoComplete?: string;
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
      autoComplete={autoComplete}
      onChange={(e) => onChange(e.target.value)}
    />
    {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
  </div>
);

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

const ToggleRow = ({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) => (
  <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-4 py-3">
    <div className="flex flex-col">
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      {hint ? (
        <p className="text-xs font-normal text-muted-foreground">{hint}</p>
      ) : null}
    </div>
    <Switch id={id} checked={checked} onCheckedChange={onChange} />
  </div>
);

export const AppSettingsPage = () => {
  const intl = useIntl();
  const toast = useToast();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const reducedMotion = useReducedMotion();
  const enterProps = getMotionProps(reducedMotion);

  const canRead = hasPermission("settings@app@read");
  const canUpdate = hasPermission("settings@app@update");

  // Legacy AI provider store (`settings.get`/`settings.update`) — separate
  // permission pair and query key from the taxonomy above. The sys-admin
  // bypass lives in hasPermissionAtom itself; no role checks in this page.
  const canReadAi = hasPermission("settings@read");
  const canUpdateAi = hasPermission("settings@update");
  const queryClient = useQueryClient();

  useMeta({
    title: intl.formatMessage({
      id: "settings.app.title",
      defaultMessage: "App Settings",
    }),
    description: intl.formatMessage({
      id: "settings.app.subtitle",
      defaultMessage: "Organization-wide configuration.",
    }),
  });

  const { data, isLoading, isError } = useAppSettings({ enabled: canRead });
  const updateAppSettings = useUpdateAppSettings();

  const [form, setForm] = useState<FormValues | null>(null);

  useEffect(() => {
    if (data) setForm(toFormValues(data));
  }, [data]);

  const update = <K extends keyof FormValues>(
    key: K,
    value: FormValues[K],
  ) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const isDirty = useMemo(() => {
    if (!form || !data) return false;
    return JSON.stringify(form) !== JSON.stringify(toFormValues(data));
  }, [form, data]);

  const handleSave = () => {
    if (!form) return;
    updateAppSettings.mutate(buildPatch(form), {
      onSuccess: () => {
        if (isAiDirty && aiForm) {
          aiMutation.mutate(aiForm, {
            onSuccess: () => {
              toast.success(
                intl.formatMessage({
                  id: "settings.app.saved",
                  defaultMessage: "App settings saved",
                }),
              );
            },
            onError: (e) => {
              toast.error(e, "Failed to save AI settings");
            },
          });
        } else {
          toast.success(
            intl.formatMessage({
              id: "settings.app.saved",
              defaultMessage: "App settings saved",
            }),
          );
        }
      },
      onError: (e) => {
        toast.error(e, "Failed to save app settings");
      },
    });
  };

  const legacyQuery = useQuery({
    queryKey: ["legacyAppSettings"],
    queryFn: () => trpcClient.settings.get.query(),
    enabled: canReadAi,
  });
  const legacyData = legacyQuery.data;

  const [aiForm, setAiForm] = useState<AiFormValues | null>(null);

  useEffect(() => {
    if (legacyData) setAiForm(toAiFormValues(legacyData));
  }, [legacyData]);

  const updateAi = <K extends keyof AiFormValues>(
    key: K,
    value: AiFormValues[K],
  ) => {
    setAiForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const updateSmtp = <K extends keyof AiFormValues["smtp"]>(
    key: K,
    value: AiFormValues["smtp"][K],
  ) => {
    setAiForm((prev) =>
      prev ? { ...prev, smtp: { ...prev.smtp, [key]: value } } : prev,
    );
  };

  const isAiDirty = useMemo(() => {
    if (!aiForm || !legacyData) return false;
    return (
      JSON.stringify(aiForm) !== JSON.stringify(toAiFormValues(legacyData))
    );
  }, [aiForm, legacyData]);

  const aiMutation = useMutation({
    mutationFn: (values: AiFormValues) =>
      trpcClient.settings.update.mutate(buildAiPatch(values)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["legacyAppSettings"] });
      toast.success(
        intl.formatMessage({
          id: "settings.app.saved",
          defaultMessage: "App settings saved",
        }),
      );
    },
    onError: (e) => {
      toast.error(e, "Failed to save AI settings");
    },
  });

  const secretHint = intl.formatMessage({
    id: "settings.app.secret_hint",
    defaultMessage: "Leave blank to keep the current value.",
  });

  // Secrets are write-only: show a masked placeholder when a value exists.
  const aiKeySet = Boolean(legacyData?.ai?.apiKey?.hasValue);
  const embeddingApiKeySet = Boolean(
    legacyData?.ai?.embeddingApiKey?.hasValue,
  );

  // Port validation: empty stays empty (keeps the stored value); anything
  // non-numeric or out of range is flagged inline and clamped on blur.
  const smtpPortRaw = aiForm?.smtp.port.trim() ?? "";
  const smtpPortInvalid =
    smtpPortRaw !== "" &&
    (!Number.isInteger(Number(smtpPortRaw)) ||
      Number(smtpPortRaw) < 1 ||
      Number(smtpPortRaw) > 65535);

  if (!canRead) {
    return (
      <section
        className="flex flex-col gap-3 pt-1 pb-6"
        data-ai-context={JSON.stringify({
          section: "app-settings",
          denied: true,
        })}
      >
        <PageHeader
          module="settings"
          title={intl.formatMessage({
            id: "settings.app.title",
            defaultMessage: "App Settings",
          })}
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
            <p className="text-sm font-normal text-foreground">
              {intl.formatMessage({
                id: "settings.app.access_denied",
                defaultMessage:
                  "You do not have permission to view app settings.",
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
        data-ai-context={JSON.stringify({
          section: "app-settings",
          loading: true,
        })}
      >
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-40 w-full" />
      </section>
    );
  }

  if (isError) {
    return (
      <section
        className="flex flex-col gap-3 pt-1 pb-6"
        data-ai-context={JSON.stringify({
          section: "app-settings",
          error: true,
        })}
      >
        <PageHeader
          module="settings"
          title={intl.formatMessage({
            id: "settings.app.title",
            defaultMessage: "App Settings",
          })}
          description={intl.formatMessage({
            id: "settings.app.subtitle",
            defaultMessage: "Organization-wide configuration.",
          })}
        />
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertCircle className="size-8 text-destructive" aria-hidden />
            <p className="text-sm font-normal text-foreground">
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
        title={intl.formatMessage({
          id: "settings.app.title",
          defaultMessage: "App Settings",
        })}
        description={intl.formatMessage({
          id: "settings.app.subtitle",
          defaultMessage: "Organization-wide configuration.",
        })}
      />

      <fieldset disabled={!canUpdate} className="flex flex-col gap-3">
        {/* General */}
        <SectionCard
          icon={SlidersHorizontal}
          title={intl.formatMessage({
            id: "settings.app.section.general",
            defaultMessage: "General",
          })}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="app-company-name">
                {intl.formatMessage({
                  id: "settings.app.field.companyName",
                  defaultMessage: "Company Name",
                })}
              </Label>
              <Input
                id="app-company-name"
                value={form.companyName}
                onChange={(e) => update("companyName", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="app-logo-url">
                {intl.formatMessage({
                  id: "settings.app.field.logoUrl",
                  defaultMessage: "Logo URL",
                })}
              </Label>
              <Input
                id="app-logo-url"
                type="url"
                value={form.logoUrl}
                placeholder="https://example.com/logo.png"
                onChange={(e) => update("logoUrl", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="app-default-language">
                {intl.formatMessage({
                  id: "settings.app.field.defaultLanguage",
                  defaultMessage: "Default Language",
                })}
              </Label>
              <Select
                value={form.defaultLanguage}
                onValueChange={(v) =>
                  update("defaultLanguage", v as "en" | "id")
                }
              >
                <SelectTrigger id="app-default-language" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="id">Bahasa Indonesia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="app-timezone">
                {intl.formatMessage({
                  id: "settings.app.field.timezone",
                  defaultMessage: "Timezone",
                })}
              </Label>
              <Input
                id="app-timezone"
                value={form.timezone}
                placeholder="Asia/Jakarta"
                onChange={(e) => update("timezone", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="app-date-format">
                {intl.formatMessage({
                  id: "settings.app.field.dateFormat",
                  defaultMessage: "Date Format",
                })}
              </Label>
              <Input
                id="app-date-format"
                value={form.dateFormat}
                placeholder="YYYY-MM-DD"
                onChange={(e) => update("dateFormat", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="app-number-format">
                {intl.formatMessage({
                  id: "settings.app.field.numberFormat",
                  defaultMessage: "Number Format",
                })}
              </Label>
              <Input
                id="app-number-format"
                value={form.numberFormat}
                placeholder="1,234.56"
                onChange={(e) => update("numberFormat", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="app-default-currency">
                {intl.formatMessage({
                  id: "settings.app.field.defaultCurrency",
                  defaultMessage: "Default Currency",
                })}
              </Label>
              <Input
                id="app-default-currency"
                value={form.defaultCurrency}
                placeholder="IDR"
                className="tabular-nums"
                onChange={(e) => update("defaultCurrency", e.target.value)}
              />
            </div>
          </div>
        </SectionCard>

        {/* Appearance */}
        <SectionCard
          icon={Palette}
          title={intl.formatMessage({
            id: "settings.app.section.appearance",
            defaultMessage: "Appearance",
          })}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="app-default-theme">
                {intl.formatMessage({
                  id: "settings.app.field.defaultTheme",
                  defaultMessage: "Default Theme",
                })}
              </Label>
              <Select
                value={form.defaultTheme}
                onValueChange={(v) =>
                  update("defaultTheme", v as "light" | "dark" | "system")
                }
              >
                <SelectTrigger id="app-default-theme" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="app-accent-color">
                {intl.formatMessage({
                  id: "settings.app.field.accentColor",
                  defaultMessage: "Accent Color",
                })}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="app-accent-color"
                  value={form.accentColor}
                  placeholder="#3b82f6"
                  className="tabular-nums"
                  onChange={(e) => update("accentColor", e.target.value)}
                />
                <input
                  type="color"
                  value={
                    /^#[0-9a-fA-F]{6}$/.test(form.accentColor)
                      ? form.accentColor
                      : "#3b82f6"
                  }
                  onChange={(e) => update("accentColor", e.target.value)}
                  className="h-8 w-12 shrink-0 cursor-pointer rounded-md border border-border bg-card p-1"
                  aria-label={intl.formatMessage({
                    id: "settings.app.field.accentColor",
                    defaultMessage: "Accent Color",
                  })}
                />
              </div>
            </div>
          </div>
          <div className="mt-3">
            <ToggleRow
              id="app-sidebar-collapsed"
              label={intl.formatMessage({
                id: "settings.app.field.sidebarCollapsed",
                defaultMessage: "Sidebar Collapsed by Default",
              })}
              checked={form.sidebarCollapsed}
              onChange={(v) => update("sidebarCollapsed", v)}
            />
          </div>
        </SectionCard>

        {/* Notifications */}
        <SectionCard
          icon={Bell}
          title={intl.formatMessage({
            id: "settings.app.section.notifications",
            defaultMessage: "Notifications",
          })}
        >
          <div className="flex flex-col gap-3">
            <ToggleRow
              id="app-email-notifications"
              label={intl.formatMessage({
                id: "settings.app.field.emailNotifications",
                defaultMessage: "Email Notifications",
              })}
              checked={form.emailNotifications}
              onChange={(v) => update("emailNotifications", v)}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="app-notification-frequency">
                  {intl.formatMessage({
                    id: "settings.app.field.defaultNotificationFrequency",
                    defaultMessage: "Notification Frequency",
                  })}
                </Label>
                <Select
                  value={form.defaultNotificationFrequency}
                  onValueChange={(v) =>
                    update(
                      "defaultNotificationFrequency",
                      v as "realtime" | "daily" | "weekly",
                    )
                  }
                >
                  <SelectTrigger
                    id="app-notification-frequency"
                    className="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">Real-time</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="app-announcement">
                {intl.formatMessage({
                  id: "settings.app.field.announcement",
                  defaultMessage: "System Announcement",
                })}
              </Label>
              <Textarea
                id="app-announcement"
                rows={3}
                value={form.announcement}
                onChange={(e) => update("announcement", e.target.value)}
              />
            </div>
          </div>
        </SectionCard>

        {/* Security */}
        <SectionCard
          icon={Shield}
          title={intl.formatMessage({
            id: "settings.app.section.security",
            defaultMessage: "Security",
          })}
        >
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="app-session-timeout">
                  {intl.formatMessage({
                    id: "settings.app.field.sessionTimeout",
                    defaultMessage: "Session Timeout (minutes)",
                  })}
                </Label>
                <Input
                  id="app-session-timeout"
                  type="number"
                  min={5}
                  max={1440}
                  value={form.sessionTimeout}
                  className="tabular-nums"
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n)) update("sessionTimeout", n);
                  }}
                  onBlur={() => {
                    const clamped = Math.min(
                      1440,
                      Math.max(5, form.sessionTimeout),
                    );
                    if (clamped !== form.sessionTimeout)
                      update("sessionTimeout", clamped);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="app-min-password-length">
                  {intl.formatMessage({
                    id: "settings.app.field.minPasswordLength",
                    defaultMessage: "Minimum Password Length",
                  })}
                </Label>
                <Input
                  id="app-min-password-length"
                  type="number"
                  min={8}
                  max={128}
                  value={form.minPasswordLength}
                  className="tabular-nums"
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n)) update("minPasswordLength", n);
                  }}
                  onBlur={() => {
                    const clamped = Math.min(
                      128,
                      Math.max(8, form.minPasswordLength),
                    );
                    if (clamped !== form.minPasswordLength)
                      update("minPasswordLength", clamped);
                  }}
                />
              </div>
            </div>
            <ToggleRow
              id="app-enforce-two-factor"
              label={intl.formatMessage({
                id: "settings.app.field.enforceTwoFactor",
                defaultMessage: "Enforce Two-Factor Authentication",
              })}
              checked={form.enforceTwoFactor}
              onChange={(v) => update("enforceTwoFactor", v)}
            />
            <div className="space-y-1.5">
              <Label htmlFor="app-allowed-login-methods">
                {intl.formatMessage({
                  id: "settings.app.field.allowedLoginMethods",
                  defaultMessage: "Allowed Login Methods",
                })}
              </Label>
              <Input
                id="app-allowed-login-methods"
                value={form.allowedLoginMethods}
                placeholder="password, oauth"
                onChange={(e) =>
                  update("allowedLoginMethods", e.target.value)
                }
              />
            </div>
          </div>
        </SectionCard>
      </fieldset>

      {/* AI provider (legacy `settings.get`/`settings.update` store) */}
      <fieldset disabled={!canUpdateAi} className="flex flex-col gap-3">
        <SectionCard
          icon={Sparkles}
          title={intl.formatMessage({
            id: "settings.app.section_ai",
            defaultMessage: "AI provider",
          })}
        >
          {!canReadAi ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-primary">
                <ShieldAlert className="size-5" aria-hidden />
              </span>
              <p className="text-sm font-normal text-foreground">
                {intl.formatMessage({
                  id: "settings.app.access_denied",
                  defaultMessage:
                    "You do not have permission to view app settings.",
                })}
              </p>
            </div>
          ) : legacyQuery.isLoading || !aiForm ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : legacyQuery.isError ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <AlertCircle className="size-8 text-destructive" aria-hidden />
              <p className="text-sm font-normal text-foreground">
                {intl.formatMessage({
                  id: "error_generic",
                  defaultMessage: "An unexpected error occurred.",
                })}
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  id="ai-base-url"
                  label={intl.formatMessage({
                    id: "settings.app.field_ai_base_url",
                    defaultMessage: "Base URL",
                  })}
                  type="url"
                  className="sm:col-span-2"
                  value={aiForm.baseUrl}
                  onChange={(v) => updateAi("baseUrl", v)}
                />
                <TextField
                  id="ai-model"
                  label={intl.formatMessage({
                    id: "settings.app.field_ai_model",
                    defaultMessage: "Model",
                  })}
                  value={aiForm.model}
                  onChange={(v) => updateAi("model", v)}
                />
                <TextField
                  id="ai-api-key"
                  label={intl.formatMessage({
                    id: "settings.app.field_ai_api_key",
                    defaultMessage: "API key",
                  })}
                  type="password"
                  value={aiForm.apiKey}
                  placeholder={aiKeySet ? "••••••" : ""}
                  hint={secretHint}
                  onChange={(v) => updateAi("apiKey", v)}
                />
                <div className="space-y-1.5">
                  <Label>
                    {intl.formatMessage({
                      id: "settings.app.field_ai_multimodal_enabled",
                      defaultMessage: "Multimodal support",
                    })}
                  </Label>
                  <RadioGroup
                    value={aiForm.multimodalEnabled ? "enabled" : "disabled"}
                    onValueChange={(v) =>
                      updateAi("multimodalEnabled", v === "enabled")
                    }
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem
                        id="ai-multimodal-enabled"
                        value="enabled"
                      />
                      <Label
                        htmlFor="ai-multimodal-enabled"
                        className="font-normal"
                      >
                        {intl.formatMessage({
                          id: "settings.app.radio_ai_multimodal_enabled",
                          defaultMessage: "Enabled",
                        })}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem
                        id="ai-multimodal-disabled"
                        value="disabled"
                      />
                      <Label
                        htmlFor="ai-multimodal-disabled"
                        className="font-normal"
                      >
                        {intl.formatMessage({
                          id: "settings.app.radio_ai_multimodal_disabled",
                          defaultMessage: "Disabled",
                        })}
                      </Label>
                    </div>
                  </RadioGroup>
                  <p className="text-xs text-muted-foreground">
                    {intl.formatMessage({
                      id: "settings.app.hint_ai_multimodal_enabled",
                      defaultMessage:
                        "When enabled, the configured AI model analyzes images. When disabled, image analysis is unavailable.",
                    })}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ai-global-rpm">
                    {intl.formatMessage({
                      id: "settings.app.field_ai_global_rpm",
                      defaultMessage: "AI requests / minute (global)",
                    })}
                  </Label>
                  <Input
                    id="ai-global-rpm"
                    type="number"
                    min={1}
                    max={600}
                    value={aiForm.globalRpm}
                    className="tabular-nums"
                    onChange={(e) =>
                      updateAi("globalRpm", e.target.value)
                    }
                    onBlur={() => {
                      const parsed = parseGlobalRpm(aiForm.globalRpm);
                      const normalized =
                        parsed === null ? "" : String(parsed);
                      if (normalized !== aiForm.globalRpm)
                        updateAi("globalRpm", normalized);
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  {intl.formatMessage({
                    id: "settings.app.hint_ai_rate_limits",
                    defaultMessage:
                      "Requests beyond these limits wait in a queue instead of failing.",
                  })}
                </p>
              </div>

              <p className="mt-4 mb-3 border-t pt-4 text-xs font-semibold text-muted-foreground">
                {intl.formatMessage({
                  id: "settings.app.ai_embedding_section_label",
                  defaultMessage:
                    "Embedding provider (optional — used for knowledge-base RAG). Leave blank to use the AI provider above.",
                })}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  id="ai-embedding-base-url"
                  label={intl.formatMessage({
                    id: "settings.app.field_ai_embedding_base_url",
                    defaultMessage: "Embedding base URL",
                  })}
                  type="url"
                  className="sm:col-span-2"
                  value={aiForm.embeddingBaseUrl}
                  onChange={(v) => updateAi("embeddingBaseUrl", v)}
                />
                <TextField
                  id="ai-embedding-model"
                  label={intl.formatMessage({
                    id: "settings.app.field_ai_embedding_model",
                    defaultMessage: "Embedding model",
                  })}
                  value={aiForm.embeddingModel}
                  onChange={(v) => updateAi("embeddingModel", v)}
                />
                <TextField
                  id="ai-embedding-api-key"
                  label={intl.formatMessage({
                    id: "settings.app.field_ai_embedding_api_key",
                    defaultMessage: "Embedding API key",
                  })}
                  type="password"
                  value={aiForm.embeddingApiKey}
                  placeholder={embeddingApiKeySet ? "••••••" : ""}
                  hint={secretHint}
                  onChange={(v) => updateAi("embeddingApiKey", v)}
                />
                <div className="space-y-1.5">
                  <Label htmlFor="ai-embedding-dimensions">
                    {intl.formatMessage({
                      id: "settings.app.field_ai_embedding_dimensions",
                      defaultMessage: "Embedding dimensions",
                    })}
                  </Label>
                  <Input
                    id="ai-embedding-dimensions"
                    type="number"
                    min={1}
                    value={aiForm.embeddingDimensions}
                    className="tabular-nums"
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isFinite(n))
                        updateAi("embeddingDimensions", Math.round(n));
                    }}
                    onBlur={() => {
                      if (aiForm.embeddingDimensions < 1)
                        updateAi("embeddingDimensions", 1536);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    {intl.formatMessage({
                      id: "settings.app.hint_ai_embedding_dimensions",
                      defaultMessage:
                        "Must match the embedding model's vector size (default 1536). Changing it requires a database migration.",
                    })}
                  </p>
                </div>
              </div>

              {/* Outbound email (SMTP) */}
              <p className="mt-4 mb-3 border-t pt-4 text-xs font-semibold text-muted-foreground">
                {intl.formatMessage({
                  id: "settings.app.section_smtp",
                  defaultMessage: "Outbound email (SMTP)",
                })}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  id="smtp-host"
                  label={intl.formatMessage({
                    id: "settings.app.field_smtp_host",
                    defaultMessage: "Host",
                  })}
                  value={aiForm.smtp.host}
                  placeholder="smtp.example.com"
                  onChange={(v) => updateSmtp("host", v)}
                />
                <div className="space-y-1.5">
                  <Label htmlFor="smtp-port">
                    {intl.formatMessage({
                      id: "settings.app.field_smtp_port",
                      defaultMessage: "Port",
                    })}
                  </Label>
                  <Input
                    id="smtp-port"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={65535}
                    value={aiForm.smtp.port}
                    placeholder="587"
                    className="tabular-nums"
                    aria-invalid={smtpPortInvalid}
                    aria-describedby="smtp-port-feedback"
                    onChange={(e) => {
                      const next = e.target.value;
                      const prevPort = parseSmtpPort(aiForm.smtp.port);
                      const nextPort = parseSmtpPort(next);
                      // While encryption still matches the port heuristic, keep
                      // it in sync so switching providers (e.g. 2525 → 465)
                      // cannot silently pair a port with the wrong TLS mode.
                      const followsPort =
                        prevPort !== null &&
                        aiForm.smtp.secure === inferSecure(prevPort);
                      updateSmtp("port", next);
                      if (followsPort && nextPort !== null)
                        updateSmtp("secure", inferSecure(nextPort));
                    }}
                    onBlur={() => {
                      const parsed = parseSmtpPort(aiForm.smtp.port);
                      if (parsed !== null && String(parsed) !== aiForm.smtp.port)
                        updateSmtp("port", String(parsed));
                    }}
                  />
                  <p
                    id="smtp-port-feedback"
                    role={smtpPortInvalid ? "alert" : undefined}
                    className={`text-xs ${
                      smtpPortInvalid
                        ? "font-medium text-destructive"
                        : "text-muted-foreground"
                    }`}
                  >
                    {smtpPortInvalid
                      ? intl.formatMessage({
                          id: "settings.app.error_smtp_port",
                          defaultMessage:
                            "Port must be a whole number between 1 and 65535.",
                        })
                      : intl.formatMessage({
                          id: "settings.app.hint_smtp_port",
                          defaultMessage:
                            "Common ports: 587, 2525 (STARTTLS) or 465 (SSL/TLS).",
                        })}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="smtp-secure">
                    {intl.formatMessage({
                      id: "settings.app.field_smtp_secure",
                      defaultMessage: "Encryption",
                    })}
                  </Label>
                  <Select
                    value={aiForm.smtp.secure}
                    onValueChange={(v) => updateSmtp("secure", v as SmtpSecure)}
                  >
                    <SelectTrigger id="smtp-secure" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        {intl.formatMessage({
                          id: "settings.app.smtp_secure_none",
                          defaultMessage: "None",
                        })}
                      </SelectItem>
                      <SelectItem value="starttls">
                        {intl.formatMessage({
                          id: "settings.app.smtp_secure_starttls",
                          defaultMessage: "STARTTLS",
                        })}
                      </SelectItem>
                      <SelectItem value="ssl">
                        {intl.formatMessage({
                          id: "settings.app.smtp_secure_ssl",
                          defaultMessage: "SSL/TLS",
                        })}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {intl.formatMessage({
                      id: "settings.app.hint_smtp_secure",
                      defaultMessage:
                        "How the connection is encrypted. SSL/TLS for 465, STARTTLS for 587/2525, or None for a plain relay.",
                    })}
                  </p>
                </div>
                <TextField
                  id="smtp-user"
                  label={intl.formatMessage({
                    id: "settings.app.field_smtp_user",
                    defaultMessage: "Username",
                  })}
                  value={aiForm.smtp.user}
                  placeholder="you@example.com"
                  onChange={(v) => updateSmtp("user", v)}
                />
                <TextField
                  id="smtp-pass"
                  label={intl.formatMessage({
                    id: "settings.app.field_smtp_pass",
                    defaultMessage: "Password / API key",
                  })}
                  type="password"
                  autoComplete="new-password"
                  value={aiForm.smtp.pass}
                  placeholder={
                    legacyData?.smtp?.pass?.hasValue ? "••••••" : ""
                  }
                  hint={secretHint}
                  onChange={(v) => updateSmtp("pass", v)}
                />
                <TextField
                  id="smtp-from"
                  label={intl.formatMessage({
                    id: "settings.app.field_smtp_from",
                    defaultMessage: "From",
                  })}
                  value={aiForm.smtp.from}
                  placeholder="sales@example.com"
                  onChange={(v) => updateSmtp("from", v)}
                />
                <TextField
                  id="smtp-domain"
                  label={intl.formatMessage({
                    id: "settings.app.field_smtp_domain",
                    defaultMessage: "Domain",
                  })}
                  value={aiForm.smtp.domain}
                  placeholder="example.com"
                  onChange={(v) => updateSmtp("domain", v)}
                />
              </div>

              {/* Email agent */}
              <p className="mt-4 mb-3 border-t pt-4 text-xs font-semibold text-muted-foreground">
                {intl.formatMessage({
                  id: "settings.app.section_email_agent",
                  defaultMessage: "Email agent",
                })}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  id="agent-title"
                  label={intl.formatMessage({
                    id: "settings.app.field_agent_title",
                    defaultMessage: "Title",
                  })}
                  value={aiForm.emailAgent.title}
                  onChange={(v) =>
                    setAiForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            emailAgent: { ...prev.emailAgent, title: v },
                          }
                        : prev,
                    )
                  }
                />
                <TextField
                  id="agent-company"
                  label={intl.formatMessage({
                    id: "settings.app.field_agent_company",
                    defaultMessage: "Company",
                  })}
                  value={aiForm.emailAgent.company}
                  onChange={(v) =>
                    setAiForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            emailAgent: { ...prev.emailAgent, company: v },
                          }
                        : prev,
                    )
                  }
                />
                <div className="space-y-1.5">
                  <Label htmlFor="agent-max-thread">
                    {intl.formatMessage({
                      id: "settings.app.field_agent_max_thread",
                      defaultMessage: "Max thread chars",
                    })}
                  </Label>
                  <Input
                    id="agent-max-thread"
                    type="number"
                    min={1000}
                    max={100000}
                    value={aiForm.emailAgent.maxThreadChars}
                    className="tabular-nums"
                    onChange={(e) =>
                      setAiForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              emailAgent: {
                                ...prev.emailAgent,
                                maxThreadChars: e.target.value,
                              },
                            }
                          : prev,
                      )
                    }
                  />
                </div>
              </div>

              {/* System identity */}
              <p className="mt-4 mb-3 border-t pt-4 text-xs font-semibold text-muted-foreground">
                {intl.formatMessage({
                  id: "settings.app.section_system",
                  defaultMessage: "System identity",
                })}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  id="system-email"
                  label={intl.formatMessage({
                    id: "settings.app.field_system_email",
                    defaultMessage: "AI system email",
                  })}
                  type="email"
                  value={aiForm.system.aiSystemEmail}
                  onChange={(v) =>
                    setAiForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            system: { ...prev.system, aiSystemEmail: v },
                          }
                        : prev,
                    )
                  }
                />
                <TextField
                  id="system-user-id"
                  label={intl.formatMessage({
                    id: "settings.app.field_system_user",
                    defaultMessage: "System user ID",
                  })}
                  value={aiForm.system.systemUserId}
                  disabled
                  onChange={() => {}}
                />
              </div>


            </>
          )}
        </SectionCard>
      </fieldset>

      <div className="flex justify-end">
        {canUpdate ? (
          <Button
            type="button"
            size="sm"
            disabled={!isDirty || updateAppSettings.isPending}
            onClick={handleSave}
          >
            {updateAppSettings.isPending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Save className="size-3.5" aria-hidden />
            )}
            {intl.formatMessage({
              id: "settings.app.save",
              defaultMessage: "Save changes",
            })}
          </Button>
        ) : null}
      </div>
    </motion.section>
  );
};

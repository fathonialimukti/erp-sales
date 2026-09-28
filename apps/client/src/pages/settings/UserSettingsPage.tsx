import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { motion, useReducedMotion } from "motion/react";
import {
  AlertCircle,
  Bell,
  Loader2,
  Save,
  Shield,
  SlidersHorizontal,
  User,
  type LucideIcon,
} from "lucide-react";

import { authUserAtom } from "../../lib/atoms";
import {
  useUpdateUserSettings,
  useUserSettings,
} from "../../lib/hooks/useSettings";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type {
  UpdateUserSettingsInput,
  UserSettingsInput,
} from "@repo/schemas/settings";

interface FormValues {
  displayName: string;
  avatarUrl: string;
  email: string;
  phone: string;
  bio: string;
  themeOverride: "light" | "dark" | "system" | "";
  timezone: string;
  dateFormat: string;
  currency: string;
  tableDensity: "compact" | "comfortable";
  emailNotifications: boolean;
  pushNotifications: boolean;
  inAppNotifications: boolean;
  digestFrequency: "realtime" | "daily" | "weekly";
  mutedCategories: string;
  twoFactorEnabled: boolean;
}

/** Settings module accent for section icon plates (allowed chrome surface). */
const settingsAccent = moduleCssVar("settings") ?? "var(--primary)";

const toFormValues = (s: UserSettingsInput): FormValues => ({
  displayName: s.displayName ?? "",
  avatarUrl: s.avatarUrl ?? "",
  email: s.email ?? "",
  phone: s.phone ?? "",
  bio: s.bio ?? "",
  themeOverride: s.themeOverride ?? "",
  timezone: s.timezone ?? "",
  dateFormat: s.dateFormat ?? "",
  currency: s.currency ?? "",
  tableDensity: s.tableDensity ?? "comfortable",
  emailNotifications: s.emailNotifications ?? true,
  pushNotifications: s.pushNotifications ?? true,
  inAppNotifications: s.inAppNotifications ?? true,
  digestFrequency: s.digestFrequency ?? "daily",
  mutedCategories: (s.mutedCategories ?? []).join(", "),
  twoFactorEnabled: s.twoFactorEnabled ?? false,
});

/** Empty-string form fields become null (nullable server columns); email is read-only. */
const buildPatch = (values: FormValues): UpdateUserSettingsInput => ({
  displayName: values.displayName,
  avatarUrl: values.avatarUrl.trim() === "" ? null : values.avatarUrl.trim(),
  phone: values.phone.trim() === "" ? null : values.phone.trim(),
  bio: values.bio.trim() === "" ? null : values.bio.trim(),
  themeOverride:
    values.themeOverride === "" ? null : values.themeOverride,
  timezone: values.timezone.trim() === "" ? null : values.timezone.trim(),
  dateFormat:
    values.dateFormat.trim() === "" ? null : values.dateFormat.trim(),
  currency: values.currency.trim() === "" ? null : values.currency.trim(),
  tableDensity: values.tableDensity,
  emailNotifications: values.emailNotifications,
  pushNotifications: values.pushNotifications,
  inAppNotifications: values.inAppNotifications,
  digestFrequency: values.digestFrequency,
  mutedCategories: values.mutedCategories
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean),
  twoFactorEnabled: values.twoFactorEnabled,
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

/**
 * User settings page — personal profile, preferences, notifications, and security.
 * Consumes useUserSettings() / useUpdateUserSettings() (T4 hooks on
 * trpcClient.settings.getUser / .updateUser, query key ["userSettings"]).
 */
export const UserSettingsPage = () => {
  const intl = useIntl();
  const toast = useToast();
  const user = useAtomValue(authUserAtom);
  const reducedMotion = useReducedMotion();
  const enterProps = getMotionProps(reducedMotion);

  useMeta({
    title: intl.formatMessage({
      id: "settings.user.title",
      defaultMessage: "User Settings",
    }),
    description: intl.formatMessage({
      id: "settings.user.subtitle",
      defaultMessage:
        "Manage your profile, preferences, notifications, and security.",
    }),
  });

  const { data, isLoading, isError } = useUserSettings();
  const updateUserSettings = useUpdateUserSettings();

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
    updateUserSettings.mutate(buildPatch(form), {
      onSuccess: () => {
        toast.success(
          intl.formatMessage({
            id: "settings.user.saved",
            defaultMessage: "User settings saved",
          }),
        );
      },
      onError: (e) => {
        toast.error(e, "Failed to save user settings");
      },
    });
  };

  if (isLoading || !form) {
    return (
      <section
        className="flex flex-col gap-3 pt-1 pb-6"
        data-ai-context={JSON.stringify({
          section: "user-settings",
          loading: true,
        })}
      >
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-28 w-full" />
      </section>
    );
  }

  if (isError) {
    return (
      <section
        className="flex flex-col gap-3 pt-1 pb-6"
        data-ai-context={JSON.stringify({
          section: "user-settings",
          error: true,
        })}
      >
        <PageHeader
          module="settings"
          title={intl.formatMessage({
            id: "settings.user.title",
            defaultMessage: "User Settings",
          })}
          description={intl.formatMessage({
            id: "settings.user.subtitle",
            defaultMessage:
              "Manage your profile, preferences, notifications, and security.",
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
      data-ai-context={JSON.stringify({ section: "user-settings" })}
    >
      <PageHeader
        module="settings"
        title={intl.formatMessage({
          id: "settings.user.title",
          defaultMessage: "User Settings",
        })}
        description={intl.formatMessage({
          id: "settings.user.subtitle",
          defaultMessage:
            "Manage your profile, preferences, notifications, and security.",
        })}
      />

      <div className="flex flex-col gap-3">
        {/* Profile */}
        <SectionCard
          icon={User}
          title={intl.formatMessage({
            id: "settings.user.section.profile",
            defaultMessage: "Profile",
          })}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="user-display-name">
                {intl.formatMessage({
                  id: "settings.user.field.displayName",
                  defaultMessage: "Display Name",
                })}
              </Label>
              <Input
                id="user-display-name"
                value={form.displayName}
                onChange={(e) => update("displayName", e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="user-avatar-url">
                {intl.formatMessage({
                  id: "settings.user.field.avatarUrl",
                  defaultMessage: "Avatar URL",
                })}
              </Label>
              <Input
                id="user-avatar-url"
                type="url"
                value={form.avatarUrl}
                placeholder="https://example.com/avatar.jpg"
                onChange={(e) => update("avatarUrl", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-email">
                {intl.formatMessage({
                  id: "settings.user.field.email",
                  defaultMessage: "Email",
                })}
              </Label>
              <Input
                id="user-email"
                value={form.email || user?.email || ""}
                disabled
                className="bg-muted/60"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-phone">
                {intl.formatMessage({
                  id: "settings.user.field.phone",
                  defaultMessage: "Phone",
                })}
              </Label>
              <Input
                id="user-phone"
                value={form.phone}
                placeholder="+62 ..."
                onChange={(e) => update("phone", e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="user-bio">
                {intl.formatMessage({
                  id: "settings.user.field.bio",
                  defaultMessage: "Bio",
                })}
              </Label>
              <Textarea
                id="user-bio"
                rows={3}
                value={form.bio}
                onChange={(e) => update("bio", e.target.value)}
              />
            </div>
          </div>
        </SectionCard>

        {/* Preferences */}
        <SectionCard
          icon={SlidersHorizontal}
          title={intl.formatMessage({
            id: "settings.user.section.preferences",
            defaultMessage: "Preferences",
          })}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="user-theme-override">
                {intl.formatMessage({
                  id: "settings.user.field.themeOverride",
                  defaultMessage: "Theme",
                })}
              </Label>
              <Select
                value={form.themeOverride || "none"}
                onValueChange={(v) =>
                  update(
                    "themeOverride",
                    v === "none"
                      ? ""
                      : (v as "light" | "dark" | "system"),
                  )
                }
              >
                <SelectTrigger id="user-theme-override" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    {intl.formatMessage({
                      id: "settings.user.theme.inherit",
                      defaultMessage: "System default",
                    })}
                  </SelectItem>
                  <SelectItem value="light">
                    {intl.formatMessage({
                      id: "settings.user.theme.light",
                      defaultMessage: "Light",
                    })}
                  </SelectItem>
                  <SelectItem value="dark">
                    {intl.formatMessage({
                      id: "settings.user.theme.dark",
                      defaultMessage: "Dark",
                    })}
                  </SelectItem>
                  <SelectItem value="system">
                    {intl.formatMessage({
                      id: "settings.user.theme.system",
                      defaultMessage: "System",
                    })}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-timezone">
                {intl.formatMessage({
                  id: "settings.user.field.timezone",
                  defaultMessage: "Timezone",
                })}
              </Label>
              <Input
                id="user-timezone"
                value={form.timezone}
                placeholder="Asia/Jakarta"
                onChange={(e) => update("timezone", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-date-format">
                {intl.formatMessage({
                  id: "settings.user.field.dateFormat",
                  defaultMessage: "Date Format",
                })}
              </Label>
              <Input
                id="user-date-format"
                value={form.dateFormat}
                placeholder="YYYY-MM-DD"
                onChange={(e) => update("dateFormat", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-currency">
                {intl.formatMessage({
                  id: "settings.user.field.currency",
                  defaultMessage: "Currency",
                })}
              </Label>
              <Input
                id="user-currency"
                value={form.currency}
                placeholder="IDR"
                className="tabular-nums"
                onChange={(e) => update("currency", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-table-density">
                {intl.formatMessage({
                  id: "settings.user.field.tableDensity",
                  defaultMessage: "Table Density",
                })}
              </Label>
              <Select
                value={form.tableDensity}
                onValueChange={(v) =>
                  update("tableDensity", v as "compact" | "comfortable")
                }
              >
                <SelectTrigger id="user-table-density" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comfortable">
                    {intl.formatMessage({
                      id: "settings.user.density.comfortable",
                      defaultMessage: "Comfortable",
                    })}
                  </SelectItem>
                  <SelectItem value="compact">
                    {intl.formatMessage({
                      id: "settings.user.density.compact",
                      defaultMessage: "Compact",
                    })}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </SectionCard>

        {/* Notifications */}
        <SectionCard
          icon={Bell}
          title={intl.formatMessage({
            id: "settings.user.section.notifications",
            defaultMessage: "Notifications",
          })}
        >
          <div className="flex flex-col gap-3">
            <ToggleRow
              id="user-email-notifications"
              label={intl.formatMessage({
                id: "settings.user.field.emailNotifications",
                defaultMessage: "Email Notifications",
              })}
              checked={form.emailNotifications}
              onChange={(v) => update("emailNotifications", v)}
            />
            <ToggleRow
              id="user-push-notifications"
              label={intl.formatMessage({
                id: "settings.user.field.pushNotifications",
                defaultMessage: "Push Notifications",
              })}
              checked={form.pushNotifications}
              onChange={(v) => update("pushNotifications", v)}
            />
            <ToggleRow
              id="user-in-app-notifications"
              label={intl.formatMessage({
                id: "settings.user.field.inAppNotifications",
                defaultMessage: "In-App Notifications",
              })}
              checked={form.inAppNotifications}
              onChange={(v) => update("inAppNotifications", v)}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="user-digest-frequency">
                  {intl.formatMessage({
                    id: "settings.user.field.digestFrequency",
                    defaultMessage: "Digest Frequency",
                  })}
                </Label>
                <Select
                  value={form.digestFrequency}
                  onValueChange={(v) =>
                    update(
                      "digestFrequency",
                      v as "realtime" | "daily" | "weekly",
                    )
                  }
                >
                  <SelectTrigger id="user-digest-frequency" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">
                      {intl.formatMessage({
                        id: "settings.user.digest.realtime",
                        defaultMessage: "Real-time",
                      })}
                    </SelectItem>
                    <SelectItem value="daily">
                      {intl.formatMessage({
                        id: "settings.user.digest.daily",
                        defaultMessage: "Daily",
                      })}
                    </SelectItem>
                    <SelectItem value="weekly">
                      {intl.formatMessage({
                        id: "settings.user.digest.weekly",
                        defaultMessage: "Weekly",
                      })}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="user-muted-categories">
                  {intl.formatMessage({
                    id: "settings.user.field.mutedCategories",
                    defaultMessage: "Muted Categories",
                  })}
                </Label>
                <Input
                  id="user-muted-categories"
                  value={form.mutedCategories}
                  placeholder="promotional, newsletter"
                  onChange={(e) => update("mutedCategories", e.target.value)}
                />
                <p className="text-xs font-normal text-muted-foreground">
                  {intl.formatMessage({
                    id: "settings.user.hint.mutedCategories",
                    defaultMessage:
                      "Comma-separated list of notification categories to mute.",
                  })}
                </p>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Security */}
        <SectionCard
          icon={Shield}
          title={intl.formatMessage({
            id: "settings.user.section.security",
            defaultMessage: "Security",
          })}
        >
          <ToggleRow
            id="user-two-factor"
            label={intl.formatMessage({
              id: "settings.user.field.twoFactorEnabled",
              defaultMessage: "Two-Factor Authentication",
            })}
            hint={intl.formatMessage({
              id: "settings.user.hint.twoFactor",
              defaultMessage:
                "Require a verification code in addition to your password.",
            })}
            checked={form.twoFactorEnabled}
            onChange={(v) => update("twoFactorEnabled", v)}
          />
        </SectionCard>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={!isDirty || updateUserSettings.isPending}
          onClick={handleSave}
        >
          {updateUserSettings.isPending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Save className="size-3.5" aria-hidden />
          )}
          {intl.formatMessage({
            id: "settings.user.save",
            defaultMessage: "Save changes",
          })}
        </Button>
      </div>
    </motion.section>
  );
};

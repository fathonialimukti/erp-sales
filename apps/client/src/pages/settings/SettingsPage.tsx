import { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue, useSetAtom } from "jotai";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import {
  AlertCircle,
  Bell,
  Filter,
  Loader2,
  Save,
  Signature,
  SlidersHorizontal,
  User,
  type LucideIcon,
} from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { authUserAtom, localeActionsAtom, themeModeAtom } from "../../lib/atoms";
import { localeLabels } from "../../lib/locale";
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
import type { UserSettings } from "@repo/schemas/settings";

interface FormValues {
  locale: "en" | "id";
  theme: "light" | "dark";
  defaultPageSize: number;
  timezone: string;
  emailSignature: string;
  inApp: boolean;
  emailDigest: boolean;
  defaultRegionId: string;
  defaultAreaId: string;
}

/** Sentinel for Radix Select "no default" (empty string is invalid for SelectItem). */
const NO_DEFAULT = "none";

/** Settings module accent — falls back to primary until Task 7 registers the token. */
const settingsAccent = moduleCssVar("settings") ?? "var(--primary)";

const toFormValues = (s: UserSettings): FormValues => ({
  locale: s.locale ?? "en",
  theme: s.theme ?? "light",
  defaultPageSize: s.defaultPageSize ?? 10,
  timezone: s.timezone ?? "",
  emailSignature: s.emailSignature ?? "",
  inApp: s.notifications?.inApp ?? true,
  emailDigest: s.notifications?.emailDigest ?? false,
  defaultRegionId: s.defaultRegionId ?? "",
  defaultAreaId: s.defaultAreaId ?? "",
});

const SectionIcon = ({ icon: Icon }: { icon: LucideIcon }) => (
  <span
    className="flex size-8 items-center justify-center rounded-lg"
    style={{
      backgroundColor: `color-mix(in srgb, ${settingsAccent} 8%, transparent)`,
      color: settingsAccent,
    }}
  >
    <Icon className="size-4" aria-hidden />
  </span>
);

export const SettingsPage = () => {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const toast = useToast();
  const user = useAtomValue(authUserAtom);
  const setLocale = useSetAtom(localeActionsAtom);
  const setTheme = useSetAtom(themeModeAtom);
  const reducedMotion = useReducedMotion();
  const enterProps = getMotionProps(reducedMotion);

  useMeta({
    title: intl.formatMessage({ id: "settings.personal.title", defaultMessage: "Settings" }),
    description: intl.formatMessage({
      id: "settings.personal.subtitle",
      defaultMessage: "Manage your personal preferences.",
    }),
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["userSettings"],
    queryFn: () => trpcClient.userSettings.get.query(),
  });

  const { data: regionList } = useQuery({
    queryKey: ["regionOptions"],
    queryFn: () => trpcClient.region.list.query({ page: 1, limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: areaList } = useQuery({
    queryKey: ["areaOptions"],
    queryFn: () => trpcClient.area.list.query({ page: 1, limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const regions = (regionList?.data ?? []) as { id: string; name: string }[];
  const areas = (areaList?.data ?? []) as { id: string; name: string; regionId?: string }[];

  const [form, setForm] = useState<FormValues | null>(null);

  useEffect(() => {
    if (data) setForm(toFormValues(data));
  }, [data]);

  const update = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const isDirty = useMemo(() => {
    if (!form || !data) return false;
    return JSON.stringify(form) !== JSON.stringify(toFormValues(data));
  }, [form, data]);

  const filteredAreas = form?.defaultRegionId
    ? areas.filter((a) => a.regionId === form.defaultRegionId)
    : areas;

  const handleRegionChange = (value: string) => {
    const regionId = value === NO_DEFAULT ? "" : value;
    update("defaultRegionId", regionId);
    // Clear area when it no longer belongs to the selected region.
    if (regionId && form?.defaultAreaId) {
      const area = areas.find((a) => a.id === form.defaultAreaId);
      if (area && area.regionId !== regionId) update("defaultAreaId", "");
    }
  };

  const handleAreaChange = (value: string) => {
    update("defaultAreaId", value === NO_DEFAULT ? "" : value);
  };

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) =>
      trpcClient.userSettings.update.mutate({
        locale: values.locale,
        theme: values.theme,
        defaultPageSize: values.defaultPageSize,
        timezone: values.timezone,
        emailSignature: values.emailSignature,
        notifications: { inApp: values.inApp, emailDigest: values.emailDigest },
        defaultRegionId: values.defaultRegionId,
        defaultAreaId: values.defaultAreaId,
      }),
    onSuccess: (_res, values) => {
      // Apply locale/theme immediately so the UI updates without a reload.
      setLocale(values.locale);
      setTheme(values.theme);
      queryClient.invalidateQueries({ queryKey: ["userSettings"] });
      toast.success(
        intl.formatMessage({ id: "settings.personal.saved", defaultMessage: "Settings saved" }),
      );
    },
    onError: (e) => {
      toast.error(e, "Failed to save settings");
    },
  });

  const handleSave = () => {
    if (form) saveMutation.mutate(form);
  };

  if (isLoading || !form) {
    return (
      <section
        className="flex flex-col gap-3 pt-1 pb-6"
        data-ai-context={JSON.stringify({ section: "settings", loading: true })}
      >
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-32 w-full" />
      </section>
    );
  }

  if (isError) {
    return (
      <section
        className="flex flex-col gap-3 pt-1 pb-6"
        data-ai-context={JSON.stringify({ section: "settings", error: true })}
      >
        <PageHeader
          module="settings"
          title={intl.formatMessage({ id: "settings.personal.title", defaultMessage: "Settings" })}
          description={intl.formatMessage({
            id: "settings.personal.subtitle",
            defaultMessage: "Manage your personal preferences.",
          })}
        />
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertCircle className="size-8 text-destructive" aria-hidden />
            <p className="text-sm text-foreground">
              {intl.formatMessage({ id: "error_generic", defaultMessage: "An unexpected error occurred." })}
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
      data-ai-context={JSON.stringify({ section: "settings" })}
    >
      <PageHeader
        module="settings"
        title={intl.formatMessage({ id: "settings.personal.title", defaultMessage: "Settings" })}
        description={intl.formatMessage({
          id: "settings.personal.subtitle",
          defaultMessage: "Manage your personal preferences.",
        })}
      />

      <div className="flex flex-col gap-3">
        {/* Profile — read-only identity */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-base font-bold">
              <SectionIcon icon={User} />
              {intl.formatMessage({ id: "settings.personal.section_profile", defaultMessage: "Profile" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {intl.formatMessage({ id: "settings.personal.profile_name", defaultMessage: "Name" })}
                </dt>
                <dd className="text-sm font-normal text-foreground">{user?.name ?? "—"}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {intl.formatMessage({ id: "settings.personal.profile_email", defaultMessage: "Email" })}
                </dt>
                <dd className="text-sm font-normal text-foreground">{user?.email ?? "—"}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {intl.formatMessage({ id: "settings.personal.profile_role", defaultMessage: "Role" })}
                </dt>
                <dd className="text-sm font-normal text-foreground">{user?.roleName ?? "—"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-base font-bold">
              <SectionIcon icon={SlidersHorizontal} />
              {intl.formatMessage({ id: "settings.personal.section_preferences", defaultMessage: "Preferences" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="locale">
                  {intl.formatMessage({ id: "settings.personal.field_locale", defaultMessage: "Language" })}
                </Label>
                <Select
                  value={form.locale}
                  onValueChange={(v) => update("locale", v as "en" | "id")}
                >
                  <SelectTrigger id="locale" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">{localeLabels.en}</SelectItem>
                    <SelectItem value="id">{localeLabels.id}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="theme">
                  {intl.formatMessage({ id: "settings.personal.field_theme", defaultMessage: "Theme" })}
                </Label>
                <Select
                  value={form.theme}
                  onValueChange={(v) => update("theme", v as "light" | "dark")}
                >
                  <SelectTrigger id="theme" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      {intl.formatMessage({ id: "settings.personal.theme_light", defaultMessage: "Light" })}
                    </SelectItem>
                    <SelectItem value="dark">
                      {intl.formatMessage({ id: "settings.personal.theme_dark", defaultMessage: "Dark" })}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="page-size">
                  {intl.formatMessage({ id: "settings.personal.field_page_size", defaultMessage: "Default page size" })}
                </Label>
                <Input
                  id="page-size"
                  type="number"
                  min={5}
                  max={100}
                  value={form.defaultPageSize}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n)) update("defaultPageSize", n);
                  }}
                  onBlur={() => {
                    const clamped = Math.min(100, Math.max(5, form.defaultPageSize));
                    if (clamped !== form.defaultPageSize) update("defaultPageSize", clamped);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="timezone">
                  {intl.formatMessage({ id: "settings.personal.field_timezone", defaultMessage: "Timezone" })}
                </Label>
                <Input
                  id="timezone"
                  value={form.timezone}
                  placeholder="e.g. Asia/Jakarta"
                  onChange={(e) => update("timezone", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-base font-bold">
              <SectionIcon icon={Bell} />
              {intl.formatMessage({ id: "settings.personal.section_notifications", defaultMessage: "Notifications" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-4 py-3">
              <Label htmlFor="in-app" className="text-sm font-medium text-foreground">
                {intl.formatMessage({ id: "settings.personal.field_in_app", defaultMessage: "In-app notifications" })}
              </Label>
              <Switch
                id="in-app"
                checked={form.inApp}
                onCheckedChange={(v) => update("inApp", v)}
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-4 py-3">
              <Label htmlFor="email-digest" className="text-sm font-medium text-foreground">
                {intl.formatMessage({ id: "settings.personal.field_email_digest", defaultMessage: "Email digest" })}
              </Label>
              <Switch
                id="email-digest"
                checked={form.emailDigest}
                onCheckedChange={(v) => update("emailDigest", v)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Email signature */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-base font-bold">
              <SectionIcon icon={Signature} />
              {intl.formatMessage({ id: "settings.personal.section_signature", defaultMessage: "Email signature" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <Label htmlFor="signature">
              {intl.formatMessage({ id: "settings.personal.field_signature", defaultMessage: "Signature" })}
            </Label>
            <Textarea
              id="signature"
              rows={5}
              maxLength={2000}
              value={form.emailSignature}
              onChange={(e) => update("emailSignature", e.target.value)}
            />
            <p className="text-right text-xs text-muted-foreground tabular-nums">
              {form.emailSignature.length}/2000
            </p>
          </CardContent>
        </Card>

        {/* Default filters */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-base font-bold">
              <SectionIcon icon={Filter} />
              {intl.formatMessage({ id: "settings.personal.section_filters", defaultMessage: "Default filters" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="region">
                  {intl.formatMessage({ id: "settings.personal.field_region", defaultMessage: "Default region" })}
                </Label>
                <Select value={form.defaultRegionId || NO_DEFAULT} onValueChange={handleRegionChange}>
                  <SelectTrigger id="region" className="w-full">
                    <SelectValue
                      placeholder={intl.formatMessage({
                        id: "settings.personal.no_default",
                        defaultMessage: "No default",
                      })}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_DEFAULT}>
                      {intl.formatMessage({ id: "settings.personal.no_default", defaultMessage: "No default" })}
                    </SelectItem>
                    {regions.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="area">
                  {intl.formatMessage({ id: "settings.personal.field_area", defaultMessage: "Default area" })}
                </Label>
                <Select value={form.defaultAreaId || NO_DEFAULT} onValueChange={handleAreaChange}>
                  <SelectTrigger id="area" className="w-full">
                    <SelectValue
                      placeholder={intl.formatMessage({
                        id: "settings.personal.no_default",
                        defaultMessage: "No default",
                      })}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_DEFAULT}>
                      {intl.formatMessage({ id: "settings.personal.no_default", defaultMessage: "No default" })}
                    </SelectItem>
                    {filteredAreas.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
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
          {intl.formatMessage({ id: "settings.personal.save", defaultMessage: "Save changes" })}
        </Button>
      </div>
    </motion.section>
  );
};

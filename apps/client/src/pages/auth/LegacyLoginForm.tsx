import { useState } from "react";
import { useNavigate } from "react-router";
import { useForm } from "@tanstack/react-form";
import { useIntl } from "react-intl";
import { AlertTriangle, ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";

import { useAuthActions } from "../../lib/useAuth";
import { useToast } from "../../components/useToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const getRpcCode = (error: unknown): string | undefined => {
  if (typeof error !== "object" || error === null || !("data" in error)) {
    return undefined;
  }
  const data = (error as { data?: unknown }).data;
  if (typeof data !== "object" || data === null || !("code" in data)) {
    return undefined;
  }
  const code = (data as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
};

type LoginErrorKey = "login.errors.invalidCredentials" | "login.errors.generic";

const LOGIN_ERROR_MESSAGES: Record<LoginErrorKey, string> = {
  "login.errors.invalidCredentials": "Invalid email or password. Please try again.",
  "login.errors.generic": "Sign in failed. Please try again.",
};

const selectLoginErrorKey = (error: unknown): LoginErrorKey =>
  getRpcCode(error) === "UNAUTHORIZED"
    ? "login.errors.invalidCredentials"
    : "login.errors.generic";

/**
 * Email+password sign-in rendered only when the demo picker is disabled
 * server-side (`listDemoUsers` throws FORBIDDEN). Submits through the
 * existing `useAuth.login` wrapper so session atoms stay identical to the
 * demo path, then redirects to `/dashboard`.
 */
export const LegacyLoginForm = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { login } = useAuthActions();
  const toast = useToast();
  const [submitErrorKey, setSubmitErrorKey] = useState<LoginErrorKey | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm({
    defaultValues: { email: "", password: "", remember: true },
    onSubmit: async ({ value }) => {
      setSubmitErrorKey(null);
      try {
        await login({ email: value.email, password: value.password });
        toast.success(intl.formatMessage({ id: "login.submit", defaultMessage: "Sign in" }));
        navigate("/dashboard", { replace: true });
      } catch (error) {
        const key = selectLoginErrorKey(error);
        setSubmitErrorKey(key);
        toast.error(
          intl.formatMessage({ id: key, defaultMessage: LOGIN_ERROR_MESSAGES[key] }),
        );
      }
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.Field
        name="email"
        validators={{
          onChange: ({ value }) =>
            value
              ? undefined
              : intl.formatMessage({
                  id: "login.error_required_email",
                  defaultMessage: "Email is required",
                }),
        }}
      >
        {(field) => {
          const error = field.state.meta.errors[0]
            ? String(field.state.meta.errors[0])
            : undefined;
          return (
            <div className="space-y-2">
              <Label htmlFor="email">
                {intl.formatMessage({ id: "login.email_label", defaultMessage: "Work email" })}
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder={intl.formatMessage({
                    id: "login.email_placeholder",
                    defaultMessage: "you@company.com",
                  })}
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  autoComplete="email"
                  aria-invalid={Boolean(error)}
                  className="pl-9"
                />
              </div>
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
            </div>
          );
        }}
      </form.Field>

      <form.Field
        name="password"
        validators={{
          onChange: ({ value }) =>
            value
              ? undefined
              : intl.formatMessage({
                  id: "login.error_required_password",
                  defaultMessage: "Password is required",
                }),
        }}
      >
        {(field) => {
          const error = field.state.meta.errors[0]
            ? String(field.state.meta.errors[0])
            : undefined;
          return (
            <div className="space-y-2">
              <Label htmlFor="password">
                {intl.formatMessage({ id: "login.password_label", defaultMessage: "Password" })}
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={intl.formatMessage({
                    id: "login.password_placeholder",
                    defaultMessage: "Enter your password",
                  })}
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  autoComplete="current-password"
                  aria-invalid={Boolean(error)}
                  className="pr-10 pl-9"
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={intl.formatMessage({
                    id: showPassword ? "login.password_hide" : "login.password_show",
                    defaultMessage: showPassword ? "Hide password" : "Show password",
                  })}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
            </div>
          );
        }}
      </form.Field>

      <div className="flex items-center justify-between gap-3">
        <form.Field name="remember">
          {(field) => (
            <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={field.state.value}
                onCheckedChange={(checked) => field.handleChange(checked === true)}
              />
              <span className="text-muted-foreground">
                {intl.formatMessage({
                  id: "login.remember_me",
                  defaultMessage: "Remember this device",
                })}
              </span>
            </label>
          )}
        </form.Field>

        <button
          type="button"
          className="min-h-[44px] cursor-pointer text-sm font-medium text-primary transition-colors hover:text-primary/80"
          onClick={() =>
            toast.info(
              `${intl.formatMessage({ id: "login.forgot_password", defaultMessage: "Forgot password?" })} — Please contact your workspace administrator.`,
            )
          }
        >
          {intl.formatMessage({ id: "login.forgot_password", defaultMessage: "Forgot password?" })}
        </button>
      </div>

      {submitErrorKey ? (
        <div
          className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-destructive">
              {intl.formatMessage({ id: "login.error_title", defaultMessage: "Sign in failed" })}
            </p>
            <p className="text-xs text-destructive/90">
              {intl.formatMessage({
                id: submitErrorKey,
                defaultMessage: LOGIN_ERROR_MESSAGES[submitErrorKey],
              })}
            </p>
          </div>
        </div>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="min-h-[44px] w-full"
        disabled={form.state.isSubmitting}
      >
        {form.state.isSubmitting
          ? intl.formatMessage({ id: "login.submit_loading", defaultMessage: "Signing in…" })
          : intl.formatMessage({ id: "login.submit", defaultMessage: "Sign in" })}
        {!form.state.isSubmitting ? <ArrowRight className="size-4" /> : null}
      </Button>
    </form>
  );
};

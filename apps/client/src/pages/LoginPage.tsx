import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { useForm } from "@tanstack/react-form";
import { useIntl } from "react-intl";
import { Icon } from "../ui";
import { useAtomValue } from "jotai";
import { useAuthActions } from "../lib/useAuth";
import { isAuthenticatedAtom } from "../lib/atoms";
import { useLocale } from "../lib/useLocale";
import { isLocale, type Locale } from "../lib/i18n";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { useToast } from "../ui/useToast";
import "./LoginPage.css";

const LOCALE_OPTIONS: Array<{ value: Locale; label: string }> = [
  { value: "en", label: "English" },
  { value: "id", label: "Bahasa Indonesia" },
];

export const LoginPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const { login } = useAuthActions();
  const { locale, setLocale } = useLocale();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const toast = useToast();

  const copyrightYear = useMemo(() => new Date().getFullYear(), []);

  const form = useForm({
    defaultValues: { email: "", password: "", remember: true },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      try {
        await login({ email: value.email, password: value.password });
        toast.success(intl.formatMessage({ id: "login.submit" }));
        navigate("/dashboard", { replace: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Login failed";
        setSubmitError(message);
      }
    },
  });

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="login-page" data-ai-context={JSON.stringify({ section: "login-page" })}>
      <div className="login-shell">
        {/* ── LEFT: Aurora brand panel ── */}
        <aside className="login-brand" aria-label="Brand">
          <div className="login-brand__mesh" aria-hidden="true">
            <span className="login-brand__glow login-brand__glow--a" />
            <span className="login-brand__glow login-brand__glow--b" />
            <span className="login-brand__glow login-brand__glow--c" />
            <span className="login-brand__grid" />
            <span className="login-brand__noise" />
          </div>

          <div className="login-brand__inner">
            <div className="login-brand__top">
              <div className="login-brand__mark">
                <Icon icon="solar:chart-2-bold" />
              </div>
              <span className="login-brand__name">ERP Sales</span>
            </div>

            <div className="login-brand__hero">
              <span className="login-brand__kicker">
                {intl.formatMessage({ id: "login.brand_kicker" })}
              </span>
              <h1 className="login-brand__title">
                {intl.formatMessage({ id: "login.brand_title" })}
              </h1>
              <p className="login-brand__subtitle">
                {intl.formatMessage({ id: "login.brand_subtitle" })}
              </p>
            </div>

            <div className="login-brand__stats" role="list">
              <div className="login-stat" role="listitem">
                <span className="login-stat__icon">
                  <Icon icon="solar:bag-check-linear" />
                </span>
                <span className="login-stat__value">2,481</span>
                <span className="login-stat__label">
                  {intl.formatMessage({ id: "login.stat_orders_label" })}
                </span>
              </div>
              <div className="login-stat" role="listitem">
                <span className="login-stat__icon">
                  <Icon icon="solar:map-point-wave-linear" />
                </span>
                <span className="login-stat__value">312</span>
                <span className="login-stat__label">
                  {intl.formatMessage({ id: "login.stat_visits_label" })}
                </span>
              </div>
              <div className="login-stat" role="listitem">
                <span className="login-stat__icon">
                  <Icon icon="solar:check-circle-linear" />
                </span>
                <span className="login-stat__value">98.4%</span>
                <span className="login-stat__label">
                  {intl.formatMessage({ id: "login.stat_approvals_label" })}
                </span>
              </div>
            </div>

            <ul className="login-brand__features">
              <li className="login-feature">
                <span className="login-feature__icon">
                  <Icon icon="solar:shield-keyhole-linear" />
                </span>
                <div className="login-feature__body">
                  <span className="login-feature__title">
                    {intl.formatMessage({ id: "login.feature_audit_title" })}
                  </span>
                  <span className="login-feature__desc">
                    {intl.formatMessage({ id: "login.feature_audit_desc" })}
                  </span>
                </div>
              </li>
              <li className="login-feature">
                <span className="login-feature__icon">
                  <Icon icon="solar:users-group-rounded-linear" />
                </span>
                <div className="login-feature__body">
                  <span className="login-feature__title">
                    {intl.formatMessage({ id: "login.feature_role_title" })}
                  </span>
                  <span className="login-feature__desc">
                    {intl.formatMessage({ id: "login.feature_role_desc" })}
                  </span>
                </div>
              </li>
              <li className="login-feature">
                <span className="login-feature__icon">
                  <Icon icon="solar:bolt-circle-linear" />
                </span>
                <div className="login-feature__body">
                  <span className="login-feature__title">
                    {intl.formatMessage({ id: "login.feature_realtime_title" })}
                  </span>
                  <span className="login-feature__desc">
                    {intl.formatMessage({ id: "login.feature_realtime_desc" })}
                  </span>
                </div>
              </li>
            </ul>

            <figure className="login-brand__quote">
              <Icon icon="solar:quote-up-square-linear" className="login-brand__quote-mark" />
              <blockquote className="login-brand__quote-text">
                {intl.formatMessage({ id: "login.testimonial_quote" })}
              </blockquote>
              <figcaption className="login-brand__quote-author">
                {intl.formatMessage({ id: "login.testimonial_author" })}
              </figcaption>
            </figure>
          </div>
        </aside>

        {/* ── RIGHT: Form panel ── */}
        <main className="login-form-panel">
          <div className="login-form-panel__top">
            <label className="login-locale" htmlFor="login-locale">
              <span className="login-locale__label">
                <Icon icon="solar:global-linear" />
                {intl.formatMessage({ id: "login.language_label" })}
              </span>
              <select
                id="login-locale"
                className="login-locale__select"
                value={locale}
                onChange={(event) => {
                  const next = event.target.value;
                  if (isLocale(next)) setLocale(next);
                }}
              >
                {LOCALE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="login-form-panel__center">
            <div className="login-form-card">
              <header className="login-form-card__head">
                <span className="login-form-card__kicker">
                  {intl.formatMessage({ id: "login.form_kicker" })}
                </span>
                <h2 className="login-form-card__title">
                  {intl.formatMessage({ id: "login.form_title" })}
                </h2>
                <p className="login-form-card__subtitle">
                  {intl.formatMessage({ id: "login.form_subtitle" })}
                </p>
              </header>

              <form
                className="login-form"
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
                        : intl.formatMessage({ id: "login.error_required_email" }),
                  }}
                >
                  {(field) => (
                    <Input
                      id="email"
                      type="email"
                      label={intl.formatMessage({ id: "login.email_label" })}
                      placeholder={intl.formatMessage({ id: "login.email_placeholder" })}
                      value={field.state.value}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        field.handleChange(event.target.value)
                      }
                      autoComplete="email"
                      leftIcon={<Icon icon="solar:letter-linear" />}
                      error={
                        field.state.meta.errors[0]
                          ? String(field.state.meta.errors[0])
                          : undefined
                      }
                    />
                  )}
                </form.Field>

                <form.Field
                  name="password"
                  validators={{
                    onChange: ({ value }) =>
                      value
                        ? undefined
                        : intl.formatMessage({ id: "login.error_required_password" }),
                  }}
                >
                  {(field) => (
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      label={intl.formatMessage({ id: "login.password_label" })}
                      placeholder={intl.formatMessage({ id: "login.password_placeholder" })}
                      value={field.state.value}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        field.handleChange(event.target.value)
                      }
                      autoComplete="current-password"
                      leftIcon={<Icon icon="solar:lock-keyhole-linear" />}
                      rightIcon={
                        <button
                          type="button"
                          className="login-password-toggle"
                          onClick={() => setShowPassword((prev) => !prev)}
                          aria-label={intl.formatMessage({
                            id: showPassword ? "login.password_hide" : "login.password_show",
                          })}
                        >
                          <Icon
                            icon={showPassword ? "solar:eye-closed-linear" : "solar:eye-linear"}
                          />
                        </button>
                      }
                      error={
                        field.state.meta.errors[0]
                          ? String(field.state.meta.errors[0])
                          : undefined
                      }
                    />
                  )}
                </form.Field>

                <div className="login-form-row">
                  <form.Field name="remember">
                    {(field) => (
                      <label className="login-check">
                        <input
                          type="checkbox"
                          checked={field.state.value}
                          onChange={(event) => field.handleChange(event.target.checked)}
                        />
                        <span className="login-check__box" aria-hidden="true">
                          <Icon icon="solar:check-linear" />
                        </span>
                        <span className="login-check__label">
                          {intl.formatMessage({ id: "login.remember_me" })}
                        </span>
                      </label>
                    )}
                  </form.Field>

                  <button
                    type="button"
                    className="login-link"
                    onClick={() =>
                      toast.info(
                        `${intl.formatMessage({ id: "login.forgot_password" })} — Please contact your workspace administrator.`,
                      )
                    }
                  >
                    {intl.formatMessage({ id: "login.forgot_password" })}
                  </button>
                </div>

                {submitError && (
                  <div className="login-error" role="alert">
                    <span className="login-error__icon">
                      <Icon icon="solar:danger-triangle-linear" />
                    </span>
                    <div className="login-error__body">
                      <span className="login-error__title">
                        {intl.formatMessage({ id: "login.error_title" })}
                      </span>
                      <span className="login-error__msg">{submitError}</span>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  isLoading={form.state.isSubmitting}
                  rightIcon={
                    !form.state.isSubmitting ? (
                      <Icon icon="solar:arrow-right-linear" />
                    ) : undefined
                  }
                >
                  {form.state.isSubmitting
                    ? intl.formatMessage({ id: "login.submit_loading" })
                    : intl.formatMessage({ id: "login.submit" })}
                </Button>
              </form>

              <footer className="login-form-card__foot">
                <Icon icon="solar:shield-check-linear" />
                <span>{intl.formatMessage({ id: "login.secure_note" })}</span>
              </footer>
            </div>
          </div>

          <div className="login-form-panel__bottom">
            <span>
              {intl.formatMessage({ id: "login.copyright" }, { year: copyrightYear })}
            </span>
          </div>
        </main>
      </div>
    </div>
  );
};

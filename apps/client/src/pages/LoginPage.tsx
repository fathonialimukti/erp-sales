import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { useForm } from "@tanstack/react-form";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";

const Svg = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  brand: "M3 3v4M5 5h4M6 17v4M4 19h4 M13 3l2.5 5.5L21 11l-5.5 2.5L13 19l-2.5-5.5L5 11l5.5-2.5z",
  orders: "M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0",
  visits: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  approvals: "M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  bolt: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  quote: "M3 21c3 0 7-1 7-8V5c0-1-1-2-2-2H4c-1 0-2 1-2 2v6c0 1 1 2 2 2h2 M15 21c3 0 7-1 7-8V5c0-1-1-2-2-2h-4c-1 0-2 1-2 2v6c0 1 1 2 2 2h2",
  globe: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
  mail: "M4 4h16c1 0 2 1 2 2v12c0 1-1 2-2 2H4c-1 0-2-1-2-2V6c0-1 1-2 2-2z M22 6l-10 7L2 6",
  lock: "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z M7 11V7a5 5 0 0 1 10 0v4",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  eyeOff: "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94 M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19 M14.12 14.12a3 3 0 1 1-4.24-4.24 M1 1l22 22",
  check: "M20 6L9 17l-5-5",
  warning: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01",
  arrowRight: "M5 12h14 M12 5l7 7-7 7",
  shieldCheck: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4",
};
import { useAuthActions } from "../lib/useAuth";
import { isAuthenticatedAtom } from "../lib/atoms";
import { useLocale } from "../lib/useLocale";
import { type Locale } from "../lib/i18n";
import { isLocale } from "../lib/locale";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { FormField } from "../ui/FormField";
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
                <Svg d={ICONS.brand} />
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
                  <Svg d={ICONS.orders} />
                </span>
                <span className="login-stat__value">2,481</span>
                <span className="login-stat__label">
                  {intl.formatMessage({ id: "login.stat_orders_label" })}
                </span>
              </div>
              <div className="login-stat" role="listitem">
                <span className="login-stat__icon">
                  <Svg d={ICONS.visits} />
                </span>
                <span className="login-stat__value">312</span>
                <span className="login-stat__label">
                  {intl.formatMessage({ id: "login.stat_visits_label" })}
                </span>
              </div>
              <div className="login-stat" role="listitem">
                <span className="login-stat__icon">
                  <Svg d={ICONS.approvals} />
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
                  <Svg d={ICONS.shield} />
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
                  <Svg d={ICONS.users} />
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
                  <Svg d={ICONS.bolt} />
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
              <span className="login-brand__quote-mark"><Svg d={ICONS.quote} /></span>
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
                <Svg d={ICONS.globe} />
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
                    <FormField
                      label={intl.formatMessage({ id: "login.email_label" })}
                      error={
                        field.state.meta.errors[0]
                          ? String(field.state.meta.errors[0])
                          : undefined
                      }
                    >
                      <Input
                        id="email"
                        type="email"
                        placeholder={intl.formatMessage({ id: "login.email_placeholder" })}
                        value={field.state.value}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                          field.handleChange(event.target.value)
                        }
                        autoComplete="email"
                        leftIcon={<Svg d={ICONS.mail} />}
                      />
                    </FormField>
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
                    <FormField
                      label={intl.formatMessage({ id: "login.password_label" })}
                      error={
                        field.state.meta.errors[0]
                          ? String(field.state.meta.errors[0])
                          : undefined
                      }
                    >
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder={intl.formatMessage({ id: "login.password_placeholder" })}
                        value={field.state.value}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                          field.handleChange(event.target.value)
                        }
                        autoComplete="current-password"
                        leftIcon={<Svg d={ICONS.lock} />}
                        rightIcon={
                          <button
                            type="button"
                            className="login-password-toggle"
                            onClick={() => setShowPassword((prev) => !prev)}
                            aria-label={intl.formatMessage({
                              id: showPassword ? "login.password_hide" : "login.password_show",
                            })}
                          >
                            <Svg d={showPassword ? ICONS.eyeOff : ICONS.eye} />
                          </button>
                        }
                      />
                    </FormField>
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
                          <Svg d={ICONS.check} size={14} />
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
                      <Svg d={ICONS.warning} />
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
                      <Svg d={ICONS.arrowRight} />
                    ) : undefined
                  }
                >
                  {form.state.isSubmitting
                    ? intl.formatMessage({ id: "login.submit_loading" })
                    : intl.formatMessage({ id: "login.submit" })}
                </Button>
              </form>

              <footer className="login-form-card__foot">
                <Svg d={ICONS.shieldCheck} size={16} />
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

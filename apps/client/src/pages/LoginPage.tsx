import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { useForm } from "@tanstack/react-form";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  Quote,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Users,
  Zap,
  AlertTriangle,
} from "lucide-react";

import brandLogo from "@/assets/icons/brand-logo.png";
import {
  getMotionProps,
  pageEnter,
  staggerContainer,
  staggerItem,
} from "../lib/motion";
import { useAuthActions } from "../lib/useAuth";
import { isAuthenticatedAtom } from "../lib/atoms";
import { useMeta } from "../lib/useMeta";
import { useToast } from "../components/useToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const LoginPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const { login } = useAuthActions();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const toast = useToast();
  const reducedMotion = useReducedMotion();
  const enterProps = getMotionProps(reducedMotion);
  const copyrightYear = useMemo(() => new Date().getFullYear(), []);

  useMeta({
    title: 'Sign In',
    description: 'Sign in to ERP Sales — sales management platform for field teams and back-office.',
    robots: 'noindex, follow',
  });

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
    <div
      className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-background text-foreground"
      data-ai-context={JSON.stringify({ section: "login-page" })}
    >
      <div className="relative grid min-h-[calc(100dvh-4rem)] flex-1 lg:grid-cols-[1.05fr_1fr]">
        <aside
          className="relative hidden overflow-hidden border-r border-border bg-background text-foreground lg:block"
          aria-label="Brand"
        >
          <motion.div
            className="relative z-10 flex h-full flex-col justify-between gap-10 p-10 xl:p-14"
            variants={staggerContainer}
            {...enterProps}
          >
            <motion.div className="flex items-center gap-3" variants={staggerItem}>
              <img
                src={brandLogo}
                alt="ERP Sales"
                className="size-11 rounded-xl object-contain"
              />
              <span className="font-heading text-lg font-bold tracking-tight">
                ERP Sales
              </span>
            </motion.div>

            <motion.div className="max-w-lg space-y-4" variants={staggerItem}>
              <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary uppercase">
                {intl.formatMessage({ id: "login.brand_kicker" })}
              </span>
              <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight text-foreground xl:text-5xl">
                {intl.formatMessage({ id: "login.brand_title" })}
              </h1>
              <p className="text-base leading-relaxed text-muted-foreground">
                {intl.formatMessage({ id: "login.brand_subtitle" })}
              </p>
            </motion.div>

            <motion.div className="grid grid-cols-3 gap-3" role="list" variants={staggerItem}>
              {[
                {
                  icon: ShoppingBag,
                  value: "2,481",
                  label: intl.formatMessage({ id: "login.stat_orders_label" }),
                },
                {
                  icon: MapPin,
                  value: "312",
                  label: intl.formatMessage({ id: "login.stat_visits_label" }),
                },
                {
                  icon: CheckCircle2,
                  value: "98.4%",
                  label: intl.formatMessage({ id: "login.stat_approvals_label" }),
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  role="listitem"
                  className="rounded-xl border border-border bg-muted p-3"
                >
                  <stat.icon className="mb-2 size-4 text-primary" />
                  <div className="font-heading text-xl font-bold tabular-nums text-foreground">
                    {stat.value}
                  </div>
                  <div className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>

            <motion.ul className="space-y-3" variants={staggerItem}>
              {[
                {
                  icon: Shield,
                  title: intl.formatMessage({ id: "login.feature_audit_title" }),
                  desc: intl.formatMessage({ id: "login.feature_audit_desc" }),
                },
                {
                  icon: Users,
                  title: intl.formatMessage({ id: "login.feature_role_title" }),
                  desc: intl.formatMessage({ id: "login.feature_role_desc" }),
                },
                {
                  icon: Zap,
                  title: intl.formatMessage({ id: "login.feature_realtime_title" }),
                  desc: intl.formatMessage({ id: "login.feature_realtime_desc" }),
                },
              ].map((feature) => (
                <li key={feature.title} className="flex gap-3">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                    <feature.icon className="size-4" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {feature.title}
                    </div>
                    <div className="text-xs leading-relaxed text-muted-foreground">
                      {feature.desc}
                    </div>
                  </div>
                </li>
              ))}
            </motion.ul>

            <motion.figure
              className="rounded-2xl border border-border bg-card p-5"
              variants={staggerItem}
            >
              <Quote className="mb-3 size-4 text-primary" />
              <blockquote className="text-sm leading-relaxed text-foreground">
                {intl.formatMessage({ id: "login.testimonial_quote" })}
              </blockquote>
              <figcaption className="mt-3 text-xs font-semibold text-primary">
                {intl.formatMessage({ id: "login.testimonial_author" })}
              </figcaption>
            </motion.figure>
          </motion.div>
        </aside>

        <div className="relative flex min-h-0 flex-col bg-background">
          <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8">
            <motion.div className="w-full max-w-md" variants={pageEnter} {...enterProps}>
              <Card className="border-border bg-card shadow-sm">
                <CardHeader className="space-y-2">
                  <span className="text-xs font-semibold tracking-wide text-primary uppercase">
                    {intl.formatMessage({ id: "login.form_kicker" })}
                  </span>
                  <CardTitle className="font-heading text-2xl">
                    {intl.formatMessage({ id: "login.form_title" })}
                  </CardTitle>
                  <CardDescription>
                    {intl.formatMessage({ id: "login.form_subtitle" })}
                  </CardDescription>
                </CardHeader>

                <CardContent>
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
                            : intl.formatMessage({ id: "login.error_required_email" }),
                      }}
                    >
                      {(field) => {
                        const error = field.state.meta.errors[0]
                          ? String(field.state.meta.errors[0])
                          : undefined;
                        return (
                          <div className="space-y-2">
                            <Label htmlFor="email">
                              {intl.formatMessage({ id: "login.email_label" })}
                            </Label>
                            <div className="relative">
                              <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                id="email"
                                type="email"
                                placeholder={intl.formatMessage({
                                  id: "login.email_placeholder",
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
                            : intl.formatMessage({ id: "login.error_required_password" }),
                      }}
                    >
                      {(field) => {
                        const error = field.state.meta.errors[0]
                          ? String(field.state.meta.errors[0])
                          : undefined;
                        return (
                          <div className="space-y-2">
                            <Label htmlFor="password">
                              {intl.formatMessage({ id: "login.password_label" })}
                            </Label>
                            <div className="relative">
                              <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder={intl.formatMessage({
                                  id: "login.password_placeholder",
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
                                  id: showPassword
                                    ? "login.password_hide"
                                    : "login.password_show",
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
                          <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <Checkbox
                              checked={field.state.value}
                              onCheckedChange={(checked) =>
                                field.handleChange(checked === true)
                              }
                            />
                            <span className="text-muted-foreground">
                              {intl.formatMessage({ id: "login.remember_me" })}
                            </span>
                          </label>
                        )}
                      </form.Field>

                      <button
                        type="button"
                        className="cursor-pointer text-sm font-medium text-primary transition-colors hover:text-primary/80"
                        onClick={() =>
                          toast.info(
                            `${intl.formatMessage({ id: "login.forgot_password" })} — Please contact your workspace administrator.`,
                          )
                        }
                      >
                        {intl.formatMessage({ id: "login.forgot_password" })}
                      </button>
                    </div>

                    {submitError ? (
                      <div
                        className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3"
                        role="alert"
                      >
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-destructive">
                            {intl.formatMessage({ id: "login.error_title" })}
                          </p>
                          <p className="text-xs text-destructive/90">{submitError}</p>
                        </div>
                      </div>
                    ) : null}

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={form.state.isSubmitting}
                    >
                      {form.state.isSubmitting
                        ? intl.formatMessage({ id: "login.submit_loading" })
                        : intl.formatMessage({ id: "login.submit" })}
                      {!form.state.isSubmitting ? <ArrowRight className="size-4" /> : null}
                    </Button>
                  </form>
                </CardContent>

                <CardFooter className="justify-center gap-2 border-t pt-6 text-sm text-muted-foreground">
                  <ShieldCheck className="size-4 text-primary" />
                  <span>{intl.formatMessage({ id: "login.secure_note" })}</span>
                </CardFooter>
              </Card>
            </motion.div>
          </div>

          <div className="px-4 pb-6 text-center text-sm text-muted-foreground sm:px-8">
            {intl.formatMessage({ id: "login.copyright" }, { year: copyrightYear })}
          </div>
        </div>
      </div>
    </div>
  );
};

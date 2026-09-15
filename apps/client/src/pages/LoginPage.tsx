import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Quote,
  RefreshCw,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Users,
  Zap,
} from "lucide-react";

import { BrandMark } from "@/components/BrandMark";
import {
  getMotionProps,
  pageEnter,
  staggerContainer,
  staggerItem,
} from "../lib/motion";
import { useAuthActions } from "../lib/useAuth";
import { isAuthenticatedAtom } from "../lib/atoms";
import { useMeta } from "../lib/useMeta";
import { trpcClient } from "../lib/trpc";
import { useToast } from "../components/useToast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "../components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { DemoUserCard } from "./auth/DemoUserCard";
import { LegacyLoginForm } from "./auth/LegacyLoginForm";

type SelectErrorKey =
  | "demo.errors.forbidden"
  | "demo.errors.notFound"
  | "demo.errors.generic";

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

const selectErrorKeyFor = (error: unknown): SelectErrorKey => {
  const code = getRpcCode(error);
  if (code === "NOT_FOUND") return "demo.errors.notFound";
  if (code === "FORBIDDEN") return "demo.errors.forbidden";
  return "demo.errors.generic";
};

const SELECT_ERROR_MESSAGES: Record<SelectErrorKey, string> = {
  "demo.errors.forbidden":
    "This account is not allowed to sign in to the demo.",
  "demo.errors.notFound": "That demo account no longer exists.",
  "demo.errors.generic": "Sign in failed. Please try again.",
};

export const LoginPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const { demoLogin } = useAuthActions();
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [selectErrorKey, setSelectErrorKey] = useState<SelectErrorKey | null>(null);
  const toast = useToast();
  const reducedMotion = useReducedMotion();
  const enterProps = getMotionProps(reducedMotion);
  const copyrightYear = useMemo(() => new Date().getFullYear(), []);

  useMeta({
    title: 'Sign In',
    description: 'Sign in to B2B CRM — sales management platform for field teams and back-office.',
    robots: 'noindex, follow',
  });

  const demoUsersQuery = useQuery({
    queryKey: ["demoUsers"],
    queryFn: () => trpcClient.auth.listDemoUsers.query(),
  });

  const users = demoUsersQuery.data ?? [];
  const listCode = demoUsersQuery.isError ? getRpcCode(demoUsersQuery.error) : undefined;
  const isDisabled = listCode === "FORBIDDEN";

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleSelect = async (userId: string) => {
    if (pendingUserId) return;
    const selected = users.find((user) => user.id === userId);
    setPendingUserId(userId);
    setSelectErrorKey(null);
    try {
      await demoLogin(userId);
      toast.success(
        intl.formatMessage(
          { id: "demo.loginAs", defaultMessage: "Continue as {name}" },
          { name: selected?.name ?? selected?.email ?? "" },
        ),
      );
      navigate("/dashboard", { replace: true });
    } catch (error) {
      const key = selectErrorKeyFor(error);
      setSelectErrorKey(key);
      toast.error(
        intl.formatMessage({ id: key, defaultMessage: SELECT_ERROR_MESSAGES[key] }),
      );
    } finally {
      setPendingUserId(null);
    }
  };

  const handleRetry = () => {
    void demoUsersQuery.refetch();
  };

  return (
    <div
      className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-background text-foreground"
      data-ai-context={JSON.stringify({ section: "login-page" })}
    >
      <div className="relative mx-auto grid w-full max-w-7xl min-h-[calc(100dvh-4rem)] flex-1 lg:grid-cols-[1.05fr_1fr]">
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
              <BrandMark className="size-11" label="B2B CRM" />
              <span className="font-heading text-lg font-bold tracking-tight">
                B2B CRM
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
          <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-8 sm:px-8">
            <motion.div
              className="flex min-h-0 w-full max-w-md flex-col"
              variants={pageEnter}
              {...enterProps}
            >
              <Card className="flex min-h-0 w-full max-h-[calc(100dvh-11rem)] flex-col border-border bg-card shadow-sm">
                <CardHeader className="space-y-2">
                  <span className="text-xs font-semibold tracking-wide text-primary uppercase">
                    {isDisabled
                      ? intl.formatMessage({
                          id: "login.form_kicker",
                          defaultMessage: "Sign in to your workspace",
                        })
                      : intl.formatMessage({
                          id: "auth.login.title",
                          defaultMessage: "Sign in",
                        })}
                  </span>
                  <CardTitle className="font-heading text-2xl">
                    {isDisabled
                      ? intl.formatMessage({
                          id: "login.form_title",
                          defaultMessage: "Welcome back",
                        })
                      : intl.formatMessage({
                          id: "demo.title",
                          defaultMessage: "Demo accounts",
                        })}
                  </CardTitle>
                  <CardDescription>
                    {isDisabled
                      ? intl.formatMessage({
                          id: "login.form_subtitle",
                          defaultMessage: "Enter your credentials to continue.",
                        })
                      : intl.formatMessage({
                          id: "demo.subtitle",
                          defaultMessage: "One click to explore the workspace as any role.",
                        })}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex min-h-0 flex-1 flex-col">
                  {demoUsersQuery.isLoading ? (
                    <div role="status" aria-live="polite" className="space-y-3">
                      <span className="sr-only">
                        {intl.formatMessage({
                          id: "demo.loading",
                          defaultMessage: "Loading demo accounts…",
                        })}
                      </span>
                      {[0, 1, 2].map((index) => (
                        <div
                          key={index}
                          aria-hidden
                          className="space-y-3 rounded-xl border border-border p-4"
                        >
                          <div className="flex items-center gap-3">
                            <Skeleton className="size-11 shrink-0 rounded-xl" />
                            <div className="flex-1 space-y-1.5">
                              <Skeleton className="h-4 w-2/3" />
                              <Skeleton className="h-3 w-1/2" />
                            </div>
                          </div>
                          <Skeleton className="h-11 w-full rounded-lg" />
                        </div>
                      ))}
                    </div>
                  ) : isDisabled ? (
                    <LegacyLoginForm />
                  ) : demoUsersQuery.isError ? (
                    <div
                      className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4"
                      role="alert"
                    >
                      <div className="flex gap-3">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-destructive">
                            {intl.formatMessage({ id: "login.error_title" })}
                          </p>
                          <p className="text-xs text-destructive/90">
                            {intl.formatMessage({
                              id: "demo.errors.generic",
                              defaultMessage: "Sign in failed. Please try again.",
                            })}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-[44px] w-full"
                        onClick={handleRetry}
                      >
                        <RefreshCw className="size-4" />
                        {intl.formatMessage({
                          id: "common.action.retry",
                          defaultMessage: "Retry",
                        })}
                      </Button>
                    </div>
                  ) : users.length === 0 ? (
                    <EmptyState
                      module="user"
                      title={intl.formatMessage({
                        id: "demo.empty",
                        defaultMessage: "No demo users available",
                      })}
                      description={intl.formatMessage({
                        id: "demo.emptyHint",
                        defaultMessage: "Ask your administrator to seed demo accounts.",
                      })}
                      action={
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-[44px]"
                          onClick={handleRetry}
                        >
                          <RefreshCw className="size-4" />
                          {intl.formatMessage({
                            id: "common.action.retry",
                            defaultMessage: "Retry",
                          })}
                        </Button>
                      }
                    />
                  ) : (
                    <motion.ul
                      className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-1"
                      variants={staggerContainer}
                      {...enterProps}
                      aria-label={intl.formatMessage({
                        id: "demo.selectUser",
                        defaultMessage: "Select a user",
                      })}
                    >
                      {users.map((user) => (
                        <motion.li key={user.id} variants={staggerItem}>
                          <DemoUserCard
                            user={user}
                            pending={pendingUserId === user.id}
                            disabled={pendingUserId !== null}
                            onSelect={handleSelect}
                          />
                        </motion.li>
                      ))}
                    </motion.ul>
                  )}

                  {selectErrorKey ? (
                    <div
                      className="mt-3 flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3"
                      role="alert"
                    >
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-destructive">
                          {intl.formatMessage({ id: "login.error_title" })}
                        </p>
                        <p className="text-xs text-destructive/90">
                          {intl.formatMessage({
                            id: selectErrorKey,
                            defaultMessage: SELECT_ERROR_MESSAGES[selectErrorKey],
                          })}
                        </p>
                      </div>
                    </div>
                  ) : null}
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

import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { useForm } from '@tanstack/react-form';
import { Icon } from "../ui";
import { useAtomValue } from 'jotai';
import { useAuthActions } from '../lib/useAuth';
import { isAuthenticatedAtom } from '../lib/atoms';
import { Button } from '../ui/Button';
import { Card, CardBody, CardFooter, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Input } from '../ui/Input';
import { useToast } from '../ui/useToast';

export const LoginPage = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const { login } = useAuthActions();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const toast = useToast();

  const highlights = [
    {
      title: 'Centralized Operations',
      description: 'Monitor warehouse activity, SKU movement, and access control from one place.',
      icon: 'solar:buildings-2-linear',
    },
    {
      title: 'Secure Role Access',
      description: 'Permission-driven modules keep operators, approvers, and admins in the right workflow.',
      icon: 'solar:shield-user-linear',
    },
    {
      title: 'Reliable Audit Trail',
      description: 'Every critical action is traceable, reducing ambiguity during daily operations.',
      icon: 'solar:clipboard-check-linear',
    },
  ];

  const form = useForm({
    defaultValues: { email: '', password: '' },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      try {
        await login(value);
        toast.success('Welcome back');
        navigate('/dashboard', { replace: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Login failed';
        setSubmitError(message);
      }
    },
  });

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <Card className="grid w-full overflow-hidden md:grid-cols-2">
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-white md:p-10">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-accent-500/20 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between gap-8">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
              <Icon icon="solar:shield-keyhole-linear" className="h-4 w-4" />
              Secure ERP Access
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-white/55">
                Warehouse Control Center
              </p>
              <h1 className="max-w-md text-3xl font-semibold leading-tight sm:text-4xl">
                Professional operations start with a disciplined sign-in flow.
              </h1>
              <p className="max-w-lg text-sm leading-6 text-white/70 sm:text-base">
                Access inventory, warehouse master data, approvals, and activity logs from one operational dashboard.
              </p>
            </div>
          </div>
          <div className="grid gap-3">
            {highlights.map((item) => (
              <div
                key={item.title}
                className="rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white">
                    <Icon icon={item.icon} className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-sm leading-5 text-white/70">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <CardBody className="p-8 md:p-10">
        <CardHeader className="border-b-0 px-0 pb-0">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-accent-700">
              <Icon icon="solar:login-2-linear" className="h-4 w-4" />
              Sign In
            </div>
            <div>
              <CardTitle>Welcome back</CardTitle>
              <CardDescription>Use your company credentials to continue to the ERP workspace.</CardDescription>
            </div>
          </div>
        </CardHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
          className="mt-8 space-y-5"
        >
          <form.Field
            name="email"
            validators={{ onChange: ({ value }) => (!value ? 'Email is required' : undefined) }}
          >
            {(field) => (
              <Input
                id="email"
                type="email"
                label="Email"
                placeholder="you@company.com"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                autoComplete="email"
                error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
              />
            )}
          </form.Field>

          <form.Field
            name="password"
            validators={{ onChange: ({ value }) => (!value ? 'Password is required' : undefined) }}
          >
            {(field) => (
              <Input
                id="password"
                type="password"
                label="Password"
                placeholder="Enter your password"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                autoComplete="current-password"
                error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
              />
            )}
          </form.Field>

          {submitError && (
            <div className="rounded-md border border-state-danger/30 bg-state-danger-bg px-4 py-3 text-sm text-state-danger">
              <div className="flex items-start gap-2">
                <Icon icon="solar:danger-triangle-linear" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            </div>
          )}

          <Button type="submit" variant="primary" fullWidth isLoading={form.state.isSubmitting}>
            {form.state.isSubmitting ? 'Signing in…' : 'Sign in to dashboard'}
          </Button>
        </form>

        <CardFooter className="mt-8 border-t border-slate-200 px-0 pt-5">
          <div className="flex w-full items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Icon icon="solar:lock-keyhole-linear" className="h-4 w-4" />
              Session is protected and permission-aware.
            </div>
          </div>
        </CardFooter>
      </CardBody>
    </Card>
  );
};

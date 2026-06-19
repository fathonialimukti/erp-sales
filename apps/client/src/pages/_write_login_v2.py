import os

css_content = """/* ============================================================
 * LoginPage — Immersive Full-Screen Glassmorphism
 * Prefix: .login-
 * 
 * Design concept:
 *   Full-screen dark gradient background with animated orbs
 *   and a subtle grid overlay. A single centered glass card
 *   holds the form — no split layout. Clean, focused, premium.
 *
 * Tokens used: --color-slate-*, --color-accent-*, --radius-*,
 *   --shadow-*, --transition-*, --color-state-*, --color-*
 * ============================================================ */

/* ──────────────────────────────────────────────
   1. FULL-SCREEN BACKGROUND
   ────────────────────────────────────────────── */

.login-screen {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(160deg, #020617 0%, #0f172a 35%, #1e293b 65%, #0f172a 100%);
}

/* Animated floating orbs */
.login-screen__orb {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.login-screen__orb--1 {
  width: 500px;
  height: 500px;
  top: -120px;
  right: -100px;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, transparent 70%);
  filter: blur(60px);
  animation: loginOrbDrift 12s ease-in-out infinite alternate;
}

.login-screen__orb--2 {
  width: 400px;
  height: 400px;
  bottom: -80px;
  left: -80px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.14) 0%, transparent 70%);
  filter: blur(60px);
  animation: loginOrbDrift 10s ease-in-out infinite alternate-reverse;
}

.login-screen__orb--3 {
  width: 250px;
  height: 250px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(16, 185, 129, 0.10) 0%, transparent 70%);
  filter: blur(40px);
  animation: loginOrbDrift 8s ease-in-out infinite alternate;
  animation-delay: 3s;
}

@keyframes loginOrbDrift {
  0%   { transform: translate(0, 0) scale(1); }
  33%  { transform: translate(40px, -30px) scale(1.08); }
  66%  { transform: translate(-25px, 20px) scale(0.95); }
  100% { transform: translate(15px, -15px) scale(1.03); }
}

/* Subtle grid pattern */
.login-screen__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
  background-size: 64px 64px;
  pointer-events: none;
  mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, black 30%, transparent 100%);
  -webkit-mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, black 30%, transparent 100%);
}

/* ──────────────────────────────────────────────
   2. GLASS CARD
   ────────────────────────────────────────────── */

.login-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  margin: 16px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(24px) saturate(1.2);
  -webkit-backdrop-filter: blur(24px) saturate(1.2);
  border: 1px solid rgba(255, 255, 255, 0.10);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.05),
    0 24px 48px -12px rgba(0, 0, 0, 0.4),
    0 8px 16px -4px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  animation: loginCardReveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes loginCardReveal {
  from {
    opacity: 0;
    transform: translateY(32px) scale(0.94);
    filter: blur(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

/* ──────────────────────────────────────────────
   3. CARD INNER LAYOUT
   ────────────────────────────────────────────── */

.login-card__inner {
  padding: 40px 32px 32px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

@media (min-width: 480px) {
  .login-card__inner {
    padding: 48px 36px 36px;
  }
}

/* ──────────────────────────────────────────────
   4. BRAND HEADER
   ────────────────────────────────────────────── */

.login-brand__header {
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: loginSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 0.15s;
}

.login-brand__badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 9999px;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.20);
  padding: 6px 14px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: #6ee7b7;
}

.login-brand__title {
  font-size: 28px;
  font-weight: 700;
  color: #f8fafc;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.login-brand__subtitle {
  font-size: 14px;
  color: rgba(248, 250, 252, 0.55);
  line-height: 1.5;
}

/* ──────────────────────────────────────────────
   5. FORM
   ────────────────────────────────────────────── */

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: loginSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 0.25s;
}

.login-form__field {
  animation: loginSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.login-form__field--1 { animation-delay: 0.30s; }
.login-form__field--2 { animation-delay: 0.35s; }

.login-form__error {
  border-radius: 12px;
  background: rgba(239, 68, 68, 0.10);
  border: 1px solid rgba(239, 68, 68, 0.25);
  padding: 12px 16px;
  font-size: 13px;
  color: #fca5a5;
  animation: loginSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.login-form__error-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.login-form__submit {
  animation: loginSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 0.40s;
  margin-top: 4px;
}

/* ──────────────────────────────────────────────
   6. HIGHLIGHTS
   ────────────────────────────────────────────── */

.login-highlights {
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: loginSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 0.45s;
}

.login-highlight {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: background 200ms ease, border-color 200ms ease;
  cursor: default;
}

.login-highlight:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(255, 255, 255, 0.10);
}

.login-highlight__icon {
  display: flex;
  height: 34px;
  width: 34px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(16, 185, 129, 0.12);
  color: #6ee7b7;
  flex-shrink: 0;
}

.login-highlight__title {
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
}

.login-highlight__desc {
  font-size: 12px;
  color: rgba(248, 250, 252, 0.45);
  line-height: 1.4;
  margin-top: 2px;
}

/* ──────────────────────────────────────────────
   7. FOOTER
   ────────────────────────────────────────────── */

.login-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 11px;
  color: rgba(248, 250, 252, 0.35);
  animation: loginSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 0.50s;
}

.login-footer__lock {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ──────────────────────────────────────────────
   8. SHARED ANIMATION
   ────────────────────────────────────────────── */

@keyframes loginSlideUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ──────────────────────────────────────────────
   9. RESPONSIVE
   ────────────────────────────────────────────── */

@media (max-width: 375px) {
  .login-card__inner {
    padding: 32px 20px 24px;
  }
  .login-brand__title {
    font-size: 24px;
  }
}

/* ──────────────────────────────────────────────
   10. DARK MODE (already dark — just refine)
   ────────────────────────────────────────────── */

.dark .login-screen {
  background: linear-gradient(160deg, #020617 0%, #0f172a 35%, #1e293b 65%, #020617 100%);
}

/* ──────────────────────────────────────────────
   11. REDUCED MOTION
   ────────────────────────────────────────────── */

@media (prefers-reduced-motion: reduce) {
  .login-screen__orb,
  .login-card,
  .login-brand__header,
  .login-form,
  .login-form__field,
  .login-form__submit,
  .login-highlights,
  .login-footer {
    animation: none !important;
  }
}
"""

tsx_content = """import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { useForm } from "@tanstack/react-form";
import { Icon } from "../ui";
import { useAtomValue } from "jotai";
import { useAuthActions } from "../lib/useAuth";
import { isAuthenticatedAtom } from "../lib/atoms";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { useToast } from "../ui/useToast";
import "./LoginPage.css";

export const LoginPage = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const { login } = useAuthActions();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const toast = useToast();

  const highlights = [
    {
      title: "Centralized Operations",
      description: "Monitor warehouse activity, SKU movement, and access control from one place.",
      icon: "solar:buildings-2-linear",
    },
    {
      title: "Secure Role Access",
      description: "Permission-driven modules keep operators, approvers, and admins in the right workflow.",
      icon: "solar:shield-user-linear",
    },
    {
      title: "Reliable Audit Trail",
      description: "Every critical action is traceable, reducing ambiguity during daily operations.",
      icon: "solar:clipboard-check-linear",
    },
  ];

  const form = useForm({
    defaultValues: { email: "", password: "" },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      try {
        await login(value);
        toast.success("Welcome back");
        navigate("/dashboard", { replace: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Login failed";
        setSubmitError(message);
      }
    },
  });

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="login-screen" data-ai-context={JSON.stringify({ section: "login-page" })}>
      {/* Animated background orbs */}
      <div className="login-screen__orb login-screen__orb--1" />
      <div className="login-screen__orb login-screen__orb--2" />
      <div className="login-screen__orb login-screen__orb--3" />
      <div className="login-screen__grid" />

      {/* Glass card */}
      <div className="login-card">
        <div className="login-card__inner">
          {/* Brand header */}
          <div className="login-brand__header">
            <div className="login-brand__badge">
              <Icon icon="solar:shield-keyhole-linear" />
              Secure ERP Access
            </div>
            <div>
              <h1 className="login-brand__title">Welcome back</h1>
              <p className="login-brand__subtitle">Use your company credentials to continue to the ERP workspace.</p>
            </div>
          </div>

          {/* Form */}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void form.handleSubmit();
            }}
            className="login-form"
          >
            <div className="login-form__field login-form__field--1">
              <form.Field
                name="email"
                validators={{ onChange: ({ value }) => (!value ? "Email is required" : undefined) }}
              >
                {(field) => (
                  <Input
                    id="email"
                    type="email"
                    label="Email"
                    placeholder="you@company.com"
                    value={field.state.value}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.handleChange(e.target.value)}
                    autoComplete="email"
                    error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
                  />
                )}
              </form.Field>
            </div>

            <div className="login-form__field login-form__field--2">
              <form.Field
                name="password"
                validators={{ onChange: ({ value }) => (!value ? "Password is required" : undefined) }}
              >
                {(field) => (
                  <Input
                    id="password"
                    type="password"
                    label="Password"
                    placeholder="Enter your password"
                    value={field.state.value}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.handleChange(e.target.value)}
                    autoComplete="current-password"
                    error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
                  />
                )}
              </form.Field>
            </div>

            {submitError && (
              <div className="login-form__error">
                <div className="login-form__error-row">
                  <Icon icon="solar:danger-triangle-linear" />
                  <span>{submitError}</span>
                </div>
              </div>
            )}

            <div className="login-form__submit">
              <Button type="submit" variant="primary" fullWidth isLoading={form.state.isSubmitting}>
                {form.state.isSubmitting ? "Signing in..." : "Sign in to dashboard"}
              </Button>
            </div>
          </form>

          {/* Highlights */}
          <div className="login-highlights">
            {highlights.map((item) => (
              <div key={item.title} className="login-highlight">
                <div className="login-highlight__icon">
                  <Icon icon={item.icon} />
                </div>
                <div>
                  <p className="login-highlight__title">{item.title}</p>
                  <p className="login-highlight__desc">{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="login-footer">
            <div className="login-footer__lock">
              <Icon icon="solar:lock-keyhole-linear" />
              Session is protected and permission-aware.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
"""

base = '/workspaces/erp-sales/apps/client/src/pages'
for name, content in [('LoginPage.css', css_content), ('LoginPage.tsx', tsx_content)]:
    filepath = os.path.join(base, name)
    with open(filepath, 'w') as f:
        f.write(content)
    print(f'Written {len(content)} chars to {filepath}')

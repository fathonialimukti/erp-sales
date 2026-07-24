import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useIntl } from "react-intl";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  Building2,
  ChartColumn,
  CheckCircle2,
  Code2,
  FilePlus2,
  Handshake,
  Link2,
  LogIn,
  Mail,
  MapPin,
  Medal,
  MessageSquare,
  Phone,
  Quote,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  User,
  Users,
} from "lucide-react";

import { Stagger, StaggerItem } from "../components/motion/Stagger";
import { fadeIn, getMotionProps } from "../lib/motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  DecorBlob,
  HeroDashboard,
  ApprovalFlow,
  EmailToOrderFlow,
  AiWorkflow,
} from "./landing/LandingSections";

const CONTACT = {
  email: "mailto:fathoni@example.com",
  whatsapp: "https://wa.me/6281234567890",
  github: "https://github.com/fathoni",
  linkedin: "https://linkedin.com/in/fathoni",
  hire: "https://fathoni.dev/hire",
};

const FEATURES = [
  {
    key: "customers",
    icon: User,
    titleId: "landing.feature_customers_title",
    descId: "landing.feature_customers_desc",
    accent: "var(--module-customer, var(--primary))",
  },
  {
    key: "orders",
    icon: ShoppingCart,
    titleId: "landing.feature_orders_title",
    descId: "landing.feature_orders_desc",
    accent: "var(--module-order, var(--primary))",
  },
  {
    key: "visits",
    icon: MapPin,
    titleId: "landing.feature_visits_title",
    descId: "landing.feature_visits_desc",
    accent: "var(--module-visit, var(--primary))",
  },
  {
    key: "programs",
    icon: Medal,
    titleId: "landing.feature_programs_title",
    descId: "landing.feature_programs_desc",
    accent: "var(--module-planning, var(--primary))",
  },
  {
    key: "approvals",
    icon: CheckCircle2,
    titleId: "landing.feature_approvals_title",
    descId: "landing.feature_approvals_desc",
    accent: "var(--primary)",
  },
  {
    key: "insight",
    icon: ChartColumn,
    titleId: "landing.feature_insight_title",
    descId: "landing.feature_insight_desc",
    accent: "var(--module-report, var(--primary))",
  },
  {
    key: "email_concierge",
    icon: Mail,
    titleId: "landing.feature_email_concierge_title",
    descId: "landing.feature_email_concierge_desc",
    accent: "var(--module-email, var(--primary))",
  },
] as const;

const STEPS = [
  {
    key: "1",
    icon: Building2,
    titleId: "landing.step_1_title",
    descId: "landing.step_1_desc",
  },
  {
    key: "2",
    icon: FilePlus2,
    titleId: "landing.step_2_title",
    descId: "landing.step_2_desc",
  },
  {
    key: "3",
    icon: MapPin,
    titleId: "landing.step_3_title",
    descId: "landing.step_3_desc",
  },
  {
    key: "4",
    icon: BarChart3,
    titleId: "landing.step_4_title",
    descId: "landing.step_4_desc",
  },
] as const;

const FAQS = [
  { key: "1", qId: "landing.faq_q_1", aId: "landing.faq_a_1" },
  { key: "2", qId: "landing.faq_q_2", aId: "landing.faq_a_2" },
  { key: "3", qId: "landing.faq_q_3", aId: "landing.faq_a_3" },
  { key: "4", qId: "landing.faq_q_4", aId: "landing.faq_a_4" },
  { key: "5", qId: "landing.faq_q_5", aId: "landing.faq_a_5" },
] as const;

const SKILLS = [
  "TypeScript",
  "React",
  "tRPC",
  "Prisma",
  "PostgreSQL",
  "n8n",
  "Node.js",
  "Tailwind CSS",
  "Vite",
  "Tauri",
] as const;

const CONTACT_ITEMS = [
  {
    key: "email",
    icon: Mail,
    labelId: "landing.contact_email",
    href: CONTACT.email,
  },
  {
    key: "whatsapp",
    icon: Phone,
    labelId: "landing.contact_whatsapp",
    href: CONTACT.whatsapp,
  },
  {
    key: "github",
    icon: Code2,
    labelId: "landing.contact_github",
    href: CONTACT.github,
  },
  {
    key: "linkedin",
    icon: Link2,
    labelId: "landing.contact_linkedin",
    href: CONTACT.linkedin,
  },
] as const;

const STATS = [
  {
    key: "orders",
    valueId: "landing.v2.stats_orders_value",
    labelId: "landing.v2.stats_orders",
    icon: ShoppingCart,
  },
  {
    key: "visits",
    valueId: "landing.v2.stats_visits_value",
    labelId: "landing.v2.stats_visits",
    icon: MapPin,
  },
  {
    key: "approval",
    valueId: "landing.v2.stats_approval_value",
    labelId: "landing.v2.stats_approval",
    icon: ShieldCheck,
  },
  {
    key: "modules",
    valueId: "landing.v2.stats_modules_value",
    labelId: "landing.v2.stats_modules",
    icon: Users,
  },
] as const;

const TRUST = [
  { key: "field", labelId: "landing.v2.trust_field", icon: MapPin },
  { key: "audit", labelId: "landing.v2.trust_audit", icon: ShieldCheck },
  { key: "ai", labelId: "landing.v2.trust_ai", icon: Sparkles },
] as const;

export const LandingPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const softEnter = getMotionProps(reducedMotion);

  const t = (id: string, fallback: string) =>
    intl.formatMessage({ id, defaultMessage: fallback });

  useEffect(() => {
    const prevTitle = document.title;
    const metaEls = Array.from(
      document.querySelectorAll<HTMLMetaElement>(
        'meta[name="description"], meta[property^="og:"], meta[name^="twitter:"], link[rel="canonical"]',
      ),
    );
    const prevMeta = metaEls.map((el) => ({
      el,
      content: el.getAttribute("content") ?? "",
      href: el.getAttribute("href") ?? "",
    }));

    const setMeta = (
      selector: string,
      attr: "content" | "href",
      value: string,
    ) => {
      const el = document.head.querySelector<HTMLElement>(selector);
      if (el) el.setAttribute(attr, value);
    };

    document.title = "ERP Sales — Sales Management Platform";
    setMeta(
      'meta[name="description"]',
      "content",
      "One platform to manage customers, outlets, sales orders, visits, and approvals. Built with React, tRPC, and PostgreSQL for field teams and back-office.",
    );
    setMeta(
      'meta[property="og:title"]',
      "content",
      "ERP Sales — Sales Management Platform",
    );
    setMeta(
      'meta[property="og:description"]',
      "content",
      "One platform to manage customers, outlets, sales orders, visits, and approvals — built for field teams and back-office alike.",
    );
    setMeta('meta[property="og:type"]', "content", "website");
    setMeta('meta[name="twitter:card"]', "content", "summary_large_image");
    setMeta(
      'meta[name="twitter:title"]',
      "content",
      "ERP Sales — Sales Management Platform",
    );
    setMeta(
      'meta[name="twitter:description"]',
      "content",
      "One platform to manage customers, outlets, sales orders, visits, and approvals — built for field teams and back-office alike.",
    );

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "ERP Sales",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Windows, macOS, Linux",
      url: window.location.origin,
      description:
        "One platform to manage customers, outlets, sales orders, visits, and approvals. Built with React, tRPC, and PostgreSQL.",
      author: {
        "@type": "Organization",
        name: "Fathoni",
        url: "https://fathoni.dev",
      },
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);

    return () => {
      document.title = prevTitle;
      prevMeta.forEach(({ el, content, href }) => {
        if (content) el.setAttribute("content", content);
        if (href) el.setAttribute("href", href);
      });
      script.remove();
    };
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      className="flex flex-1 flex-col"
      data-ai-context={JSON.stringify({ section: "landing" })}
    >
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:px-8">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_55%)]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          aria-hidden="true"
          style={{
            backgroundImage:
              "linear-gradient(to right, color-mix(in oklch, var(--border) 70%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklch, var(--border) 70%, transparent) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage:
              "radial-gradient(ellipse at center, black 20%, transparent 75%)",
          }}
        />
        <DecorBlob
          className="pointer-events-none absolute -right-10 -top-16 size-80 opacity-20"
          variant="a"
        />
        <DecorBlob
          className="pointer-events-none absolute -bottom-24 -left-16 size-72 opacity-10"
          variant="b"
        />

        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <Stagger className="space-y-6">
            <StaggerItem>
              <Badge
                variant="secondary"
                className="gap-1.5 px-3 py-1 text-xs font-semibold"
              >
                <Sparkles className="size-3.5 text-primary" />
                {t("landing.badge", "ERP SALES")}
              </Badge>
            </StaggerItem>

            <StaggerItem>
              <h1 className="font-heading text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                <span className="block text-foreground">
                  {t("landing.v2.hero_title_lead", "Sales Management,")}
                </span>
                <span className="mt-1 block bg-linear-to-r from-primary to-[color-mix(in_oklch,var(--primary)_55%,var(--foreground))] bg-clip-text text-transparent">
                  {t("landing.v2.hero_title_accent", "Reimagined")}
                </span>
              </h1>
            </StaggerItem>

            <StaggerItem>
              <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {t(
                  "landing.hero_subtitle",
                  "One platform to manage customers, outlets, sales orders, visits, and approvals.",
                )}
              </p>
            </StaggerItem>

            <StaggerItem>
              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  className="min-h-11 px-5"
                  onClick={() => navigate("/login")}
                >
                  <LogIn className="size-4" />
                  {t("landing.cta_primary", "Try the Demo")}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="min-h-11 px-5"
                  onClick={() => scrollTo("features")}
                >
                  {t("landing.cta_secondary", "Learn More")}
                  <ArrowDown className="size-4" />
                </Button>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="flex flex-wrap gap-2 pt-1">
                {TRUST.map((item) => (
                  <span
                    key={item.key}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-card/80 px-3 text-xs font-medium text-muted-foreground shadow-sm"
                  >
                    <item.icon className="size-3.5 text-primary" />
                    {t(item.labelId, item.key)}
                  </span>
                ))}
              </div>
            </StaggerItem>
          </Stagger>

          <motion.div className="relative" variants={fadeIn} {...softEnter}>
            <div className="absolute -inset-4 rounded-[2rem] bg-primary/10 blur-2xl" aria-hidden="true" />
            <div className="relative rounded-2xl border border-border/80 bg-card/70 p-3 shadow-xl shadow-primary/10 backdrop-blur-sm">
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("landing.v2.command_stage", "Command stage")}
                </span>
                <Badge variant="outline" className="text-[0.625rem]">
                  Live preview
                </Badge>
              </div>
              <HeroDashboard className="mx-auto w-full max-w-xl" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats / proof */}
      <section
        aria-labelledby="stats-title"
        className="border-b border-border bg-card/40 px-4 py-12 sm:px-6 sm:py-14 lg:px-8"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {t("landing.v2.stats_eyebrow", "Proof points")}
              </p>
              <h2
                id="stats-title"
                className="mt-1 font-heading text-2xl font-bold tracking-tight sm:text-3xl"
              >
                {t("landing.v2.stats_title", "Numbers that matter")}
              </h2>
            </div>
            <figure className="max-w-md rounded-xl border border-border bg-card p-4 shadow-sm">
              <Quote className="mb-2 size-4 text-primary" aria-hidden="true" />
              <blockquote className="text-sm leading-relaxed text-foreground">
                {t(
                  "landing.v2.social_quote",
                  "Field and back-office finally share one operating system — orders, visits, and approvals stay connected.",
                )}
              </blockquote>
              <figcaption className="mt-2 text-xs text-muted-foreground">
                {t("landing.v2.social_role", "Sales Ops Lead · Demo narrative")}
              </figcaption>
            </figure>
          </div>

          <Stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((stat) => (
              <StaggerItem key={stat.key}>
                <Card className="h-full border-border/80 transition-shadow hover:shadow-md">
                  <CardContent className="flex items-start gap-3 p-5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <stat.icon className="size-4" />
                    </span>
                    <div>
                      <div className="font-heading text-2xl font-semibold tabular-nums tracking-tight">
                        {t(stat.valueId, "—")}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {t(stat.labelId, stat.key)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Features bento */}
      <section
        id="features"
        aria-labelledby="features-title"
        className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {t("landing.features_eyebrow", "Modules")}
            </p>
            <h2
              id="features-title"
              className="mt-2 font-heading text-3xl font-bold tracking-tight"
            >
              {t(
                "landing.features_title",
                "Everything your sales operation needs",
              )}
            </h2>
            <p className="mt-3 text-muted-foreground">
              {t(
                "landing.features_subtitle",
                "From the first customer touch to the final approval.",
              )}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, index) => (
              <Card
                key={f.key}
                className={cn(
                  "group border-border/80 transition-all hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0",
                  index === 0 && "sm:col-span-2 lg:col-span-1",
                )}
              >
                <CardHeader className="gap-3 p-5">
                  <span
                    className="flex size-11 items-center justify-center rounded-xl transition-transform group-hover:scale-[1.03]"
                    style={{
                      background: `color-mix(in srgb, ${f.accent} 14%, transparent)`,
                      color: f.accent,
                    }}
                  >
                    <f.icon className="size-5" />
                  </span>
                  <CardTitle className="font-heading text-base sm:text-lg">
                    {t(f.titleId, f.key)}
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {t(f.descId, "")}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        aria-labelledby="how-title"
        className="scroll-mt-20 border-y border-border bg-card/40 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {t("landing.how_it_works_eyebrow", "Workflow")}
            </p>
            <h2
              id="how-title"
              className="mt-2 font-heading text-3xl font-bold tracking-tight"
            >
              {t("landing.how_it_works_title", "How It Works")}
            </h2>
            <p className="mt-3 text-muted-foreground">
              {t(
                "landing.how_it_works_subtitle",
                "Four steps from setup to insight.",
              )}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <Card key={step.key} className="relative border-border/80">
                <CardHeader className="gap-3 p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-primary">
                      <step.icon className="size-4" />
                    </span>
                  </div>
                  <CardTitle className="font-heading text-base">
                    {t(step.titleId, "")}
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {t(step.descId, "")}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Spotlight deep dives */}
      <section
        id="workflow"
        aria-labelledby="spotlight-title"
        className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
      >
        <div className="mx-auto max-w-6xl space-y-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {t("landing.v2.spotlight_eyebrow", "Deep dives")}
            </p>
            <h2
              id="spotlight-title"
              className="mt-2 font-heading text-3xl font-bold tracking-tight"
            >
              {t(
                "landing.v2.spotlight_title",
                "How the operating system works",
              )}
            </h2>
            <p className="mt-3 text-muted-foreground">
              {t(
                "landing.v2.spotlight_subtitle",
                "Governance, AI, and automation — three systems that keep field work and back-office in the same loop.",
              )}
            </p>
          </div>

          {/* Approval */}
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="space-y-4">
              <Badge variant="outline">
                {t("landing.workflow_eyebrow", "Governance")}
              </Badge>
              <h3 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                {t("landing.workflow_title", "Approval, with a paper trail")}
              </h3>
              <p className="leading-relaxed text-muted-foreground">
                {t(
                  "landing.workflow_subtitle",
                  "Every document moves through a clear, multi-level workflow.",
                )}
              </p>
              <ul className="space-y-2.5 text-sm">
                {[
                  t(
                    "landing.workflow_point_1",
                    "Draft → AI review → Proposed → Approved or Rejected",
                  ),
                  t(
                    "landing.workflow_point_2",
                    "LLM checks pricing, quantity & discount risk",
                  ),
                  t(
                    "landing.workflow_point_3",
                    "Full audit trail on every transition",
                  ),
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-card/60 p-3 shadow-sm">
              <ApprovalFlow className="w-full" />
            </div>
          </div>

          {/* Automation */}
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="order-2 rounded-2xl border border-border bg-card/60 p-3 shadow-sm lg:order-1">
              <EmailToOrderFlow className="w-full" />
            </div>
            <div className="order-1 space-y-4 lg:order-2">
              <Badge variant="outline">
                {t("landing.automation_eyebrow", "Automation")}
              </Badge>
              <h3 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                {t("landing.automation_title", "Orders that file themselves")}
              </h3>
              <p className="leading-relaxed text-muted-foreground">
                {t(
                  "landing.automation_subtitle",
                  "Customers email your company inbox. Email Concierge drafts an AI HTML reply.",
                )}
              </p>
              <ul className="space-y-2.5 text-sm">
                {[
                  {
                    icon: Mail,
                    text: t(
                      "landing.automation_point_1",
                      "Inbound email → company inbox",
                    ),
                  },
                  {
                    icon: Code2,
                    text: t(
                      "landing.automation_point_2",
                      "AI drafts and sends an HTML reply",
                    ),
                  },
                  {
                    icon: ShoppingCart,
                    text: t(
                      "landing.automation_point_3",
                      "Optional draft sales order on the thread",
                    ),
                  },
                ].map((item) => (
                  <li key={item.text} className="flex items-start gap-2">
                    <item.icon className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* AI */}
          <div
            id="ai"
            className="grid scroll-mt-20 items-center gap-10 lg:grid-cols-2 lg:gap-14"
          >
            <div className="space-y-4">
              <Badge variant="outline">
                {t("landing.ai_eyebrow", "Built-in AI")}
              </Badge>
              <h3 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                {t(
                  "landing.ai_title",
                  "An AI assistant that actually does the work",
                )}
              </h3>
              <p className="leading-relaxed text-muted-foreground">
                {t(
                  "landing.ai_subtitle",
                  "A streaming LLM engine sits inside the app — grounded in your docs via RAG.",
                )}
              </p>
              <ul className="space-y-2.5 text-sm">
                {[
                  {
                    icon: MessageSquare,
                    text: t(
                      "landing.ai_point_1",
                      "Chat with RAG over your knowledge base",
                    ),
                  },
                  {
                    icon: FilePlus2,
                    text: t(
                      "landing.ai_point_2",
                      "Extract orders from free-text or email",
                    ),
                  },
                  {
                    icon: BarChart3,
                    text: t(
                      "landing.ai_point_3",
                      "Ask data in plain language → read-only SQL",
                    ),
                  },
                  {
                    icon: CheckCircle2,
                    text: t(
                      "landing.ai_point_4",
                      "Auto-summarize pages & draft follow-ups",
                    ),
                  },
                ].map((item) => (
                  <li key={item.text} className="flex items-start gap-2">
                    <item.icon className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-card/60 p-3 shadow-sm">
              <AiWorkflow className="w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        aria-labelledby="faq-title"
        className="scroll-mt-20 border-y border-border bg-card/40 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
      >
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {t("landing.faq_eyebrow", "FAQ")}
            </p>
            <h2
              id="faq-title"
              className="mt-2 font-heading text-3xl font-bold tracking-tight"
            >
              {t("landing.faq_title", "Frequently Asked Questions")}
            </h2>
          </div>

          <Accordion type="single" collapsible className="rounded-xl bg-card shadow-sm">
            {FAQS.map((faq) => (
              <AccordionItem key={faq.key} value={faq.key}>
                <AccordionTrigger className="px-4 py-4 text-sm font-medium sm:px-5">
                  {t(faq.qId, "")}
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground sm:px-5">
                  {t(faq.aId, "")}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* About */}
      <section
        id="about"
        aria-labelledby="about-title"
        className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
      >
        <div className="mx-auto max-w-6xl">
          <Card className="overflow-hidden border-border/80 shadow-sm">
            <CardContent className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[220px_1fr] lg:gap-10">
              <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                <div className="flex size-20 items-center justify-center rounded-2xl bg-primary font-heading text-3xl font-bold text-primary-foreground shadow-lg shadow-primary/25">
                  F
                </div>
                <h3 className="mt-4 font-heading text-xl font-semibold">
                  {t("landing.about_name", "Fathoni")}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(
                    "landing.about_role",
                    "Full-Stack Developer & ERP Specialist",
                  )}
                </p>
              </div>
              <div className="space-y-4">
                <h2
                  id="about-title"
                  className="font-heading text-2xl font-bold tracking-tight"
                >
                  {t("landing.about_title", "About the Developer")}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t("landing.about_bio", "")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {SKILLS.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
                <Button asChild className="min-h-11">
                  <a
                    href={CONTACT.hire}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Handshake className="size-4" />
                    {t("landing.about_hire_cta", "Hire Me")}
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Contact */}
      <section
        id="contact"
        aria-labelledby="contact-title"
        className="scroll-mt-20 border-t border-border bg-card/40 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {t("landing.contact_eyebrow", "Contact")}
            </p>
            <h2
              id="contact-title"
              className="mt-2 font-heading text-3xl font-bold tracking-tight"
            >
              {t("landing.contact_title", "Get in Touch")}
            </h2>
            <p className="mt-3 text-muted-foreground">
              {t("landing.contact_subtitle", "Have questions? Reach out.")}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CONTACT_ITEMS.map((item) => (
              <a
                key={item.key}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "group flex min-h-28 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-6 text-center shadow-sm transition-all",
                  "hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                )}
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <item.icon className="size-5" />
                </span>
                <span className="text-sm font-medium">
                  {t(item.labelId, "")}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA band */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <Card className="overflow-hidden border-primary/20 bg-linear-to-br from-primary/10 via-card to-card shadow-md">
            <CardContent className="flex flex-col items-start gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div className="space-y-2">
                <Badge variant="secondary" className="gap-1.5">
                  <Sparkles className="size-3.5 text-primary" />
                  {t("landing.v2.cta_badge", "Aurora Commerce")}
                </Badge>
                <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                  {t("landing.cta_primary", "Try the Demo")}
                </h2>
                <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                  {t(
                    "landing.hero_subtitle",
                    "One platform to manage customers, outlets, sales orders, visits, and approvals.",
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  className="min-h-11 px-5"
                  onClick={() => navigate("/login")}
                >
                  <LogIn className="size-4" />
                  {t("landing.footer_sign_in", "Sign In")}
                  <ArrowRight className="size-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="min-h-11 px-5"
                  onClick={() => scrollTo("contact")}
                >
                  {t("landing.contact_title", "Get in Touch")}
                </Button>
              </div>
            </CardContent>
          </Card>
          <Separator className="mt-10 opacity-0" aria-hidden="true" />
        </div>
      </section>
    </div>
  );
};

export default LandingPage;

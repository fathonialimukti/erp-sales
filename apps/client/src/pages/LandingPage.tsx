import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useIntl } from "react-intl";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowDown,
  BarChart3,
  Building2,
  ChartColumn,
  CheckCircle2,
  ChevronDown,
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
  ShoppingCart,
  Sparkles,
  Star,
  User,
} from "lucide-react";

import { Stagger, StaggerItem } from "../components/motion/Stagger";
import { fadeIn, getMotionProps } from "../lib/motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DecorBlob,
  HeroDashboard,
  ApprovalFlow,
  EmailToOrderFlow,
  AiWorkflow,
} from "./landing-assets";

const CONTACT = {
  email: "mailto:fathoni@example.com",
  whatsapp: "https://wa.me/6281234567890",
  github: "https://github.com/fathoni",
  linkedin: "https://linkedin.com/in/fathoni",
  hire: "https://fathoni.dev/hire",
};

const FEATURES = [
  { key: "customers", icon: User, titleId: "landing.feature_customers_title", descId: "landing.feature_customers_desc", accent: "var(--module-customer)" },
  { key: "orders", icon: ShoppingCart, titleId: "landing.feature_orders_title", descId: "landing.feature_orders_desc", accent: "var(--module-order)" },
  { key: "visits", icon: MapPin, titleId: "landing.feature_visits_title", descId: "landing.feature_visits_desc", accent: "var(--module-visit)" },
  { key: "programs", icon: Medal, titleId: "landing.feature_programs_title", descId: "landing.feature_programs_desc", accent: "var(--module-planning)" },
  { key: "approvals", icon: CheckCircle2, titleId: "landing.feature_approvals_title", descId: "landing.feature_approvals_desc", accent: "var(--success)" },
  { key: "insight", icon: ChartColumn, titleId: "landing.feature_insight_title", descId: "landing.feature_insight_desc", accent: "var(--module-report)" },
  { key: "email_concierge", icon: Mail, titleId: "landing.feature_email_concierge_title", descId: "landing.feature_email_concierge_desc", accent: "var(--module-email)" },
] as const;

const STEPS = [
  { key: "1", icon: Building2, titleId: "landing.step_1_title", descId: "landing.step_1_desc" },
  { key: "2", icon: FilePlus2, titleId: "landing.step_2_title", descId: "landing.step_2_desc" },
  { key: "3", icon: MapPin, titleId: "landing.step_3_title", descId: "landing.step_3_desc" },
  { key: "4", icon: BarChart3, titleId: "landing.step_4_title", descId: "landing.step_4_desc" },
] as const;

const FAQS = [
  { key: "1", qId: "landing.faq_q_1", aId: "landing.faq_a_1" },
  { key: "2", qId: "landing.faq_q_2", aId: "landing.faq_a_2" },
  { key: "3", qId: "landing.faq_q_3", aId: "landing.faq_a_3" },
  { key: "4", qId: "landing.faq_q_4", aId: "landing.faq_a_4" },
  { key: "5", qId: "landing.faq_q_5", aId: "landing.faq_a_5" },
] as const;

const SKILLS = [
  "TypeScript", "React", "tRPC", "Prisma", "PostgreSQL",
  "n8n", "Node.js", "Tailwind CSS", "Vite", "Tauri",
];

const CONTACT_ITEMS = [
  { key: "email", icon: Mail, labelId: "landing.contact_email", href: CONTACT.email },
  { key: "whatsapp", icon: Phone, labelId: "landing.contact_whatsapp", href: CONTACT.whatsapp },
  { key: "github", icon: Code2, labelId: "landing.contact_github", href: CONTACT.github },
  { key: "linkedin", icon: Link2, labelId: "landing.contact_linkedin", href: CONTACT.linkedin },
] as const;

const FOOTER_LINKS = [
  { key: "signin", labelId: "landing.footer_sign_in", href: "/login", isRoute: true },
  { key: "features", labelId: "landing.footer_features", href: "#features", isRoute: false },
  { key: "faq", labelId: "landing.footer_faq", href: "#faq", isRoute: false },
  { key: "contact", labelId: "landing.footer_contact", href: "#contact", isRoute: false },
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

    const setMeta = (selector: string, attr: "content" | "href", value: string) => {
      const el = document.head.querySelector<HTMLElement>(selector);
      if (el) el.setAttribute(attr, value);
    };

    document.title = "ERP Sales — Sales Management Platform";
    setMeta(
      'meta[name="description"]',
      "content",
      "One platform to manage customers, outlets, sales orders, visits, and approvals. Built with React, tRPC, and PostgreSQL for field teams and back-office.",
    );
    setMeta('meta[property="og:title"]', "content", "ERP Sales — Sales Management Platform");
    setMeta(
      'meta[property="og:description"]',
      "content",
      "One platform to manage customers, outlets, sales orders, visits, and approvals — built for field teams and back-office alike.",
    );
    setMeta('meta[property="og:type"]', "content", "website");
    setMeta('meta[name="twitter:card"]', "content", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "content", "ERP Sales — Sales Management Platform");
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
      className="flex min-h-dvh flex-col bg-background text-foreground"
      data-ai-context={JSON.stringify({ section: "landing" })}
    >
      <header className="relative overflow-hidden border-b border-border px-6 pb-16 pt-16 sm:px-8 sm:pb-24 sm:pt-24">
        <div className="aurora-mesh pointer-events-none absolute inset-0 opacity-90" aria-hidden="true" />
        <DecorBlob className="pointer-events-none absolute -right-10 -top-16 size-80 opacity-15" variant="a" />
        <DecorBlob className="pointer-events-none absolute -bottom-20 -left-16 size-64 opacity-10" variant="b" />

        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <Stagger className="space-y-6">
            <StaggerItem>
              <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-xs font-semibold">
                <Star className="size-3.5" />
                {t("landing.badge", "ERP SALES")}
              </Badge>
            </StaggerItem>
            <StaggerItem>
              <h1 className="font-heading text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                {t("landing.hero_title", "Sales Management, Reimagined")}
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
                <Button size="lg" onClick={() => navigate("/login")}>
                  <LogIn className="size-4" />
                  {t("landing.cta_primary", "Sign In")}
                </Button>
                <Button size="lg" variant="outline" onClick={() => scrollTo("features")}>
                  {t("landing.cta_secondary", "Learn More")}
                  <ArrowDown className="size-4" />
                </Button>
              </div>
            </StaggerItem>
          </Stagger>

          <motion.div className="relative" variants={fadeIn} {...softEnter}>
            <HeroDashboard className="mx-auto w-full max-w-xl drop-shadow-xl" />
          </motion.div>
        </div>

        <div className="relative z-10 mt-12 flex justify-center text-muted-foreground" aria-hidden="true">
          <ArrowDown className="size-5 animate-bounce" />
        </div>
      </header>

      <main className="flex-1">
        <section id="features" aria-labelledby="features-title" className="mx-auto max-w-6xl px-6 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 id="features-title" className="font-heading text-3xl font-bold tracking-tight">
              {t("landing.features_title", "Everything your sales operation needs")}
            </h2>
            <p className="mt-3 text-muted-foreground">
              {t("landing.features_subtitle", "From the first customer touch to the final approval.")}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.key} className="border-border/80 transition-shadow hover:shadow-md">
                <CardHeader className="gap-3">
                  <span
                    className="flex size-11 items-center justify-center rounded-xl"
                    style={{
                      background: `color-mix(in srgb, ${f.accent} 14%, transparent)`,
                      color: f.accent,
                    }}
                  >
                    <f.icon className="size-5" />
                  </span>
                  <CardTitle className="font-heading text-lg">
                    {t(f.titleId, f.key)}
                  </CardTitle>
                  <CardDescription>{t(f.descId, "")}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section id="how-it-works" aria-labelledby="how-title" className="border-y border-border bg-card/40 px-6 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <h2 id="how-title" className="font-heading text-3xl font-bold tracking-tight">
                {t("landing.how_it_works_title", "How It Works")}
              </h2>
              <p className="mt-3 text-muted-foreground">
                {t("landing.how_it_works_subtitle", "Four steps from setup to insight.")}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, i) => (
                <Card key={step.key} className="border-border/80">
                  <CardHeader className="gap-3">
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
                    <CardDescription>{t(step.descId, "")}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" aria-labelledby="workflow-title" className="mx-auto max-w-6xl px-6 py-16 sm:px-8 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="space-y-4">
              <Badge variant="outline">{t("landing.workflow_eyebrow", "Governance")}</Badge>
              <h2 id="workflow-title" className="font-heading text-3xl font-bold tracking-tight">
                {t("landing.workflow_title", "Approval, with a paper trail")}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t(
                  "landing.workflow_subtitle",
                  "Every document moves through a clear, multi-level workflow. An AI reviews each order before it can be proposed, and every transition is logged with who, when, and why — so nothing slips through unnoticed.",
                )}
              </p>
              <ul className="space-y-2.5 text-sm">
                {[
                  t("landing.workflow_point_1", "Draft → AI review → Proposed → Approved or Rejected"),
                  t("landing.workflow_point_2", "LLM checks pricing, quantity & discount risk"),
                  t("landing.workflow_point_3", "Full audit trail on every transition"),
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <ApprovalFlow className="w-full drop-shadow-md" />
            </div>
          </div>
        </section>

        <section id="automation" aria-labelledby="automation-title" className="border-y border-border bg-card/40 px-6 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="order-2 lg:order-1">
              <EmailToOrderFlow className="w-full drop-shadow-md" />
            </div>
            <div className="order-1 space-y-4 lg:order-2">
              <Badge variant="outline">{t("landing.automation_eyebrow", "Automation")}</Badge>
              <h2 id="automation-title" className="font-heading text-3xl font-bold tracking-tight">
                {t("landing.automation_title", "Orders that file themselves")}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t(
                  "landing.automation_subtitle",
                  "Customers email their orders. An n8n workflow parses the message, creates a draft sales order, and routes it straight into your approval pipeline — zero manual entry.",
                )}
              </p>
              <ul className="space-y-2.5 text-sm">
                {[
                  { icon: Mail, text: t("landing.automation_point_1", "Inbound email → webhook trigger") },
                  { icon: Code2, text: t("landing.automation_point_2", "n8n parses and validates the order") },
                  { icon: ShoppingCart, text: t("landing.automation_point_3", "Draft sales order, ready to approve") },
                ].map((item) => (
                  <li key={item.text} className="flex items-start gap-2">
                    <item.icon className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="ai" aria-labelledby="ai-title" className="mx-auto max-w-6xl px-6 py-16 sm:px-8 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="space-y-4">
              <Badge variant="outline">{t("landing.ai_eyebrow", "Built-in AI")}</Badge>
              <h2 id="ai-title" className="font-heading text-3xl font-bold tracking-tight">
                {t("landing.ai_title", "An AI assistant that actually does the work")}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t(
                  "landing.ai_subtitle",
                  "A streaming LLM engine sits inside the app — grounded in your docs via RAG and wired to real tools, so it answers, navigates, and drafts instead of just chatting.",
                )}
              </p>
              <ul className="space-y-2.5 text-sm">
                {[
                  { icon: MessageSquare, text: t("landing.ai_point_1", "Chat with RAG over your knowledge base") },
                  { icon: FilePlus2, text: t("landing.ai_point_2", "Extract orders from free-text or email") },
                  { icon: BarChart3, text: t("landing.ai_point_3", "Ask data in plain language → read-only SQL") },
                  { icon: CheckCircle2, text: t("landing.ai_point_4", "Auto-summarize pages & draft follow-ups") },
                ].map((item) => (
                  <li key={item.text} className="flex items-start gap-2">
                    <item.icon className="mt-0.5 size-4 shrink-0 text-module-ai" />
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <AiWorkflow className="w-full drop-shadow-md" />
            </div>
          </div>
        </section>

        <section id="faq" aria-labelledby="faq-title" className="border-y border-border bg-card/40 px-6 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 id="faq-title" className="mb-8 text-center font-heading text-3xl font-bold tracking-tight">
              {t("landing.faq_title", "Frequently Asked Questions")}
            </h2>
            <div className="space-y-3">
              {FAQS.map((faq) => (
                <details
                  key={faq.key}
                  className="group rounded-xl border border-border bg-card px-5 py-4 shadow-sm open:shadow-md"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium">
                    <span>{t(faq.qId, "")}</span>
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {t(faq.aId, "")}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="about" aria-labelledby="about-title" className="mx-auto max-w-6xl px-6 py-16 sm:px-8 sm:py-20">
          <Card className="overflow-hidden border-border/80">
            <CardContent className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[220px_1fr] lg:gap-10">
              <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                <div className="flex size-20 items-center justify-center rounded-2xl bg-primary font-heading text-3xl font-bold text-primary-foreground shadow-lg shadow-primary/25">
                  F
                </div>
                <h3 className="mt-4 font-heading text-xl font-semibold">
                  {t("landing.about_name", "Fathoni")}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("landing.about_role", "Full-Stack Developer & ERP Specialist")}
                </p>
              </div>
              <div className="space-y-4">
                <h2 id="about-title" className="font-heading text-2xl font-bold tracking-tight">
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
                <Button asChild>
                  <a href={CONTACT.hire} target="_blank" rel="noopener noreferrer">
                    <Handshake className="size-4" />
                    {t("landing.about_hire_cta", "Hire Me")}
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="contact" aria-labelledby="contact-title" className="border-t border-border bg-card/40 px-6 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <h2 id="contact-title" className="font-heading text-3xl font-bold tracking-tight">
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
                    "group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 text-center shadow-sm transition-all",
                    "hover:border-primary/40 hover:shadow-md",
                  )}
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <item.icon className="size-5" />
                  </span>
                  <span className="text-sm font-medium">{t(item.labelId, "")}</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card px-6 py-10 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-start">
            {FOOTER_LINKS.map((link) =>
              link.isRoute ? (
                <a
                  key={link.key}
                  className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-primary"
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(link.href);
                  }}
                >
                  {t(link.labelId, "")}
                </a>
              ) : (
                <a
                  key={link.key}
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  href={link.href}
                >
                  {t(link.labelId, "")}
                </a>
              ),
            )}
          </div>
          <div className="space-y-1 text-center text-sm text-muted-foreground sm:text-left">
            <p className="flex items-center justify-center gap-1.5 sm:justify-start">
              <Sparkles className="size-3.5 text-primary" />
              {t("landing.footer_tagline", "ERP Sales — the operating system for your sales team.")}
            </p>
            <p>
              {t("landing.footer_built_by", "Built by Fathoni")}
              {" · "}
              {t("landing.footer_copyright", "© 2026 ERP Sales. All rights reserved.")}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

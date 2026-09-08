import { useState } from "react";
import { useNavigate } from "react-router";
import { useIntl } from "react-intl";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowDown,
  BarChart3,
  BookOpen,
  Building2,
  ChartColumn,
  CheckCircle2,
  Code2,
  FilePlus2,
  Handshake,
  LandPlot,
  Link2,
  LogIn,
  Mail,
  MapPin,
  Medal,
  MessageSquare,
  Phone,
  Quote,
  Server,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  User,
  Users,
  Warehouse,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Stagger, StaggerItem } from "../components/motion/Stagger";
import { fadeIn, getMotionProps } from "../lib/motion";
import { useMeta } from "../lib/useMeta";
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
import { cn } from "@/lib/utils";
import { MermaidDiagram } from "../components/MermaidDiagram";
import {
  DecorBlob,
  HeroDashboard,
  ApprovalFlow,
  EmailToOrderFlow,
  AiWorkflow,
  RagArchitecture,
} from "./landing/LandingSections";

const RAG_MERMAID_CHART = `flowchart LR
    subgraph WritePath["📝 Path 1: Pushing Knowledge"]
        direction TB
        KB["Knowledge Base Frontend"] -->|"create / update"| R["Knowledge-Base Router"]
        R -->|"set pending"| E["ai-embedding.ts"]
        E -->|"generateEmbedding()"| V["pgvector"]
        E -->|"upsertChunkEmbedding()"| V
        V -->|"status = done"| Done["✅ Embedded"]
    end

    subgraph ReadPath["💬 Path 2: Chatbot Retrieval"]
        direction TB
        Q["User Question"] -->|"query"| H["rag.ts"]
        H -->|"hybrid search"| V2["pgvector"]
        V2 -->|"vector similarity"| R1["searchKnowledgeChunksVector()"]
        V2 -->|"full-text"| R2["searchKnowledgeChunksFts()"]
        R1 -->|"merge"| M["mergeKnowledgeHits()"]
        R2 -->|"merge"| M
        M -->|"format"| F["formatKnowledgeHits()"]
        F -->|"inject"| AI["AI Assistant"]
        AI -->|"answer"| A["Response to User"]
    end

    V -. "Retrieve vectors" .-> V2
`;
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CONTACT = {
  email: "mailto:fathoni@example.com",
  whatsapp: "https://wa.me/6281234567890",
  github: "https://github.com/fathoni",
  linkedin: "https://linkedin.com/in/fathoni",
  hire: "https://fathoni.dev/hire",
};

const FEATURES = [
  {
    key: "region",
    icon: LandPlot,
    titleId: "landing.feature_region_title",
    descId: "landing.feature_region_desc",
    accent: "var(--module-region, var(--primary))",
  },
  {
    key: "area",
    icon: Building2,
    titleId: "landing.feature_area_title",
    descId: "landing.feature_area_desc",
    accent: "var(--module-area, var(--primary))",
  },
  {
    key: "customers",
    icon: User,
    titleId: "landing.feature_customers_title",
    descId: "landing.feature_customers_desc",
    accent: "var(--module-customer, var(--primary))",
  },
  {
    key: "outlet",
    icon: Warehouse,
    titleId: "landing.feature_outlet_title",
    descId: "landing.feature_outlet_desc",
    accent: "var(--module-outlet, var(--primary))",
  },
  {
    key: "sku",
    icon: ShoppingCart,
    titleId: "landing.feature_sku_title",
    descId: "landing.feature_sku_desc",
    accent: "var(--module-sku, var(--primary))",
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
    key: "events",
    icon: FilePlus2,
    titleId: "landing.feature_events_title",
    descId: "landing.feature_events_desc",
    accent: "var(--module-event, var(--primary))",
  },
  {
    key: "email_crm",
    icon: Mail,
    titleId: "landing.feature_email_crm_title",
    descId: "landing.feature_email_crm_desc",
    accent: "var(--module-email, var(--primary))",
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
    key: "knowledge",
    icon: BookOpen,
    titleId: "landing.feature_knowledge_title",
    descId: "landing.feature_knowledge_desc",
    accent: "var(--module-knowledge, var(--primary))",
  },
  {
    key: "ai_admin",
    icon: Sparkles,
    titleId: "landing.feature_ai_admin_title",
    descId: "landing.feature_ai_admin_desc",
    accent: "var(--module-ai, var(--primary))",
  },
  {
    key: "users",
    icon: Users,
    titleId: "landing.feature_users_title",
    descId: "landing.feature_users_desc",
    accent: "var(--module-user, var(--primary))",
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
  const [ragDiagramOpen, setRagDiagramOpen] = useState(false);
  const [ragZoom, setRagZoom] = useState(1);
  const RAG_ZOOM_MIN = 0.5;
  const RAG_ZOOM_MAX = 3;
  const RAG_ZOOM_STEP = 0.25;

  const handleRagZoomIn = () => setRagZoom((z) => Math.min(z + RAG_ZOOM_STEP, RAG_ZOOM_MAX));
  const handleRagZoomOut = () => setRagZoom((z) => Math.max(z - RAG_ZOOM_STEP, RAG_ZOOM_MIN));
  const handleRagZoomReset = () => setRagZoom(1);

  const t = (id: string, fallback: string) =>
    intl.formatMessage({ id, defaultMessage: fallback });

  // ── SEO / AEO / GEO meta ──
  const BASE = 'https://erp-sales.app';
  const faqData = FAQS.map((faq) => {
    const q = t(faq.qId, '');
    const a = t(faq.aId, '');
    return { '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } };
  });

  useMeta({
    title: 'Sales Management Platform',
    description:
      'One platform to manage customers, outlets, sales orders, visits, and approvals. Built with React, tRPC, and PostgreSQL for field teams and back-office. Includes AI-powered approval workflow, email-to-order automation, and real-time analytics.',
    canonical: BASE,
    robots: 'index, follow',
    jsonLd: [
      // ── Site ──
      {
        '@type': 'WebSite',
        name: 'ERP Sales',
        url: BASE,
        description:
          'One platform to manage customers, outlets, sales orders, visits, and approvals. Built with React, tRPC, and PostgreSQL.',
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${BASE}/search?q={search_term_string}` },
          'query-input': 'required name=search_term_string',
        },
      },
      // ── Breadcrumb ──
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
          { '@type': 'ListItem', position: 2, name: 'Features', item: `${BASE}/#features` },
          { '@type': 'ListItem', position: 3, name: 'How It Works', item: `${BASE}/#how-it-works` },
        ],
      },
      // ── Portfolio: Person (freelance branding) ──
      {
        '@type': 'Person',
        name: 'Fathoni',
        alternateName: 'Fathoni Full-Stack Developer',
        url: 'https://fathoni.dev',
        image: `${BASE}/og-image.png`,
        jobTitle: 'Full-Stack Developer & ERP Specialist',
        description:
          'Independent full-stack developer specializing in custom ERP systems, CRM platforms, and business automation. TypeScript, React, tRPC, PostgreSQL.',
        sameAs: [
          'https://github.com/fathoni',
          'https://linkedin.com/in/fathoni',
          'https://fathoni.dev',
        ],
        knowsAbout: [
          'ERP Systems',
          'Sales Management',
          'Custom CRM Development',
          'Business Process Automation',
          'TypeScript',
          'React',
          'tRPC',
          'PostgreSQL',
          'Prisma',
          'Node.js',
        ],
        makesOffer: [
          {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: 'Custom ERP Development',
              description:
                'End-to-end ERP and CRM platform development for sales teams, field operations, and back-office.',
            },
          },
          {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: 'Full-Stack Web Development',
              description:
                'TypeScript full-stack web applications with React, tRPC, Prisma, and PostgreSQL.',
            },
          },
        ],
      },
      // ── App ──
      {
        '@type': 'SoftwareApplication',
        name: 'ERP Sales',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web, Windows, macOS, Linux',
        url: BASE,
        description:
          'One platform to manage customers, outlets, sales orders, visits, and approvals. Built with React, tRPC, and PostgreSQL.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
        },
        author: { '@type': 'Person', name: 'Fathoni', url: 'https://fathoni.dev' },
        featureList: [
          'Customer & Outlet Management',
          'Sales Order Processing',
          'Visit Logging & Field Tracking',
          'Multi-level Approval Workflow with AI Review',
          'Email-to-Order Automation',
          'AI Chat Assistant with RAG Knowledge Base',
          'Real-time Analytics & Reports',
          'Role-based Access Control',
        ],
        screenshot: `${BASE}/og-image.png`,
      },
      // ── HowTo (AEO: step-by-step) ──
      {
        '@type': 'HowTo',
        name: 'How to Manage Your Sales Operation with ERP Sales',
        description:
          'Set up your territory, register customers and outlets, log visits, process orders, and gain insights — all in one platform.',
        totalTime: 'P1D',
        estimatedCost: { '@type': 'MonetaryAmount', currency: 'USD', value: '0' },
        tool: [
          { '@type': 'HowToTool', name: 'Web browser (Chrome, Firefox, Safari)' },
          { '@type': 'HowToTool', name: 'Desktop app (Windows, macOS, Linux via Tauri)' },
        ],
        step: [
          {
            '@type': 'HowToStep',
            position: 1,
            name: 'Define Territory',
            text: 'Create regions and areas that map to your sales territory. Organize by province, city, or district.',
          },
          {
            '@type': 'HowToStep',
            position: 2,
            name: 'Register Customers & Outlets',
            text: 'Add customer profiles and link their outlets, visit schedules, and contact information in one place.',
          },
          {
            '@type': 'HowToStep',
            position: 3,
            name: 'Log Visits & Place Orders',
            text: 'Field teams log visits in real-time. Create sales orders tied to customers, SKUs, pricing and discounts.',
          },
          {
            '@type': 'HowToStep',
            position: 4,
            name: 'Review Approvals & Analytics',
            text: 'Every order moves through AI-assisted multi-level approval. Track KPIs, reports, and audit trails from the dashboard.',
          },
        ],
      },
      // ── FAQ ──
      {
        '@type': 'FAQPage',
        mainEntity: faqData,
      },
    ],
  });

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      className="flex flex-1 flex-col"
      data-ai-context={JSON.stringify({
        section: 'landing',
        site: 'ERP Sales — Sales Management Platform',
        description:
          'One platform to manage customers, outlets, sales orders, visits, and approvals. Built with React, tRPC, and PostgreSQL for field teams and back-office. Includes AI-powered approval workflow, email-to-order automation, and real-time analytics.',
        features: [
          'Customer & Outlet Management',
          'Sales Order Processing',
          'Visit Logging & Field Tracking',
          'Multi-level Approval Workflow with AI Review',
          'Email-to-Order Automation',
          'AI Chat Assistant with RAG',
          'Real-time Analytics',
          'Role-based Access Control',
        ],
        author: {
          name: 'Fathoni',
          type: 'Full-Stack Developer',
          portfolio: 'https://fathoni.dev',
          url: 'https://fathoni.dev',
          expertise: ['ERP Systems', 'Custom CRM', 'Business Automation', 'TypeScript', 'React', 'tRPC', 'PostgreSQL', 'Prisma'],
        },
        techStack: ['TypeScript', 'React', 'tRPC', 'Prisma', 'PostgreSQL', 'n8n', 'Node.js', 'Tailwind CSS', 'Vite', 'Tauri'],
        howItWorks: [
          { step: 1, title: 'Define Territory', description: 'Create regions and areas for your sales territory.' },
          { step: 2, title: 'Register Customers & Outlets', description: 'Add customer profiles and link their outlets.' },
          { step: 3, title: 'Log Visits & Place Orders', description: 'Field teams log visits and create sales orders.' },
          { step: 4, title: 'Review Approvals & Analytics', description: 'AI-assisted multi-level approval and KPI tracking.' },
        ],
      })}
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

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <Stagger className="space-y-6">
            <StaggerItem>
              <Badge
                variant="secondary"
                className="gap-1.5 px-3 py-1 text-xs font-semibold"
              >
                <Star className="size-3.5 text-primary" />
                {t("landing.badge", "ERP SALES")}
              </Badge>
            </StaggerItem>

            <StaggerItem>
              <h1 className="font-heading text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                <span className="block text-foreground">
                  {t("landing.v2.hero_title_lead", "Sales ops,")}
                </span>
                <span className="mt-1 block text-primary">
                  {t("landing.v2.hero_title_accent", "one system")}
                </span>
              </h1>
            </StaggerItem>

            <StaggerItem>
              <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {t("landing.hero_subtitle", "Customers, outlets, orders, visits, approvals.")}
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
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-medium text-muted-foreground shadow-sm"
                  >
                    <item.icon className="size-3.5 text-primary" />
                    {t(item.labelId, item.key)}
                  </span>
                ))}
              </div>
            </StaggerItem>
          </Stagger>

          <motion.div className="relative" variants={fadeIn} {...softEnter}>
            <div className="relative rounded-2xl border border-border bg-card p-3">
              <HeroDashboard className="mx-auto w-full max-w-xl" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features bento */}
      <section
        id="features"
        aria-labelledby="features-title"
        className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2
              id="features-title"
              className="font-heading text-3xl font-bold tracking-tight"
            >
              {t("landing.features_title", "Modules")}
            </h2>
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
        className="scroll-mt-20 border-y border-border bg-muted px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
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
        className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
      >
        <div className="mx-auto max-w-7xl space-y-16">
          {/* Approval */}
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="space-y-4">
              <Badge variant="outline">
                {t("landing.workflow_eyebrow", "Governance")}
              </Badge>
              <h3 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                {t("landing.workflow_title", "Approvals with an audit trail")}
              </h3>
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
            <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <ApprovalFlow className="w-full" />
            </div>
          </div>

          {/* Automation */}
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="order-2 rounded-2xl border border-border bg-card p-3 shadow-sm lg:order-1">
              <EmailToOrderFlow className="w-full" />
            </div>
            <div className="order-1 space-y-4 lg:order-2">
              <Badge variant="outline">
                {t("landing.automation_eyebrow", "Automation")}
              </Badge>
              <h3 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                {t("landing.automation_title", "Email to order")}
              </h3>
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
                {t("landing.ai_eyebrow", "AI")}
              </Badge>
              <h3 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                {t("landing.ai_title", "Built-in AI assistant")}
              </h3>
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
            <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <AiWorkflow className="w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* RAG Architecture */}
      <section
        id="rag-architecture"
        aria-labelledby="rag-title"
        className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {t("landing.rag_eyebrow", "AI Knowledge")}
            </p>
            <h2
              id="rag-title"
              className="mt-2 font-heading text-3xl font-bold tracking-tight"
            >
              {t("landing.rag_title", "Grounded in your documents")}
            </h2>
            <p className="mt-3 text-muted-foreground">
              {t("landing.rag_subtitle", "Upload docs. The AI answers from them.")}
            </p>
          </div>
          <RagArchitecture className="w-full" />
          <div className="mt-6 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRagDiagramOpen(true)}
              className="gap-1.5"
            >
              <ZoomIn className="size-3.5" />
              {t("landing.rag_view_detailed", "View detailed diagram")}
            </Button>
          </div>
        </div>
      </section>

      {/* RAG Technical Diagram Popup */}
      <Dialog open={ragDiagramOpen} onOpenChange={(open) => { setRagDiagramOpen(open); if (!open) setRagZoom(1); }}>
        <DialogContent className="!max-w-7xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-4">
              <span>{t("landing.rag_diagram_title", "RAG Architecture — Technical View")}</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon-sm" onClick={handleRagZoomOut} disabled={ragZoom <= RAG_ZOOM_MIN} aria-label="Zoom out">
                  <ZoomOut className="size-4" />
                </Button>
                <span className="min-w-12 text-center text-xs tabular-nums text-muted-foreground">{Math.round(ragZoom * 100)}%</span>
                <Button variant="ghost" size="icon-sm" onClick={handleRagZoomIn} disabled={ragZoom >= RAG_ZOOM_MAX} aria-label="Zoom in">
                  <ZoomIn className="size-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleRagZoomReset} disabled={ragZoom === 1}>
                  {t("landing.rag_zoom_reset", "Reset")}
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto rounded-lg border border-border bg-muted/50 p-4" style={{ maxHeight: 'calc(90vh - 120px)' }}>
            <div style={{ transform: `scale(${ragZoom})`, transformOrigin: 'top left', transition: 'transform 0.2s ease', minWidth: '900px' }}>
              <MermaidDiagram chart={RAG_MERMAID_CHART} className="w-full" />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* FAQ */}
      <section
        id="faq"
        aria-labelledby="faq-title"
        className="scroll-mt-20 border-y border-border bg-muted px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
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
        <div className="mx-auto max-w-7xl">
          <Card className="overflow-hidden border-border/80 shadow-sm">
            <CardContent className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[220px_1fr] lg:gap-10">
              <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                <div className="flex size-20 items-center justify-center rounded-2xl bg-primary font-heading text-3xl font-bold text-primary-foreground">
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
        className="scroll-mt-20 border-t border-border bg-muted px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
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

    </div>
  );
};

export default LandingPage;

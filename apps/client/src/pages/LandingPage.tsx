import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useIntl } from "react-intl";
import { Button } from "../ui/Button";
import { DecorBlob, HeroDashboard, ApprovalFlow, EmailToOrderFlow, AiWorkflow } from "./landing-assets";
import "./LandingPage.css";

// ── Contact URLs ──
const CONTACT = {
  email: "mailto:fathoni@example.com",
  whatsapp: "https://wa.me/6281234567890",
  github: "https://github.com/fathoni",
  linkedin: "https://linkedin.com/in/fathoni",
  hire: "https://fathoni.dev/hire",
};

// ── Inline SVG icons (24x24 viewBox, stroke-based) ──
const PATHS: Record<string, string> = {
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  login: "M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3",
  arrowDown: "M12 5v14M19 12l-7 7-7-7",
  user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 7a4 4 0 100 8 4 4 0 000-8z",
  cart: "M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6M9 21a1 1 0 100-2 1 1 0 000 2zM20 21a1 1 0 100-2 1 1 0 000 2z",
  mapPin: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 10a3 3 0 100-6 3 3 0 000 6z",
  medal: "M12 8a7 7 0 100 14 7 7 0 000-14zM8.21 13.89L7 23l5-3 5 3-1.21-9.11",
  checkCircle: "M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01 9 11.01",
  chart: "M18 20V10M12 20V4M6 20v-6",
  mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6L12 13 2 6",
  building: "M4 2h16v20H4zM9 6h.01M15 6h.01M9 10h.01M15 10h.01M9 14h.01M15 14h.01M9 18h6v4H9z",
  docAdd: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M12 18v-6M9 15h6",
  chartBar: "M3 3h18v18H3zM8 16v-3M12 16V10M16 16V8",
  chevronDown: "M6 9l6 6 6-6",
  handShake: "M20.42 4.58a5.4 5.4 0 00-7.65 0l-.77.78-.77-.78a5.4 5.4 0 00-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42zM12 2L8 8l4 4 4-4-4-6z",
  phone: "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z",
  code: "M16 18l6-6-6-6M8 6l-6 6 6 6",
  link: "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
  chat: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
};

const Icon = ({ name, className }: { name: keyof typeof PATHS; className?: string }) => (
  <svg
    className={className}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={PATHS[name]} />
  </svg>
);

const FEATURES = [
  { key: "customers", icon: "user" as const, titleId: "landing.feature_customers_title", descId: "landing.feature_customers_desc" },
  { key: "orders", icon: "cart" as const, titleId: "landing.feature_orders_title", descId: "landing.feature_orders_desc" },
  { key: "visits", icon: "mapPin" as const, titleId: "landing.feature_visits_title", descId: "landing.feature_visits_desc" },
  { key: "programs", icon: "medal" as const, titleId: "landing.feature_programs_title", descId: "landing.feature_programs_desc" },
  { key: "approvals", icon: "checkCircle" as const, titleId: "landing.feature_approvals_title", descId: "landing.feature_approvals_desc" },
  { key: "insight", icon: "chart" as const, titleId: "landing.feature_insight_title", descId: "landing.feature_insight_desc" },
  { key: "email_concierge", icon: "mail" as const, titleId: "landing.feature_email_concierge_title", descId: "landing.feature_email_concierge_desc" },
] as const;

const STEPS = [
  { key: "1", icon: "building" as const, titleId: "landing.step_1_title", descId: "landing.step_1_desc" },
  { key: "2", icon: "docAdd" as const, titleId: "landing.step_2_title", descId: "landing.step_2_desc" },
  { key: "3", icon: "mapPin" as const, titleId: "landing.step_3_title", descId: "landing.step_3_desc" },
  { key: "4", icon: "chartBar" as const, titleId: "landing.step_4_title", descId: "landing.step_4_desc" },
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
  { key: "email", icon: "mail" as const, labelId: "landing.contact_email", href: CONTACT.email },
  { key: "whatsapp", icon: "phone" as const, labelId: "landing.contact_whatsapp", href: CONTACT.whatsapp },
  { key: "github", icon: "code" as const, labelId: "landing.contact_github", href: CONTACT.github },
  { key: "linkedin", icon: "link" as const, labelId: "landing.contact_linkedin", href: CONTACT.linkedin },
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

  const t = (id: string, fallback: string) => intl.formatMessage({ id, defaultMessage: fallback });

  // SEO: set document title + meta description on mount, restore on unmount
  useEffect(() => {
    const prevTitle = document.title;
    const metaEls = Array.from(document.querySelectorAll<HTMLMetaElement>(
      'meta[name="description"], meta[property^="og:"], meta[name^="twitter:"], link[rel="canonical"]',
    ));
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
    setMeta('meta[name="description"]', "content",
      "One platform to manage customers, outlets, sales orders, visits, and approvals. Built with React, tRPC, and PostgreSQL for field teams and back-office.");
    setMeta('meta[property="og:title"]', "content", "ERP Sales — Sales Management Platform");
    setMeta('meta[property="og:description"]', "content",
      "One platform to manage customers, outlets, sales orders, visits, and approvals — built for field teams and back-office alike.");
    setMeta('meta[property="og:type"]', "content", "website");
    setMeta('meta[name="twitter:card"]', "content", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "content", "ERP Sales — Sales Management Platform");
    setMeta('meta[name="twitter:description"]', "content",
      "One platform to manage customers, outlets, sales orders, visits, and approvals — built for field teams and back-office alike.");

    // JSON-LD structured data (SoftwareApplication + Organization)
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
    <div className="landing" data-ai-context={JSON.stringify({ section: "landing" })}>
      {/* ── Hero ── */}
      <header className="landing__hero">
        <div className="landing__aurora" aria-hidden="true" />
        <DecorBlob className="landing__hero-blob landing__hero-blob--1" variant="a" />
        <DecorBlob className="landing__hero-blob landing__hero-blob--2" variant="b" />
        <div className="landing__hero-inner">
          <div className="landing__hero-copy">
            <span className="landing__badge reveal stagger-1">
              <Icon name="star" />
              {t("landing.badge", "ERP SALES")}
            </span>
            <h1 className="landing__title reveal stagger-2">{t("landing.hero_title", "Sales Management, Reimagined")}</h1>
            <p className="landing__desc reveal stagger-3">{t("landing.hero_subtitle", "One platform to manage customers, outlets, sales orders, visits, and approvals.")}</p>
            <div className="landing__actions reveal stagger-4">
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate("/login")}
                leftIcon={<Icon name="login" />}
              >
                {t("landing.cta_primary", "Sign In")}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => scrollTo("features")}
                rightIcon={<Icon name="arrowDown" />}
              >
                {t("landing.cta_secondary", "Learn More")}
              </Button>
            </div>
          </div>
          <div className="landing__hero-art reveal stagger-3">
            <HeroDashboard className="landing__hero-dashboard" />
          </div>
        </div>
        <div className="landing__scroll-hint" aria-hidden="true">
          <Icon name="arrowDown" />
        </div>
      </header>

      <main className="landing__main">
        {/* ── Features ── */}
        <section className="landing__features" id="features" aria-labelledby="features-title">
          <div className="landing__features-head">
            <h2 id="features-title" className="landing__features-title reveal stagger-1">{t("landing.features_title", "Everything your sales operation needs")}</h2>
            <p className="landing__features-sub reveal stagger-2">{t("landing.features_subtitle", "From the first customer touch to the final approval.")}</p>
          </div>
          <div className="landing__grid">
            {FEATURES.map((f, i) => (
              <article className={`landing__card reveal stagger-${i + 1}`} key={f.key}>
                <span className="landing__card-icon" aria-hidden="true">
                  <Icon name={f.icon} />
                </span>
                <h3 className="landing__card-title">{t(f.titleId, f.key)}</h3>
                <p className="landing__card-desc">{t(f.descId, "")}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── How It Works ── */}
        <section className="landing__how" id="how-it-works" aria-labelledby="how-title">
          <div className="landing__how-head">
            <h2 id="how-title" className="landing__how-title reveal stagger-1">{t("landing.how_it_works_title", "How It Works")}</h2>
            <p className="landing__how-sub reveal stagger-2">{t("landing.how_it_works_subtitle", "Four steps from setup to insight.")}</p>
          </div>
          <div className="landing__steps">
            {STEPS.map((step, i) => (
              <div className={`landing__step reveal stagger-${i + 1}`} key={step.key}>
                <div className="landing__step-badge">
                  <span className="landing__step-num">{i + 1}</span>
                  <span className="landing__step-icon" aria-hidden="true">
                    <Icon name={step.icon} />
                  </span>
                </div>
                <h3 className="landing__step-title">{t(step.titleId, "")}</h3>
                <p className="landing__step-desc">{t(step.descId, "")}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Approval Workflow ── */}
        <section className="landing__workflow" id="workflow" aria-labelledby="workflow-title">
          <div className="landing__workflow-inner">
            <div className="landing__workflow-copy reveal reveal--slideInLeft">
              <span className="landing__eyebrow">{t("landing.workflow_eyebrow", "Governance")}</span>
              <h2 id="workflow-title" className="landing__workflow-title">{t("landing.workflow_title", "Approval, with a paper trail")}</h2>
              <p className="landing__workflow-sub">{t("landing.workflow_subtitle", "Every document moves through a clear, multi-level workflow. An AI reviews each order before it can be proposed, and every transition is logged with who, when, and why — so nothing slips through unnoticed.")}</p>
              <ul className="landing__workflow-list">
                <li><Icon name="checkCircle" />{t("landing.workflow_point_1", "Draft → AI review → Proposed → Approved or Rejected")}</li>
                <li><Icon name="checkCircle" />{t("landing.workflow_point_2", "LLM checks pricing, quantity & discount risk")}</li>
                <li><Icon name="checkCircle" />{t("landing.workflow_point_3", "Full audit trail on every transition")}</li>
              </ul>
            </div>
            <div className="landing__workflow-art reveal reveal--slideInRight stagger-2">
              <ApprovalFlow className="landing__workflow-diagram" />
            </div>
          </div>
        </section>

        {/* ── Email-to-Order Automation ── */}
        <section className="landing__automation" id="automation" aria-labelledby="automation-title">
          <div className="landing__automation-inner">
            <div className="landing__automation-art reveal reveal--slideInLeft">
              <EmailToOrderFlow className="landing__automation-diagram" />
            </div>
            <div className="landing__automation-copy reveal reveal--slideInRight stagger-2">
              <span className="landing__eyebrow">{t("landing.automation_eyebrow", "Automation")}</span>
              <h2 id="automation-title" className="landing__automation-title">{t("landing.automation_title", "Orders that file themselves")}</h2>
              <p className="landing__automation-sub">{t("landing.automation_subtitle", "Customers email their orders. An n8n workflow parses the message, creates a draft sales order, and routes it straight into your approval pipeline — zero manual entry.")}</p>
              <ul className="landing__automation-list">
                <li><Icon name="mail" />{t("landing.automation_point_1", "Inbound email → webhook trigger")}</li>
                <li><Icon name="code" />{t("landing.automation_point_2", "n8n parses and validates the order")}</li>
                <li><Icon name="cart" />{t("landing.automation_point_3", "Draft sales order, ready to approve")}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── AI / LLM Features ── */}
        <section className="landing__ai" id="ai" aria-labelledby="ai-title">
          <div className="landing__ai-inner">
            <div className="landing__ai-copy reveal reveal--slideInLeft">
              <span className="landing__eyebrow">{t("landing.ai_eyebrow", "Built-in AI")}</span>
              <h2 id="ai-title" className="landing__ai-title">{t("landing.ai_title", "An AI assistant that actually does the work")}</h2>
              <p className="landing__ai-sub">{t("landing.ai_subtitle", "A streaming LLM engine sits inside the app — grounded in your docs via RAG and wired to real tools, so it answers, navigates, and drafts instead of just chatting.")}</p>
              <ul className="landing__ai-list">
                <li><Icon name="chat" />{t("landing.ai_point_1", "Chat with RAG over your knowledge base")}</li>
                <li><Icon name="docAdd" />{t("landing.ai_point_2", "Extract orders from free-text or email")}</li>
                <li><Icon name="chartBar" />{t("landing.ai_point_3", "Ask data in plain language → read-only SQL")}</li>
                <li><Icon name="checkCircle" />{t("landing.ai_point_4", "Auto-summarize pages & draft follow-ups")}</li>
              </ul>
            </div>
            <div className="landing__ai-art reveal reveal--slideInRight stagger-2">
              <AiWorkflow className="landing__ai-diagram" />
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="landing__faq" id="faq" aria-labelledby="faq-title">
          <div className="landing__faq-head">
            <h2 id="faq-title" className="landing__faq-title reveal stagger-1">{t("landing.faq_title", "Frequently Asked Questions")}</h2>
          </div>
          <div className="landing__faq-list">
            {FAQS.map((faq, i) => (
              <details className={`landing__faq-item reveal stagger-${i + 1}`} key={faq.key}>
                <summary className="landing__faq-q">
                  <span>{t(faq.qId, "")}</span>
                  <span className="landing__faq-chevron" aria-hidden="true">
                    <Icon name="chevronDown" />
                  </span>
                </summary>
                <p className="landing__faq-a">{t(faq.aId, "")}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── About the Developer ── */}
        <section className="landing__about" id="about" aria-labelledby="about-title">
          <div className="landing__about-card">
            <div className="landing__about-left reveal reveal--slideInLeft">
              <div className="landing__about-avatar" aria-hidden="true">
                <span>F</span>
              </div>
              <h3 className="landing__about-name">{t("landing.about_name", "Fathoni")}</h3>
              <p className="landing__about-role">{t("landing.about_role", "Full-Stack Developer & ERP Specialist")}</p>
            </div>
            <div className="landing__about-right reveal reveal--slideInRight stagger-2">
              <h2 id="about-title" className="landing__about-title">{t("landing.about_title", "About the Developer")}</h2>
              <p className="landing__about-bio">{t("landing.about_bio", "")}</p>
              <div className="landing__about-skills">
                {SKILLS.map((skill) => (
                  <span className="landing__about-chip" key={skill}>{skill}</span>
                ))}
              </div>
              <a
                href={CONTACT.hire}
                target="_blank"
                rel="noopener noreferrer"
                className="landing__about-cta"
              >
                <Icon name="handShake" />
                {t("landing.about_hire_cta", "Hire Me")}
              </a>
            </div>
          </div>
        </section>

        {/* ── Contact ── */}
        <section className="landing__contact" id="contact" aria-labelledby="contact-title">
          <div className="landing__contact-head">
            <h2 id="contact-title" className="landing__contact-title reveal stagger-1">{t("landing.contact_title", "Get in Touch")}</h2>
            <p className="landing__contact-sub reveal stagger-2">{t("landing.contact_subtitle", "Have questions? Reach out.")}</p>
          </div>
          <div className="landing__contact-grid">
            {CONTACT_ITEMS.map((item, i) => (
              <a
                className={`landing__contact-card reveal stagger-${i + 1}`}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                key={item.key}
              >
                <span className="landing__card-icon" aria-hidden="true">
                  <Icon name={item.icon} />
                </span>
                <span className="landing__contact-label">{t(item.labelId, "")}</span>
              </a>
            ))}
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="landing__footer">
        <div className="landing__footer-inner">
          <div className="landing__footer-links">
            {FOOTER_LINKS.map((link) =>
              link.isRoute ? (
                <a
                  key={link.key}
                  className="landing__footer-link"
                  href={link.href}
                  onClick={(e) => { e.preventDefault(); navigate(link.href); }}
                >
                  {t(link.labelId, "")}
                </a>
              ) : (
                <a
                  key={link.key}
                  className="landing__footer-link"
                  href={link.href}
                >
                  {t(link.labelId, "")}
                </a>
              ),
            )}
          </div>
          <div className="landing__footer-info">
            <p className="landing__footer-tagline">{t("landing.footer_tagline", "ERP Sales — the operating system for your sales team.")}</p>
            <p className="landing__footer-credit">
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

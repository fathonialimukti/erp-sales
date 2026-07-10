import { useNavigate } from "react-router";
import { useIntl } from "react-intl";
import { Icon } from "../ui";
import { Button } from "../ui/Button";
import "./LandingPage.css";

const FEATURES = [
  {
    key: "customers",
    icon: "solar:user-bold",
    titleId: "landing.feature_customers_title",
    descId: "landing.feature_customers_desc",
  },
  {
    key: "orders",
    icon: "solar:cart-large-2-bold",
    titleId: "landing.feature_orders_title",
    descId: "landing.feature_orders_desc",
  },
  {
    key: "visits",
    icon: "solar:map-point-bold",
    titleId: "landing.feature_visits_title",
    descId: "landing.feature_visits_desc",
  },
  {
    key: "programs",
    icon: "solar:medal-ribbon-bold",
    titleId: "landing.feature_programs_title",
    descId: "landing.feature_programs_desc",
  },
  {
    key: "approvals",
    icon: "solar:check-circle-bold",
    titleId: "landing.feature_approvals_title",
    descId: "landing.feature_approvals_desc",
  },
  {
    key: "insight",
    icon: "solar:chart-2-bold",
    titleId: "landing.feature_insight_title",
    descId: "landing.feature_insight_desc",
  },
] as const;

export const LandingPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();

  const t = (id: string, fallback: string) => intl.formatMessage({ id, defaultMessage: fallback });

  return (
    <div className="landing" data-ai-context={JSON.stringify({ section: "landing" })}>
      {/* ── Hero ── */}
      <header className="landing__hero">
        <div className="landing__aurora" aria-hidden="true" />
        <div className="landing__hero-inner">
          <span className="landing__badge">
            <Icon icon="solar:star-bold" />
            {t("landing.badge", "ERP SALES")}
          </span>
          <h1 className="landing__title">{t("landing.hero_title", "Sales Management, Reimagined")}</h1>
          <p className="landing__desc">{t("landing.hero_subtitle", "One platform to manage customers, outlets, sales orders, visits, and approvals.")}</p>
          <div className="landing__actions">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate("/login")}
              leftIcon={<Icon icon="solar:login-3-linear" />}
            >
              {t("landing.cta_primary", "Sign In")}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                const el = document.getElementById("features");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              rightIcon={<Icon icon="solar:arrow-down-linear" />}
            >
              {t("landing.cta_secondary", "Learn More")}
            </Button>
          </div>
        </div>
      </header>

      {/* ── Features ── */}
      <section className="landing__features" id="features">
        <div className="landing__features-head">
          <h2 className="landing__features-title">{t("landing.features_title", "Everything your sales operation needs")}</h2>
          <p className="landing__features-sub">{t("landing.features_subtitle", "From the first customer touch to the final approval.")}</p>
        </div>
        <div className="landing__grid">
          {FEATURES.map((f) => (
            <article className="landing__card" key={f.key}>
              <span className="landing__card-icon" aria-hidden="true">
                <Icon icon={f.icon} />
              </span>
              <h3 className="landing__card-title">{t(f.titleId, f.key)}</h3>
              <p className="landing__card-desc">{t(f.descId, "")}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing__footer">
        <p>{t("landing.footer_tagline", "ERP Sales — the operating system for your sales team.")}</p>
      </footer>
    </div>
  );
};

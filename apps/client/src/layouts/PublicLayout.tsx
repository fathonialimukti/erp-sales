import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { useIntl } from "react-intl";
import { Globe, LogIn, Menu, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useLocale } from "@/lib/useLocale";
import { type Locale } from "@/lib/i18n";
import { isLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";

const LOCALE_OPTIONS: Array<{ value: Locale; label: string }> = [
  { value: "en", label: "English" },
  { value: "id", label: "Bahasa Indonesia" },
];

const NAV_LINKS = [
  {
    key: "features",
    labelId: "landing.footer_features",
    hash: "features",
  },
  {
    key: "workflow",
    labelId: "landing.how_it_works_title",
    hash: "how-it-works",
  },
  {
    key: "faq",
    labelId: "landing.footer_faq",
    hash: "faq",
  },
  {
    key: "contact",
    labelId: "landing.footer_contact",
    hash: "contact",
  },
] as const;

const FOOTER_LINKS = [
  {
    key: "features",
    labelId: "landing.footer_features",
    hash: "features",
    isRoute: false,
  },
  {
    key: "faq",
    labelId: "landing.footer_faq",
    hash: "faq",
    isRoute: false,
  },
  {
    key: "contact",
    labelId: "landing.footer_contact",
    hash: "contact",
    isRoute: false,
  },
  {
    key: "signin",
    labelId: "landing.footer_sign_in",
    href: "/login",
    isRoute: true,
  },
] as const;

export const PublicLayout = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const location = useLocation();
  const { locale, setLocale } = useLocale();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLogin = location.pathname.startsWith("/login");
  const isLanding =
    location.pathname === "/" || location.pathname === "/landing-v1";

  const t = (id: string, fallback: string) =>
    intl.formatMessage({ id, defaultMessage: fallback });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!isLanding || !location.hash) return;
    const id = location.hash.replace("#", "");
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [isLanding, location.hash]);

  const scrollToHash = (hash: string) => {
    if (!isLanding) {
      navigate(`/#${hash}`);
      return;
    }
    const el = document.getElementById(hash);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState(null, "", `#${hash}`);
      return;
    }
    navigate(`/#${hash}`);
  };

  return (
    <div
      className="flex min-h-dvh flex-col bg-background text-foreground"
      data-ai-context={JSON.stringify({
        section: "public-layout",
        path: location.pathname,
      })}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-100 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        {t("landing.skip_to_content", "Skip to content")}
      </a>

      <header
        className={cn(
          "sticky top-0 z-50 border-b transition-[background-color,box-shadow,border-color] duration-200 motion-reduce:transition-none",
          scrolled
            ? "border-border/80 bg-background/90 shadow-sm backdrop-blur-md supports-backdrop-filter:bg-background/75"
            : "border-transparent bg-background/70 backdrop-blur-sm supports-backdrop-filter:bg-background/55",
        )}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="group flex min-h-11 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/25 transition-transform group-hover:scale-[1.02]">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <span className="font-heading text-sm font-semibold tracking-tight sm:text-base">
              ERP Sales
            </span>
          </Link>

          {!isLogin && (
            <nav
              className="hidden items-center gap-1 md:flex"
              aria-label={t("landing.nav_primary", "Primary")}
            >
              {NAV_LINKS.map((link) => (
                <button
                  key={link.key}
                  type="button"
                  onClick={() => scrollToHash(link.hash)}
                  className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  {t(link.labelId, link.key)}
                </button>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1.5 sm:flex">
              <Globe
                className="size-3.5 text-muted-foreground"
                aria-hidden="true"
              />
              <Select
                value={locale}
                onValueChange={(next) => {
                  if (isLocale(next)) setLocale(next);
                }}
              >
                <SelectTrigger
                  aria-label={t("login.language_label", "Language")}
                  className="h-9 w-[9.5rem] bg-card/70"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCALE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!isLogin && (
              <Button
                size="lg"
                className="hidden min-h-11 px-4 sm:inline-flex"
                onClick={() => navigate("/login")}
              >
                <LogIn className="size-4" />
                {t("landing.footer_sign_in", "Sign In")}
              </Button>
            )}

            {isLogin && (
              <Button
                size="lg"
                variant="outline"
                className="hidden min-h-11 px-4 sm:inline-flex"
                onClick={() => navigate("/")}
              >
                {t("landing.nav_home", "Home")}
              </Button>
            )}

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon-lg"
                  className="min-h-11 min-w-11 md:hidden"
                  aria-label={t("landing.nav_open_menu", "Open menu")}
                >
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[min(100%,20rem)] p-0">
                <SheetHeader className="border-b border-border px-5 py-5 text-left">
                  <SheetTitle className="font-heading text-base">
                    ERP Sales
                  </SheetTitle>
                  <SheetDescription>
                    {t(
                      "landing.nav_menu_desc",
                      "Navigate the product overview or sign in.",
                    )}
                  </SheetDescription>
                </SheetHeader>

                <div className="flex flex-col gap-1 p-3">
                  {!isLogin &&
                    NAV_LINKS.map((link) => (
                      <button
                        key={link.key}
                        type="button"
                        onClick={() => {
                          setMobileOpen(false);
                          scrollToHash(link.hash);
                        }}
                        className="inline-flex min-h-11 items-center rounded-lg px-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      >
                        {t(link.labelId, link.key)}
                      </button>
                    ))}

                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        navigate("/");
                      }}
                      className="inline-flex min-h-11 items-center rounded-lg px-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      {t("landing.nav_home", "Home")}
                    </button>
                  )}

                  <Separator className="my-2" />

                  <div className="flex items-center gap-2 px-3 py-2">
                    <Globe
                      className="size-3.5 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Select
                      value={locale}
                      onValueChange={(next) => {
                        if (isLocale(next)) setLocale(next);
                      }}
                    >
                      <SelectTrigger
                        aria-label={t("login.language_label", "Language")}
                        className="h-10 w-full bg-card"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LOCALE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {!isLogin && (
                    <Button
                      size="lg"
                      className="mt-2 min-h-11"
                      onClick={() => {
                        setMobileOpen(false);
                        navigate("/login");
                      }}
                    >
                      <LogIn className="size-4" />
                      {t("landing.footer_sign_in", "Sign In")}
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main id="main-content" className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>

      {!isLogin && (
        <footer className="mt-auto border-t border-border bg-card px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-sm space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/20">
                    <Sparkles className="size-4" aria-hidden="true" />
                  </span>
                  <span className="font-heading text-sm font-semibold tracking-tight">
                    ERP Sales
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t(
                    "landing.footer_tagline",
                    "ERP Sales — the operating system for your sales team.",
                  )}
                </p>
              </div>

              <nav
                className="flex flex-wrap gap-x-5 gap-y-2"
                aria-label={t("landing.nav_footer", "Footer")}
              >
                {FOOTER_LINKS.map((link) =>
                  link.isRoute ? (
                    <Link
                      key={link.key}
                      to={link.href}
                      className="inline-flex min-h-11 items-center text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      {t(link.labelId, link.key)}
                    </Link>
                  ) : (
                    <button
                      key={link.key}
                      type="button"
                      onClick={() => scrollToHash(link.hash)}
                      className="inline-flex min-h-11 items-center text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      {t(link.labelId, link.key)}
                    </button>
                  ),
                )}
              </nav>
            </div>

            <Separator />

            <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p>
                {t("landing.footer_built_by", "Built by Fathoni")}
                {" · "}
                {t(
                  "landing.footer_copyright",
                  "© 2026 ERP Sales. All rights reserved.",
                )}
              </p>
              <p className="text-xs sm:text-sm">
                {t("landing.v2.cta_badge", "Aurora Commerce")}
              </p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

import { useId, useLayoutEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { ArrowRight, ChevronDown } from "lucide-react";
import type { DemoUser } from "@repo/schemas/auth";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface DemoUserCardProps {
  user: DemoUser;
  /** True while this card's login request is in flight. */
  pending: boolean;
  /** True while any login request is in flight (locks the whole list). */
  disabled: boolean;
  onSelect: (userId: string) => void;
}

/**
 * Role story copy keyed by role slug — data, not translated.
 * Mirrors the server seed texts (T20) so the card reads the same with or
 * without a DB description.
 */
const ABOUT_TEXT_BY_SLUG: Record<string, string> = {
  "system-admin": "Full access to users, roles, and every workflow.",
  "demo-manager": "Runs the sales operation: reviews, validates, and approves team orders.",
  "demo-supervisor": "Supervises the team: proposes and validates orders, but never approves.",
  "demo-salesperson": "Field account: creates own sales orders and records visits.",
  "demo-inbound-staff": "Receiving only: records incoming goods, no pricing or sales orders.",
};

const GENERIC_ABOUT_DEFAULT =
  "General workspace access. Explore the workspace as this account.";

const toRoleSlug = (role: string): string => role.toLowerCase().replace(/\s+/g, "-");

export const DemoUserCard = ({ user, pending, disabled, onSelect }: DemoUserCardProps) => {
  const intl = useIntl();
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const aboutRef = useRef<HTMLParagraphElement>(null);
  const aboutId = useId();
  const initial = user.name.trim().charAt(0).toUpperCase() || "•";
  const roleLabel = intl.formatMessage({ id: "demo.role", defaultMessage: "Role" });
  const aboutLabel = intl.formatMessage({
    id: "demo.about.title",
    defaultMessage: "About this user",
  });

  const roleSlug = toRoleSlug(user.role);
  const genericText = intl.formatMessage({
    id: "demo.about.generic",
    defaultMessage: GENERIC_ABOUT_DEFAULT,
  });
  const fallbackText = ABOUT_TEXT_BY_SLUG[roleSlug] ?? genericText;
  // Fallback chain: server description → role slug map → generic chrome copy.
  const description = user.description?.trim() ? user.description : fallbackText;

  // Show the trigger only when the clamped text really overflows 3 lines.
  // Measured while collapsed: scrollHeight reports full height even under
  // line-clamp, clientHeight is the 3-line box. Re-measures on width/font
  // changes via ResizeObserver so the toggle stays accurate across reflows.
  useLayoutEffect(() => {
    const el = aboutRef.current;
    if (!el || expanded) return;
    const measure = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [description, expanded]);

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-heading text-lg font-bold text-primary"
          >
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            <div className="mt-2">
              <Badge variant="secondary" aria-label={`${roleLabel}: ${user.role}`}>
                {user.role}
              </Badge>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-3">
          <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
            {aboutLabel}
          </p>
          <p
            ref={aboutRef}
            id={aboutId}
            className={cn(
              "mt-1 text-sm font-normal leading-relaxed text-foreground",
              !expanded && "line-clamp-3",
            )}
            {...(expanded ? { role: "region", "aria-label": aboutLabel } : {})}
          >
            {description}
          </p>

          {overflows || expanded ? (
            <Button
              type="button"
              variant="ghost"
              className="mt-1 min-h-[44px] w-full justify-between px-2 text-primary"
              aria-expanded={expanded}
              aria-controls={aboutId}
              onClick={() => setExpanded((open) => !open)}
            >
              {expanded
                ? intl.formatMessage({ id: "demo.showLess", defaultMessage: "Show less" })
                : intl.formatMessage({ id: "demo.showMore", defaultMessage: "Show more" })}
              <ChevronDown
                aria-hidden
                className={cn(
                  "size-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none",
                  expanded && "rotate-180",
                )}
              />
            </Button>
          ) : null}
        </div>
      </CardContent>

      <CardFooter>
        <Button
          type="button"
          className="min-h-[44px] w-full"
          disabled={disabled}
          aria-busy={pending}
          onClick={() => onSelect(user.id)}
        >
          {pending ? (
            <>
              <Spinner />
              {intl.formatMessage({
                id: "demo.loggingIn",
                defaultMessage: "Signing in…",
              })}
            </>
          ) : (
            <>
              <ArrowRight className="size-4" />
              {intl.formatMessage(
                { id: "demo.loginAs", defaultMessage: "Continue as {name}" },
                { name: user.name },
              )}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};
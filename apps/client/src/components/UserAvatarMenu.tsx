import { useAtomValue } from "jotai";
import { ChevronUp } from "lucide-react";
import { useIntl } from "react-intl";

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { authUserAtom } from "@/lib/atoms";
import { UserMenuTrigger } from "./UserMenuPopover";

interface UserAvatarMenuProps {
  variant: "sidebar" | "topbar";
  className?: string;
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

/**
 * P12 single-surface avatar trigger.
 * Always wraps `UserMenuTrigger` so `user-menu-anchor` still fires for the
 * shared `UserMenuPopover` host in PrivateLayout.
 */
export const UserAvatarMenu = ({ variant, className }: UserAvatarMenuProps) => {
  const intl = useIntl();
  const user = useAtomValue(authUserAtom);

  if (!user) return null;

  const menuLabel = intl.formatMessage({
    id: "user.menu.label",
    defaultMessage: "User menu",
  });
  const ariaLabel = `${user.name} — ${menuLabel}`;

  if (variant === "topbar") {
    return (
      <UserMenuTrigger
        className={cn(
          "inline-flex size-9 cursor-pointer items-center justify-center rounded-full outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
        aria-label={ariaLabel}
      >
        <Avatar size="default" className="size-8">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {initialsOf(user.name)}
          </AvatarFallback>
        </Avatar>
      </UserMenuTrigger>
    );
  }

  return (
    <UserMenuTrigger
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-xl border border-transparent bg-card/60 px-2.5 py-2 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      aria-label={ariaLabel}
    >
      <Avatar size="default" className="size-9">
        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
          {initialsOf(user.name)}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">
          {user.name}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {user.roleName}
        </span>
      </span>
      <ChevronUp
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden
      />
    </UserMenuTrigger>
  );
};

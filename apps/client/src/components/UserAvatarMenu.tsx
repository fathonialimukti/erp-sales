import { useAtomValue } from "jotai";
import { ChevronUp, LogOut, Settings, User } from "lucide-react";
import { useIntl } from "react-intl";
import { useNavigate } from "react-router";

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authUserAtom } from "@/lib/atoms";
import { initialsOf } from "@/lib/initials";
import { useAuthActions } from "@/lib/useAuth";
import { cn } from "@/lib/utils";

interface UserAvatarMenuProps {
  variant: "sidebar" | "topbar";
  /** Icon-only chrome for collapsed sidebar rail. */
  compact?: boolean;
  className?: string;
}

/**
 * P12 single-surface avatar menu.
 * Radix DropdownMenu anchors to the visible trigger with `align="end"`.
 */
export const UserAvatarMenu = ({
  variant,
  compact = false,
  className,
}: UserAvatarMenuProps) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const user = useAtomValue(authUserAtom);
  const { logout } = useAuthActions();

  if (!user) return null;

  const menuLabel = intl.formatMessage({
    id: "user.menu.label",
    defaultMessage: "User menu",
  });
  const ariaLabel = `${user.name} — ${menuLabel}`;

  const handleProfile = () => {
    navigate("/users");
  };

  const handleSettings = () => {
    navigate("/users");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const trigger =
    variant === "topbar" || compact ? (
      <button
        type="button"
        className={cn(
          "inline-flex size-9 cursor-pointer items-center justify-center rounded-full outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
        aria-label={ariaLabel}
        data-user-menu-trigger=""
      >
        <Avatar size="default" className="size-8">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {initialsOf(user.name)}
          </AvatarFallback>
        </Avatar>
      </button>
    ) : (
      <button
        type="button"
        className={cn(
          "flex w-full cursor-pointer items-center gap-3 rounded-xl border border-transparent bg-card px-2.5 py-2 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
        aria-label={ariaLabel}
        data-user-menu-trigger=""
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
      </button>
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side={variant === "sidebar" ? "top" : "bottom"}
        sideOffset={8}
        className="z-1100 w-60 min-w-60 p-1.5"
        aria-label={menuLabel}
      >
        <DropdownMenuLabel className="flex items-center gap-2.5 px-2.5 py-2.5 font-normal">
          <Avatar size="default" className="size-9">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {initialsOf(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-semibold text-foreground">
              {user.name}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {user.roleName}
            </span>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="cursor-pointer gap-2.5 px-2.5 py-2 text-sm font-medium"
          onSelect={handleProfile}
        >
          <span className="inline-flex size-7 items-center justify-center rounded-lg bg-violet-500 text-white">
            <User className="size-3.5" aria-hidden />
          </span>
          {intl.formatMessage({
            id: "user.menu.profile",
            defaultMessage: "Profile",
          })}
        </DropdownMenuItem>

        <DropdownMenuItem
          className="cursor-pointer gap-2.5 px-2.5 py-2 text-sm font-medium"
          onSelect={handleSettings}
        >
          <span className="inline-flex size-7 items-center justify-center rounded-lg bg-blue-500 text-white">
            <Settings className="size-3.5" aria-hidden />
          </span>
          {intl.formatMessage({
            id: "user.menu.settings",
            defaultMessage: "Settings",
          })}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          className="cursor-pointer gap-2.5 px-2.5 py-2 text-sm font-medium"
          onSelect={() => {
            void handleLogout();
          }}
        >
          <span className="inline-flex size-7 items-center justify-center rounded-lg bg-red-500 text-white">
            <LogOut className="size-3.5" aria-hidden />
          </span>
          {intl.formatMessage({
            id: "nav.logout",
            defaultMessage: "Log out",
          })}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

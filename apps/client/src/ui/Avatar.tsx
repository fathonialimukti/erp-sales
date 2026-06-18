import { cn } from "./cn";

interface AvatarProps {
  name?: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE = {
  sm: "h-7 w-7 text-[11px]",
  md: "h-9 w-9 text-xs",
  lg: "h-11 w-11 text-sm",
};

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "?";

export const Avatar = ({ name = "", src, size = "md", className }: AvatarProps) => {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(
          "rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700",
          SIZE[size],
          className,
        )}
      />
    );
  }
  return (
    <span
      aria-label={name || "avatar"}
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-accent-100 font-semibold text-accent-700 ring-1 ring-accent-200",
        "dark:bg-accent-900/40 dark:text-accent-200 dark:ring-accent-800",
        SIZE[size],
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
};

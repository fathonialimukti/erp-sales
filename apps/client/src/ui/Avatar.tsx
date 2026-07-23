import {
  Avatar as ShadAvatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AvatarProps {
  name?: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = { sm: "sm", md: "default", lg: "lg" } as const;

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "?";

export const Avatar = ({ name = "", src, size = "md", className }: AvatarProps) => (
  <ShadAvatar size={SIZE_MAP[size]} className={cn(className)}>
    {src ? <AvatarImage src={src} alt={name} /> : null}
    <AvatarFallback>{initialsOf(name)}</AvatarFallback>
  </ShadAvatar>
);

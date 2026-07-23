import { Camera } from "lucide-react";

import { cn } from "@/lib/utils";

interface EntityPhotoProps {
  src?: string | null;
  alt: string;
  className?: string;
  /** @deprecated Iconify name kept for API compat; Lucide Camera is used. */
  icon?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASS = {
  sm: "size-10 rounded-lg",
  md: "size-14 rounded-xl",
  lg: "size-20 rounded-xl",
} as const;

export const EntityPhoto = ({
  src,
  alt,
  className,
  size = "md",
}: EntityPhotoProps) => {
  // If className sets size (e.g. upload preview), skip default size tokens
  const sizeClass = className ? undefined : SIZE_CLASS[size];

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn(
          "object-cover",
          sizeClass ?? "rounded-xl",
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center bg-muted text-muted-foreground",
        sizeClass ?? "rounded-xl",
        className,
      )}
      aria-label={alt}
      role="img"
    >
      <Camera className="size-5" aria-hidden />
    </div>
  );
};

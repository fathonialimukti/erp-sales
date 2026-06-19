import "./Avatar.css";

interface AvatarProps {
  name?: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASS: Record<string, string> = { sm: "av--sm", md: "av--md", lg: "av--lg" };

const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("") || "?";

export const Avatar = ({ name = "", src, size = "md", className }: AvatarProps) => {
  const sizeClass = SIZE_CLASS[size];
  if (src) {
    return <img src={src} alt={name} className={`av av--image ${sizeClass} ${className ?? ""}`} />;
  }
  return (
    <span aria-label={name || "avatar"} className={`av av--initials ${sizeClass} ${className ?? ""}`}>
      {initialsOf(name)}
    </span>
  );
};

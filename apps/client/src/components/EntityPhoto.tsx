import { Icon } from "../ui";
import "./EntityPhoto.css";

interface EntityPhotoProps {
  src?: string | null;
  alt: string;
  className?: string;
  icon?: string;
}

const SIZE_CLASS: Record<string, string> = {
  sm: "ep--sm",
  md: "ep--md",
  lg: "ep--lg",
};

export const EntityPhoto = ({
  src,
  alt,
  className,
  icon = "solar:camera-linear",
}: EntityPhotoProps) => {
  // Default to medium size
  const sizeClass = className ? "" : SIZE_CLASS.md;

  if (src) {
    return <img src={src} alt={alt} className={`ep ${sizeClass}`} style={{ objectFit: "cover" }} />;
  }
  return (
    <div className={`ep ep--fallback ${sizeClass}`} aria-label={alt}>
      <Icon icon={icon} className="ep__icon" />
    </div>
  );
};

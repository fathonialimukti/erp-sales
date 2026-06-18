import { Icon } from "../ui";

interface EntityPhotoProps {
  src?: string | null;
  alt: string;
  className?: string;
  icon?: string;
}

export const EntityPhoto = ({
  src,
  alt,
  className = "h-14 w-14 rounded-2xl",
  icon = "solar:camera-linear",
}: EntityPhotoProps) => {
  if (src) {
    return <img src={src} alt={alt} className={`${className} object-cover`} />;
  }
  return (
    <div
      className={`${className} flex items-center justify-center bg-slate-100 text-slate-400 dark:bg-slate-800`}
      aria-label={alt}
    >
      <Icon icon={icon} className="h-5 w-5" />
    </div>
  );
};

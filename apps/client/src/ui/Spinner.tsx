import "./Spinner.css";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const SIZE_CLASS: Record<string, string> = { sm: "spin--sm", md: "spin--md", lg: "spin--lg" };

export const Spinner = ({ size = "md", className, label }: SpinnerProps) => (
  <span role="status" aria-label={label ?? "Loading"} className={`spin-wrapper ${className ?? ""}`}>
    <span className={`spin ${SIZE_CLASS[size]}`} />
  </span>
);

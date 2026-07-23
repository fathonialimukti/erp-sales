import type { ChangeEvent, TextareaHTMLAttributes } from "react";
import { forwardRef } from "react";
import { Textarea as ShadTextarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  onValueChange?: (value: string) => void;
  onChange?: (event: ChangeEvent<HTMLTextAreaElement>) => void;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ id, className, rows = 4, onValueChange, onChange, ...rest }, ref) => {
    const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(event);
      onValueChange?.(event.target.value);
    };

    return (
      <ShadTextarea
        ref={ref}
        id={id}
        rows={rows}
        className={cn(className)}
        onChange={handleChange}
        {...rest}
      />
    );
  },
);
Textarea.displayName = "Textarea";

import type { ChangeEvent, InputHTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";
import { Input as ShadInput } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onValueChange?: (value: string) => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ leftIcon, rightIcon, id, onValueChange, onChange, className, ...rest }, ref) => {
    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      onChange?.(event);
      onValueChange?.(event.target.value);
    };

    if (!leftIcon && !rightIcon) {
      return (
        <ShadInput ref={ref} id={id} className={className} onChange={handleChange} {...rest} />
      );
    }

    return (
      <div
        className={cn(
          "relative flex w-full items-center",
          rest.disabled && "opacity-50",
        )}
      >
        {leftIcon ? (
          <span className="pointer-events-none absolute left-2.5 inline-flex text-muted-foreground [&_svg]:size-4">
            {leftIcon}
          </span>
        ) : null}
        <ShadInput
          ref={ref}
          id={id}
          className={cn(leftIcon && "pl-8", rightIcon && "pr-8", className)}
          onChange={handleChange}
          {...rest}
        />
        {rightIcon ? (
          <span className="pointer-events-none absolute right-2.5 inline-flex text-muted-foreground [&_svg]:size-4">
            {rightIcon}
          </span>
        ) : null}
      </div>
    );
  },
);
Input.displayName = "Input";

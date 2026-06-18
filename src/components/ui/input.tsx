import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-ena-light">
            {label}
          </label>
        )}
        <input
          id={id}
          className={cn(
            "block w-full rounded border border-ena-border bg-ena-card/50 px-3 py-2.5 text-sm text-ena-text shadow-sm placeholder:text-ena-text-muted/50 focus:border-ena-text/40 focus:outline-none focus:ring-1 focus:ring-ena-border",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500",
            className,
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="text-sm text-ena-primary">{error}</p>}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };

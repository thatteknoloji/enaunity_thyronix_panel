import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center rounded font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-ena-dark disabled:pointer-events-none disabled:opacity-50 cursor-pointer text-ena-text",
          {
            "bg-ena-primary text-white hover:brightness-90 focus:ring-ena-primary": variant === "primary",
            "bg-ena-card/50 text-ena-text hover:bg-ena-card/70 focus:ring-ena-border": variant === "secondary",
            "border border-ena-border bg-transparent text-ena-text hover:bg-ena-card/50 focus:ring-ena-border": variant === "outline",
            "text-ena-light hover:bg-ena-card/50 hover:text-ena-text focus:ring-ena-border": variant === "ghost",
            "bg-ena-primary/90 text-white hover:brightness-90 focus:ring-ena-primary": variant === "danger",
          },
          {
            "h-9 px-3 text-sm": size === "sm",
            "h-10 px-5 text-sm": size === "md",
            "h-12 px-8 text-base": size === "lg",
          },
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button };

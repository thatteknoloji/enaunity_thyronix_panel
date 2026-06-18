import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
        {
          "bg-white/10 text-ena-light": variant === "default",
          "bg-green-500/10 text-green-400": variant === "success",
          "bg-yellow-500/10 text-yellow-400": variant === "warning",
          "bg-ena-primary/50/10 text-ena-primary": variant === "danger",
        },
        className,
      )}
    >
      {children}
    </span>
  );
}

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        success:
          "border-transparent bg-[hsl(var(--status-ok)/0.15)] text-[hsl(var(--status-ok))]",
        error:
          "border-transparent bg-[hsl(var(--status-error)/0.15)] text-[hsl(var(--status-error))]",
        critical:
          "border-transparent bg-[hsl(var(--severity-critical)/0.15)] text-[hsl(var(--severity-critical))]",
        high: "border-transparent bg-[hsl(var(--severity-high)/0.15)] text-[hsl(var(--severity-high))]",
        medium:
          "border-transparent bg-[hsl(var(--severity-medium)/0.15)] text-[hsl(var(--severity-medium))]",
        low: "border-transparent bg-[hsl(var(--severity-low)/0.15)] text-[hsl(var(--severity-low))]",
        unknown:
          "border-transparent bg-[hsl(var(--severity-unknown)/0.15)] text-[hsl(var(--severity-unknown))]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };

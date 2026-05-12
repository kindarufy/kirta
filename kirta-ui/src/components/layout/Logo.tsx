import { ShieldCheck } from "lucide-react";
import { cn } from "@/utils/cn";

interface LogoProps {
  size?: "md" | "lg";
  className?: string;
}

export function Logo({ size = "lg", className }: LogoProps) {
  const isLg = size === "lg";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-500 text-white shadow-md shadow-primary/20",
          isLg ? "h-12 w-12 rounded-2xl" : "h-9 w-9 rounded-xl",
        )}
      >
        <ShieldCheck className={isLg ? "h-7 w-7" : "h-5 w-5"} />
      </span>
      <span
        className={cn(
          "font-bold tracking-tight",
          isLg ? "text-2xl" : "text-lg font-semibold",
        )}
      >
        Kirta
      </span>
    </div>
  );
}

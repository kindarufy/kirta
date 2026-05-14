import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/utils/cn";

interface LogoProps {
  size?: "md" | "lg" | "xl";
  src?: string;
  lightSrc?: string;
  darkSrc?: string;
  imageClassName?: string;
  className?: string;
}

export function Logo({
  size = "lg",
  src = "/kirta-logo-landing.png",
  lightSrc,
  darkSrc,
  imageClassName,
  className,
}: LogoProps) {
  const isMd = size === "md";
  const isXl = size === "xl";
  const [imageFailed, setImageFailed] = useState(false);

  if (!imageFailed) {
    const logoSizeClass = isMd
      ? "h-10 w-[170px]"
      : isXl
        ? "h-16 w-[300px]"
        : "h-14 w-[240px]";

    return (
      <div className={cn("flex items-center", className)}>
        {lightSrc && darkSrc ? (
          <span className={cn("relative inline-flex shrink-0", logoSizeClass)}>
            <img
              src={lightSrc}
              alt="KIRTA"
              className={cn(
                "absolute inset-0 h-full w-full object-contain dark:hidden",
                imageClassName,
              )}
              onError={() => setImageFailed(true)}
            />
            <img
              src={darkSrc}
              alt="KIRTA"
              className={cn(
                "absolute inset-0 hidden h-full w-full object-contain dark:block",
                imageClassName,
              )}
              onError={() => setImageFailed(true)}
            />
          </span>
        ) : (
          <img
            src={src}
            alt="KIRTA"
            className={cn(
              "h-auto w-auto max-w-full object-contain",
              logoSizeClass,
              imageClassName,
            )}
            onError={() => setImageFailed(true)}
          />
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-500 text-white shadow-md shadow-primary/20",
          isMd ? "h-9 w-9 rounded-xl" : isXl ? "h-14 w-14 rounded-2xl" : "h-12 w-12 rounded-2xl",
        )}
      >
        <ShieldCheck className={isMd ? "h-5 w-5" : isXl ? "h-8 w-8" : "h-7 w-7"} />
      </span>
      <span
        className={cn(
          "font-bold tracking-tight",
          isMd ? "text-lg font-semibold" : isXl ? "text-3xl" : "text-2xl",
        )}
      >
        Kirta
      </span>
    </div>
  );
}

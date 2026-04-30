"use client";

interface BaikalLogoProps {
  variant?: "default" | "light";
  height?: number;
  className?: string;
}

/**
 * Shared BidSight wordmark for light and dark surfaces.
 */
export function BaikalLogo({ variant = "default", height = 32, className = "" }: BaikalLogoProps) {
  const textSize = height >= 44 ? "text-3xl" : height >= 36 ? "text-2xl" : "text-xl";
  const textColor = variant === "light" ? "text-white" : "text-slate-950 dark:text-white";
  const accentColor =
    variant === "light"
      ? "from-sky-300 via-violet-300 to-rose-300"
      : "from-sky-500 via-indigo-500 to-rose-500 dark:from-sky-300 dark:via-violet-300 dark:to-rose-300";

  return (
    <div className={`inline-flex flex-col justify-center ${className}`} style={{ minHeight: height }}>
      <span className={`font-black tracking-[-0.06em] leading-none ${textSize} ${textColor}`}>
        BidSight
      </span>
      <span className={`mt-1 h-1.5 w-16 rounded-full bg-gradient-to-r ${accentColor}`} />
    </div>
  );
}

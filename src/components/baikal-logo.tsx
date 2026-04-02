"use client";

interface BaikalLogoProps {
  variant?: "default" | "light" | "compact" | "hero";
  className?: string;
}

export function BaikalLogo({ variant = "default", className = "" }: BaikalLogoProps) {
  const isLight = variant === "light" || variant === "hero";
  const isCompact = variant === "compact";
  const isHero = variant === "hero";

  const iconSize = isHero
    ? "h-12 w-12 rounded-2xl"
    : isCompact
    ? "h-8 w-8 rounded-xl"
    : "h-9 w-9 rounded-xl";

  const svgSize = isHero ? "w-7 h-7" : isCompact ? "w-5 h-5" : "w-6 h-6";
  const titleSize = isHero ? "text-lg tracking-[0.14em]" : "text-[13px] tracking-[0.14em]";
  const subSize = isHero ? "text-[11px] mt-1" : "text-[9px] mt-0.5";
  const gapSize = isHero ? "gap-3" : "gap-2.5";

  return (
    <div className={`flex items-center ${gapSize} ${className}`}>
      <div
        className={`relative shrink-0 flex items-center justify-center transition-all duration-300 group-hover:scale-105 ${iconSize}`}
        style={{
          background: isHero
            ? "rgba(255,255,255,0.10)"
            : "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 55%, #0284c7 100%)",
          backdropFilter: isHero ? "blur(16px)" : undefined,
          WebkitBackdropFilter: isHero ? "blur(16px)" : undefined,
          border: isHero ? "1px solid rgba(255,255,255,0.10)" : undefined,
          boxShadow: isHero
            ? "0 4px 20px rgba(0,0,0,0.25)"
            : isLight
            ? "0 4px 16px rgba(2,132,199,0.40)"
            : "0 4px 14px rgba(29,78,216,0.30)",
        }}
      >
        {!isHero && (
          <div
            className="absolute inset-0 opacity-40"
            style={{
              borderRadius: "inherit",
              background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.25), transparent 60%)",
            }}
          />
        )}
        <svg
          viewBox="0 0 36 36"
          fill="none"
          className={`relative z-10 ${svgSize}`}
          aria-hidden="true"
        >
          <path d="M5 21 C8 13 13 9 18 9 C23 9 28 13 31 21"
            stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M3 27 C7 18 13 14 18 14 C23 14 29 18 33 27"
            stroke="white" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.55" />
          <path d="M7 32 C10 26 14 22 18 22 C22 22 26 26 29 32"
            stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.28" />
        </svg>
      </div>

      {!isCompact && (
        <div className="flex flex-col leading-none select-none">
          <span className={`font-black uppercase leading-tight ${titleSize} ${isLight ? "text-white" : "text-foreground"}`}>
            BAIKAL
          </span>
          <span className={`font-semibold tracking-widest uppercase leading-none ${subSize} ${isLight ? "text-white/45" : "text-muted-foreground/55"}`}>
            BidSight
          </span>
        </div>
      )}
    </div>
  );
}

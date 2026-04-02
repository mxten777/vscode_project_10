"use client";

import Image from "next/image";

interface BaikalLogoProps {
  variant?: "default" | "light";
  height?: number;
  className?: string;
}

/**
 * BAIKAL.AI brand logo using official image assets.
 * variant="default" — black text for light backgrounds, white text for dark mode
 * variant="light"   — always white text (for dark hero panels)
 */
export function BaikalLogo({ variant = "default", height = 32, className = "" }: BaikalLogoProps) {
  const width = height * 2; // 1200x600 = 2:1 ratio

  if (variant === "light") {
    return (
      <div className={className}>
        <Image
          src="/images/baikal_logo_white.png"
          alt="BAIKAL.AI"
          width={width}
          height={height}
          className="object-contain"
          priority
        />
      </div>
    );
  }

  // Default: colored black logo for light mode, white logo for dark mode
  return (
    <div className={className}>
      <Image
        src="/images/baikal_logo_new_trans.png"
        alt="BAIKAL.AI"
        width={width}
        height={height}
        className="object-contain dark:hidden"
        priority
      />
      <Image
        src="/images/baikal_logo_white.png"
        alt="BAIKAL.AI"
        width={width}
        height={height}
        className="object-contain hidden dark:block"
        priority
      />
    </div>
  );
}

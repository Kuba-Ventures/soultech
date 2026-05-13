import Image from "next/image";
import { brand } from "@/lib/brand";

type Props = {
  // Display height in px. The image keeps aspect ratio.
  height?: number;
  // "light" inverts the logo to white for dark backgrounds (default).
  // "original" renders the file as-is (navy + teal).
  variant?: "light" | "original";
  className?: string;
};

export function Logo({ height = 28, variant = "original", className = "" }: Props) {
  const ratio = brand.logo.width / brand.logo.height;
  const width = Math.round(height * ratio);
  return (
    <Image
      src={brand.logo.src}
      alt={brand.logo.alt}
      width={width}
      height={height}
      priority
      className={
        (variant === "light" ? "brightness-0 invert " : "") +
        "select-none " +
        className
      }
    />
  );
}

import Image from "next/image";
import Link from "next/link";

const SIZES = {
  sm: 28,
  md: 36,
  lg: 80,
} as const;

type LogoProps = {
  size?: keyof typeof SIZES;
  showText?: boolean;
  href?: string;
  className?: string;
};

export function Logo({ size = "md", showText = true, href, className = "" }: LogoProps) {
  const px = SIZES[size];

  const inner = (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Image
        src="/zerdali-logo.png"
        alt="Zerdali logosu"
        width={px}
        height={px}
        className="object-contain shrink-0"
        priority={size === "lg"}
      />
      {showText && (
        <span className={`font-bold text-brand-gradient ${size === "lg" ? "text-3xl" : "text-xl"}`}>
          Zerdali
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="hover:opacity-90 transition-opacity">
        {inner}
      </Link>
    );
  }

  return inner;
}

import Image from "next/image";

import type { Image as ImageType } from "@/lib/commerce/types";

const PLACEHOLDERS: [RegExp, string, string][] = [
  [/coral/i, "🪸", "from-coral-500/30 to-fuchsia-200"],
  [/invert|shrimp|crab|snail/i, "🦐", "from-orange-200 to-ocean-100"],
  [/plant/i, "🌿", "from-emerald-200 to-lime-100"],
  [/salt|reef|marine/i, "🐠", "from-ocean-200 to-sky-100"],
  [/fish/i, "🐟", "from-ocean-100 to-emerald-100"],
];

export function ProductImage({
  image,
  alt,
  productType,
  sizes = "(min-width: 1024px) 25vw, 50vw",
  priority,
}: {
  image: ImageType | null;
  alt: string;
  productType?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (image) {
    return (
      <Image
        src={image.url}
        alt={image.altText ?? alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    );
  }
  const [, emoji, gradient] = PLACEHOLDERS.find(([re]) => re.test(productType ?? "")) ?? [
    null,
    "🫧",
    "from-slate-100 to-ocean-50",
  ];
  return (
    <div
      role="img"
      aria-label={alt}
      className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient}`}
    >
      <span className="text-6xl drop-shadow-sm" aria-hidden>
        {emoji}
      </span>
    </div>
  );
}

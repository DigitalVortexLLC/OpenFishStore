import type { CareInfo, Collection, Product } from "./types";

// Sample catalog used when Shopify credentials are not configured, so the
// storefront can be explored and developed without a Shopify store.

type Seed = {
  handle: string;
  title: string;
  productType: string;
  collections: string[];
  price: number;
  description: string;
  tags?: string[];
  care?: CareInfo;
  variants?: { title: string; price: number; available?: boolean }[];
  soldOut?: boolean;
};

export const DEMO_COLLECTIONS: Collection[] = [
  { handle: "freshwater-fish", title: "Freshwater Fish", description: "Community favorites, centerpiece fish and oddballs." },
  { handle: "saltwater-fish", title: "Saltwater Fish", description: "Aquacultured and responsibly collected marine fish." },
  { handle: "corals", title: "Corals", description: "Soft, LPS and SPS frags grown in our reef systems." },
  { handle: "invertebrates", title: "Invertebrates", description: "Cleanup crews, shrimp, snails and more." },
  { handle: "plants", title: "Aquatic Plants", description: "Stem plants, carpets and easy low-light growers." },
  { handle: "supplies", title: "Supplies", description: "Food, water care and the gear to keep it all running." },
].map((c) => ({ ...c, id: `gid://demo/Collection/${c.handle}`, image: null }));

const SEEDS: Seed[] = [
  {
    handle: "ocellaris-clownfish",
    title: "Ocellaris Clownfish (Captive Bred)",
    productType: "Saltwater Fish",
    collections: ["saltwater-fish"],
    price: 24.99,
    tags: ["captive-bred", "beginner"],
    description:
      "Hardy, captive-bred clownfish that settle in quickly and eat almost anything. A perfect first marine fish.",
    care: { waterType: "REEF", careLevel: "EASY", temperament: "PEACEFUL", reefSafe: true, minTankGallons: 20, maxSizeInches: 3, diet: "Omnivore", scientificName: "Amphiprion ocellaris", live: true },
    variants: [
      { title: "Small", price: 24.99 },
      { title: "Medium", price: 29.99 },
      { title: "Mated Pair", price: 69.99 },
    ],
  },
  {
    handle: "yellow-tang",
    title: "Yellow Tang",
    productType: "Saltwater Fish",
    collections: ["saltwater-fish"],
    price: 129.99,
    description: "A bright, active grazer that helps keep algae in check. Needs swimming room.",
    care: { waterType: "REEF", careLevel: "MODERATE", temperament: "SEMI_AGGRESSIVE", reefSafe: true, minTankGallons: 100, maxSizeInches: 8, diet: "Herbivore", scientificName: "Zebrasoma flavescens", live: true },
  },
  {
    handle: "neon-tetra",
    title: "Neon Tetra",
    productType: "Freshwater Fish",
    collections: ["freshwater-fish"],
    price: 2.99,
    tags: ["schooling", "beginner"],
    description: "Classic schooling fish with an electric blue stripe. Keep in groups of 6 or more.",
    care: { waterType: "FRESHWATER", careLevel: "EASY", temperament: "PEACEFUL", minTankGallons: 10, maxSizeInches: 1.5, diet: "Omnivore", scientificName: "Paracheirodon innesi", live: true },
    variants: [
      { title: "Single", price: 2.99 },
      { title: "School of 10", price: 24.99 },
    ],
  },
  {
    handle: "betta-halfmoon",
    title: "Halfmoon Betta (Male)",
    productType: "Freshwater Fish",
    collections: ["freshwater-fish"],
    price: 19.99,
    description: "Show-quality halfmoon bettas with full 180° tails. Colors vary.",
    care: { waterType: "FRESHWATER", careLevel: "EASY", temperament: "SEMI_AGGRESSIVE", minTankGallons: 5, maxSizeInches: 3, diet: "Carnivore", scientificName: "Betta splendens", live: true },
  },
  {
    handle: "german-blue-ram",
    title: "German Blue Ram",
    productType: "Freshwater Fish",
    collections: ["freshwater-fish"],
    price: 12.99,
    soldOut: true,
    description: "A jewel-toned dwarf cichlid for warm, soft, well-established tanks.",
    care: { waterType: "FRESHWATER", careLevel: "MODERATE", temperament: "PEACEFUL", minTankGallons: 20, maxSizeInches: 2.5, diet: "Omnivore", scientificName: "Mikrogeophagus ramirezi", live: true },
  },
  {
    handle: "green-star-polyp",
    title: "Green Star Polyp Frag",
    productType: "Coral",
    collections: ["corals"],
    price: 19.99,
    tags: ["frag", "beginner"],
    description: "Fast-growing soft coral that forms a waving neon-green mat. Great for beginners.",
    care: { waterType: "REEF", careLevel: "EASY", temperament: "PEACEFUL", reefSafe: true, live: true },
  },
  {
    handle: "hammer-coral",
    title: "Branching Hammer Coral",
    productType: "Coral",
    collections: ["corals"],
    price: 89.99,
    description: "A flowing LPS coral with anchor-shaped tips. Give it space; it can sting neighbors.",
    care: { waterType: "REEF", careLevel: "MODERATE", temperament: "SEMI_AGGRESSIVE", reefSafe: true, live: true },
    variants: [
      { title: "1 Head", price: 89.99 },
      { title: "3 Heads", price: 199.99 },
    ],
  },
  {
    handle: "cleanup-crew-reef",
    title: "Reef Cleanup Crew Pack",
    productType: "Invertebrate",
    collections: ["invertebrates"],
    price: 49.99,
    description: "Snails and hermit crabs that eat algae and leftover food. Sized per 20 gallons.",
    care: { waterType: "REEF", careLevel: "EASY", temperament: "PEACEFUL", reefSafe: true, live: true },
  },
  {
    handle: "amano-shrimp",
    title: "Amano Shrimp",
    productType: "Invertebrate",
    collections: ["invertebrates", "freshwater-fish"],
    price: 4.49,
    description: "Tireless freshwater algae eaters. Peaceful with nearly any community fish.",
    care: { waterType: "FRESHWATER", careLevel: "EASY", temperament: "PEACEFUL", minTankGallons: 10, maxSizeInches: 2, diet: "Algae / detritus", scientificName: "Caridina multidentata", live: true },
  },
  {
    handle: "java-fern",
    title: "Java Fern",
    productType: "Plant",
    collections: ["plants"],
    price: 9.99,
    description: "Nearly indestructible low-light plant. Tie it to rock or driftwood.",
    care: { waterType: "FRESHWATER", careLevel: "EASY", live: true },
  },
  {
    handle: "reef-salt-mix",
    title: "Premium Reef Salt Mix — 50 gal",
    productType: "Supplies",
    collections: ["supplies"],
    price: 21.99,
    description: "Consistent, lab-tested salt mix with elevated calcium and alkalinity for reef tanks.",
  },
  {
    handle: "water-conditioner",
    title: "Water Conditioner — 16 oz",
    productType: "Supplies",
    collections: ["supplies"],
    price: 11.99,
    description: "Removes chlorine and chloramine and detoxifies ammonia. Treats 4,800 gallons.",
  },
];

const money = (amount: number) => ({ amount: amount.toFixed(2), currencyCode: "USD" });

export const DEMO_PRODUCTS: (Product & { collections: string[] })[] = SEEDS.map((seed, i) => {
  const variants = (seed.variants ?? [{ title: "Default Title", price: seed.price }]).map((v, j) => ({
    id: `gid://demo/ProductVariant/${seed.handle}--${j}`,
    title: v.title,
    availableForSale: !seed.soldOut && v.available !== false,
    quantityAvailable: seed.soldOut ? 0 : 12,
    price: money(v.price),
    selectedOptions: [{ name: seed.variants ? "Size" : "Title", value: v.title }],
  }));
  const prices = variants.map((v) => Number(v.price.amount));
  return {
    id: `gid://demo/Product/${i + 1}`,
    handle: seed.handle,
    title: seed.title,
    description: seed.description,
    descriptionHtml: `<p>${seed.description}</p>`,
    productType: seed.productType,
    tags: seed.tags ?? [],
    availableForSale: variants.some((v) => v.availableForSale),
    featuredImage: null,
    images: [],
    priceRange: { minVariantPrice: money(Math.min(...prices)), maxVariantPrice: money(Math.max(...prices)) },
    variants,
    care: seed.care ?? {},
    collections: seed.collections,
  };
});

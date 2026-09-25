// Seeds an owner account plus sample tanks, species, livestock and tasks.
// Run with `npm run db:seed`. Safe to re-run: sample data is only added to an
// empty database.

import { randomBytes } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

async function main() {
  const email = (process.env.SEED_OWNER_EMAIL || "owner@example.com").toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  let owner = existing;
  if (!owner) {
    // Never fall back to a well-known password: generate one if none is given.
    const provided = process.env.SEED_OWNER_PASSWORD;
    if (provided && provided.length < 10) throw new Error("SEED_OWNER_PASSWORD must be at least 10 characters");
    const password = provided || randomBytes(12).toString("base64url");
    owner = await db.user.create({
      data: { email, name: "Store Owner", role: "OWNER", passwordHash: await bcrypt.hash(password, 12) },
    });
    console.log(`Created owner account: ${email}`);
    if (!provided) console.log(`Generated password (shown once, change it after signing in): ${password}`);
  } else {
    console.log(`Owner account ${email} already exists.`);
  }

  if ((await db.tank.count()) > 0) {
    console.log("Sample data already present, skipping.");
    return;
  }

  const tanks = Object.fromEntries(
    await Promise.all(
      [
        { key: "fw1", name: "FW-01", system: "Freshwater Wall", waterType: "FRESHWATER", purpose: "SALES", volumeGallons: 40, location: "Sales floor" },
        { key: "fw2", name: "FW-02", system: "Freshwater Wall", waterType: "FRESHWATER", purpose: "SALES", volumeGallons: 40, location: "Sales floor" },
        { key: "reef", name: "Reef Frag Tank", system: "Reef Rack A", waterType: "REEF", purpose: "SALES", volumeGallons: 120, location: "Sales floor" },
        { key: "sw1", name: "SW-01", system: "Saltwater Fish System", waterType: "SALTWATER", purpose: "SALES", volumeGallons: 55, location: "Sales floor" },
        { key: "qt", name: "QT-01", waterType: "SALTWATER", purpose: "QUARANTINE", volumeGallons: 30, location: "Back room" },
        { key: "display", name: "Front Display", waterType: "REEF", purpose: "DISPLAY", volumeGallons: 300, location: "Entrance" },
      ].map(async ({ key, ...data }) => [key, await db.tank.create({ data })] as const),
    ),
  );

  const species = Object.fromEntries(
    await Promise.all(
      [
        { key: "clown", commonName: "Ocellaris Clownfish", scientificName: "Amphiprion ocellaris", category: "FISH", waterType: "REEF", careLevel: "EASY", temperament: "PEACEFUL", reefSafe: true, minTankGallons: 20, maxSizeInches: 3, diet: "Omnivore" },
        { key: "tang", commonName: "Yellow Tang", scientificName: "Zebrasoma flavescens", category: "FISH", waterType: "REEF", careLevel: "MODERATE", temperament: "SEMI_AGGRESSIVE", reefSafe: true, minTankGallons: 100, maxSizeInches: 8, diet: "Herbivore" },
        { key: "neon", commonName: "Neon Tetra", scientificName: "Paracheirodon innesi", category: "FISH", waterType: "FRESHWATER", careLevel: "EASY", temperament: "PEACEFUL", minTankGallons: 10, maxSizeInches: 1.5, diet: "Omnivore" },
        { key: "betta", commonName: "Betta", scientificName: "Betta splendens", category: "FISH", waterType: "FRESHWATER", careLevel: "EASY", temperament: "SEMI_AGGRESSIVE", minTankGallons: 5, maxSizeInches: 3, diet: "Carnivore" },
        { key: "gsp", commonName: "Green Star Polyp", scientificName: "Pachyclavularia violacea", category: "CORAL", waterType: "REEF", careLevel: "EASY", temperament: "PEACEFUL", reefSafe: true },
        { key: "amano", commonName: "Amano Shrimp", scientificName: "Caridina multidentata", category: "INVERTEBRATE", waterType: "FRESHWATER", careLevel: "EASY", temperament: "PEACEFUL", minTankGallons: 10, maxSizeInches: 2 },
      ].map(async ({ key, ...data }) => [key, await db.species.create({ data })] as const),
    ),
  );

  const batches = [
    { species: "clown", tank: "sw1", qty: 8, received: 10, days: 21, status: "AVAILABLE", cost: 900, supplier: "ORA" },
    { species: "tang", tank: "qt", qty: 3, received: 3, days: 5, status: "QUARANTINE", cost: 5500, supplier: "Quality Marine", qtDays: 14 },
    { species: "neon", tank: "fw1", qty: 42, received: 50, days: 10, status: "AVAILABLE", cost: 45, supplier: "Segrest Farms" },
    { species: "betta", tank: "fw2", qty: 12, received: 12, days: 3, status: "AVAILABLE", cost: 600, supplier: "Local breeder" },
    { species: "gsp", tank: "reef", qty: 15, received: 15, days: 30, status: "AVAILABLE", cost: 0, supplier: "In-house frag" },
    { species: "amano", tank: "fw1", qty: 20, received: 20, days: 1, status: "QUARANTINE", cost: 120, supplier: "Segrest Farms", qtDays: 7 },
  ];
  for (const b of batches) {
    const receivedAt = daysAgo(b.days);
    await db.livestockBatch.create({
      data: {
        speciesId: species[b.species].id,
        tankId: tanks[b.tank].id,
        quantity: b.qty,
        receivedQuantity: b.received,
        unitCostCents: b.cost,
        supplier: b.supplier,
        status: b.status,
        receivedAt,
        quarantineUntil: b.qtDays ? new Date(receivedAt.getTime() + b.qtDays * DAY) : null,
        events: {
          create: [
            { type: "RECEIVED", quantityDelta: b.received, userId: owner.id, createdAt: receivedAt, note: b.supplier },
            ...(b.received > b.qty
              ? [{ type: "SOLD", quantityDelta: b.qty - b.received, userId: owner.id, createdAt: daysAgo(1), note: "In-store sale" }]
              : []),
          ],
        },
      },
    });
  }

  // A few days of water tests, including one tank that needs attention.
  const tests: [string, number, Record<string, number>][] = [
    ["fw1", 1, { temperatureF: 77, ph: 7.2, ammonia: 0, nitrite: 0, nitrate: 15 }],
    ["fw2", 1, { temperatureF: 79, ph: 7.0, ammonia: 0.25, nitrite: 0.1, nitrate: 35 }],
    ["reef", 0, { temperatureF: 78, ph: 8.2, ammonia: 0, nitrite: 0, nitrate: 5, salinity: 1.025, alkalinity: 8.4, calcium: 420, magnesium: 1320, phosphate: 0.05 }],
    ["reef", 3, { temperatureF: 78.5, ph: 8.1, nitrate: 8, salinity: 1.025, alkalinity: 8.0, calcium: 410, magnesium: 1300, phosphate: 0.08 }],
    ["sw1", 2, { temperatureF: 78, ph: 8.1, ammonia: 0, nitrite: 0, nitrate: 20, salinity: 1.023, alkalinity: 9 }],
    ["qt", 0, { temperatureF: 79, ph: 7.9, ammonia: 0.5, nitrite: 0.1, nitrate: 10, salinity: 1.021 }],
  ];
  for (const [tank, days, readings] of tests) {
    await db.waterTest.create({ data: { tankId: tanks[tank].id, testedAt: daysAgo(days), userId: owner.id, ...readings } });
  }

  await db.maintenanceTask.createMany({
    data: [
      { title: "20% water change", tankId: tanks.fw2.id, dueAt: daysAgo(1), repeatDays: 7 },
      { title: "Feed frozen mysis", tankId: tanks.sw1.id, dueAt: new Date(), repeatDays: 1 },
      { title: "Clean filter socks", tankId: tanks.reef.id, dueAt: new Date(Date.now() + 2 * DAY), repeatDays: 3 },
      { title: "Calibrate refractometer", dueAt: new Date(Date.now() + 5 * DAY), repeatDays: 30 },
    ],
  });

  await db.specialOrder.createMany({
    data: [
      { customerName: "Jordan Lee", customerPhone: "555-0142", request: "Mandarin Dragonet (eating frozen)", quantity: 1, depositCents: 2000, status: "ORDERED" },
      { customerName: "Sam Rivera", customerEmail: "sam@example.com", request: "Pair of German Blue Rams", quantity: 2, status: "REQUESTED" },
    ],
  });

  console.log("Sample tanks, livestock, water tests, tasks and special orders created.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

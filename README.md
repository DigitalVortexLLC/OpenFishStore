# 🐠 OpenFishStore

An open source website for independent aquarium and fish stores:

- **A storefront** for fish, corals, invertebrates, plants and supplies, with
  **Shopify** handling the ecommerce backend (catalog, cart, checkout, payments, orders).
- **A staff back office** for running the store: tanks, water tests, livestock,
  quarantine, husbandry tasks and special orders.

It runs out of the box in **demo mode** with a sample catalog, so you can try it
before you connect a Shopify store.

## Features

### Storefront (headless Shopify)
- Home page, collections, product pages, search and sorting
- Cart backed by the Shopify Cart API, with checkout on Shopify's hosted checkout
- **Care sheets** on product pages (water type, care level, temperament, reef
  safe, min. tank size…) from Shopify metafields
- Live-animal notes (quarantine, pickup and live-arrival guarantee)
- Mobile friendly

### Back office (`/admin`)
- **Dashboard**: tank alerts, overdue tasks, quarantine status, open special
  orders, losses this week
- **Tanks & water**: tanks grouped by filtration system; log water tests and
  have each reading graded against targets for freshwater, brackish, saltwater
  and reef
- **Livestock**: receive batches into quarantine, release them for sale,
  record sales, losses, treatments and recounts, move between tanks, and view
  a full history per batch with survival rate
- **Shopify sync**: link a batch to a Shopify variant. Online orders take
  stock from batches (oldest first) through webhooks, and back-office changes
  update Shopify inventory
- **Species catalog** with care information
- **Tasks**: water changes, feeding and maintenance, with repeating schedules
- **Special orders**: track customer requests from requested → ordered →
  arrived → notified → completed
- **Staff accounts** with Owner / Manager / Staff roles

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Server Components, Server Actions), React 19, TypeScript
- Tailwind CSS 4
- Prisma ORM, with SQLite by default and PostgreSQL for production
- Shopify Storefront API + Admin API + webhooks
- Vitest

## Getting started

Requires Node.js 20.9+.

```bash
git clone https://github.com/DigitalVortexLLC/OpenFishStore.git
cd OpenFishStore
npm install
cp .env.example .env        # then set SESSION_SECRET (openssl rand -base64 32)
npm run setup               # creates the database and seeds sample data
npm run dev
```

- Storefront: http://localhost:3000
- Back office: http://localhost:3000/admin, signing in with `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD`
  (default `owner@example.com` / `changeme123`; change it)

To connect your Shopify store, see **[docs/shopify-setup.md](docs/shopify-setup.md)**.

## Scripts

| Command             | What it does                                  |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Start the dev server                          |
| `npm run build`     | Production build                              |
| `npm start`         | Serve the production build                    |
| `npm run lint`      | ESLint                                        |
| `npm run typecheck` | TypeScript                                    |
| `npm test`          | Unit tests (Vitest)                           |
| `npm run setup`     | `db:push` + `db:seed`                         |
| `npm run db:studio` | Browse the database with Prisma Studio        |

## Project layout

```
prisma/
  schema.prisma          Internal data model (tanks, livestock, water tests…)
  seed.ts                Owner account + sample data
src/
  app/(store)/           Public storefront
  app/admin/             Staff back office (+ actions.ts server actions)
  app/login/             Staff sign-in
  app/api/webhooks/      Shopify webhook receiver
  components/            Store and admin UI
  lib/commerce/          Commerce provider: Shopify Storefront API or demo catalog
  lib/shopify/           Admin API inventory sync, webhook verification
  lib/livestock.ts       Batch operations and Shopify sync rules
  lib/water.ts           Water parameter targets and grading
  lib/auth/              Staff sessions and role checks
  proxy.ts               Redirects signed-out visitors away from /admin
```

## Deployment

It's a standard Next.js app. Deploy to Vercel, Render or Fly, or run the
included `Dockerfile`:

```bash
docker build -t openfishstore .
docker run -p 3000:3000 -v ofs-data:/data \
  -e SESSION_SECRET=... -e SHOPIFY_STORE_DOMAIN=... -e SHOPIFY_STOREFRONT_ACCESS_TOKEN=... \
  openfishstore
docker exec -it <container> npx prisma db seed   # first run: create the owner
```

**PostgreSQL:** change `provider = "sqlite"` to `provider = "postgresql"` in
`prisma/schema.prisma`, point `DATABASE_URL` at your database and run
`npm run db:push`. Use PostgreSQL for serverless hosts, where there is no
persistent disk for SQLite.

## Roadmap ideas

- Water parameter charts and trends per tank
- Customer-facing "what's in stock" page fed by available batches
- Printable tank labels / QR codes linking to care sheets
- Refund and cancellation webhooks restocking batches
- Supplier and purchase order tracking
- Customer water-test log tied to Shopify customers

Contributions welcome!

## License

[MIT](LICENSE)

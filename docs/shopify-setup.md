# Connecting Shopify

OpenFishStore uses Shopify as its commerce backend: catalog, pricing, cart,
checkout, payments, customers, orders, taxes and shipping all live in Shopify.
This app is a custom (headless) storefront on the Storefront API plus a back
office that syncs livestock counts through the Admin API and webhooks.

## 1. Storefront API (required for the shop)

1. In Shopify admin, install the **Headless** sales channel (or create a custom
   app with Storefront API access).
2. Create a storefront and copy the **public access token**.
3. Set in `.env`:

   ```
   SHOPIFY_STORE_DOMAIN="your-store.myshopify.com"
   SHOPIFY_STOREFRONT_ACCESS_TOKEN="…"
   SHOPIFY_API_VERSION="2026-07"
   ```

4. Make sure products are published to the Headless channel.

When these are set, the demo banner disappears and the storefront reads your
real catalog. Checkout redirects to Shopify's hosted checkout.

## 2. Care sheet metafields (recommended)

Product pages show a care sheet built from product metafields in the `care`
namespace. Create these definitions under **Settings → Custom data → Products**
and give them **Storefront access**:

| Key                | Type                | Example                   |
| ------------------ | ------------------- | ------------------------- |
| `water_type`       | Single line text    | `FRESHWATER`, `SALTWATER`, `REEF`, `BRACKISH` |
| `care_level`       | Single line text    | `EASY`, `MODERATE`, `EXPERT` |
| `temperament`      | Single line text    | `PEACEFUL`, `SEMI_AGGRESSIVE`, `AGGRESSIVE` |
| `reef_safe`        | True or false       | `true`                    |
| `min_tank_gallons` | Integer             | `30`                      |
| `max_size_inches`  | Decimal             | `4.5`                     |
| `diet`             | Single line text    | `Omnivore`                |
| `scientific_name`  | Single line text    | `Amphiprion ocellaris`    |
| `live`             | True or false       | `true` (shows live-animal shipping/pickup notes) |

## 3. Admin API (livestock → Shopify inventory)

Create a custom app in **Settings → Apps and sales channels → Develop apps**
with the `read_products`, `read_inventory` and `write_inventory` scopes. Then set:

```
SHOPIFY_ADMIN_ACCESS_TOKEN="shpat_…"
SHOPIFY_LOCATION_ID="gid://shopify/Location/123456789"
```

Link a livestock batch to a Shopify variant (on the batch page, or when
receiving). From then on:

- Only **Available** batches count as sellable. Releasing a batch from
  quarantine adds its count to Shopify; putting it on hold removes it.
- In-store sales, losses and recounts recorded in the back office are pushed to
  Shopify inventory at the configured location.

Adjustments use Shopify's `@idempotent` directive and `changeFromQuantity`
concurrency check (required from API version 2026-04).

## 4. Webhooks (Shopify orders → livestock batches)

Subscribe the `orders/create` topic to:

```
https://your-domain/api/webhooks/shopify
```

and set `SHOPIFY_WEBHOOK_SECRET` to your app's client secret. Each order line
for a linked variant is taken from that variant's Available batches, oldest
first, and recorded in the batch history. Deliveries are HMAC-verified and
de-duplicated by webhook id.

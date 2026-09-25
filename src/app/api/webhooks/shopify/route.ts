import { Prisma } from "@prisma/client";

import { applyShopifyOrder } from "@/lib/livestock";
import { verifyShopifyHmac, type OrderPayload } from "@/lib/shopify/webhooks";

// Receives Shopify webhooks. Subscribe the `orders/create` topic to this URL
// so online livestock sales decrement the matching batches in the back office.

export async function POST(request: Request) {
  const rawBody = await request.text();
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET ?? "";
  if (!verifyShopifyHmac(rawBody, request.headers.get("x-shopify-hmac-sha256"), secret)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const topic = request.headers.get("x-shopify-topic") ?? "unknown";
  if (topic !== "orders/create") return Response.json({ ok: true, ignored: topic });

  const webhookId = request.headers.get("x-shopify-webhook-id") ?? request.headers.get("x-shopify-event-id");
  if (!webhookId) return new Response("Missing webhook id", { status: 400 });

  try {
    // The delivery is recorded in the same transaction that applies the order,
    // so a crash or error mid-way leaves nothing behind for Shopify's retry.
    const applied = await applyShopifyOrder(JSON.parse(rawBody) as OrderPayload, { webhookId, topic });
    return applied === null ? Response.json({ ok: true, duplicate: true }) : Response.json({ ok: true, applied });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return Response.json({ ok: true, duplicate: true });
    }
    console.error(`Failed to process Shopify webhook ${topic}`, err);
    return new Response("Processing failed", { status: 500 });
  }
}

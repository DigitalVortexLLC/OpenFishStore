import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
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
  const webhookId = request.headers.get("x-shopify-webhook-id") ?? request.headers.get("x-shopify-event-id");
  if (!webhookId) return new Response("Missing webhook id", { status: 400 });

  // Shopify retries deliveries; claim the id first so each is applied once.
  try {
    await db.shopifyWebhook.create({ data: { id: webhookId, topic } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return Response.json({ ok: true, duplicate: true });
    }
    throw err;
  }

  try {
    if (topic === "orders/create") {
      const applied = await applyShopifyOrder(JSON.parse(rawBody) as OrderPayload);
      return Response.json({ ok: true, applied });
    }
    return Response.json({ ok: true, ignored: topic });
  } catch (err) {
    // Release the claim so Shopify's retry can try again.
    await db.shopifyWebhook.delete({ where: { id: webhookId } }).catch(() => {});
    console.error(`Failed to process Shopify webhook ${topic}`, err);
    return new Response("Processing failed", { status: 500 });
  }
}

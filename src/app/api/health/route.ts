import { commerce } from "@/lib/commerce";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  let database = "ok";
  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    database = "error";
  }
  return Response.json(
    { status: database === "ok" ? "ok" : "degraded", database, commerce: commerce.name },
    { status: database === "ok" ? 200 : 503 },
  );
}

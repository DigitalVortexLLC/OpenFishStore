import "server-only";

import type { WaterType } from "./constants";
import { db } from "./db";
import { evaluateWaterTest, worstGrade, type Grade } from "./water";

/** Every active tank with its latest water test and grade. */
export async function getTanksWithLatestTest() {
  const tanks = await db.tank.findMany({
    where: { active: true },
    orderBy: [{ system: "asc" }, { name: "asc" }],
    include: {
      waterTests: { orderBy: { testedAt: "desc" }, take: 1 },
      batches: { where: { quantity: { gt: 0 } }, select: { quantity: true } },
    },
  });
  return tanks.map((tank) => {
    const latest = tank.waterTests[0] ?? null;
    const results = latest ? evaluateWaterTest(tank.waterType as WaterType, latest) : [];
    return {
      ...tank,
      latest,
      results,
      grade: (latest ? worstGrade(results) : null) as Grade | null,
      animalCount: tank.batches.reduce((sum, b) => sum + b.quantity, 0),
    };
  });
}

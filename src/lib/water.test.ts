import { describe, expect, it } from "vitest";
import { evaluateWaterTest, gradeParameter, worstGrade } from "./water";

describe("gradeParameter", () => {
  it("grades values inside the target band as ok", () => {
    expect(gradeParameter("REEF", "alkalinity", 8.2)).toBe("ok");
    expect(gradeParameter("FRESHWATER", "ph", 7.0)).toBe("ok");
  });

  it("grades values in the tolerance band as warn", () => {
    expect(gradeParameter("REEF", "calcium", 380)).toBe("warn");
    expect(gradeParameter("SALTWATER", "nitrate", 40)).toBe("warn");
  });

  it("grades values outside tolerance as critical", () => {
    expect(gradeParameter("FRESHWATER", "ammonia", 1)).toBe("critical");
    expect(gradeParameter("REEF", "salinity", 1.018)).toBe("critical");
  });

  it("treats parameters without a target as ok", () => {
    expect(gradeParameter("FRESHWATER", "calcium", 9999)).toBe("ok");
  });
});

describe("evaluateWaterTest", () => {
  it("skips missing readings and reports the worst grade", () => {
    const results = evaluateWaterTest("SALTWATER", {
      temperatureF: 78,
      ph: null,
      ammonia: 0.5,
      nitrate: 10,
    });
    expect(results.map((r) => r.key)).toEqual(["temperatureF", "ammonia", "nitrate"]);
    expect(worstGrade(results)).toBe("critical");
  });

  it("is ok when everything is in range", () => {
    expect(worstGrade(evaluateWaterTest("FRESHWATER", { ph: 7, nitrate: 5 }))).toBe("ok");
    expect(worstGrade([])).toBe("ok");
  });
});

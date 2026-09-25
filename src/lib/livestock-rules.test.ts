import { describe, expect, it } from "vitest";

import { sellableDelta, statusAfterQuantityChange } from "./livestock-rules";

describe("sellableDelta", () => {
  it("counts only AVAILABLE stock", () => {
    expect(sellableDelta({ status: "QUARANTINE", quantity: 6 }, { status: "AVAILABLE", quantity: 6 })).toBe(6);
    expect(sellableDelta({ status: "AVAILABLE", quantity: 6 }, { status: "HOLD", quantity: 6 })).toBe(-6);
    expect(sellableDelta({ status: "AVAILABLE", quantity: 6 }, { status: "AVAILABLE", quantity: 4 })).toBe(-2);
    expect(sellableDelta({ status: "QUARANTINE", quantity: 6 }, { status: "QUARANTINE", quantity: 2 })).toBe(0);
  });
});

describe("statusAfterQuantityChange", () => {
  it("sells out empty batches and reopens restocked ones", () => {
    expect(statusAfterQuantityChange("AVAILABLE", 0)).toBe("SOLD_OUT");
    expect(statusAfterQuantityChange("SOLD_OUT", 3)).toBe("AVAILABLE");
    expect(statusAfterQuantityChange("QUARANTINE", 3)).toBe("QUARANTINE");
  });
});

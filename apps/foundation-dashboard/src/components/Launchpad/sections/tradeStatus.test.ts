import { describe, expect, it } from "vitest";
import { toDisplayStatus } from "./TradeHistory";

describe("toDisplayStatus", () => {
  it("maps known statuses case-insensitively", () => {
    expect(toDisplayStatus("COMPLETED")).toBe("Completed");
    expect(toDisplayStatus("confirmed")).toBe("Completed");
    expect(toDisplayStatus("pending")).toBe("Pending");
    expect(toDisplayStatus("Reverted")).toBe("Failed");
    expect(toDisplayStatus("failed")).toBe("Failed");
  });

  it("never reports an unknown or missing status as completed", () => {
    expect(toDisplayStatus(undefined)).toBe("Unknown");
    expect(toDisplayStatus("weird")).toBe("Unknown");
  });
});

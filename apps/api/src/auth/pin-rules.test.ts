import { describe, expect, it } from "vitest";
import { checkNewPin } from "./pin-rules.js";

describe("checkNewPin", () => {
  it.each([
    ["12345", "format"],
    ["12a456", "format"],
    ["1234567", "format"],
    ["000000", "repeated"],
    ["123456", "sequential"],
    ["890123", "sequential"],
    ["654321", "sequential"],
    ["210987", "sequential"],
    ["121212", "common"],
  ])("rejects %s as %s", (pin, problem) => {
    expect(checkNewPin(pin)).toBe(problem);
  });

  it("accepts an unpredictable PIN", () => {
    expect(checkNewPin("482913")).toBeNull();
  });
});

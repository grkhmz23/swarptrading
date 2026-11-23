import { describe, expect, it } from "vitest";
import { checkNewPin } from "./pin";

describe("checkNewPin", () => {
  it.each([
    ["12345", "format"],
    ["12a456", "format"],
    ["000000", "repeated"],
    ["999999", "repeated"],
    ["123456", "sequential"],
    ["654321", "sequential"],
    ["890123", "sequential"],
    ["121212", "common"],
  ])("rejects %s (%s)", (pin, problem) => {
    expect(checkNewPin(pin)).toBe(problem);
  });

  it("accepts an unpredictable PIN", () => {
    expect(checkNewPin("483916")).toBeNull();
  });
});

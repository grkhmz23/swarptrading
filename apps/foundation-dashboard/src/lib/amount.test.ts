import { describe, expect, it } from "vitest";
import { floorToDecimals, fractionOfSpendable, isAmountInput, maxSpendable, parseAmount } from "./amount";

describe("parseAmount", () => {
  it("rejects empty, malformed and zero values", () => {
    expect(parseAmount("", 9)).toMatchObject({ ok: false, problem: "empty" });
    expect(parseAmount(".", 9)).toMatchObject({ ok: false, problem: "invalid" });
    expect(parseAmount("1.2.3", 9)).toMatchObject({ ok: false, problem: "invalid" });
    expect(parseAmount("-1", 9)).toMatchObject({ ok: false, problem: "invalid" });
    expect(parseAmount("0.000", 9)).toMatchObject({ ok: false, problem: "zero" });
  });

  it("rejects more decimals than the token has", () => {
    expect(parseAmount("0.0000000001", 9)).toMatchObject({ ok: false, problem: "too_precise" });
    expect(parseAmount("1.1234567", 6)).toMatchObject({ ok: false, problem: "too_precise" });
  });

  it("checks the spendable balance", () => {
    expect(parseAmount("2", 9, 1.5)).toMatchObject({ ok: false, problem: "insufficient" });
    expect(parseAmount("1.5", 9, 1.5)).toMatchObject({ ok: true, value: 1.5 });
    expect(parseAmount(".5", 9)).toMatchObject({ ok: true, value: 0.5 });
  });
});

describe("floor helpers", () => {
  it("never rounds up past the balance", () => {
    expect(floorToDecimals(1.2345678, 6)).toBe("1.234567");
    expect(floorToDecimals(1000.6, 0)).toBe("1000");
    expect(floorToDecimals(0.1 + 0.2, 9)).toBe("0.3");
    expect(floorToDecimals(1e-10, 9)).toBe("0");
  });

  it("reserves SOL for fees but not for tokens", () => {
    expect(maxSpendable(1, 9, true)).toBe("0.99");
    expect(maxSpendable(0.005, 9, true)).toBe("0");
    expect(maxSpendable(12.5, 6, false)).toBe("12.5");
    expect(fractionOfSpendable(1.01, 0.5, 9, true)).toBe("0.5");
  });

  it("allows only digits and one dot while typing", () => {
    expect(isAmountInput("12.")).toBe(true);
    expect(isAmountInput("1e5")).toBe(false);
    expect(isAmountInput("1.2.")).toBe(false);
  });
});

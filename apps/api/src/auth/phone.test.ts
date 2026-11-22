import { describe, expect, it } from "vitest";
import { normalizePhone } from "./phone.js";

describe("normalizePhone", () => {
  it("normalises formatted international numbers to E.164", () => {
    expect(normalizePhone("+1 (415) 555-2671")).toEqual({ e164: "+14155552671", country: "US" });
    expect(normalizePhone("+44 20 7946 0958")).toEqual({ e164: "+442079460958", country: "GB" });
  });

  it("rejects numbers without a country code or that are invalid", () => {
    expect(normalizePhone("4155552671")).toBeNull();
    expect(normalizePhone("+1 555")).toBeNull();
    expect(normalizePhone("+999 123456")).toBeNull();
    expect(normalizePhone(`+1${"2".repeat(30)}`)).toBeNull();
  });
});

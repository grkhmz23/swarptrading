import { describe, expect, it } from "vitest";
import { explorerUrl, SOLANA_CLUSTER } from "./env";

describe("explorerUrl", () => {
  it("adds the cluster query for non-mainnet clusters and encodes the value", () => {
    const url = explorerUrl("tx", "abc/def");
    expect(url.startsWith("https://explorer.solana.com/tx/abc%2Fdef")).toBe(true);
    if (SOLANA_CLUSTER !== "mainnet-beta") {
      expect(url.endsWith(`?cluster=${SOLANA_CLUSTER}`)).toBe(true);
    }
  });
});

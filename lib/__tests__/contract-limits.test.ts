import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as spare from "../spare";

const SRC = join(__dirname, "..", "..", "contracts", "src");

function solidityConstants(): Map<string, bigint> {
  const found = new Map<string, bigint>();
  for (const file of readdirSync(SRC).filter((f) => f.endsWith(".sol"))) {
    const src = readFileSync(join(SRC, file), "utf8");
    for (const m of src.matchAll(/constant\s+([A-Z][A-Z0-9_]*)\s*=\s*(\d+)\s*;/g)) {
      found.set(m[1], BigInt(m[2]));
    }
  }
  return found;
}

describe("Spare contract limits agreement", () => {
  const onChain = solidityConstants();

  it("agrees on integer constants", () => {
    expect(BigInt(spare.MAX_MEMO_BYTES)).toBe(onChain.get("MAX_MEMO_BYTES"));
    expect(BigInt(spare.MAX_NAME_BYTES)).toBe(onChain.get("MAX_NAME_BYTES"));
    expect(BigInt(spare.MAX_PAGE)).toBe(onChain.get("MAX_PAGE"));
  });

  it("agrees on ether bounds", () => {
    expect(spare.MIN_UNIT).toBe(1000000000000000n); // 0.001 ether
    expect(spare.MAX_UNIT).toBe(1000000000000000000000n); // 1000 ether
    expect(spare.MAX_PRICE).toBe(1000000000000000000000000n); // 1,000,000 ether
  });
});

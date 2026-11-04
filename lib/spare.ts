import { parseEther, type Address } from "viem";

export const MIN_UNIT = parseEther("0.001");
export const MAX_UNIT = parseEther("1000");
export const MAX_PRICE = parseEther("1000000");
export const MAX_MEMO_BYTES = 64;
export const MAX_NAME_BYTES = 40;
export const MAX_PAGE = 50;

export interface Cause {
  name: string;
  registeredBlock: number;
}

/**
 * Calculates change needed to round up price to next multiple of unit:
 * spare(price, unit) = ((price + unit - 1) / unit) * unit - price
 */
export function spare(price: bigint, unit: bigint): bigint {
  if (unit === 0n) return 0n;
  const rem = price % unit;
  if (rem === 0n) return 0n;
  return unit - rem;
}

export function totalCost(price: bigint, unit: bigint): bigint {
  return price + spare(price, unit);
}

export function splitText(
  price: bigint,
  unit: bigint,
  causeName: string
): string {
  const s = spare(price, unit);
  const total = price + s;
  return `You pay ${(Number(total) / 1e18).toFixed(4)} BOT: ${(
    Number(price) / 1e18
  ).toFixed(4)} to the merchant and ${(Number(s) / 1e18).toFixed(
    4
  )} to ${causeName}.`;
}

/**
 * Calculates coin counts for coin-dish visualization based on spare amount.
 */
export function coinsFor(
  spareAmount: bigint,
  _unit: bigint
): number {
  if (spareAmount === 0n) return 0;
  const spareEth = Number(spareAmount) / 1e18;
  if (spareEth < 0.05) return 1;
  if (spareEth < 0.2) return 2;
  if (spareEth < 0.5) return 3;
  if (spareEth < 1.0) return 4;
  if (spareEth < 2.5) return 5;
  if (spareEth < 5.0) return 6;
  return 8;
}

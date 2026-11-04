import { describe, expect, it } from "vitest";
import { parseEther } from "viem";
import { spare, totalCost, splitText, coinsFor } from "../spare";
import { describeError } from "../errors";

describe("Spare library unit tests", () => {
  it("calculates spare and totalCost accurately", () => {
    // Exact multiple -> 0 spare
    expect(spare(parseEther("5"), parseEther("1"))).toBe(0n);
    expect(totalCost(parseEther("5"), parseEther("1"))).toBe(parseEther("5"));

    // 2.4 rounded up to 1 -> 0.6 spare
    expect(spare(parseEther("2.4"), parseEther("1"))).toBe(parseEther("0.6"));
    expect(totalCost(parseEther("2.4"), parseEther("1"))).toBe(parseEther("3.0"));

    // 1 wei price, 1 ether unit -> 1 ether - 1 wei
    expect(spare(1n, parseEther("1"))).toBe(parseEther("1") - 1n);
    expect(totalCost(1n, parseEther("1"))).toBe(parseEther("1"));
  });

  it("produces exact splitText sentence", () => {
    const text = splitText(parseEther("2.4"), parseEther("1"), "Animal Shelter");
    expect(text).toBe(
      "You pay 3.0000 BOT: 2.4000 to the merchant and 0.6000 to Animal Shelter."
    );
  });

  it("calculates visual coin count in dish correctly", () => {
    expect(coinsFor(0n, parseEther("1"))).toBe(0);
    expect(coinsFor(parseEther("0.02"), parseEther("1"))).toBe(1);
    expect(coinsFor(parseEther("0.15"), parseEther("1"))).toBe(2);
    expect(coinsFor(parseEther("0.4"), parseEther("1"))).toBe(3);
    expect(coinsFor(parseEther("0.8"), parseEther("1"))).toBe(4);
    expect(coinsFor(parseEther("2.0"), parseEther("5"))).toBe(5);
    expect(coinsFor(parseEther("4.0"), parseEther("5"))).toBe(6);
    expect(coinsFor(parseEther("8.0"), parseEther("10"))).toBe(8);
  });

  it("describes contract errors properly", () => {
    expect(describeError(new Error("BadCause()"))).toBe(
      "The cause can't be the merchant, you, or this contract."
    );
    expect(describeError(new Error("BadUnit()"))).toBe(
      "Pick a unit between 0.001 and 1000 BOT."
    );
    expect(describeError(new Error("WrongPayment(3000000000000000000)"))).toBe(
      "The total is 3 BOT. Quote again."
    );
    expect(describeError(new Error("User denied transaction"))).toBe(
      "Transaction cancelled in wallet."
    );
  });
});

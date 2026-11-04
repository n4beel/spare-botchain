import { spawn, execSync, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  parseEther,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { spareAbi } from "@/lib/botchain/abi";
import { spare, totalCost } from "@/lib/spare";

const PORT = 8652;
const RPC = `http://127.0.0.1:${PORT}`;
const CHAIN_ID = 968;

const localChain = defineChain({
  id: CHAIN_ID,
  name: "anvil",
  nativeCurrency: { name: "Test BOT", symbol: "tBOT", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});

const ACCOUNTS = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // 0: Payer (Alice)
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", // 1: Merchant (Bob)
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", // 2: Cause (Charlie)
].map((k) => privateKeyToAccount(k as Hex));

describe("Spare On-Chain Integration Tests", () => {
  let anvil: ChildProcess;
  let contractAddress: Address;

  const publicClient = createPublicClient({
    chain: localChain,
    transport: http(RPC),
  });

  const [payer, merchant, cause] = ACCOUNTS.map((account) =>
    createWalletClient({
      account,
      chain: localChain,
      transport: http(RPC),
    })
  );

  beforeAll(async () => {
    try {
      execSync(`fuser -k ${PORT}/tcp 2>/dev/null || true`);
    } catch {}

    anvil = spawn("anvil", [
      "--port",
      String(PORT),
      "--chain-id",
      String(CHAIN_ID),
      "--silent",
    ]);

    for (let i = 0; i < 30; i++) {
      try {
        await publicClient.getBlockNumber();
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    const artifactPath = join(
      process.cwd(),
      "contracts",
      "out",
      "Spare.sol",
      "Spare.json"
    );
    const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
    const bytecode = artifact.bytecode.object as Hex;

    const deployHash = await payer.deployContract({
      abi: spareAbi,
      bytecode,
    });
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: deployHash,
    });
    contractAddress = receipt.contractAddress!;
  });

  afterAll(() => {
    if (anvil) anvil.kill();
  });

  it("client spare calculation matches on-chain quote view for fixed vectors including 1 wei", async () => {
    const vectors = [
      { price: parseEther("2.4"), unit: parseEther("1") },
      { price: parseEther("5.0"), unit: parseEther("1") },
      { price: 1n, unit: parseEther("1") },
      { price: parseEther("10.3"), unit: parseEther("0.5") },
    ];

    for (const v of vectors) {
      const [changeContract, totalContract] = await publicClient.readContract({
        address: contractAddress,
        abi: spareAbi,
        functionName: "quote",
        args: [v.price, v.unit],
      });

      const clientChange = spare(v.price, v.unit);
      const clientTotal = totalCost(v.price, v.unit);

      expect(changeContract).toBe(clientChange);
      expect(totalContract).toBe(clientTotal);
    }
  });

  it("runs full lifecycle: register cause -> pay with change -> check balances -> withdraw", async () => {
    // 1. Cause registers
    const regTx = await cause.writeContract({
      address: contractAddress,
      abi: spareAbi,
      functionName: "register",
      args: ["Green Earth Coalition"],
    });
    await publicClient.waitForTransactionReceipt({ hash: regTx });

    const causeInfo = await publicClient.readContract({
      address: contractAddress,
      abi: spareAbi,
      functionName: "causeOf",
      args: [cause.account.address],
    });
    expect(causeInfo.name).toBe("Green Earth Coalition");

    // 2. Payer pays merchant with round up
    const price = parseEther("3.2");
    const unit = parseEther("1");
    const change = spare(price, unit); // 0.8 ether
    const total = price + change; // 4.0 ether

    const payTx = await payer.writeContract({
      address: contractAddress,
      abi: spareAbi,
      functionName: "pay",
      args: [merchant.account.address, cause.account.address, price, unit, "Solar Panels"],
      value: total,
    });
    await publicClient.waitForTransactionReceipt({ hash: payTx });

    // Check on-chain balances
    const merchantPending = await publicClient.readContract({
      address: contractAddress,
      abi: spareAbi,
      functionName: "pending",
      args: [merchant.account.address],
    });
    const causePending = await publicClient.readContract({
      address: contractAddress,
      abi: spareAbi,
      functionName: "pending",
      args: [cause.account.address],
    });
    const givenPayer = await publicClient.readContract({
      address: contractAddress,
      abi: spareAbi,
      functionName: "given",
      args: [payer.account.address],
    });
    const receivedCause = await publicClient.readContract({
      address: contractAddress,
      abi: spareAbi,
      functionName: "received",
      args: [cause.account.address],
    });

    expect(merchantPending).toBe(price);
    expect(causePending).toBe(change);
    expect(givenPayer).toBe(change);
    expect(receivedCause).toBe(change);

    // 3. Merchant withdraws
    const wMerchant = await merchant.writeContract({
      address: contractAddress,
      abi: spareAbi,
      functionName: "withdraw",
    });
    await publicClient.waitForTransactionReceipt({ hash: wMerchant });

    const mPendingAfter = await publicClient.readContract({
      address: contractAddress,
      abi: spareAbi,
      functionName: "pending",
      args: [merchant.account.address],
    });
    expect(mPendingAfter).toBe(0n);

    // 4. Cause withdraws
    const wCause = await cause.writeContract({
      address: contractAddress,
      abi: spareAbi,
      functionName: "withdraw",
    });
    await publicClient.waitForTransactionReceipt({ hash: wCause });

    const cPendingAfter = await publicClient.readContract({
      address: contractAddress,
      abi: spareAbi,
      functionName: "pending",
      args: [cause.account.address],
    });
    expect(cPendingAfter).toBe(0n);
  });

  describe("Custom errors verification", () => {
    it("reverts BadCause when cause is merchant or self", async () => {
      await expect(
        publicClient.simulateContract({
          account: payer.account,
          address: contractAddress,
          abi: spareAbi,
          functionName: "pay",
          args: [merchant.account.address, merchant.account.address, parseEther("1"), parseEther("1"), ""],
          value: parseEther("1"),
        })
      ).rejects.toThrow("BadCause");
    });

    it("reverts WrongPayment when msg.value is wrong", async () => {
      await expect(
        publicClient.simulateContract({
          account: payer.account,
          address: contractAddress,
          abi: spareAbi,
          functionName: "pay",
          args: [merchant.account.address, cause.account.address, parseEther("1.4"), parseEther("1"), ""],
          value: parseEther("1.4"), // Expected 2.0
        })
      ).rejects.toThrow("WrongPayment");
    });

    it("reverts NothingToWithdraw when pending is zero", async () => {
      await expect(
        publicClient.simulateContract({
          account: payer.account,
          address: contractAddress,
          abi: spareAbi,
          functionName: "withdraw",
        })
      ).rejects.toThrow("NothingToWithdraw");
    });
  });
});

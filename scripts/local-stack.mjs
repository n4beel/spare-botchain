/**
 * Local stack runner and seeder for Spare (Archetype BB · Coin dish).
 *
 * Spawns anvil on port 8752 with chain id 968, deploys Spare, and seeds state per spec §5:
 * - Three registered causes (one with several receipts).
 * - Twelve payments with different units (exact multiples, 1-wei remainder, large price, memo at 64-byte limit).
 *
 * Usage:
 *   node scripts/local-stack.mjs
 */

import { spawn, execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const PORT = 8752;
const RPC = `http://127.0.0.1:${PORT}`;
const CHAIN_ID = 968;

const KEYS = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // 0: Payer (Alice)
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", // 1: Merchant (Bob)
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", // 2: Cause A (Charlie)
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", // 3: Cause B (Dave)
  "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a", // 4: Cause C (Eve)
];

const accounts = KEYS.map((k) => privateKeyToAccount(k));

const local = defineChain({
  id: CHAIN_ID,
  name: "anvil",
  nativeCurrency: { name: "Test BOT", symbol: "tBOT", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});

try {
  execSync(`fuser -k ${PORT}/tcp 2>/dev/null || true`);
} catch {}

console.log(`Starting anvil on port ${PORT}...`);
spawn(
  "anvil",
  [
    "--port",
    String(PORT),
    "--chain-id",
    String(CHAIN_ID),
    "--accounts",
    "10",
    "--balance",
    "1000",
    "--silent",
  ],
  { detached: true, stdio: "ignore" }
).unref();

const pub = createPublicClient({ chain: local, transport: http() });

for (let i = 0; i < 40; i++) {
  try {
    await pub.getBlockNumber();
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 100));
  }
}

const [alice, bob, charlie, dave, eve] = accounts.map((acc) =>
  createWalletClient({ account: acc, chain: local, transport: http() })
);

const artifact = JSON.parse(
  readFileSync("contracts/out/Spare.sol/Spare.json", "utf8")
);

console.log("Deploying Spare contract...");
const deployTx = await alice.deployContract({
  abi: artifact.abi,
  bytecode: artifact.bytecode.object,
});
const deployReceipt = await pub.waitForTransactionReceipt({ hash: deployTx });
const contractAddress = deployReceipt.contractAddress;

console.log("Registering 3 causes...");
await charlie.writeContract({
  address: contractAddress,
  abi: artifact.abi,
  functionName: "register",
  args: ["Ocean Cleanup Initiative"],
});
await dave.writeContract({
  address: contractAddress,
  abi: artifact.abi,
  functionName: "register",
  args: ["Open Source Research Fund"],
});
await eve.writeContract({
  address: contractAddress,
  abi: artifact.abi,
  functionName: "register",
  args: ["Animal Rescue Sanctuary"],
});

function spare(price, unit) {
  const rem = price % unit;
  if (rem === 0n) return 0n;
  return unit - rem;
}

console.log("Seeding 12 payments with varied units and remainders...");
const payments = [
  { price: parseEther("1.25"), unit: parseEther("1"), cause: charlie.account.address, memo: "Espresso & Croissant" },
  { price: parseEther("2.80"), unit: parseEther("1"), cause: charlie.account.address, memo: "Bookstore Paperbacks" },
  { price: parseEther("5.00"), unit: parseEther("1"), cause: charlie.account.address, memo: "Exact multiple payment" },
  { price: parseEther("0.45"), unit: parseEther("0.5"), cause: charlie.account.address, memo: "Matcha Latte" },
  { price: parseEther("14.10"), unit: parseEther("5"), cause: charlie.account.address, memo: "Dinner with friends" },
  { price: parseEther("3.99"), unit: parseEther("1"), cause: dave.account.address, memo: "USB Cable" },
  { price: parseEther("8.50"), unit: parseEther("5"), cause: dave.account.address, memo: "Art Supplies" },
  { price: parseEther("0.05"), unit: parseEther("0.1"), cause: dave.account.address, memo: "Transit Ticket" },
  { price: parseEther("1.999"), unit: parseEther("0.5"), cause: eve.account.address, memo: "Fruit market basket" },
  { price: 1n, unit: parseEther("1"), cause: eve.account.address, memo: "1-wei remainder edge case" },
  { price: parseEther("25.0"), unit: parseEther("10"), cause: eve.account.address, memo: "Workshop registration" },
  {
    price: parseEther("12.34"),
    unit: parseEther("1"),
    cause: charlie.account.address,
    memo: "1234567890123456789012345678901234567890123456789012345678901234", // 64 bytes exact limit
  },
];

for (const p of payments) {
  const s = spare(p.price, p.unit);
  const total = p.price + s;
  await alice.writeContract({
    address: contractAddress,
    abi: artifact.abi,
    functionName: "pay",
    args: [bob.account.address, p.cause, p.price, p.unit, p.memo],
    value: total,
  });
}

console.log("\n=======================================================");
console.log("              SPARE LOCAL STACK READY                  ");
console.log("=======================================================");
console.log(`Contract: ${contractAddress}`);
console.log(`RPC:      ${RPC}`);
console.log(`Chain ID: ${CHAIN_ID}`);
console.log("-------------------------------------------------------");
console.log("Role Table (Labelled Wallets):");
console.log(`  Payer (Alice):     ${alice.account.address}`);
console.log(`  Merchant (Bob):    ${bob.account.address}`);
console.log(`  Cause A (Charlie): ${charlie.account.address} (Ocean Cleanup)`);
console.log(`  Cause B (Dave):    ${dave.account.address} (Open Source Research)`);
console.log(`  Cause C (Eve):     ${eve.account.address} (Animal Sanctuary)`);
console.log("-------------------------------------------------------");
console.log("Seeded:");
console.log("  - 3 registered causes");
console.log("  - 12 payments with varied units (0.1, 0.5, 1, 5, 10 BOT)");
console.log("  - Exact multiples, 1-wei remainders, 64-byte max memo");
console.log("=======================================================\n");

const envContent = `NEXT_PUBLIC_BOTCHAIN_NETWORK=testnet
NEXT_PUBLIC_BOHR_RPC=${RPC}
NEXT_PUBLIC_CONTRACT_968=${contractAddress}
NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}
NEXT_PUBLIC_DEPLOY_BLOCK_968=1
NEXT_PUBLIC_CHAIN_ID=${CHAIN_ID}
NEXT_PUBLIC_RPC_URL=${RPC}
`;
writeFileSync(".env.local", envContent);
console.log("Wrote .env.local with deployed contract address.");
process.exit(0);

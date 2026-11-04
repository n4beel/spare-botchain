"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount, usePublicClient } from "wagmi";
import { parseEther, isAddress, type Address, type Hex } from "viem";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import BotChainGate from "@/components/botchain/BotChainGate";
import { CoinDish } from "@/components/spare/CoinDish";
import { LimitationsBlock } from "@/components/spare/LimitationsBlock";
import { useWriteContract } from "@/lib/useChainWrite";
import { spareAbi } from "@/lib/botchain/abi";
import { activeBotChain } from "@/lib/botchain/chain";
import { getDeployment, isDeployed } from "@/lib/botchain/deployment";
import { describeError } from "@/lib/errors";
import { spare, totalCost, type Cause } from "@/lib/spare";

const UNIT_PRESETS = [
  { label: "0.1 BOT", value: "0.1" },
  { label: "1 BOT", value: "1.0" },
  { label: "5 BOT", value: "5.0" },
  { label: "10 BOT", value: "10.0" },
];

export default function HomePage() {
  const router = useRouter();
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: activeBotChain.id });
  const { writeContractAsync } = useWriteContract();

  const [merchantInput, setMerchantInput] = useState("");
  const [priceInput, setPriceInput] = useState("2.4");
  const [selectedUnit, setSelectedUnit] = useState("1.0");
  const [customUnit, setCustomUnit] = useState("");
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [selectedCauseAddr, setSelectedCauseAddr] = useState("");
  const [customCauseInput, setCustomCauseInput] = useState("");
  const [isCustomCause, setIsCustomCause] = useState(false);
  const [memoInput, setMemoInput] = useState("Coffee & Beans");

  const [registeredCauses, setRegisteredCauses] = useState<{ address: Address; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const deployed = isDeployed(activeBotChain.id);
  const contractAddress = deployed ? getDeployment(activeBotChain.id).address : undefined;

  // Load registered causes
  useEffect(() => {
    async function loadCauses() {
      if (!publicClient || !contractAddress) return;
      try {
        const [addrs, details] = await publicClient.readContract({
          address: contractAddress,
          abi: spareAbi,
          functionName: "causes",
          args: [0n, 20n],
        });

        const list = addrs.map((a, i) => ({
          address: a,
          name: details[i]?.name || "Anonymous Cause",
        }));
        setRegisteredCauses(list);
        if (list.length > 0 && !selectedCauseAddr && !isCustomCause) {
          setSelectedCauseAddr(list[0].address);
        }
      } catch (err) {
        console.error("Failed to load causes:", err);
      }
    }

    loadCauses();
  }, [publicClient?.chain?.id, contractAddress]);

  // Derived values
  const effectiveUnitStr = isCustomUnit ? customUnit : selectedUnit;
  const effectiveCauseAddr = isCustomCause ? customCauseInput.trim() : selectedCauseAddr;
  const chosenCauseName =
    registeredCauses.find(
      (c) => c.address.toLowerCase() === effectiveCauseAddr.toLowerCase()
    )?.name || (effectiveCauseAddr ? `${effectiveCauseAddr.slice(0, 6)}...` : "None");

  let parsedPrice = 0n;
  let parsedUnit = 0n;
  let parsedSpare = 0n;
  let parsedTotal = 0n;
  let quoteValid = false;

  try {
    if (priceInput && !isNaN(Number(priceInput)) && Number(priceInput) > 0) {
      parsedPrice = parseEther(priceInput);
    }
    if (effectiveUnitStr && !isNaN(Number(effectiveUnitStr)) && Number(effectiveUnitStr) > 0) {
      parsedUnit = parseEther(effectiveUnitStr);
    }
    if (parsedPrice > 0n && parsedUnit > 0n) {
      parsedSpare = spare(parsedPrice, parsedUnit);
      parsedTotal = totalCost(parsedPrice, parsedUnit);
      quoteValid = true;
    }
  } catch {}

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractAddress || !publicClient) return;
    setErrorMsg(null);

    if (!isAddress(merchantInput)) {
      setErrorMsg("Please enter a valid merchant address.");
      return;
    }
    if (!isAddress(effectiveCauseAddr)) {
      setErrorMsg("Please pick or enter a valid cause address.");
      return;
    }
    if (effectiveCauseAddr.toLowerCase() === merchantInput.toLowerCase()) {
      setErrorMsg("The cause can't be the merchant.");
      return;
    }
    if (effectiveCauseAddr.toLowerCase() === address?.toLowerCase()) {
      setErrorMsg("The cause can't be yourself.");
      return;
    }
    if (!quoteValid) {
      setErrorMsg("Invalid price or unit.");
      return;
    }

    try {
      setSubmitting(true);
      const txHash = await writeContractAsync({
        address: contractAddress,
        abi: spareAbi,
        functionName: "pay",
        args: [
          merchantInput as Address,
          effectiveCauseAddr as Address,
          parsedPrice,
          parsedUnit,
          memoInput,
        ],
        value: parsedTotal,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status === "success") {
        router.push("/me");
      } else {
        setErrorMsg("Transaction mined but failed.");
      }
    } catch (err: unknown) {
      setErrorMsg(describeError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell activeTab="pay">
      <div className="space-y-8">
        {/* Intro */}
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h1 className="font-heading text-3xl sm:text-4xl text-[#2B0A15]">
            Pay &amp; Round Up
          </h1>
          <p className="text-sm font-semibold text-[#5C2434]">
            Pay, and the change goes to a cause.
          </p>
        </div>

        {/* Not Deployed Warning */}
        {!deployed && (
          <div className="p-5 bg-white border-2 border-[var(--danger)] rounded-2xl text-center">
            <h2 className="text-base font-bold text-[var(--danger)]">
              Not live on this network
            </h2>
            <p className="text-xs text-[#704444] mt-1">
              Spare is not deployed on chain {activeBotChain.id}. Switch to testnet.
            </p>
          </div>
        )}

        {/* Archetype Layout: Coin Dish Top + Pay Form */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Left Column: Coin Dish Visualizer */}
          <div className="md:col-span-5 flex flex-col items-center">
            <CoinDish
              spareAmount={parsedSpare}
              unit={parsedUnit}
              causeName={chosenCauseName}
            />

            {/* Quote Summary Sentence */}
            <div className="mt-4 p-4 w-full bg-[var(--bg-surface)] border-2 border-[#BC8579] rounded-2xl text-xs font-semibold text-[#2B0A15] leading-relaxed shadow-sm text-center">
              {quoteValid ? (
                <>
                  You pay <span className="font-bold text-[#7A1F3D]">{(Number(parsedTotal) / 1e18).toFixed(4)} BOT</span>:{" "}
                  {(Number(parsedPrice) / 1e18).toFixed(4)} to merchant and{" "}
                  <span className="font-bold text-[#1F7A3D]">{(Number(parsedSpare) / 1e18).toFixed(4)}</span> to {chosenCauseName}.
                </>
              ) : (
                "Enter payment details to view quote."
              )}
            </div>
          </div>

          {/* Right Column: Interactive Pay Form */}
          <div className="md:col-span-7">
            <BotChainGate>
              <div className="p-6 bg-[var(--bg-surface)] border-4 border-[#BC8579] rounded-3xl shadow-sm">
                <form onSubmit={handlePay} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#2B0A15] mb-1">
                      Merchant Recipient Address
                    </label>
                    <input
                      type="text"
                      required
                      value={merchantInput}
                      onChange={(e) => setMerchantInput(e.target.value.trim())}
                      placeholder="0x..."
                      className="w-full px-3.5 py-2.5 bg-white border-2 border-[#BC8579] rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#7A1F3D]"
                    />
                    <span className="text-[11px] font-medium text-[#704444]">
                      Gets exactly the specified price with 0 change deducted.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#2B0A15] mb-1">
                      Price to Pay (BOT)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.0001"
                      required
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      placeholder="e.g. 2.4"
                      className="w-full px-3.5 py-2.5 bg-white border-2 border-[#BC8579] rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#7A1F3D]"
                    />
                  </div>

                  {/* Round-up Unit Segmented Control */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#2B0A15] mb-1.5">
                      Round-up Unit
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {UNIT_PRESETS.map((u) => (
                        <button
                          key={u.value}
                          type="button"
                          onClick={() => {
                            setSelectedUnit(u.value);
                            setIsCustomUnit(false);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer ${
                            !isCustomUnit && selectedUnit === u.value
                              ? "bg-[#7A1F3D] text-white border-[#7A1F3D]"
                              : "bg-white text-[#5C2434] border-[#BC8579] hover:bg-[#FFEAE2]"
                          }`}
                        >
                          {u.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setIsCustomUnit(true)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer ${
                          isCustomUnit
                            ? "bg-[#7A1F3D] text-white border-[#7A1F3D]"
                            : "bg-white text-[#5C2434] border-[#BC8579] hover:bg-[#FFEAE2]"
                        }`}
                      >
                        Custom Unit
                      </button>
                    </div>

                    {isCustomUnit && (
                      <input
                        type="number"
                        step="any"
                        min="0.001"
                        max="1000"
                        placeholder="Custom unit in BOT (0.001 - 1000)"
                        value={customUnit}
                        onChange={(e) => setCustomUnit(e.target.value)}
                        className="mt-2 w-full px-3 py-2 bg-white border-2 border-[#BC8579] rounded-xl text-xs font-mono"
                      />
                    )}
                  </div>

                  {/* Round Cause Picker */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#2B0A15]">
                        Beneficiary Cause
                      </label>
                      <Link href="/causes" className="text-[11px] font-bold text-[#7A1F3D] underline">
                        View All Causes
                      </Link>
                    </div>

                    {parsedSpare === 0n && (
                      <p className="text-[11px] text-[#704444] font-medium mb-1.5">
                        Price is an exact multiple: Pick a cause anyway; nothing will be sent to it.
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      {registeredCauses.map((c) => (
                        <button
                          key={c.address}
                          type="button"
                          onClick={() => {
                            setSelectedCauseAddr(c.address);
                            setIsCustomCause(false);
                          }}
                          className={`p-2.5 rounded-xl text-left border-2 text-xs transition-all cursor-pointer flex items-center gap-2 ${
                            !isCustomCause && selectedCauseAddr.toLowerCase() === c.address.toLowerCase()
                              ? "bg-[#FFEAE2] border-[#7A1F3D] text-[#7A1F3D] font-bold"
                              : "bg-white border-[#BC8579] text-[#2B0A15] hover:bg-[#FFF5F0]"
                          }`}
                        >
                          <span className="w-5 h-5 rounded-full bg-[#E5A93C] text-[10px] font-black text-[#5C3B00] flex items-center justify-center shrink-0">
                            ★
                          </span>
                          <span className="truncate">{c.name}</span>
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => setIsCustomCause(true)}
                        className={`p-2.5 rounded-xl text-left border-2 text-xs transition-all cursor-pointer flex items-center gap-2 ${
                          isCustomCause
                            ? "bg-[#FFEAE2] border-[#7A1F3D] text-[#7A1F3D] font-bold"
                            : "bg-white border-[#BC8579] text-[#2B0A15] hover:bg-[#FFF5F0]"
                        }`}
                      >
                        <span className="w-5 h-5 rounded-full bg-[#BC8579] text-[10px] font-black text-white flex items-center justify-center shrink-0">
                          +
                        </span>
                        <span>Another address…</span>
                      </button>
                    </div>

                    {isCustomCause && (
                      <input
                        type="text"
                        placeholder="Enter custom cause address (0x...)"
                        value={customCauseInput}
                        onChange={(e) => setCustomCauseInput(e.target.value)}
                        className="mt-2 w-full px-3 py-2 bg-white border-2 border-[#BC8579] rounded-xl text-xs font-mono"
                      />
                    )}
                  </div>

                  {/* Memo */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#2B0A15] mb-1">
                      Payment Note / Memo ({memoInput.length}/64 bytes)
                    </label>
                    <input
                      type="text"
                      maxLength={64}
                      value={memoInput}
                      onChange={(e) => setMemoInput(e.target.value)}
                      placeholder="e.g. Lunch or Invoice #42"
                      className="w-full px-3.5 py-2 bg-white border-2 border-[#BC8579] rounded-xl text-sm"
                    />
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-red-50 border border-[var(--danger)] text-[var(--danger)] rounded-xl text-xs font-bold">
                      {errorMsg}
                    </div>
                  )}

                  <Button
                    type="submit"
                    tone="action"
                    scale="chunky"
                    className="w-full mt-2"
                    spinning={submitting}
                    disabled={!quoteValid}
                  >
                    {submitting
                      ? "Processing Payment..."
                      : `Pay & Round Up (${(Number(parsedTotal) / 1e18).toFixed(4)} BOT)`}
                  </Button>
                </form>
              </div>
            </BotChainGate>
          </div>
        </div>

        {/* Limitations block */}
        <LimitationsBlock />
      </div>
    </PageShell>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount, usePublicClient } from "wagmi";
import { formatEther, type Address } from "viem";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import BotChainGate from "@/components/botchain/BotChainGate";
import { useWriteContract } from "@/lib/useChainWrite";
import { spareAbi } from "@/lib/botchain/abi";
import { activeBotChain } from "@/lib/botchain/chain";
import { getDeployment, isDeployed } from "@/lib/botchain/deployment";
import { describeError } from "@/lib/errors";

interface CauseItem {
  address: Address;
  name: string;
  registeredBlock: number;
  totalReceived: bigint;
}

export default function CausesPage() {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: activeBotChain.id });
  const { writeContractAsync } = useWriteContract();

  const [causes, setCauses] = useState<CauseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [registerName, setRegisterName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const deployed = isDeployed(activeBotChain.id);
  const contractAddress = deployed ? getDeployment(activeBotChain.id).address : undefined;

  async function loadCauses() {
    if (!publicClient || !contractAddress) {
      setLoading(false);
      return;
    }

    try {
      const [addrs, details] = await publicClient.readContract({
        address: contractAddress,
        abi: spareAbi,
        functionName: "causes",
        args: [0n, 50n],
      });

      const items: CauseItem[] = [];
      for (let i = 0; i < addrs.length; i++) {
        const a = addrs[i];
        const rec = await publicClient.readContract({
          address: contractAddress,
          abi: spareAbi,
          functionName: "received",
          args: [a],
        });

        items.push({
          address: a,
          name: details[i]?.name || "Anonymous Cause",
          registeredBlock: details[i]?.registeredBlock || 0,
          totalReceived: rec,
        });
      }

      setCauses(items);
    } catch (err) {
      console.error("Failed to load causes:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCauses();
    const interval = setInterval(loadCauses, 8000);
    return () => clearInterval(interval);
  }, [publicClient?.chain?.id, contractAddress]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractAddress || !publicClient || !registerName) return;
    setErrorMsg(null);
    setStatusMsg(null);
    setSubmitting(true);

    try {
      const txHash = await writeContractAsync({
        address: contractAddress,
        abi: spareAbi,
        functionName: "register",
        args: [registerName],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status === "success") {
        setStatusMsg("Successfully registered your cause name!");
        setRegisterName("");
        await loadCauses();
      } else {
        setErrorMsg("Registration failed.");
      }
    } catch (err) {
      setErrorMsg(describeError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell activeTab="causes">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="font-heading text-3xl text-[#2B0A15]">
            Beneficiary Causes
          </h1>
          <p className="text-sm font-semibold text-[#5C2434] mt-1">
            Registered organizations and initiatives receiving round-up change.
          </p>
        </div>

        {/* Register or rename your cause */}
        <BotChainGate>
          <div className="p-6 bg-[var(--bg-surface)] border-4 border-[#BC8579] rounded-3xl shadow-sm space-y-4">
            <h2 className="font-heading text-lg font-bold text-[#2B0A15]">
              Label Your Wallet as a Cause
            </h2>
            <p className="text-xs text-[#704444] font-medium leading-relaxed">
              Anyone can register a public label (1..40 bytes) for their wallet to appear in the cause directory.
            </p>

            <form onSubmit={handleRegister} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                required
                maxLength={40}
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                placeholder="e.g. Wildlife Haven / River Cleanup"
                className="flex-1 px-3.5 py-2 bg-white border-2 border-[#BC8579] rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#7A1F3D]"
              />
              <Button
                type="submit"
                tone="action"
                scale="regular"
                spinning={submitting}
              >
                {submitting ? "Registering..." : "Register / Rename"}
              </Button>
            </form>

            {statusMsg && (
              <div className="p-3 bg-green-50 border border-[var(--success)] text-[var(--success)] rounded-xl text-xs font-bold">
                {statusMsg}
              </div>
            )}
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-[var(--danger)] text-[var(--danger)] rounded-xl text-xs font-bold">
                {errorMsg}
              </div>
            )}
          </div>
        </BotChainGate>

        {/* Causes List */}
        <div className="space-y-4">
          <h2 className="font-heading text-xl font-bold text-[#2B0A15]">
            Registered Causes ({causes.length})
          </h2>

          {loading ? (
            <div className="p-8 text-center text-xs font-bold text-[#704444] animate-pulse">
              Loading causes from BOT Chain...
            </div>
          ) : causes.length === 0 ? (
            <div className="p-8 bg-[var(--bg-surface)] border-2 border-[#BC8579] rounded-2xl text-center text-xs font-bold text-[#704444]">
              No causes registered yet. Be the first to register above!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {causes.map((c) => (
                <div
                  key={c.address}
                  className="p-5 bg-[var(--bg-surface)] border-2 border-[#BC8579] rounded-2xl shadow-sm flex flex-col justify-between gap-3 hover:border-[#7A1F3D] transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#E5A93C] text-xs font-black text-[#5C3B00] flex items-center justify-center">
                        ★
                      </span>
                      <h3 className="font-heading text-base font-bold text-[#2B0A15]">
                        {c.name}
                      </h3>
                    </div>
                    <p className="font-mono text-xs text-[#704444] mt-2">
                      {c.address}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#D99D8D] flex justify-between items-center text-xs font-bold">
                    <span className="text-[#5C2434]">Total Received:</span>
                    <span className="font-heading text-sm text-[#7A1F3D]">
                      {formatEther(c.totalReceived)} BOT
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

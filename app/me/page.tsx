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

interface PastPayment {
  id: bigint;
  merchant: Address;
  cause: Address;
  price: bigint;
  spare: bigint;
  memo: string;
}

export default function MyGivingPage() {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: activeBotChain.id });
  const { writeContractAsync } = useWriteContract();

  const [totalGiven, setTotalGiven] = useState<bigint | null>(null);
  const [pendingBalance, setPendingBalance] = useState<bigint | null>(null);
  const [payments, setPayments] = useState<PastPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const deployed = isDeployed(activeBotChain.id);
  const contractAddress = deployed ? getDeployment(activeBotChain.id).address : undefined;

  async function loadUserStats() {
    if (!publicClient || !contractAddress || !address) {
      setLoading(false);
      return;
    }

    try {
      const g = await publicClient.readContract({
        address: contractAddress,
        abi: spareAbi,
        functionName: "given",
        args: [address],
      });
      setTotalGiven(g);

      const p = await publicClient.readContract({
        address: contractAddress,
        abi: spareAbi,
        functionName: "pending",
        args: [address],
      });
      setPendingBalance(p);

      // Query past payments made by this user
      const logs = await publicClient.getLogs({
        address: contractAddress,
        event: {
          type: "event",
          name: "Paid",
          inputs: [
            { name: "id", type: "uint256", indexed: true },
            { name: "payer", type: "address", indexed: true },
            { name: "merchant", type: "address", indexed: true },
            { name: "cause", type: "address", indexed: false },
            { name: "price", type: "uint128", indexed: false },
            { name: "spare", type: "uint128", indexed: false },
            { name: "unit", type: "uint128", indexed: false },
            { name: "memo", type: "string", indexed: false },
          ],
        },
        args: { payer: address },
        fromBlock: 0n,
      });

      const list = logs.map((l: any) => ({
        id: l.args.id,
        merchant: l.args.merchant,
        cause: l.args.cause,
        price: l.args.price,
        spare: l.args.spare,
        memo: l.args.memo,
      }));
      setPayments(list.reverse());
    } catch (err) {
      console.error("Failed to load user stats:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUserStats();
    const interval = setInterval(loadUserStats, 8000);
    return () => clearInterval(interval);
  }, [publicClient?.chain?.id, contractAddress, address]);

  const handleWithdraw = async () => {
    if (!contractAddress || !publicClient) return;
    setErrorMsg(null);
    setStatusMsg(null);
    setSubmitting(true);

    try {
      const txHash = await writeContractAsync({
        address: contractAddress,
        abi: spareAbi,
        functionName: "withdraw",
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status === "success") {
        setStatusMsg("Withdrawal complete! Funds delivered to wallet.");
        await loadUserStats();
      } else {
        setErrorMsg("Withdrawal failed on chain.");
      }
    } catch (err) {
      setErrorMsg(describeError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell activeTab="me">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="font-heading text-3xl text-[#2B0A15]">
            My Giving Tray &amp; Escrow
          </h1>
          <p className="text-sm font-semibold text-[#5C2434] mt-1">
            Track your round-up contributions and withdraw pending earnings or refunds.
          </p>
        </div>

        <BotChainGate>
          <div className="space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-6 bg-[var(--bg-surface)] border-4 border-[#BC8579] rounded-3xl shadow-sm space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#704444]">
                  Total Change Given
                </span>
                <p className="font-heading text-3xl font-extrabold text-[#7A1F3D]">
                  {totalGiven !== null ? `${formatEther(totalGiven)} BOT` : "—"}
                </p>
                <p className="text-xs text-[#5C2434] font-medium">
                  Contributed across all rounded payments.
                </p>
              </div>

              <div className="p-6 bg-[var(--bg-surface)] border-4 border-[#BC8579] rounded-3xl shadow-sm flex flex-col justify-between gap-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#704444]">
                    Pending Escrow Balance
                  </span>
                  <p className="font-heading text-3xl font-extrabold text-[#2B0A15]">
                    {pendingBalance !== null ? `${formatEther(pendingBalance)} BOT` : "—"}
                  </p>
                  <p className="text-xs text-[#5C2434] font-medium">
                    Earnings as merchant or cause, or pull payment credits.
                  </p>
                </div>

                <Button
                  tone="action"
                  scale="regular"
                  onClick={handleWithdraw}
                  disabled={submitting || !pendingBalance || pendingBalance === 0n}
                  spinning={submitting}
                >
                  {submitting ? "Withdrawing..." : "Withdraw Escrow"}
                </Button>
              </div>
            </div>

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

            {/* Tray of Past Change: visual stacked coins & roll */}
            <div className="p-6 bg-[var(--bg-surface)] border-4 border-[#BC8579] rounded-3xl shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-heading text-xl font-bold text-[#2B0A15]">
                  Your Giving History &amp; Receipts ({payments.length})
                </h2>
                <span className="text-xs font-mono text-[#704444]">
                  Paper roll receipts
                </span>
              </div>

              {loading ? (
                <div className="p-8 text-center text-xs font-bold text-[#704444] animate-pulse">
                  Loading your payment history...
                </div>
              ) : payments.length === 0 ? (
                <div className="p-8 bg-[#FFEAE2] border-2 border-dashed border-[#BC8579] rounded-2xl text-center text-xs font-bold text-[#704444]">
                  No rounded payments made yet. Use the pay form to make your first payment!
                </div>
              ) : (
                <div className="divide-y divide-[#D99D8D]">
                  {payments.map((p) => (
                    <div
                      key={p.id.toString()}
                      className="py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#7A1F3D]">
                            Receipt #{p.id.toString()}
                          </span>
                          {p.memo && (
                            <span className="font-semibold text-[#2B0A15]">
                              · {p.memo}
                            </span>
                          )}
                        </div>
                        <p className="text-[#704444] font-mono text-[11px]">
                          Merchant: {p.merchant.slice(0, 6)}... · Cause: {p.cause.slice(0, 6)}...
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[#5C2434] block">Price: {formatEther(p.price)} BOT</span>
                          <span className="font-bold text-[#1F7A3D] block">
                            Change: +{formatEther(p.spare)} BOT
                          </span>
                        </div>

                        <Link
                          href={`/receipt/${p.id.toString()}`}
                          className="px-3 py-1 bg-[#FFEAE2] border border-[#BC8579] rounded-lg font-bold text-[#7A1F3D] hover:bg-white"
                        >
                          View Receipt →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </BotChainGate>
      </div>
    </PageShell>
  );
}

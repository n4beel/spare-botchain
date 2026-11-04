"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { usePublicClient } from "wagmi";
import { formatEther, type Address } from "viem";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { spareAbi } from "@/lib/botchain/abi";
import { activeBotChain } from "@/lib/botchain/chain";
import { getDeployment, isDeployed } from "@/lib/botchain/deployment";
import { getLogsAtBlock } from "@/lib/logs";

interface ReceiptData {
  id: bigint;
  payer: Address;
  merchant: Address;
  cause: Address;
  price: bigint;
  spare: bigint;
  unit: bigint;
  memo: string;
}

export default function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const paymentId = BigInt(resolvedParams.id);
  const publicClient = usePublicClient({ chainId: activeBotChain.id });

  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);

  const deployed = isDeployed(activeBotChain.id);
  const contractAddress = deployed ? getDeployment(activeBotChain.id).address : undefined;

  useEffect(() => {
    async function loadReceipt() {
      if (!publicClient || !contractAddress) {
        setLoading(false);
        return;
      }

      try {
        // Query Paid logs chunked/all
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
          args: { id: paymentId },
          fromBlock: 0n,
        });

        if (logs && logs.length > 0) {
          const l = logs[0] as any;
          setReceipt({
            id: paymentId,
            payer: l.args.payer,
            merchant: l.args.merchant,
            cause: l.args.cause,
            price: l.args.price,
            spare: l.args.spare,
            unit: l.args.unit,
            memo: l.args.memo,
          });
        }
      } catch (err) {
        console.error("Failed to load receipt:", err);
      } finally {
        setLoading(false);
      }
    }

    loadReceipt();
  }, [publicClient?.chain?.id, contractAddress, paymentId]);

  return (
    <PageShell>
      <div className="max-w-md mx-auto space-y-6">
        <Link
          href="/"
          className="text-xs font-bold text-[#5C2434] hover:text-[#2B0A15] flex items-center gap-1"
        >
          ← Back to Payment
        </Link>

        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-[#704444] animate-pulse">
            Loading receipt #{paymentId.toString()}...
          </div>
        ) : !receipt ? (
          <div className="p-8 bg-white border-2 border-[var(--danger)] rounded-2xl text-center space-y-2">
            <p className="font-bold text-sm text-[var(--danger)]">
              Receipt #{paymentId.toString()} not found
            </p>
            <p className="text-xs text-[#704444]">
              No on-chain payment record exists with this receipt ID.
            </p>
          </div>
        ) : (
          /* Paper roll archetype styled receipt */
          <div className="bg-[#FFFDFB] border-4 border-[#BC8579] rounded-2xl p-6 shadow-md space-y-4 font-mono text-xs">
            <div className="text-center border-b-2 border-dashed border-[#BC8579] pb-4 space-y-1">
              <span className="text-xl">🧾</span>
              <h1 className="font-heading font-bold text-lg text-[#2B0A15]">
                SPARE RECEIPT
              </h1>
              <p className="text-[11px] text-[#704444]">
                Transaction #{receipt.id.toString()}
              </p>
            </div>

            <div className="space-y-2 pt-2 text-[#2B0A15]">
              <div className="flex justify-between">
                <span className="text-[#704444]">Payer:</span>
                <span className="font-bold">{receipt.payer.slice(0, 6)}...{receipt.payer.slice(-4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#704444]">Merchant:</span>
                <span className="font-bold">{receipt.merchant.slice(0, 6)}...{receipt.merchant.slice(-4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#704444]">Cause:</span>
                <span className="font-bold">{receipt.cause.slice(0, 6)}...{receipt.cause.slice(-4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#704444]">Round Unit:</span>
                <span className="font-bold">{formatEther(receipt.unit)} BOT</span>
              </div>

              {receipt.memo && (
                <div className="pt-2 border-t border-dashed border-[#D99D8D]">
                  <span className="text-[#704444] block mb-0.5">Note:</span>
                  <span className="font-sans text-xs italic">{receipt.memo}</span>
                </div>
              )}
            </div>

            <div className="border-t-2 border-dashed border-[#BC8579] pt-3 space-y-1.5 font-bold">
              <div className="flex justify-between text-[#5C2434]">
                <span>Merchant Price:</span>
                <span>{formatEther(receipt.price)} BOT</span>
              </div>
              <div className="flex justify-between text-[#1F7A3D]">
                <span>Cause Change:</span>
                <span>+{formatEther(receipt.spare)} BOT</span>
              </div>
              <div className="flex justify-between text-sm text-[#7A1F3D] pt-2 border-t border-[#BC8579]">
                <span>TOTAL PAID:</span>
                <span>{formatEther(receipt.price + receipt.spare)} BOT</span>
              </div>
            </div>

            <div className="pt-4 border-t border-dashed border-[#BC8579] text-center">
              <button
                onClick={() => {
                  if (typeof navigator !== "undefined") {
                    navigator.clipboard.writeText(window.location.href);
                    alert("Receipt link copied!");
                  }
                }}
                className="px-4 py-2 bg-[#FFEAE2] border-2 border-[#BC8579] rounded-xl text-xs font-bold text-[#7A1F3D] hover:bg-white cursor-pointer"
              >
                Share / Copy Link
              </button>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

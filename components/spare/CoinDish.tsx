"use client";

import React from "react";
import { formatEther } from "viem";
import { coinsFor } from "@/lib/spare";

interface CoinDishProps {
  spareAmount: bigint;
  unit: bigint;
  causeName: string;
}

export function CoinDish({ spareAmount, unit, causeName }: CoinDishProps) {
  const numCoins = coinsFor(spareAmount, unit);
  const spareFormatted = (Number(spareAmount) / 1e18).toFixed(4);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-[var(--bg-surface)] border-4 border-[#BC8579] rounded-3xl shadow-sm space-y-4">
      <div className="relative w-48 h-48 sm:w-56 sm:h-56 coin-dish-container flex items-center justify-center overflow-hidden">
        {/* SVG Shallow dish details */}
        <svg
          viewBox="0 0 200 200"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          <ellipse
            cx="100"
            cy="100"
            rx="85"
            ry="85"
            fill="none"
            stroke="#D99D8D"
            strokeWidth="3"
            strokeDasharray="4 4"
          />
          <ellipse
            cx="100"
            cy="100"
            rx="65"
            ry="65"
            fill="none"
            stroke="#BC8579"
            strokeWidth="1.5"
            opacity="0.6"
          />
        </svg>

        {/* Scattered coins inside dish */}
        {numCoins === 0 ? (
          <div className="text-center p-3 z-10">
            <span className="text-3xl block opacity-40">🪙</span>
            <span className="text-xs font-bold text-[#704444] mt-1 block">
              No change needed
            </span>
          </div>
        ) : (
          <div className="relative w-32 h-32 flex items-center justify-center z-10">
            {Array.from({ length: numCoins }).map((_, idx) => {
              // Deterministic scattered layout angles
              const angle = (idx * (360 / numCoins) * Math.PI) / 180;
              const radius = 24 + (idx % 2) * 14;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;

              return (
                <div
                  key={idx}
                  className="absolute coin-element w-9 h-9 rounded-full bg-[#E5A93C] border-2 border-[#8A5A00] flex items-center justify-center text-xs font-black text-[#5C3B00] shadow-md select-none"
                  style={{
                    transform: `translate(${x}px, ${y}px) rotate(${idx * 45}deg)`,
                  }}
                  title="Spare Coin"
                >
                  BOT
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Big Friendly Change Indicator */}
      <div className="text-center space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-[#704444] block">
          Your Change
        </span>
        <p className="font-heading text-3xl font-extrabold text-[#7A1F3D]">
          {spareAmount > 0n ? `${spareFormatted} BOT` : "0.0000 BOT"}
        </p>
        <p className="text-xs font-semibold text-[#5C2434]">
          {spareAmount > 0n ? (
            <>Rounds up to cause: <strong>{causeName || "Selected Cause"}</strong></>
          ) : (
            "Price is already an exact multiple."
          )}
        </p>
      </div>
    </div>
  );
}

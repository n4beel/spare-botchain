import React from "react";

export function LimitationsBlock() {
  return (
    <div className="p-5 bg-[var(--bg-surface)] border-2 border-[var(--border-default)] rounded-2xl shadow-sm space-y-2.5">
      <h3 className="font-heading text-sm font-bold text-[#2B0A15]">
        What isn&apos;t checked
      </h3>
      <ul className="text-xs text-[#5C2434] space-y-1.5 list-disc list-inside font-medium leading-relaxed">
        <li>
          Any address can be a cause. A name proves nothing.
        </li>
        <li>
          The merchant gets exactly the price. The cause gets only the change.
        </li>
        <li>
          It doesn&apos;t know what you bought.
        </li>
      </ul>
    </div>
  );
}

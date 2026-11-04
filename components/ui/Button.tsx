import React from "react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: "action" | "soft" | "destructive" | "bare";
  scale?: "compact" | "regular" | "chunky";
  spinning?: boolean;
}

export function Button({
  children,
  className = "",
  tone = "action",
  scale = "regular",
  spinning,
  disabled,
  ...props
}: ButtonProps) {
  let toneClass = "bg-[var(--accent)] text-white hover:brightness-110 active:scale-[0.98]";
  if (tone === "soft") {
    toneClass = "bg-[#FFEAE2] text-[var(--accent)] border border-[var(--border-default)] hover:bg-white";
  } else if (tone === "destructive") {
    toneClass = "bg-[var(--danger)] text-white hover:brightness-110";
  } else if (tone === "bare") {
    toneClass = "bg-transparent text-[var(--text-secondary)] hover:bg-[#FFEAE2]";
  }

  let scaleClass = "px-4 py-2 text-sm rounded-xl";
  if (scale === "compact") {
    scaleClass = "px-2.5 py-1 text-xs rounded-lg";
  } else if (scale === "chunky") {
    scaleClass = "px-6 py-3.5 text-base rounded-2xl font-bold shadow-md";
  }

  return (
    <button
      disabled={disabled || spinning}
      className={`font-semibold cursor-pointer select-none inline-flex items-center justify-center gap-2 transition-transform disabled:opacity-40 disabled:cursor-not-allowed ${toneClass} ${scaleClass} ${className}`}
      {...props}
    >
      {spinning && (
        <span className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}

export default Button;

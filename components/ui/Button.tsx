import React from "react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: "action" | "soft" | "destructive" | "bare";
  scale?: "compact" | "regular" | "chunky";
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  spinning?: boolean;
  loading?: boolean;
}

export function Button({
  children,
  className = "",
  tone,
  scale,
  variant,
  size,
  spinning,
  loading,
  disabled,
  ...props
}: ButtonProps) {
  const isSpinning = spinning || loading;
  const effectiveTone = tone || (variant === "secondary" ? "soft" : variant === "danger" ? "destructive" : variant === "ghost" ? "bare" : "action");
  const effectiveScale = scale || (size === "sm" ? "compact" : size === "lg" ? "chunky" : "regular");

  let toneClass = "bg-[var(--accent)] text-white hover:brightness-110 active:scale-[0.98]";
  if (effectiveTone === "soft") {
    toneClass = "bg-[#FFEAE2] text-[var(--accent)] border border-[var(--border-default)] hover:bg-white";
  } else if (effectiveTone === "destructive") {
    toneClass = "bg-[var(--danger)] text-white hover:brightness-110";
  } else if (effectiveTone === "bare") {
    toneClass = "bg-transparent text-[var(--text-secondary)] hover:bg-[#FFEAE2]";
  }

  let scaleClass = "px-4 py-2 text-sm rounded-xl";
  if (effectiveScale === "compact") {
    scaleClass = "px-2.5 py-1 text-xs rounded-lg";
  } else if (effectiveScale === "chunky") {
    scaleClass = "px-6 py-3.5 text-base rounded-2xl font-bold shadow-md";
  }

  return (
    <button
      disabled={disabled || isSpinning}
      className={`font-semibold cursor-pointer select-none inline-flex items-center justify-center gap-2 transition-transform disabled:opacity-40 disabled:cursor-not-allowed ${toneClass} ${scaleClass} ${className}`}
      {...props}
    >
      {isSpinning && (
        <span className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}

export default Button;

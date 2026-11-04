import React from "react";

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "dish" | "tray" | "paper";
}

export function Panel({
  children,
  className = "",
  variant = "dish",
  ...props
}: PanelProps) {
  let baseClass = "p-5 ";
  if (variant === "dish") {
    baseClass +=
      "bg-[var(--bg-surface)] border-2 border-[var(--border-default)] rounded-2xl shadow-sm ";
  } else if (variant === "tray") {
    baseClass +=
      "bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl ";
  } else {
    // Paper roll effect
    baseClass +=
      "bg-[#FFFDFB] border-y-2 border-x border-[var(--border-default)] rounded-md shadow-sm ";
  }

  return (
    <div className={`${baseClass} ${className}`} {...props}>
      {children}
    </div>
  );
}

export default Panel;

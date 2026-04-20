import { ReactNode } from "react";

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p
      className="inline-block text-xs font-semibold uppercase tracking-widest mb-4"
      style={{
        color: "#818cf8",
        fontFamily: "'DM Sans', sans-serif",
        letterSpacing: "0.1em",
      }}
    >
      {children}
    </p>
  );
}

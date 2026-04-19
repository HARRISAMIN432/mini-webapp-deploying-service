"use client";

export function AuthDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 h-px bg-white/8" />
      <span className="text-gray-600 text-xs uppercase tracking-widest font-medium">
        {label}
      </span>
      <div className="flex-1 h-px bg-white/8" />
    </div>
  );
}

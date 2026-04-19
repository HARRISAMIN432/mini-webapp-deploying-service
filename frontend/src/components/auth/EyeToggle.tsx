"use client";

import { cn } from "@/lib/utils";

interface EyeToggleProps {
  show: boolean;
  onToggle: () => void;
  className?: string;
}

export function EyeToggle({ show, onToggle, className }: EyeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      tabIndex={-1}
      className={cn(
        "text-gray-500 hover:text-gray-300 transition-colors focus:outline-none",
        className,
      )}
      aria-label={show ? "Hide password" : "Show password"}
    >
      {show ? (
        <svg
          viewBox="0 0 24 24"
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}

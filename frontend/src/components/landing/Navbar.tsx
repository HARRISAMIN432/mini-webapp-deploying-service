"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 md:px-12 transition-all duration-300"
      style={{
        height: "64px",
        background: scrolled ? "rgba(5,6,8,0.85)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled
          ? "1px solid rgba(255,255,255,0.07)"
          : "1px solid transparent",
      }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 group">
        <div
          className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            boxShadow: "0 0 20px rgba(99,102,241,0.35)",
          }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
          </svg>
        </div>
        <span
          className="text-white font-bold text-[17px]"
          style={{ fontFamily: "'Sora', sans-serif", letterSpacing: "-0.03em" }}
        >
          ShipStack
        </span>
      </Link>

      {/* Center links */}
      <div className="hidden md:flex items-center gap-9">
        {[
          { label: "Features", href: "#features" },
          { label: "How it works", href: "#how" },
          { label: "Pricing", href: "#pricing" },
          { label: "Reviews", href: "#testimonials" },
          { label: "Docs", href: "/docs" },
        ].map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="text-sm font-medium transition-colors duration-200"
            style={{ color: "#6b7280", fontFamily: "'DM Sans', sans-serif" }}
            onMouseEnter={(e) =>
              ((e.target as HTMLElement).style.color = "white")
            }
            onMouseLeave={(e) =>
              ((e.target as HTMLElement).style.color = "#6b7280")
            }
          >
            {link.label}
          </a>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Link
          href="/auth/login"
          className="text-sm font-medium px-4 py-2 rounded-[10px] transition-all duration-200"
          style={{ color: "#9ca3af", fontFamily: "'DM Sans', sans-serif" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "rgba(255,255,255,0.05)";
            (e.currentTarget as HTMLElement).style.color = "white";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "#9ca3af";
          }}
        >
          Sign in
        </Link>
        <Link
          href="/auth/sign-up"
          className="group flex items-center gap-1.5 text-sm font-semibold text-white px-5 py-[9px] rounded-[10px] transition-all duration-200"
          style={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            boxShadow:
              "0 0 0 1px rgba(99,102,241,0.5), 0 4px 20px rgba(99,102,241,0.25)",
            fontFamily: "'DM Sans', sans-serif",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow =
              "0 0 0 1px rgba(99,102,241,0.7), 0 8px 30px rgba(99,102,241,0.4)";
            (e.currentTarget as HTMLElement).style.transform =
              "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow =
              "0 0 0 1px rgba(99,102,241,0.5), 0 4px 20px rgba(99,102,241,0.25)";
            (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
          }}
        >
          Get started free
          <svg
            viewBox="0 0 24 24"
            width="13"
            height="13"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="group-hover:translate-x-0.5 transition-transform duration-150"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>
    </nav>
  );
}

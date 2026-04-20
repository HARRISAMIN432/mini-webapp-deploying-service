"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const HeroCanvas = dynamic(
  () => import("./HeroCanvas").then((m) => ({ default: m.HeroCanvas })),
  { ssr: false },
);

export function HeroSection() {
  const badgeRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const proofRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let gsap: typeof import("gsap").gsap;
    async function animate() {
      const mod = await import("gsap");
      gsap = mod.gsap;
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(badgeRef.current, { opacity: 0, y: 20, duration: 0.8 }, 0.2)
        .from(titleRef.current, { opacity: 0, y: 44, duration: 1 }, 0.4)
        .from(subRef.current, { opacity: 0, y: 30, duration: 0.8 }, 0.65)
        .from(actionsRef.current, { opacity: 0, y: 24, duration: 0.8 }, 0.85)
        .from(proofRef.current, { opacity: 0, y: 20, duration: 0.8 }, 1.05);

      // Animate counters
      const stats = [
        { id: "stat-teams", target: 12000, decimal: false },
        { id: "stat-uptime", target: 99.99, decimal: true },
        { id: "stat-regions", target: 40, decimal: false },
        { id: "stat-time", target: 28, decimal: false },
      ];
      stats.forEach(({ id, target, decimal }) => {
        const el = document.getElementById(id);
        if (!el) return;
        setTimeout(() => {
          const start = Date.now();
          const duration = 2200;
          function tick() {
            const progress = Math.min((Date.now() - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const val = target * eased;
            if (el)
              el.textContent = decimal
                ? val.toFixed(2)
                : val >= 1000
                  ? Math.round(val).toLocaleString()
                  : String(Math.round(val));
            if (progress < 1) requestAnimationFrame(tick);
          }
          tick();
        }, 1200);
      });
    }
    animate();
  }, []);

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ paddingTop: "64px" }}
    >
      {/* Three.js canvas */}
      <HeroCanvas />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage:
            "radial-gradient(ellipse 80% 80% at 50% 40%, black 30%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 80% at 50% 40%, black 30%, transparent 100%)",
        }}
      />

      {/* Top glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "-100px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "900px",
          height: "600px",
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(99,102,241,0.18) 0%, transparent 65%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center max-w-[860px] px-6">
        {/* Badge */}
        <div
          ref={badgeRef}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8"
          style={{
            background: "rgba(99,102,241,0.1)",
            border: "1px solid rgba(99,102,241,0.25)",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: "#818cf8",
              boxShadow: "0 0 8px rgba(129,140,248,0.9)",
              animation: "pulse-dot 2s infinite",
            }}
          />
          <span
            className="text-sm font-medium"
            style={{ color: "#818cf8", fontFamily: "'DM Sans', sans-serif" }}
          >
            Now with AI-powered deployment suggestions
          </span>
        </div>

        {/* Title */}
        <h1
          ref={titleRef}
          className="text-white mb-6"
          style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: "clamp(52px, 7.5vw, 88px)",
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 1.0,
          }}
        >
          Deploy once.
          <br />
          <span
            style={{
              background:
                "linear-gradient(135deg, #818cf8 0%, #c084fc 60%, #e879f9 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Run everywhere.
          </span>
        </h1>

        {/* Subtitle */}
        <p
          ref={subRef}
          className="mx-auto mb-10"
          style={{
            fontSize: "18px",
            color: "#6b7280",
            lineHeight: 1.7,
            maxWidth: "520px",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Push your repo. Get a live, globally distributed URL in under 30
          seconds. No infrastructure knowledge required — just ship.
        </p>

        {/* CTAs */}
        <div
          ref={actionsRef}
          className="flex items-center justify-center gap-3.5 flex-wrap"
        >
          <Link
            href="/auth/sign-up"
            className="group inline-flex items-center gap-2 text-white font-semibold px-7 py-3.5 rounded-xl transition-all duration-200"
            style={{
              fontSize: "15px",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              boxShadow:
                "0 0 0 1px rgba(99,102,241,0.5), 0 4px 28px rgba(99,102,241,0.28)",
              fontFamily: "'DM Sans', sans-serif",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform =
                "translateY(-2px)";
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 0 0 1px rgba(99,102,241,0.7), 0 10px 40px rgba(99,102,241,0.4)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform =
                "translateY(0)";
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 0 0 1px rgba(99,102,241,0.5), 0 4px 28px rgba(99,102,241,0.28)";
            }}
          >
            Start deploying free
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="group-hover:translate-x-0.5 transition-transform"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
          <button
            onClick={() =>
              document
                .getElementById("how")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="inline-flex items-center gap-2 font-medium px-7 py-3.5 rounded-xl transition-all duration-200"
            style={{
              fontSize: "15px",
              color: "#9ca3af",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.1)",
              fontFamily: "'DM Sans', sans-serif",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "rgba(255,255,255,0.07)";
              (e.currentTarget as HTMLElement).style.color = "white";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "rgba(255,255,255,0.03)";
              (e.currentTarget as HTMLElement).style.color = "#9ca3af";
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Watch demo
          </button>
        </div>

        {/* Social proof stats */}
        <div
          ref={proofRef}
          className="mt-14 flex items-center justify-center gap-6 flex-wrap"
        >
          {[
            { id: "stat-teams", label: "Teams deploying", suffix: "+" },
            { id: "stat-uptime", label: "Uptime SLA %", suffix: "" },
            { id: "stat-regions", label: "Edge regions", suffix: "+" },
            { id: "stat-time", label: "Avg. deploy sec", suffix: "s" },
          ].map((s, i) => (
            <div key={s.id} className="flex items-center gap-6">
              <div className="flex flex-col items-center gap-0.5">
                <span
                  id={s.id}
                  className="font-bold"
                  style={{
                    fontFamily: "'Sora', sans-serif",
                    fontSize: "22px",
                    background:
                      "linear-gradient(135deg, #818cf8 0%, #c084fc 60%, #e879f9 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  0
                </span>
                <span
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{
                    color: "#374151",
                    fontFamily: "'DM Sans', sans-serif",
                    letterSpacing: "0.05em",
                  }}
                >
                  {s.label}
                </span>
              </div>
              {i < 3 && <div className="w-px h-8 bg-white/[0.07]" />}
            </div>
          ))}
        </div>
      </div>

      {/* Scroll cue */}
      <div
        className="absolute bottom-9 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{
          color: "#374151",
          fontSize: "10px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          fontFamily: "'DM Sans', sans-serif",
          animation: "bounce-cue 2s infinite",
        }}
      >
        <span>scroll</span>
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      <style jsx>{`
        @keyframes pulse-dot {
          0%,
          100% {
            opacity: 1;
            box-shadow: 0 0 8px rgba(129, 140, 248, 0.8);
          }
          50% {
            opacity: 0.7;
            box-shadow: 0 0 16px rgba(129, 140, 248, 1);
          }
        }
        @keyframes bounce-cue {
          0%,
          100% {
            transform: translateX(-50%) translateY(0);
          }
          50% {
            transform: translateX(-50%) translateY(6px);
          }
        }
      `}</style>
    </section>
  );
}

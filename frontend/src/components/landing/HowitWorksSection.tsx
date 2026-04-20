"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { SectionLabel } from "./SectionLabel";

type TerminalLine = { cls: string; text: string } | null;

const STEPS: { title: string; desc: string; lines: TerminalLine[] }[] = [
  {
    title: "Connect your repository",
    desc: "Link your GitHub, GitLab, or Bitbucket repo in one click. ShipStack detects your framework and sets up the pipeline automatically.",
    lines: [
      { cls: "prompt", text: "~/my-app" },
      { cls: "cmd", text: " $ shipstack link" },
      null,
      { cls: "info", text: "  Connecting to GitHub..." },
      { cls: "success", text: "  ✓ Linked to github.com/you/my-app" },
      { cls: "success", text: "  ✓ Detected: Next.js 14" },
      { cls: "success", text: "  ✓ Build pipeline configured" },
    ],
  },
  {
    title: "Push your code",
    desc: "Every git push triggers an automatic build. Our AI analyzes your project, selects optimal build settings, and starts deployment instantly.",
    lines: [
      { cls: "prompt", text: "~/my-app" },
      { cls: "cmd", text: " $ git push origin main" },
      null,
      { cls: "info", text: "  → Build triggered [#42]" },
      { cls: "warn", text: "  ⟳ Installing dependencies..." },
      { cls: "warn", text: "  ⟳ Compiling TypeScript..." },
      { cls: "warn", text: "  ⟳ Optimizing bundle..." },
    ],
  },
  {
    title: "Watch it deploy globally",
    desc: "Your app is built, containerized, and distributed to all 40+ edge regions in parallel. Real-time logs stream directly to your terminal.",
    lines: [
      { cls: "success", text: "  ✓ Build completed in 18.4s" },
      null,
      { cls: "info", text: "  → Deploying to edge network..." },
      { cls: "info", text: "  ↑ us-east-1  ✓" },
      { cls: "info", text: "  ↑ eu-west-1  ✓" },
      { cls: "info", text: "  ↑ ap-south-1 ✓" },
      { cls: "success", text: "  ✓ All 40 regions live" },
    ],
  },
  {
    title: "Live URL, instantly",
    desc: "Get your production URL within seconds. Custom domains, SSL, and analytics set up automatically. Your users never feel the transition.",
    lines: [
      { cls: "success", text: "  ✓ Deployment complete!" },
      null,
      { cls: "cmd", text: "  Production URL:" },
      { cls: "url", text: "  https://my-app.shipstack.app" },
      null,
      { cls: "cmd", text: "  Preview URL:" },
      { cls: "url", text: "  https://pr-42.my-app.shipstack.app" },
    ],
  },
];

const LINE_COLORS: Record<string, string> = {
  prompt: "#4b5563",
  cmd: "#e5e7eb",
  info: "#60a5fa",
  success: "#4ade80",
  warn: "#fbbf24",
  url: "#c084fc",
};

export function HowItWorksSection() {
  const [active, setActive] = useState(0);
  const [visibleLines, setVisibleLines] = useState<boolean[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  const runStep = useCallback((idx: number) => {
    setActive(idx);
    setVisibleLines([]);
    const lines = STEPS[idx].lines;
    lines.forEach((_, i) => {
      setTimeout(
        () =>
          setVisibleLines((prev) => {
            const next = [...prev];
            next[i] = true;
            return next;
          }),
        i * 130,
      );
    });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(
      () => runStep((idx + 1) % STEPS.length),
      3800,
    );
  }, []);

  useEffect(() => {
    runStep(0);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [runStep]);

  // GSAP reveal
  useEffect(() => {
    async function animate() {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);
      if (!sectionRef.current) return;
      gsap.from(sectionRef.current.querySelectorAll(".how-reveal"), {
        opacity: 0,
        y: 35,
        stagger: 0.1,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 80%" },
      });
    }
    animate();
  }, []);

  const handleStepClick = (idx: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    runStep(idx);
  };

  return (
    <section
      id="how"
      ref={sectionRef}
      className="py-28 px-6 md:px-12 relative overflow-hidden"
      style={{ background: "#050608" }}
    >
      {/* Subtle background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(99,102,241,0.05) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-[1160px] mx-auto relative z-10">
        <div className="how-reveal mb-4">
          <SectionLabel>🔄 How it works</SectionLabel>
        </div>
        <h2
          className="how-reveal text-white mb-16"
          style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: "clamp(32px, 4vw, 52px)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
          }}
        >
          From git push to{" "}
          <span
            style={{
              background:
                "linear-gradient(135deg, #818cf8 0%, #c084fc 60%, #e879f9 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            live in 30 seconds
          </span>
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          {/* Steps */}
          <div className="how-reveal flex flex-col">
            {STEPS.map((step, i) => (
              <button
                key={i}
                onClick={() => handleStepClick(i)}
                className="flex gap-6 py-7 text-left transition-all duration-200"
                style={{
                  borderBottom:
                    i < STEPS.length - 1
                      ? "1px solid rgba(255,255,255,0.07)"
                      : "none",
                  paddingTop: i === 0 ? 0 : undefined,
                  paddingBottom: i === STEPS.length - 1 ? 0 : undefined,
                  background: "none",
                  border: i < STEPS.length - 1 ? "none" : "none",
                  cursor: "pointer",
                  borderBottomColor:
                    i < STEPS.length - 1
                      ? "rgba(255,255,255,0.07)"
                      : "transparent",
                  borderBottomWidth: i < STEPS.length - 1 ? "1px" : "0",
                  borderBottomStyle: "solid",
                }}
              >
                {/* Number */}
                <div
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 transition-all duration-300"
                  style={{
                    background:
                      active === i
                        ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
                        : "#0d0f14",
                    border:
                      active === i
                        ? "none"
                        : "1px solid rgba(255,255,255,0.07)",
                    boxShadow:
                      active === i ? "0 0 20px rgba(99,102,241,0.3)" : "none",
                    color: active === i ? "white" : "#4b5563",
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  0{i + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div
                    className="font-bold mb-2 transition-colors duration-200"
                    style={{
                      fontFamily: "'Sora', sans-serif",
                      fontSize: "16px",
                      color: active === i ? "white" : "#6b7280",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {step.title}
                  </div>
                  <div
                    className="transition-colors duration-200"
                    style={{
                      color: active === i ? "#6b7280" : "#374151",
                      fontSize: "14px",
                      lineHeight: 1.65,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {step.desc}
                  </div>

                  {/* Progress bar */}
                  {active === i && (
                    <div
                      className="mt-4 h-[2px] rounded-full overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.07)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          background: "linear-gradient(90deg,#6366f1,#8b5cf6)",
                          animation: "progress-run 3.8s linear forwards",
                        }}
                      />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Terminal */}
          <div
            className="how-reveal rounded-[20px] overflow-hidden"
            style={{
              background: "#0a0b0f",
              border: "1px solid rgba(255,255,255,0.07)",
              height: "360px",
            }}
          >
            {/* Terminal bar */}
            <div
              className="flex items-center gap-2 px-4 py-3"
              style={{
                background: "#111318",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span
                className="ml-2"
                style={{
                  color: "#4b5563",
                  fontSize: "12px",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                shipstack — deploy
              </span>
            </div>

            {/* Terminal output */}
            <div
              className="p-5"
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "13px",
                lineHeight: 2,
              }}
            >
              {STEPS[active].lines.map((line, i) => (
                <div
                  key={`${active}-${i}`}
                  className="flex items-baseline gap-2 transition-all duration-300"
                  style={{
                    opacity: visibleLines[i] ? 1 : 0,
                    transform: visibleLines[i] ? "none" : "translateY(4px)",
                  }}
                >
                  {line === null ? (
                    <span>&nbsp;</span>
                  ) : (
                    <span style={{ color: LINE_COLORS[line.cls] || "#e5e7eb" }}>
                      {line.text}
                    </span>
                  )}
                </div>
              ))}
              <span
                className="inline-block w-2 h-4 ml-1 align-middle"
                style={{
                  background: "#818cf8",
                  animation: "blink-cur 1s infinite",
                  opacity: visibleLines[STEPS[active].lines.length - 1] ? 1 : 0,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes progress-run {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
        @keyframes blink-cur {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }
      `}</style>
    </section>
  );
}

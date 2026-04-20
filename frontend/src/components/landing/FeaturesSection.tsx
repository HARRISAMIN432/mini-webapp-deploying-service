"use client";

import { useEffect, useRef } from "react";
import {
  Zap,
  Globe,
  GitBranch,
  ShieldCheck,
  BarChart3,
  Terminal,
} from "lucide-react";
import { SectionLabel } from "./SectionLabel";

const FEATURES = [
  {
    icon: <Zap size={22} />,
    color: "#818cf8",
    bg: "rgba(99,102,241,0.12)",
    num: "01",
    title: "Instant auto-detection",
    desc: "Push your code and ShipStack automatically detects your framework — Next.js, Remix, SvelteKit, Astro, or Docker — and configures the build pipeline. Zero configuration required.",
    tag: "Framework-aware",
  },
  {
    icon: <Globe size={22} />,
    color: "#c084fc",
    bg: "rgba(139,92,246,0.12)",
    num: "02",
    title: "Global edge CDN",
    desc: "Deploy to 40+ edge regions simultaneously. Your users get served from the nearest node, cutting latency to under 10ms for 95% of global traffic. Automatic failover included.",
    tag: "40+ regions",
  },
  {
    icon: <GitBranch size={22} />,
    color: "#818cf8",
    bg: "rgba(99,102,241,0.12)",
    num: "03",
    title: "Preview deployments",
    desc: "Every pull request gets its own isolated preview URL — staging, feature branches, everything. Share with stakeholders before merging. Automatic cleanup on close.",
    tag: "Git-integrated",
  },
  {
    icon: <ShieldCheck size={22} />,
    color: "#e879f9",
    bg: "rgba(232,121,249,0.1)",
    num: "04",
    title: "Zero-trust security",
    desc: "Automatic TLS certificates, DDoS protection, and WAF on every deployment. Secrets are encrypted at rest and injected at runtime. SOC 2 Type II compliant.",
    tag: "SOC 2 Type II",
  },
  {
    icon: <BarChart3 size={22} />,
    color: "#818cf8",
    bg: "rgba(99,102,241,0.12)",
    num: "05",
    title: "Real-time observability",
    desc: "Streaming logs, performance metrics, error tracking, and custom alerts — all in a single pane of glass. No separate monitoring setup required.",
    tag: "Full-stack traces",
  },
  {
    icon: <Terminal size={22} />,
    color: "#c084fc",
    bg: "rgba(139,92,246,0.12)",
    num: "06",
    title: "CLI + API first",
    desc: "Deploy with shipstack deploy in one command. Full REST API and webhooks for CI/CD integration. GitHub Actions, GitLab CI, and CircleCI ready out of the box.",
    tag: "API-first",
  },
];

export function FeaturesSection() {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function animate() {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      if (!gridRef.current) return;
      gsap.from(gridRef.current.querySelectorAll(".feature-card"), {
        opacity: 0,
        y: 40,
        stagger: 0.09,
        duration: 0.75,
        ease: "power3.out",
        scrollTrigger: { trigger: gridRef.current, start: "top 82%" },
      });
    }
    animate();
  }, []);

  return (
    <section
      id="features"
      className="py-28 px-6 md:px-12"
      style={{ background: "#050608" }}
    >
      <div className="max-w-[1160px] mx-auto">
        <div className="text-center mb-16">
          <SectionLabel>⚡ Platform features</SectionLabel>
          <h2
            className="text-white mx-auto mb-4"
            style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: "clamp(32px, 4vw, 52px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              maxWidth: "560px",
            }}
          >
            Everything you need to ship fast
          </h2>
          <p
            className="mx-auto"
            style={{
              fontSize: "17px",
              color: "#6b7280",
              maxWidth: "440px",
              lineHeight: 1.7,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Built for developers who hate configuration and love shipping.
          </p>
        </div>

        <div
          ref={gridRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 overflow-hidden rounded-[20px]"
          style={{
            gap: "1px",
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {FEATURES.map((f) => (
            <div
              key={f.num}
              className="feature-card group relative p-8 transition-colors duration-200"
              style={{ background: "#0d0f14" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#111318";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#0d0f14";
              }}
            >
              {/* Hover glow */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-none"
                style={{
                  background:
                    "radial-gradient(circle at 0% 0%, rgba(99,102,241,0.07) 0%, transparent 60%)",
                }}
              />

              <div className="relative z-10">
                {/* Icon */}
                <div
                  className="relative w-12 h-12 rounded-[14px] flex items-center justify-center mb-5"
                  style={{ background: f.bg, color: f.color }}
                >
                  {f.icon}
                  <span
                    className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold"
                    style={{
                      background: "#050608",
                      border: "1px solid rgba(255,255,255,0.07)",
                      color: "#818cf8",
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    {f.num}
                  </span>
                </div>

                <h3
                  className="text-white mb-2.5"
                  style={{
                    fontFamily: "'Sora', sans-serif",
                    fontSize: "17px",
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {f.title}
                </h3>
                <p
                  style={{
                    color: "#6b7280",
                    fontSize: "14px",
                    lineHeight: 1.7,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {f.desc}
                </p>
                <span
                  className="inline-block mt-5 px-2.5 py-1 rounded-md text-[11px] font-semibold"
                  style={{
                    background: "rgba(99,102,241,0.1)",
                    color: "#818cf8",
                    border: "1px solid rgba(99,102,241,0.2)",
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
                  {f.tag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

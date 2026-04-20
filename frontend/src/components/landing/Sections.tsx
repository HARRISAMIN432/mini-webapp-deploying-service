"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { SectionLabel } from "./SectionLabel";

// ── STATS ──────────────────────────────────────────────────────────────────

const STATS = [
  {
    id: "s1",
    target: 12400,
    decimal: false,
    label: "Teams shipping",
    sub: "and growing every day",
  },
  {
    id: "s2",
    target: 99.99,
    decimal: true,
    label: "Uptime SLA %",
    sub: "over the last 12 months",
  },
  {
    id: "s3",
    target: 2800000,
    decimal: false,
    label: "Deployments served",
    sub: "this quarter alone",
  },
  {
    id: "s4",
    target: 28,
    decimal: false,
    label: "Avg. deploy time (s)",
    sub: "end-to-end, globally",
  },
];

export function StatsSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    async function animate() {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      STATS.forEach(({ id, target, decimal }) => {
        ScrollTrigger.create({
          trigger: `#${id}`,
          start: "top 80%",
          onEnter: () => {
            const el = document.getElementById(id);
            if (!el) return;
            const start = Date.now();
            const dur = 2200;
            function tick() {
              const p = Math.min((Date.now() - start) / dur, 1);
              const eased = 1 - Math.pow(1 - p, 3);
              const val = target * eased;
              if (el)
                el.textContent = decimal
                  ? val.toFixed(2)
                  : val >= 1_000_000
                    ? `${(val / 1_000_000).toFixed(1)}M`
                    : val >= 1000
                      ? Math.round(val).toLocaleString()
                      : String(Math.round(val));
              if (p < 1) requestAnimationFrame(tick);
            }
            tick();
          },
        });
      });

      if (sectionRef.current) {
        gsap.from(sectionRef.current.querySelectorAll(".stat-card"), {
          opacity: 0,
          y: 30,
          stagger: 0.1,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: { trigger: sectionRef.current, start: "top 82%" },
        });
      }
    }
    animate();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-20 px-6 md:px-12"
      style={{
        background: "#0d0f14",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="max-w-[1160px] mx-auto">
        <div
          className="grid grid-cols-2 lg:grid-cols-4 overflow-hidden rounded-[20px]"
          style={{
            gap: "1px",
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {STATS.map((s, i) => (
            <div
              key={s.id}
              className="stat-card relative text-center py-10 px-8 transition-colors duration-200"
              style={{ background: "#0d0f14" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "#111318")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "#0d0f14")
              }
            >
              <div
                id={s.id}
                className="mb-2 leading-none"
                style={{
                  fontFamily: "'Sora', sans-serif",
                  fontSize: "48px",
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                  background:
                    "linear-gradient(135deg, #818cf8 0%, #c084fc 60%, #e879f9 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                0
              </div>
              <div className="text-white text-[15px] font-semibold mb-1.5">
                {s.label}
              </div>
              <div
                style={{
                  color: "#374151",
                  fontSize: "13px",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {s.sub}
              </div>
              {/* Bottom accent line */}
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-px rounded-full"
                style={{
                  width: "60%",
                  background: "linear-gradient(90deg,#6366f1,#8b5cf6)",
                  opacity: 0.4,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── PRICING ────────────────────────────────────────────────────────────────

const PLANS = [
  {
    badge: "Free",
    badgeStyle: {
      background: "rgba(255,255,255,0.07)",
      color: "#9ca3af",
      border: "1px solid rgba(255,255,255,0.1)",
    },
    name: "Hobby",
    desc: "Perfect for side projects and early experiments",
    price: "$0",
    period: "/ month",
    featured: false,
    cta: "Get started free",
    ctaHref: "/auth/sign-up",
    ctaStyle: "outline",
    features: [
      { ok: true, text: "3 projects" },
      { ok: true, text: "100 GB bandwidth / month" },
      { ok: true, text: "Shared edge network" },
      { ok: true, text: "Auto TLS certificates" },
      { ok: false, text: "Custom domains" },
      { ok: false, text: "Team access" },
    ],
  },
  {
    badge: "Most popular",
    badgeStyle: {
      background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
      color: "white",
      boxShadow: "0 0 16px rgba(99,102,241,0.3)",
    },
    name: "Pro",
    desc: "For growing teams who ship daily and need more control",
    price: "$29",
    period: "/ month",
    featured: true,
    cta: "Start free trial",
    ctaHref: "/auth/sign-up",
    ctaStyle: "primary",
    features: [
      { ok: true, text: "Unlimited projects" },
      { ok: true, text: "1 TB bandwidth / month" },
      { ok: true, text: "Dedicated edge nodes" },
      { ok: true, text: "Custom domains + wildcard SSL" },
      { ok: true, text: "Team access (up to 10)" },
      { ok: true, text: "Priority support" },
    ],
  },
  {
    badge: "Enterprise",
    badgeStyle: {
      background: "rgba(139,92,246,0.15)",
      color: "#c084fc",
      border: "1px solid rgba(139,92,246,0.25)",
    },
    name: "Scale",
    desc: "For high-traffic apps with enterprise compliance requirements",
    price: "Custom",
    period: "",
    featured: false,
    cta: "Contact sales",
    ctaHref: "mailto:enterprise@shipstack.io",
    ctaStyle: "outline",
    features: [
      { ok: true, text: "Unlimited everything" },
      { ok: true, text: "Dedicated infrastructure" },
      { ok: true, text: "SOC 2 Type II + HIPAA" },
      { ok: true, text: "SSO / SAML integration" },
      { ok: true, text: "SLA with uptime guarantee" },
      { ok: true, text: "Dedicated success manager" },
    ],
  },
];

export function PricingSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    async function animate() {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);
      if (!sectionRef.current) return;
      gsap.from(sectionRef.current.querySelectorAll(".pricing-card"), {
        opacity: 0,
        y: 40,
        stagger: 0.12,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 80%" },
      });
    }
    animate();
  }, []);

  return (
    <section
      id="pricing"
      ref={sectionRef}
      className="py-28 px-6 md:px-12"
      style={{ background: "#050608" }}
    >
      <div className="max-w-[1160px] mx-auto">
        <div className="text-center mb-16">
          <SectionLabel>💳 Simple pricing</SectionLabel>
          <h2
            className="text-white mb-4"
            style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: "clamp(32px, 4vw, 52px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
            }}
          >
            Pay for what you ship
          </h2>
          <p
            style={{
              fontSize: "17px",
              color: "#6b7280",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            No hidden fees. No infrastructure costs. Upgrade or downgrade at any
            time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className="pricing-card relative rounded-[20px] p-8 transition-all duration-300"
              style={{
                background: plan.featured
                  ? "linear-gradient(160deg, rgba(99,102,241,0.08) 0%, #0d0f14 60%)"
                  : "#0d0f14",
                border: plan.featured
                  ? "1px solid rgba(99,102,241,0.4)"
                  : "1px solid rgba(255,255,255,0.07)",
                transform: plan.featured ? "scale(1.02)" : undefined,
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.transform =
                  plan.featured
                    ? "scale(1.02) translateY(-4px)"
                    : "translateY(-4px)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.transform =
                  plan.featured ? "scale(1.02)" : "translateY(0)")
              }
            >
              {plan.featured && (
                <div
                  className="absolute inset-0 rounded-[20px] pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(99,102,241,0.12), transparent 50%)",
                  }}
                />
              )}
              <div className="relative z-10">
                <span
                  className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-5"
                  style={{ letterSpacing: "0.08em", ...plan.badgeStyle }}
                >
                  {plan.badge}
                </span>
                <h3
                  className="text-white mb-2"
                  style={{
                    fontFamily: "'Sora', sans-serif",
                    fontSize: "20px",
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {plan.name}
                </h3>
                <p
                  style={{
                    color: "#6b7280",
                    fontSize: "14px",
                    fontFamily: "'DM Sans', sans-serif",
                    marginBottom: "24px",
                  }}
                >
                  {plan.desc}
                </p>
                <div className="flex items-baseline gap-1 mb-7">
                  <span
                    className="text-white"
                    style={{
                      fontFamily: "'Sora', sans-serif",
                      fontSize: plan.price === "Custom" ? "32px" : "44px",
                      fontWeight: 800,
                      letterSpacing: "-0.04em",
                      lineHeight: plan.price === "Custom" ? "1.4" : "1",
                    }}
                  >
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span
                      style={{
                        color: "#374151",
                        fontSize: "14px",
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {plan.period}
                    </span>
                  )}
                </div>

                <div
                  className="h-px mb-6"
                  style={{ background: "rgba(255,255,255,0.07)" }}
                />

                <ul className="flex flex-col gap-3 mb-7">
                  {plan.features.map((f) => (
                    <li
                      key={f.text}
                      className="flex items-center gap-2.5"
                      style={{
                        fontSize: "14px",
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {f.ok ? (
                        <CheckCircle2
                          size={16}
                          className="flex-shrink-0"
                          style={{ color: "#4ade80" }}
                        />
                      ) : (
                        <XCircle
                          size={16}
                          className="flex-shrink-0"
                          style={{ color: "#374151" }}
                        />
                      )}
                      <span style={{ color: f.ok ? "#9ca3af" : "#374151" }}>
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.ctaHref}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                  style={
                    plan.ctaStyle === "primary"
                      ? {
                          background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                          color: "white",
                          boxShadow:
                            "0 0 0 1px rgba(99,102,241,0.4), 0 4px 20px rgba(99,102,241,0.2)",
                          fontFamily: "'DM Sans', sans-serif",
                        }
                      : {
                          background: "transparent",
                          color: "#9ca3af",
                          border: "1px solid rgba(255,255,255,0.1)",
                          fontFamily: "'DM Sans', sans-serif",
                        }
                  }
                  onMouseEnter={(e) => {
                    if (plan.ctaStyle === "primary") {
                      (e.currentTarget as HTMLElement).style.transform =
                        "translateY(-1px)";
                      (e.currentTarget as HTMLElement).style.boxShadow =
                        "0 0 0 1px rgba(99,102,241,0.6), 0 8px 30px rgba(99,102,241,0.35)";
                    } else {
                      (e.currentTarget as HTMLElement).style.color = "white";
                      (e.currentTarget as HTMLElement).style.background =
                        "rgba(255,255,255,0.05)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (plan.ctaStyle === "primary") {
                      (e.currentTarget as HTMLElement).style.transform =
                        "translateY(0)";
                      (e.currentTarget as HTMLElement).style.boxShadow =
                        "0 0 0 1px rgba(99,102,241,0.4), 0 4px 20px rgba(99,102,241,0.2)";
                    } else {
                      (e.currentTarget as HTMLElement).style.color = "#9ca3af";
                      (e.currentTarget as HTMLElement).style.background =
                        "transparent";
                    }
                  }}
                >
                  {plan.cta}
                  {plan.ctaStyle === "primary" && <ArrowRight size={14} />}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── TESTIMONIALS ───────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    quote:
      "ShipStack cut our deployment pipeline from 45 minutes to under 90 seconds. Our team ships 3× faster and we've eliminated an entire DevOps position. The ROI was immediate.",
    name: "Sara Rashid",
    role: "CTO, Nexora",
    initials: "SR",
    grad: "linear-gradient(135deg,#6366f1,#8b5cf6)",
    featured: true,
  },
  {
    quote:
      "We migrated 14 microservices from AWS to ShipStack in a single afternoon. Preview deployments alone saved our team from 3 critical production bugs last month.",
    name: "Ahmed Malik",
    role: "Principal Engineer, Strata AI",
    initials: "AM",
    grad: "linear-gradient(135deg,#0ea5e9,#6366f1)",
    featured: false,
  },
  {
    quote:
      "The observability stack is incredible. We went from blind production deploys to real-time error tracking, custom alerts, and performance traces — without any additional setup.",
    name: "Lena Kovacs",
    role: "Head of Platform, Meridian",
    initials: "LK",
    grad: "linear-gradient(135deg,#f59e0b,#ef4444)",
    featured: false,
  },
];

const Stars = () => (
  <div className="flex gap-1 mb-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <svg key={i} width="14" height="14" viewBox="0 0 20 20" fill="#f59e0b">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))}
  </div>
);

export function TestimonialsSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    async function animate() {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);
      if (!sectionRef.current) return;
      gsap.from(sectionRef.current.querySelectorAll(".tcard"), {
        opacity: 0,
        y: 36,
        stagger: 0.12,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 80%" },
      });
    }
    animate();
  }, []);

  return (
    <section
      id="testimonials"
      ref={sectionRef}
      className="py-28 px-6 md:px-12"
      style={{
        background: "#0d0f14",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="max-w-[1160px] mx-auto">
        <div className="text-center mb-16">
          <SectionLabel>💬 What teams say</SectionLabel>
          <h2
            className="text-white"
            style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: "clamp(32px, 4vw, 52px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
            }}
          >
            Loved by developers
            <br />
            worldwide
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="tcard rounded-[16px] p-7 transition-all duration-200"
              style={{
                background: "#0d0f14",
                border: t.featured
                  ? "1px solid rgba(99,102,241,0.2)"
                  : "1px solid rgba(255,255,255,0.07)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor =
                  "rgba(99,102,241,0.25)";
                (e.currentTarget as HTMLElement).style.transform =
                  "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = t.featured
                  ? "rgba(99,102,241,0.2)"
                  : "rgba(255,255,255,0.07)";
                (e.currentTarget as HTMLElement).style.transform =
                  "translateY(0)";
              }}
            >
              <Stars />
              <p
                style={{
                  color: "#9ca3af",
                  fontSize: "14px",
                  lineHeight: 1.7,
                  fontFamily: "'DM Sans', sans-serif",
                  marginBottom: "20px",
                }}
              >
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: t.grad }}
                >
                  {t.initials}
                </div>
                <div>
                  <div className="text-white text-sm font-semibold">
                    {t.name}
                  </div>
                  <div
                    style={{
                      color: "#374151",
                      fontSize: "12px",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {t.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA SECTION ────────────────────────────────────────────────────────────

export function CtaSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    async function animate() {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);
      if (!sectionRef.current) return;
      gsap.from(sectionRef.current.querySelector(".cta-box"), {
        opacity: 0,
        scale: 0.95,
        duration: 0.9,
        ease: "back.out(1.4)",
        scrollTrigger: { trigger: sectionRef.current, start: "top 80%" },
      });
    }
    animate();
  }, []);

  return (
    <section
      id="cta"
      ref={sectionRef}
      className="py-28 px-6 md:px-12 relative overflow-hidden"
      style={{ background: "#050608" }}
    >
      <div className="max-w-[860px] mx-auto">
        <div
          className="cta-box relative rounded-[28px] p-16 text-center overflow-hidden"
          style={{
            background:
              "linear-gradient(160deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 50%, transparent 100%)",
            border: "1px solid rgba(99,102,241,0.25)",
          }}
        >
          {/* Top glow */}
          <div
            className="absolute -top-16 left-1/2 -translate-x-1/2 w-96 h-48 rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse, rgba(99,102,241,0.25) 0%, transparent 70%)",
            }}
          />
          <div className="relative z-10">
            <div className="mb-5 flex justify-center">
              <SectionLabel>🚀 Start shipping today</SectionLabel>
            </div>
            <h2
              className="text-white mb-5"
              style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: "clamp(36px, 5vw, 56px)",
                fontWeight: 800,
                letterSpacing: "-0.04em",
                lineHeight: 1.1,
              }}
            >
              Your next deployment
              <br />
              is 30 seconds away
            </h2>
            <p
              className="mx-auto mb-10"
              style={{
                fontSize: "17px",
                color: "#6b7280",
                maxWidth: "460px",
                lineHeight: 1.7,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Join 12,000+ teams who chose ShipStack to ship faster, with less
              ops overhead. Free forever, upgrade when you&apos;re ready.
            </p>
            <div className="flex justify-center gap-3.5 flex-wrap">
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
                Deploy your first app free
                <ArrowRight
                  size={16}
                  className="group-hover:translate-x-0.5 transition-transform"
                />
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center font-medium px-7 py-3.5 rounded-xl transition-all duration-200"
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
                Read the docs
              </Link>
            </div>
            <p
              style={{
                color: "#374151",
                fontSize: "13px",
                marginTop: "20px",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              No credit card required · Free SSL · Deploy in under 30 seconds
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── FOOTER ─────────────────────────────────────────────────────────────────

const FOOTER_COLS = [
  {
    title: "Product",
    links: ["Features", "Pricing", "Changelog", "Roadmap", "Status"],
  },
  {
    title: "Developers",
    links: [
      "Documentation",
      "CLI Reference",
      "API Reference",
      "SDKs",
      "Open Source",
    ],
  },
  { title: "Company", links: ["About", "Blog", "Careers", "Press", "Contact"] },
  {
    title: "Legal",
    links: ["Privacy Policy", "Terms of Service", "Cookie Policy", "Security"],
  },
];

export function Footer() {
  return (
    <footer
      className="px-6 md:px-12 pt-16 pb-8"
      style={{
        background: "#050608",
        borderTop: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="max-w-[1160px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-12 mb-16">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
              <div
                className="w-8 h-8 rounded-[10px] flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  boxShadow: "0 0 16px rgba(99,102,241,0.3)",
                }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
                  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                </svg>
              </div>
              <span
                className="text-white font-bold text-base"
                style={{
                  fontFamily: "'Sora', sans-serif",
                  letterSpacing: "-0.02em",
                }}
              >
                ShipStack
              </span>
            </Link>
            <p
              style={{
                color: "#374151",
                fontSize: "13px",
                lineHeight: 1.7,
                maxWidth: "200px",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              The fastest way to go from code to globally distributed production
              URL.
            </p>
          </div>

          {/* Columns */}
          {FOOTER_COLS.map((col) => (
            <div key={col.title}>
              <h4
                className="text-white text-[13px] font-bold mb-4"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                {col.title}
              </h4>
              {col.links.map((link) => (
                <Link
                  key={link}
                  href="#"
                  className="block text-[13px] mb-2.5 transition-colors duration-200"
                  style={{
                    color: "#374151",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.color = "#9ca3af")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.color = "#374151")
                  }
                >
                  {link}
                </Link>
              ))}
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <span
            style={{
              color: "#374151",
              fontSize: "13px",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            © 2026 ShipStack, Inc. All rights reserved.
          </span>
          <div className="flex gap-6">
            {["Privacy", "Terms", "Security", "Status"].map((l) => (
              <Link
                key={l}
                href="#"
                className="text-[13px] transition-colors duration-200"
                style={{
                  color: "#374151",
                  fontFamily: "'DM Sans', sans-serif",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.color = "#9ca3af")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.color = "#374151")
                }
              >
                {l}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

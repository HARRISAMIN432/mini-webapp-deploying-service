"use client";

import { ReactNode, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Zap, Ship, Globe, BarChart3, Menu, X } from "lucide-react";

interface AuthLayoutClientProps {
  children: ReactNode;
}

export function AuthLayoutClient({ children }: AuthLayoutClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const pathname = usePathname();

  // Track mouse position for dynamic glow effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Dynamic glow style based on mouse position
  const dynamicGlowStyle = {
    background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, 
      rgba(99,102,241,0.15) 0%, 
      transparent 50%)`,
  };

  return (
    <div className="min-h-screen bg-[#050608] flex font-sans">
      {/* ── Left panel — branding (now with client-side interactivity) ── */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[44%] relative flex-col overflow-hidden border-r border-white/[0.06]">
        {/* Dynamic glow that follows mouse */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={dynamicGlowStyle}
        />

        {/* Animated noise texture overlay with client-side animation */}
        <div
          className="absolute inset-0 opacity-[0.03] animate-subtlePulse"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Interactive grid with hover states */}
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            backgroundImage: `linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)`,
            backgroundSize: "56px 56px",
          }}
        />

        {/* Rest of your left panel content remains similar but can add interactivity */}
        <div className="relative z-10 flex flex-col h-full p-10 xl:p-14">
          <Link
            href="/"
            className="flex items-center gap-3 group w-fit"
            onMouseEnter={(e) => {
              // Add custom animation on hover
              e.currentTarget.style.transform = "scale(1.02)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl"
              style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                boxShadow:
                  "0 0 20px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
              </svg>
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">
              ShipStack
            </span>
          </Link>

          {/* Interactive badge with client-side counter */}
          <div className="flex-1 flex flex-col justify-center gap-12 mt-8">
            <div>
              <InteractiveBadge />

              <h1 className="text-[2.6rem] xl:text-5xl font-bold text-white leading-[1.08] tracking-tight mb-5">
                Deploy once.
                <br />
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Run everywhere.
                </span>
              </h1>
              <p className="text-[#6b7280] text-[15px] leading-relaxed max-w-[340px]">
                Push your repo. Get a live, globally distributed URL in under 30
                seconds — no infrastructure knowledge needed.
              </p>
            </div>

            {/* Interactive feature grid with hover animations */}
            <InteractiveFeatureGrid />

            {/* Animated stats row */}
            <AnimatedStatsRow />
          </div>

          {/* Testimonial with carousel functionality */}
          <div className="mt-6">
            <TestimonialCarousel />
          </div>
        </div>
      </div>

      {/* ── Right panel — forms with client-side state ── */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Dynamic background based on time of day */}
        <DynamicBackground />

        {/* Mobile menu toggle */}
        <div className="lg:hidden flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
              </svg>
            </div>
            <span className="text-white font-semibold">ShipStack</span>
          </Link>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <MobileMenuPanel onClose={() => setMobileMenuOpen(false)} />
        )}

        {/* Form area with loading state management */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative z-10">
          <div className="w-full max-w-[400px]">{children}</div>
        </div>

        {/* Footer with current year */}
        <DynamicFooter />
      </div>
    </div>
  );
}

// Client-side only components
function InteractiveBadge() {
  const [deployments, setDeployments] = useState(0);

  useEffect(() => {
    // Simulate real-time deployment count
    const interval = setInterval(() => {
      setDeployments((prev) => prev + Math.floor(Math.random() * 3));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6 bg-indigo-500/12 border border-indigo-500/25 text-indigo-300">
      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shadow-lg" />
      {deployments > 0
        ? `${deployments}+ active deployments`
        : "Now with edge deployments in 40+ regions"}
    </div>
  );
}

function InteractiveFeatureGrid() {
  const [activeFeature, setActiveFeature] = useState<number | null>(null);

  const features = [
    {
      icon: <Zap className="w-4 h-4 text-purple-500" />,
      title: "Auto-detect",
      desc: "Framework aware builds",
      color: "#6366f1",
    },
    {
      icon: <Ship className="w-4 h-4 text-purple-500" />,
      title: "Dockerized",
      desc: "Automated container builds",
      color: "#6C3BAA",
    },
    {
      icon: <Globe className="w-4 h-4 text-purple-500" />,
      title: "Edge CDN",
      desc: "40+ global regions",
      color: "#6366f1",
    },
    {
      icon: <BarChart3 className="w-4 h-4 text-purple-500" />,
      title: "Observability",
      desc: "Logs, metrics & alerts",
      color: "#8b5cf6",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {features.map((feature, i) => (
        <div
          key={i}
          className={`group p-4 rounded-2xl transition-all duration-300 cursor-pointer transform ${
            activeFeature === i ? "scale-105" : "scale-100"
          }`}
          style={{
            background:
              activeFeature === i
                ? "rgba(99,102,241,0.1)"
                : "rgba(255,255,255,0.025)",
            border:
              activeFeature === i
                ? "1px solid rgba(99,102,241,0.5)"
                : "1px solid rgba(255,255,255,0.07)",
          }}
          onMouseEnter={() => setActiveFeature(i)}
          onMouseLeave={() => setActiveFeature(null)}
          onClick={() => {
            // Handle feature click
            console.log(`Feature ${feature.title} clicked`);
          }}
        >
          <div className="mb-3 w-8 h-8 rounded-lg flex items-center justify-center bg-current/10 transition-transform group-hover:scale-110">
            {feature.icon}
          </div>
          <p className="text-white text-sm font-semibold tracking-tight">
            {feature.title}
          </p>
          <p className="text-[#4b5563] text-xs mt-0.5">{feature.desc}</p>
        </div>
      ))}
    </div>
  );
}

function AnimatedStatsRow() {
  const [stats, setStats] = useState([
    { value: "99.99%", label: "Uptime SLA", target: 99.99 },
    { value: "<30s", label: "Deploy time", target: 30 },
    { value: "40+", label: "Edge regions", target: 40 },
  ]);

  useEffect(() => {
    // Animate stats on mount
    const animateValue = (
      index: number,
      start: number,
      end: number,
      duration: number,
    ) => {
      let startTimestamp: number | null = null;
      const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const currentValue = start + (end - start) * progress;

        setStats((prev) => {
          const newStats = [...prev];
          if (index === 0) {
            newStats[index].value = `${currentValue.toFixed(2)}%`;
          } else if (index === 1) {
            newStats[index].value = `<${Math.floor(currentValue)}s`;
          } else {
            newStats[index].value = `${Math.floor(currentValue)}+`;
          }
          return newStats;
        });

        if (progress < 1) {
          requestAnimationFrame(step);
        }
      };
      requestAnimationFrame(step);
    };

    // Start animations
    animateValue(0, 0, 99.99, 2000);
    animateValue(1, 0, 30, 2000);
    animateValue(2, 0, 40, 2000);
  }, []);

  return (
    <div className="flex items-center gap-0 rounded-2xl overflow-hidden border border-white/10">
      {stats.map((stat, i) => (
        <div
          key={i}
          className="flex-1 px-4 py-3.5 text-center border-r border-white/10 last:border-r-0 bg-white/5"
        >
          <p className="text-white font-bold text-lg bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            {stat.value}
          </p>
          <p className="text-[#4b5563] text-xs mt-0.5">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

function TestimonialCarousel() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const testimonials = [
    {
      text: "ShipStack cut our deployment time from 45 minutes to under 90 seconds. Our team ships 3× faster now.",
      author: "Sara Rashid",
      role: "CTO at Nexora",
      initials: "SR",
    },
    {
      text: "The edge deployment capabilities are game-changing. Our global users see 80% less latency.",
      author: "Marcus Chen",
      role: "VP Engineering at GlobalTech",
      initials: "MC",
    },
    {
      text: "Best developer experience I've ever had. No more infrastructure headaches.",
      author: "Elena Volkova",
      role: "Lead DevOps at CloudScale",
      initials: "EV",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const testimonial = testimonials[currentTestimonial];

  return (
    <div className="rounded-2xl p-5 bg-white/5 border border-white/10 transition-all duration-500">
      <div className="flex items-start gap-1 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg
            key={i}
            className="w-3.5 h-3.5 text-amber-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <p className="text-[#9ca3af] text-sm leading-relaxed mb-4 transition-all duration-300">
        &ldquo;{testimonial.text}&rdquo;
      </p>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br from-indigo-500 to-purple-600">
          {testimonial.initials}
        </div>
        <div>
          <p className="text-white text-xs font-semibold">
            {testimonial.author}
          </p>
          <p className="text-[#4b5563] text-xs">{testimonial.role}</p>
        </div>
      </div>

      {/* Dots indicator */}
      <div className="flex justify-center gap-1 mt-4">
        {testimonials.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentTestimonial(i)}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === currentTestimonial ? "w-4 bg-indigo-500" : "w-1 bg-gray-600"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function DynamicBackground() {
  const [timeOfDay, setTimeOfDay] = useState<
    "morning" | "afternoon" | "evening" | "night"
  >("night");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setTimeOfDay("morning");
    else if (hour < 17) setTimeOfDay("afternoon");
    else if (hour < 20) setTimeOfDay("evening");
    else setTimeOfDay("night");
  }, []);

  const gradients = {
    morning:
      "radial-gradient(circle at 80% 20%, rgba(99,102,241,0.15) 0%, rgba(236,72,153,0.08) 100%)",
    afternoon:
      "radial-gradient(circle at 80% 20%, rgba(249,115,22,0.12) 0%, rgba(99,102,241,0.08) 100%)",
    evening:
      "radial-gradient(circle at 80% 20%, rgba(139,92,246,0.15) 0%, rgba(59,130,246,0.08) 100%)",
    night:
      "radial-gradient(circle at 80% 20%, rgba(99,102,241,0.08) 0%, rgba(0,0,0,0) 60%)",
  };

  return (
    <div
      className="absolute top-0 right-0 w-[600px] h-[600px] opacity-30 pointer-events-none transition-all duration-1000"
      style={{ background: gradients[timeOfDay] }}
    />
  );
}

function MobileMenuPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="lg:hidden absolute top-16 left-0 right-0 bg-[#050608] border-b border-white/10 z-20 p-4 backdrop-blur-xl">
      <div className="space-y-3">
        <Link
          href="/features"
          className="block text-gray-300 hover:text-white py-2"
          onClick={onClose}
        >
          Features
        </Link>
        <Link
          href="/pricing"
          className="block text-gray-300 hover:text-white py-2"
          onClick={onClose}
        >
          Pricing
        </Link>
        <Link
          href="/docs"
          className="block text-gray-300 hover:text-white py-2"
          onClick={onClose}
        >
          Documentation
        </Link>
        <Link
          href="/contact"
          className="block text-gray-300 hover:text-white py-2"
          onClick={onClose}
        >
          Contact
        </Link>
      </div>
    </div>
  );
}

function DynamicFooter() {
  const [year] = useState(new Date().getFullYear());

  return (
    <div className="relative z-10 p-5 text-center border-t border-white/[0.04]">
      <p className="text-[#374151] text-xs">
        © {year} ShipStack, Inc. ·{" "}
        <Link
          href="/privacy"
          className="hover:text-[#6b7280] transition-colors"
        >
          Privacy
        </Link>{" "}
        ·{" "}
        <Link href="/terms" className="hover:text-[#6b7280] transition-colors">
          Terms
        </Link>
      </p>
    </div>
  );
}

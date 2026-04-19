import type { Metadata } from "next";
import { Zap, Ship, Globe, BarChart3 } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: {
    template: "%s | ShipStack",
    default: "Auth | ShipStack",
  },
  description: "Authenticate to access your ShipStack workspace.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#080a0f] flex">
      {/* ── Left panel — branding ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] relative flex-col overflow-hidden">
        {/* Animated grid background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(37,99,235,0.06) 1px, transparent 1px),
              linear-gradient(90deg, rgba(37,99,235,0.06) 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px",
          }}
        />

        {/* Glow orbs */}
        <div
          className="absolute top-[-120px] left-[-80px] w-[500px] h-[500px] rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, #2563eb 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full opacity-15"
          style={{
            background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)",
          }}
        />

        {/* Diagonal accent bar */}
        <div
          className="absolute inset-y-0 right-0 w-[1px]"
          style={{
            background:
              "linear-gradient(to bottom, transparent, rgba(37,99,235,0.4) 30%, rgba(124,58,237,0.4) 70%, transparent)",
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-10 xl:p-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group w-fit">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30 group-hover:shadow-blue-600/50 transition-shadow">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
              </svg>
            </div>
            <span
              className="text-white font-semibold text-lg tracking-tight"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              ShipStack
            </span>
          </Link>

          {/* Central quote */}
          <div className="flex-1 flex flex-col justify-center gap-10 mt-12">
            <div>
              <h1
                className="text-4xl xl:text-5xl font-bold text-white leading-[1.1] tracking-tight mb-5"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                Ship code.
                <br />
                <span
                  className="text-transparent"
                  style={{
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    backgroundImage:
                      "linear-gradient(135deg, #60a5fa, #a78bfa)",
                  }}
                >
                  Not config.
                </span>
              </h1>
              <p className="text-gray-400 text-base leading-relaxed max-w-sm">
                Push your repo, get a live URL. No infrastructure knowledge
                required. Deploy in seconds, scale in minutes.
              </p>
            </div>

            {/* Feature Grid Cards */}
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  icon: <Zap className="w-5 h-5 text-blue-400" />,
                  title: "Auto-detect",
                  desc: "Framework aware",
                },
                {
                  icon: <Ship className="w-5 h-5 text-purple-400" />,
                  title: "Dockerized",
                  desc: "Automated builds",
                },
                {
                  icon: <Globe className="w-5 h-5 text-blue-400" />,
                  title: "Instant Edge",
                  desc: "Global subdomains",
                },
                {
                  icon: <BarChart3 className="w-5 h-5 text-purple-400" />,
                  title: "Real-time",
                  desc: "Logs & metrics",
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] transition-colors"
                >
                  <div className="mb-3 w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                    {feature.icon}
                  </div>
                  <p className="text-white text-sm font-semibold">
                    {feature.title}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div className="border border-white/8 rounded-2xl bg-white/[0.03] p-5 mt-8">
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              &ldquo;ShipStack cut our deployment time from 45 minutes to under
              90 seconds. It just works.&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-xs font-semibold">
                SR
              </div>
              <div>
                <p className="text-white text-xs font-medium">Sara Rashid</p>
                <p className="text-gray-500 text-xs">CTO at Nexora</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel — forms ── */}
      <div className="flex-1 flex flex-col">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center justify-between p-5 border-b border-white/8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
              </svg>
            </div>
            <span
              className="text-white font-semibold"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              ShipStack
            </span>
          </Link>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>

        {/* Footer */}
        <div className="p-5 text-center">
          <p className="text-gray-600 text-xs">
            © 2026 ShipStack, Inc. ·{" "}
            <Link
              href="/privacy"
              className="hover:text-gray-400 transition-colors"
            >
              Privacy
            </Link>{" "}
            ·{" "}
            <Link
              href="/terms"
              className="hover:text-gray-400 transition-colors"
            >
              Terms
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

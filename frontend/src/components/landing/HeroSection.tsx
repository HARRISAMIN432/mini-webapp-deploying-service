// components/landing/HeroSection.tsx
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-4xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-xs font-medium mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          Now with AI-powered deployment suggestions
        </div>

        {/* Heading */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 tracking-tight leading-[1.05] mb-6">
          Deploy once.
          <br />
          <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            Run everywhere.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed">
          Push your repo. Get a live, globally distributed URL in under 30
          seconds. No infrastructure knowledge required — just ship.
        </p>

        {/* CTAs */}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/auth/sign-up"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            Start deploying free
            <svg
              className="w-4 h-4"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 4l4 4-4 4" />
            </svg>
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-medium rounded-xl transition-colors text-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 2a6 6 0 100 12A6 6 0 008 2zM6.5 5.5l4 2.5-4 2.5v-5z" />
            </svg>
            Watch demo
          </a>
        </div>

        {/* Social proof */}
        <div className="mt-16 flex items-center justify-center gap-8 flex-wrap">
          {[
            { value: "12,000+", label: "Teams deploying" },
            { value: "99.99%", label: "Uptime SLA" },
            { value: "40+", label: "Edge regions" },
            { value: "<30s", label: "Avg. deploy time" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

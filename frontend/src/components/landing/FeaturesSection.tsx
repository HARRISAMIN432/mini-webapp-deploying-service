// components/landing/FeaturesSection.tsx
import {
  Zap,
  Globe,
  GitBranch,
  ShieldCheck,
  BarChart3,
  Terminal,
} from "lucide-react";

const FEATURES = [
  {
    icon: <Zap className="w-5 h-5" />,
    color: "bg-violet-50 text-violet-600",
    title: "Instant auto-detection",
    desc: "Push your code and ShipStack automatically detects your framework — Next.js, Remix, SvelteKit, or Docker — and configures the build pipeline. Zero config required.",
  },
  {
    icon: <Globe className="w-5 h-5" />,
    color: "bg-indigo-50 text-indigo-600",
    title: "Global edge CDN",
    desc: "Deploy to 40+ edge regions simultaneously. Your users get served from the nearest node, cutting latency to under 10ms for 95% of global traffic.",
  },
  {
    icon: <GitBranch className="w-5 h-5" />,
    color: "bg-violet-50 text-violet-600",
    title: "Preview deployments",
    desc: "Every pull request gets its own isolated preview URL. Share with stakeholders before merging. Automatic cleanup on close.",
  },
  {
    icon: <ShieldCheck className="w-5 h-5" />,
    color: "bg-green-50 text-green-600",
    title: "Zero-trust security",
    desc: "Automatic TLS certificates, DDoS protection, and WAF on every deployment. Secrets encrypted at rest and injected at runtime.",
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    color: "bg-blue-50 text-blue-600",
    title: "Real-time observability",
    desc: "Streaming logs, performance metrics, error tracking, and custom alerts — all in a single pane of glass. No separate monitoring setup required.",
  },
  {
    icon: <Terminal className="w-5 h-5" />,
    color: "bg-amber-50 text-amber-600",
    title: "CLI + API first",
    desc: "Deploy with a single command. Full REST API and webhooks for CI/CD integration. GitHub Actions, GitLab CI, and CircleCI ready.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-xs font-semibold text-violet-600 uppercase tracking-wider mb-3">
            Platform features
          </p>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Everything you need to ship fast
          </h2>
          <p className="text-gray-500 text-base max-w-lg mx-auto">
            Built for developers who hate configuration and love shipping.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feature, i) => (
            <div
              key={i}
              className="group bg-white border border-gray-200 rounded-xl p-6 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div
                className={`w-10 h-10 rounded-lg ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
              >
                {feature.icon}
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

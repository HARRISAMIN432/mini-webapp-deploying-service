// components/landing/PricingSection.tsx
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

const PLANS = [
  {
    name: "Hobby",
    desc: "Perfect for side projects",
    price: "$0",
    period: "/month",
    cta: "Get started free",
    href: "/auth/sign-up",
    highlighted: false,
    features: [
      { included: true, text: "3 projects" },
      { included: true, text: "100 GB bandwidth" },
      { included: true, text: "Shared edge network" },
      { included: true, text: "Auto TLS certificates" },
      { included: false, text: "Custom domains" },
      { included: false, text: "Team access" },
    ],
  },
  {
    name: "Pro",
    desc: "For growing teams",
    price: "$29",
    period: "/month",
    cta: "Start free trial",
    href: "/auth/sign-up",
    highlighted: true,
    features: [
      { included: true, text: "Unlimited projects" },
      { included: true, text: "1 TB bandwidth" },
      { included: true, text: "Dedicated edge nodes" },
      { included: true, text: "Custom domains + SSL" },
      { included: true, text: "Team access (up to 10)" },
      { included: true, text: "Priority support" },
    ],
  },
  {
    name: "Scale",
    desc: "For high-traffic apps",
    price: "Custom",
    period: "",
    cta: "Contact sales",
    href: "mailto:enterprise@shipstack.io",
    highlighted: false,
    features: [
      { included: true, text: "Unlimited everything" },
      { included: true, text: "Dedicated infrastructure" },
      { included: true, text: "SOC 2 Type II + HIPAA" },
      { included: true, text: "SSO / SAML integration" },
      { included: true, text: "SLA with uptime guarantee" },
      { included: true, text: "Dedicated support" },
    ],
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 px-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold text-violet-600 uppercase tracking-wider mb-3">
            Simple pricing
          </p>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Pay for what you ship
          </h2>
          <p className="text-gray-500">
            No hidden fees. Upgrade or downgrade at any time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl p-8 ${
                plan.highlighted
                  ? "bg-white border-2 border-violet-500 shadow-lg shadow-violet-100 relative"
                  : "bg-white border border-gray-200"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Most popular
                </div>
              )}
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {plan.name}
              </h3>
              <p className="text-sm text-gray-500 mb-4">{plan.desc}</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-gray-900">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-gray-500">{plan.period}</span>
                )}
              </div>
              <div className="border-t border-gray-100 pt-6 mb-6">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature.text}
                      className="flex items-center gap-2 text-sm"
                    >
                      {feature.included ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      )}
                      <span
                        className={
                          feature.included ? "text-gray-700" : "text-gray-400"
                        }
                      >
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href={plan.href}
                className={`block text-center py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  plan.highlighted
                    ? "bg-gray-900 text-white hover:bg-gray-800"
                    : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

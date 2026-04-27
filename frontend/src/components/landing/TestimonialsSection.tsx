// components/landing/TestimonialsSection.tsx
const TESTIMONIALS = [
  {
    quote:
      "ShipStack cut our deployment pipeline from 45 minutes to under 90 seconds. Our team ships 3× faster and we've eliminated an entire DevOps position.",
    name: "Sara Rashid",
    role: "CTO, Nexora",
    initials: "SR",
  },
  {
    quote:
      "We migrated 14 microservices from AWS to ShipStack in a single afternoon. Preview deployments alone saved our team from 3 critical production bugs last month.",
    name: "Ahmed Malik",
    role: "Principal Engineer, Strata AI",
    initials: "AM",
  },
  {
    quote:
      "The observability stack is incredible. We went from blind deploys to real-time error tracking and custom alerts — without any additional setup.",
    name: "Lena Kovacs",
    role: "Head of Platform, Meridian",
    initials: "LK",
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold text-violet-600 uppercase tracking-wider mb-3">
            What teams say
          </p>
          <h2 className="text-4xl font-bold text-gray-900">
            Loved by developers worldwide
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="bg-gray-50 border border-gray-200 rounded-xl p-6 hover:shadow-sm transition-shadow"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg
                    key={i}
                    className="w-4 h-4 text-amber-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-semibold">
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {t.name}
                  </p>
                  <p className="text-xs text-gray-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

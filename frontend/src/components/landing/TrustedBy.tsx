// components/landing/TrustedBy.tsx
export function TrustedBy() {
  const companies = [
    "Acme Corp",
    "Nexora",
    "Prismatic",
    "Cascade Labs",
    "Strata AI",
    "Meridian",
    "Volta Systems",
    "Cirrus Cloud",
    "Apex Build",
    "Epoch Tech",
  ];

  return (
    <section className="py-12 border-y border-gray-100 bg-gray-50/50">
      <div className="max-w-6xl mx-auto px-6">
        <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wider mb-6">
          Trusted by teams worldwide
        </p>
        <div className="flex items-center justify-center gap-8 flex-wrap">
          {companies.map((name) => (
            <span
              key={name}
              className="text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

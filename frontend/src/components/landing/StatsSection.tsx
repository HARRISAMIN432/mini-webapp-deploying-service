// components/landing/StatsSection.tsx
export function StatsSection() {
  const stats = [
    { value: "12,400+", label: "Teams shipping" },
    { value: "99.99%", label: "Uptime SLA" },
    { value: "2.8M+", label: "Deployments served" },
    { value: "<30s", label: "Avg. deploy time" },
  ];

  return (
    <section className="py-16 border-y border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold text-gray-900 mb-1">
                {stat.value}
              </p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

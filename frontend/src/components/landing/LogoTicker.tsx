"use client";

const LOGOS = [
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

export function LogoTicker() {
  const doubled = [...LOGOS, ...LOGOS];

  return (
    <div
      className="border-t border-b overflow-hidden py-5"
      style={{ borderColor: "rgba(255,255,255,0.07)" }}
    >
      <p
        className="text-center text-xs font-medium uppercase tracking-widest mb-6"
        style={{
          color: "#374151",
          fontFamily: "'DM Sans', sans-serif",
          letterSpacing: "0.1em",
        }}
      >
        Trusted by teams at
      </p>
      <div className="relative">
        {/* Fade masks */}
        <div
          className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
          style={{
            background: "linear-gradient(to right, #050608, transparent)",
          }}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
          style={{
            background: "linear-gradient(to left, #050608, transparent)",
          }}
        />
        <div className="overflow-hidden">
          <div
            className="flex items-center gap-16 w-max"
            style={{ animation: "scroll-logos 28s linear infinite" }}
          >
            {doubled.map((name, i) => (
              <span
                key={i}
                className="text-base font-bold whitespace-nowrap transition-colors duration-200 cursor-default"
                style={{
                  fontFamily: "'Sora', sans-serif",
                  color: "#374151",
                  letterSpacing: "-0.02em",
                }}
                onMouseEnter={(e) =>
                  ((e.target as HTMLElement).style.color = "#9ca3af")
                }
                onMouseLeave={(e) =>
                  ((e.target as HTMLElement).style.color = "#374151")
                }
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes scroll-logos {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}

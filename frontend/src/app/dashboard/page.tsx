import Link from "next/link";

const cards = [
  { label: "Total Projects", value: "12" },
  { label: "Running Deployments", value: "4" },
  { label: "Queued Builds", value: "2" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-indigo-400/20 bg-[#0d1320] p-8">
        <h2
          className="text-3xl font-bold text-white"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Welcome back
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Manage your deployments from one place. Start by creating a new project
          and configuring root directory, build and runtime environment.
        </p>
        <div className="mt-5 flex gap-3">
          <Link
            href="/dashboard/projects/new"
            className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
          >
            New Project
          </Link>
          <Link
            href="/dashboard/projects"
            className="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-200 hover:bg-white/5"
          >
            View Projects
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-white/10 bg-[#0e1422] p-5"
          >
            <p className="text-xs uppercase tracking-[0.15em] text-slate-400">
              {card.label}
            </p>
            <p
              className="mt-3 text-3xl font-bold text-white"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              {card.value}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}

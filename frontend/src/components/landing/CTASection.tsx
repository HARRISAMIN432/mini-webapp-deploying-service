// components/landing/CtaSection.tsx
import Link from "next/link";

export function CtaSection() {
  return (
    <section className="py-24 px-6 bg-gray-900">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-4xl font-bold text-white mb-4">
          Your next deployment is 30 seconds away
        </h2>
        <p className="text-gray-400 mb-10 text-base">
          Join thousands of teams who chose ShipStack to ship faster, with less
          ops overhead. Free forever, upgrade when you're ready.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/auth/sign-up"
            className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            Deploy your first app free
          </Link>
          <Link
            href="/docs"
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-xl transition-colors text-sm border border-gray-700"
          >
            Read the docs
          </Link>
        </div>
        <p className="text-gray-600 text-sm mt-6">
          No credit card required · Free SSL · Deploy in under 30 seconds
        </p>
      </div>
    </section>
  );
}

import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#080a0f] flex flex-col items-center justify-center p-8 text-center">
      <h1
        className="text-2xl font-bold text-white mb-2"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        You&apos;re signed in
      </h1>
      <p className="text-gray-400 text-sm mb-8 max-w-md">
        Session cookies were set by the API. Build your app UI here or sign out
        from account settings when you add them.
      </p>
      <Link
        href="/"
        className="text-blue-400 hover:text-blue-300 text-sm font-medium"
      >
        ← Back to home
      </Link>
    </div>
  );
}

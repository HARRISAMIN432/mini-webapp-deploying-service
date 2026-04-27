// components/landing/HowItWorksSection.tsx
"use client";

import { useState, useEffect, useCallback } from "react";

const STEPS = [
  {
    title: "Connect your repository",
    desc: "Link your GitHub, GitLab, or Bitbucket repo in one click. ShipStack detects your framework and sets up the pipeline automatically.",
    terminal: [
      "$ shipstack link",
      "",
      "Connecting to GitHub...",
      "✓ Linked to github.com/you/my-app",
      "✓ Detected: Next.js 14",
      "✓ Build pipeline configured",
    ],
  },
  {
    title: "Push your code",
    desc: "Every git push triggers an automatic build. We analyze your project, select optimal build settings, and start deployment instantly.",
    terminal: [
      "$ git push origin main",
      "",
      "→ Build triggered [#42]",
      "⟳ Installing dependencies...",
      "⟳ Compiling TypeScript...",
      "⟳ Optimizing bundle...",
    ],
  },
  {
    title: "Watch it deploy globally",
    desc: "Your app is built, containerized, and distributed to all 40+ edge regions in parallel. Real-time logs stream directly to your terminal.",
    terminal: [
      "✓ Build completed in 18.4s",
      "",
      "→ Deploying to edge network...",
      "↑ us-east-1  ✓",
      "↑ eu-west-1  ✓",
      "↑ ap-south-1 ✓",
      "✓ All 40 regions live",
    ],
  },
  {
    title: "Live URL, instantly",
    desc: "Get your production URL within seconds. Custom domains, SSL, and analytics set up automatically.",
    terminal: [
      "✓ Deployment complete!",
      "",
      "Production URL:",
      "https://my-app.shipstack.app",
      "",
      "Preview URL:",
      "https://pr-42.my-app.shipstack.app",
    ],
  },
];

export function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);
  const [visibleLines, setVisibleLines] = useState<number>(0);

  const runAnimation = useCallback((step: number) => {
    setActiveStep(step);
    setVisibleLines(0);
    const lines = STEPS[step].terminal;
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setVisibleLines(count);
      if (count >= lines.length) clearInterval(interval);
    }, 100);
    return interval;
  }, []);

  useEffect(() => {
    const interval = runAnimation(0);
    const timer = setInterval(() => {
      setActiveStep((prev) => {
        const next = (prev + 1) % STEPS.length;
        runAnimation(next);
        return next;
      });
    }, 4000);

    return () => {
      clearInterval(timer);
      clearInterval(interval);
    };
  }, [runAnimation]);

  return (
    <section id="how-it-works" className="py-24 px-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold text-violet-600 uppercase tracking-wider mb-3">
            How it works
          </p>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            From git push to{" "}
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              live in 30 seconds
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Steps */}
          <div className="space-y-2">
            {STEPS.map((step, i) => (
              <button
                key={i}
                onClick={() => runAnimation(i)}
                className={`w-full text-left p-5 rounded-xl transition-all ${
                  activeStep === i
                    ? "bg-white border border-gray-200 shadow-sm"
                    : "hover:bg-white/50"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold flex-shrink-0 transition-colors ${
                      activeStep === i
                        ? "bg-gray-900 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {step.title}
                    </h3>
                    <p className="text-sm text-gray-500">{step.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Terminal */}
          <div className="bg-gray-900 rounded-xl overflow-hidden shadow-lg">
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-2 text-xs text-gray-400 font-mono">
                Terminal
              </span>
            </div>
            <div className="p-5 font-mono text-sm leading-relaxed">
              {STEPS[activeStep].terminal.map((line, i) => (
                <div
                  key={i}
                  className={`transition-all duration-200 ${
                    i < visibleLines
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-1"
                  }`}
                >
                  {line ? (
                    <span
                      className={
                        line.startsWith("$")
                          ? "text-green-400"
                          : line.startsWith("✓")
                            ? "text-green-400"
                            : line.startsWith("⟳")
                              ? "text-yellow-400"
                              : line.startsWith("→")
                                ? "text-blue-400"
                                : line.startsWith("↑")
                                  ? "text-gray-400"
                                  : line.startsWith("http")
                                    ? "text-violet-400"
                                    : "text-gray-500"
                      }
                    >
                      {line}
                    </span>
                  ) : (
                    <span className="text-gray-900">-</span>
                  )}
                </div>
              ))}
              <span className="inline-block w-2 h-5 bg-violet-400 animate-pulse ml-1" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

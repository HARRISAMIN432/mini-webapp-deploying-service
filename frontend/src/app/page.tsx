import type { Metadata } from "next";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { LogoTicker } from "@/components/landing/LogoTicker";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowItWorksSection } from "@/components/landing/HowitWorksSection";
import {
  StatsSection,
  PricingSection,
  TestimonialsSection,
  CtaSection,
  Footer,
} from "@/components/landing/Sections";

export const metadata: Metadata = {
  title: "ShipStack — Deploy Once. Run Everywhere.",
  description:
    "Push your repo. Get a live, globally distributed URL in under 30 seconds. No infrastructure knowledge required.",
};

export default function LandingPage() {
  return (
    <main style={{ background: "#050608", overflowX: "hidden" }}>
      <Navbar />
      <HeroSection />
      <LogoTicker />
      <FeaturesSection />
      <HowItWorksSection />
      <StatsSection />
      <PricingSection />
      <TestimonialsSection />
      <CtaSection />
      <Footer />
    </main>
  );
}

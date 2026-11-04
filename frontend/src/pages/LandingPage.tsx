import { LandingNav } from '@/components/landing/LandingNav';
import { Hero } from '@/components/landing/Hero';
import { Problem } from '@/components/landing/Problem';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { AIShowcase } from '@/components/landing/AIShowcase';
import { ReviewShowcase } from '@/components/landing/ReviewShowcase';
import { DeadlineShowcase } from '@/components/landing/DeadlineShowcase';
import { DashboardPreview } from '@/components/landing/DashboardPreview';
import { TrustSecurity } from '@/components/landing/TrustSecurity';
import { Features } from '@/components/landing/Features';
import { CTA } from '@/components/landing/CTA';
import { Footer } from '@/components/landing/Footer';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <LandingNav />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <AIShowcase />
        <ReviewShowcase />
        <DeadlineShowcase />
        <DashboardPreview />
        <TrustSecurity />
        <Features />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

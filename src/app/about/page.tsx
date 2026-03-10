import Link from 'next/link';
import { Shield, Heart, Users, RefreshCw, ArrowLeft } from 'lucide-react';
import { PageMotion } from '@/components/PageMotion';
import AboutBentoGrid from '@/components/about-bento-grid';

export const metadata = {
  title: 'About Us | REXU',
  description: 'REXU is a safety and trust platform designed for real-world situations.',
};

export default function AboutPage() {
  return (
    <PageMotion className="min-h-screen bg-black text-foreground">
      <header className="bg-black/80 backdrop-blur-lg border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-[#0F3D2E]/30 border border-[#145A3A]/40 text-[#9AC57A] hover:bg-[#0F3D2E]/50 transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <img 
              src="/rexu-logo.png" 
              alt="REXU" 
              className="h-8 w-auto object-contain"
            />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="text-center py-16 px-4 bg-gradient-to-b from-black via-[#101518] to-black">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0F3D2E]/20 border border-[#145A3A]/30 text-[11px] font-semibold tracking-[0.22em] text-[#9AC57A] mb-8">
            <Shield className="w-4 h-4 text-[#9AC57A]" /> ABOUT REXU
          </div>
          <h2 className="text-5xl sm:text-6xl md:text-7xl font-bold leading-tight">
            <span className="block text-white mb-2">
              Technology that speaks
            </span>
            <span className="block text-[#9AC57A]">
              when you can&apos;t.
            </span>
          </h2>
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-[#D1D7DC] leading-relaxed mt-6">
            REXU is a safety and trust platform designed for real-world emergencies — for
            individual riders and their families <strong className="text-white">(B2C)</strong>, and
            for logistics companies, cab operators, and fleet owners{' '}
            <strong className="text-white">(B2B)</strong>. Quick access to the right information
            can make all the difference.
          </p>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-4 py-10 pb-20 relative overflow-hidden w-full box-border">
        <div className="relative z-10">
          <AboutBentoGrid />
        </div>
      </main>
    </PageMotion>
  );
}

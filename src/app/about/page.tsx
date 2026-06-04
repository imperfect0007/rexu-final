import Link from 'next/link';
import { PageMotion } from '@/components/PageMotion';
import AboutBentoGrid from '@/components/about-bento-grid';
import { SiteNavbar } from '@/components/marketing/SiteNavbar';
import { SectionTag } from '@/components/marketing/SparkSheet';
import { GradientButton } from '@/components/marketing/GradientButton';
import { DataSheets } from '@/components/marketing/DataSheets';

export const metadata = {
  title: 'About Us | REXU',
  description: 'REXU is a safety and trust platform designed for real-world situations.',
};

export default function AboutPage() {
  return (
    <PageMotion className="min-h-screen text-neutral-900">
      <SiteNavbar />

      <section className="px-4 py-16 text-center sm:px-6">
        <div className="mx-auto max-w-3xl">
          <SectionTag>About REXU</SectionTag>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Technology that speaks{' '}
            <span className="text-gradient-brand">when you can&apos;t</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-neutral-600 leading-relaxed">
            REXU is built for real-world emergencies — for individual riders and families,
            and for logistics companies and fleet owners who need reliable safety at scale.
          </p>
          <div className="mt-8 flex justify-center">
            <GradientButton href="/register">Get your QR</GradientButton>
          </div>
        </div>
      </section>



      <main className="mx-auto max-w-5xl px-4 py-10 pb-20 w-full">
        <AboutBentoGrid />
      </main>
    </PageMotion>
  );
}

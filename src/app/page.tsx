'use client';

import * as React from 'react';
import Link from 'next/link';
import Marquee from 'react-fast-marquee';
import { motion } from 'framer-motion';
import {
  QrCode,
  PhoneOff,
  ShieldCheck,
  Smartphone,
  PhoneCall,
  Lock,
  Heart,
  User,
  Truck,
  CheckCircle2,
  LayoutDashboard,
  CreditCard,
} from 'lucide-react';
import { MotionSection, staggerChildVariants, FadeUp } from '@/components/MotionSection';
import { HowItWorksToggle } from '@/components/marketing/HowItWorksToggle';
import { SiteNavbar } from '@/components/marketing/SiteNavbar';
import { GradientButton } from '@/components/marketing/GradientButton';
import { SectionTag, SparkSheet } from '@/components/marketing/SparkSheet';
import { DataSheets } from '@/components/marketing/DataSheets';
import { TeamSection } from '@/components/marketing/TeamSection';
import { TestimonialsSection } from '@/components/marketing/TestimonialsSection';
import { FAQSection } from '@/components/marketing/FAQSection';
import { CTABanner } from '@/components/marketing/CTABanner';
import { InstagramSection } from '@/components/marketing/InstagramSection';

const ease: [number, number, number, number] = [0.33, 1, 0.68, 1];

const heroContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const heroItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease },
  },
};

const brands = ['Safewheels', 'FleetOne', 'Guardian', 'QuickDeliver', 'RoadSafe', 'ProtectQR'];

const features = [
  {
    icon: QrCode,
    title: 'Instant QR Scanning',
    desc: 'Anyone scans with their phone camera — no app install required.',
  },
  {
    icon: PhoneOff,
    title: 'Privacy First',
    desc: 'Your phone number stays hidden. Only emergency contacts are reachable.',
  },
  {
    icon: ShieldCheck,
    title: 'Works When You Can\'t',
    desc: 'If you cannot speak, your QR shares the right info in seconds.',
  },
];

type HomePageProps = {
  params?: Promise<Record<string, string | string[]>>;
  searchParams?: Promise<Record<string, string | string[]>>;
};

export default function Home(props: HomePageProps) {
  if (props.params) React.use(props.params);
  if (props.searchParams) React.use(props.searchParams);

  return (
    <div className="min-h-screen text-neutral-900">
      <SiteNavbar />

      {/* Hero */}
      <section className="relative px-4 pb-16 pt-8 sm:px-6 lg:pb-24">
        <motion.div
          animate={{
            x: [0, 45, -30, 25, 0],
            y: [0, -35, 55, -20, 0],
            scale: [1, 1.15, 0.9, 1.1, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: 'mirror',
            ease: 'easeInOut',
          }}
          className="pointer-events-none absolute right-0 top-20 h-64 w-64 rounded-full bg-[#c9e265]/35 blur-3xl"
          aria-hidden
        />
        <motion.div
          animate={{
            x: [0, -55, 35, -25, 0],
            y: [0, 45, -35, 45, 0],
            scale: [1, 0.9, 1.15, 0.95, 1],
          }}
          transition={{
            duration: 24,
            repeat: Infinity,
            repeatType: 'mirror',
            ease: 'easeInOut',
          }}
          className="pointer-events-none absolute left-0 top-40 h-48 w-48 rounded-full bg-[#89d957]/30 blur-3xl"
          aria-hidden
        />

        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={heroContainerVariants}
            className="flex flex-col items-center"
          >
            <motion.div variants={heroItemVariants}>
              <SectionTag>Emergency QR safety</SectionTag>
            </motion.div>
            <motion.h1
              variants={heroItemVariants}
              className="mt-8 text-4xl font-bold leading-[1.08] tracking-tight text-neutral-900 sm:text-5xl md:text-6xl lg:text-7xl"
            >
              Revolutionize Your Safety with{' '}
              <span className="text-gradient-brand">REXU</span>
            </motion.h1>
            <motion.p
              variants={heroItemVariants}
              className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-neutral-600 sm:text-lg"
            >
              Comprehensive emergency contact access via QR — for personal riders,
              families, and commercial fleets. Scan. Connect. Save lives.
            </motion.p>
            <motion.div variants={heroItemVariants} className="mt-10 flex justify-center">
              <GradientButton href="/register">Get started</GradientButton>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Trusted by */}
      <FadeUp delay={0.1}>
        <section className="border-y border-neutral-100 bg-white/60 py-10">
          <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
            Trusted by safety-focused teams
          </p>
          <Marquee speed={35} gradient={false}>
            {brands.map((name) => (
              <span
                key={name}
                className="mx-8 text-lg font-semibold text-neutral-300"
              >
                {name}
              </span>
            ))}
          </Marquee>
        </section>
      </FadeUp>

      {/* About + data sheets */}
      <MotionSection className="px-4 py-20 sm:px-6" stagger staggerDelay={0.12}>
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <motion.div variants={staggerChildVariants}>
            <SectionTag>About us</SectionTag>
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              Transforming safety with{' '}
              <span className="text-gradient-brand">smart QR</span> technology
            </h2>
            <p className="mt-4 text-neutral-600 leading-relaxed">
              REXU puts critical emergency information one scan away — on helmets,
              vehicles, and ID cards. Built for individuals and fleets who take safety
              seriously.
            </p>
            <div className="mt-8">
              <GradientButton href="/about">Learn more</GradientButton>
            </div>
          </motion.div>
          <motion.div variants={staggerChildVariants}>
            <DataSheets />
          </motion.div>
        </div>
      </MotionSection>

      {/* Features */}
      <MotionSection className="px-4 py-16 sm:px-6" stagger staggerDelay={0.08}>
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <SectionTag>Why REXU</SectionTag>
            <h2 className="mt-6 text-3xl font-bold text-neutral-900 sm:text-4xl">
              What is <span className="text-gradient-brand">REXU</span>?
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {features.map(({ icon: Icon, title, desc }) => (
              <motion.div key={title} variants={staggerChildVariants}>
                <SparkSheet className="h-full text-center !p-8">
                  <div className="flex justify-center mb-4">
                    <Icon className="h-7 w-7 text-[#1a2e0f]" />
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900">{title}</h3>
                  <p className="mt-2 text-sm text-neutral-600">{desc}</p>
                </SparkSheet>
              </motion.div>
            ))}
          </div>
        </div>
      </MotionSection>

      {/* How it works */}
      <MotionSection
        id="features"
        className="px-4 py-20 sm:px-6"
        stagger
        staggerDelay={0.1}
      >
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-1">
            <SectionTag>Process</SectionTag>
          </div>
          <HowItWorksToggle />
        </div>
      </MotionSection>

      {/* Pricing */}
      <MotionSection
        id="pricing"
        className="px-4 py-20 sm:px-6"
        stagger
        staggerDelay={0.08}
      >
        <div className="mx-auto max-w-5xl">
          <motion.div className="text-center" variants={staggerChildVariants}>
            <SectionTag>Pricing</SectionTag>
            <h2 className="mt-6 text-3xl font-bold text-neutral-900 sm:text-4xl">
              Choose your <span className="text-gradient-brand">plan</span>
            </h2>
          </motion.div>
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            <motion.div variants={staggerChildVariants}>
              <SparkSheet className="flex h-full flex-col !p-8">
                <div className="mb-4 flex h-12 w-12 items-center justify-center">
                  <User className="h-6 w-6 text-[#1a2e0f]" />
                </div>
                <h3 className="text-xl font-bold">Individuals & Families</h3>
                <p className="mt-2 text-sm text-neutral-600">From ₹299 — one-time setup</p>
                <ul className="mt-6 flex-1 space-y-3 text-sm text-neutral-700">
                  {[
                    'Personal safety profile',
                    'Family emergency contacts',
                    'Optional medical info',
                    'One QR per person or vehicle',
                  ].map((text) => (
                    <li key={text} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#6eb84a]" />
                      {text}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className="mt-8 block rounded-full bg-gradient-brand py-3.5 text-center text-sm font-semibold text-[#1a2e0f] transition-opacity hover:opacity-90"
                >
                  Get started
                </Link>
              </SparkSheet>
            </motion.div>

            <motion.div variants={staggerChildVariants}>
              <SparkSheet className="relative flex h-full flex-col border-2 border-[#89d957]/40 !p-8">
                <span className="absolute right-6 top-6 rounded-full bg-gradient-brand px-3 py-1 text-xs font-bold text-[#1a2e0f]">
                  For Business
                </span>
                <div className="mb-4 flex h-12 w-12 items-center justify-center">
                  <Truck className="h-6 w-6 text-[#1a2e0f]" />
                </div>
                <h3 className="text-xl font-bold">Commercial Fleets</h3>
                <p className="mt-2 text-sm text-neutral-600">Dashboard + bulk QR management</p>
                <ul className="mt-6 flex-1 space-y-3 text-sm text-neutral-700">
                  {[
                    'Admin dashboard',
                    'Multiple vehicles & drivers',
                    'Daily driver assignment',
                    'Bulk QR generation',
                  ].map((text) => (
                    <li key={text} className="flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4 shrink-0 text-[#6eb84a]" />
                      {text}
                    </li>
                  ))}
                  <li className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 shrink-0 text-[#6eb84a]" />
                    Consolidated fleet billing
                  </li>
                </ul>
                <Link
                  href="/login"
                  className="mt-8 block rounded-full border-2 border-[#89d957] py-3.5 text-center text-sm font-semibold text-[#5a9c32] transition-colors hover:bg-[#89d957]/10"
                >
                  Fleet sign in
                </Link>
              </SparkSheet>
            </motion.div>
          </div>
        </div>
      </MotionSection>

      <TeamSection />


      <InstagramSection />
      <TestimonialsSection />
      <FAQSection />

      <CTABanner />
    </div>
  );
}

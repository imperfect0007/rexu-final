'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpRight,
  PhoneOff,
  ShieldCheck,
  Smartphone,
  PhoneCall,
  Lock,
  Heart,
  User,
  Truck,
} from 'lucide-react';
import { MotionSection, staggerChildVariants } from '@/components/MotionSection';
import { HowItWorksToggle } from '@/components/marketing/HowItWorksToggle';
import { SiteNavbar } from '@/components/marketing/SiteNavbar';
import { GradientButton } from '@/components/marketing/GradientButton';
import { SectionTag } from '@/components/marketing/SparkSheet';
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

const individualProducts = [
  {
    id: 'personal-sticker',
    name: 'Personal Helmet QR Safety Sticker',
    price: '₹349* (MRP ₹499)',
    image: '/productgalu/1.png',
  },
  {
    id: 'keychain-bundle',
    name: 'Scooter QR Safety Sticker',
    price: 'From ₹349* (MRP ₹499)',
    image: '/productgalu/2.png',
  },
  {
    id: 'helmet-shield',
    name: 'Cars and LMVs QR Safety Sticker',
    price: 'From ₹349* (MRP ₹499)',
    image: '/productgalu/3.png',
  },
];

const commercialProducts = [
  {
    id: 'fleet-starter',
    name: 'Fleet Starter Dashboard',
    price: 'Free',
    image: '/productgalu/3.png',
  },
  {
    id: 'fleet-enterprise',
    name: 'Enterprise Custom Fleet',
    price: 'Custom Pricing',
    image: '/productgalu/4.png',
  },
];

type HomePageProps = {
  params?: Promise<Record<string, string | string[]>>;
  searchParams?: Promise<Record<string, string | string[]>>;
};

export default function Home(props: HomePageProps) {
  if (props.params) React.use(props.params);
  if (props.searchParams) React.use(props.searchParams);

  const [productMode, setProductMode] = React.useState<'individual' | 'commercial'>('individual');

  const activeProducts = productMode === 'individual' ? individualProducts : commercialProducts;

  return (
    <div className="relative min-h-screen text-neutral-900 overflow-x-clip bg-rexu-grid bg-white">
      <SiteNavbar />

      {/* Hero */}
      <section className="relative px-4 pb-16 pt-8 sm:px-6 lg:pb-24">
        {/* Floating background blur orbs */}
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
            <motion.div 
              variants={heroItemVariants} 
              className="mt-10 flex justify-center cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = '/?choice=true';
              }}
            >
              <GradientButton href="/?choice=true">Get started</GradientButton>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* About Us (Centered Layout) */}
      <MotionSection className="px-4 py-20 sm:px-6" stagger staggerDelay={0.12}>
        <div className="mx-auto max-w-3xl text-center">
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
            <div className="mt-8 flex justify-center">
              <GradientButton href="/about">Learn more</GradientButton>
            </div>
          </motion.div>
        </div>
      </MotionSection>

      {/* Instagram Section (Social Media directly after About Us) */}
      <InstagramSection />

      {/* How it works */}
      <div id="features" className="relative w-full">
        <HowItWorksToggle />
      </div>

      {/* Solutions / Pricing Catalog Grid */}
      <MotionSection
        id="solutions"
        className="px-4 py-20 sm:px-6"
        stagger
        staggerDelay={0.08}
      >
        <div className="mx-auto max-w-5xl">
          <motion.div className="text-center" variants={staggerChildVariants}>
            <SectionTag>Solutions</SectionTag>
            <h2 className="mt-6 text-3xl font-bold text-neutral-900 sm:text-4xl">
              Our <span className="text-gradient-brand">Products</span>
            </h2>

            {/* Pill Toggle for Products Catalog */}
            <div className="relative flex w-full max-w-xs mx-auto mt-8 justify-center rounded-full bg-neutral-950/5 p-1 border border-neutral-200/50 backdrop-blur-md">
              <div className="absolute inset-0 -z-20 rounded-full bg-gradient-brand opacity-25 blur-sm" />
              {[
                { id: 'individual', label: 'Individual' },
                { id: 'commercial', label: 'Commercial' },
              ].map((item) => {
                const isActive = productMode === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setProductMode(item.id as 'individual' | 'commercial')}
                    className="relative flex-1 rounded-full py-2 text-sm font-semibold transition-colors duration-300 z-10 text-neutral-500 hover:text-neutral-800 focus:outline-none cursor-pointer"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-product-bubble"
                        className="absolute inset-0 rounded-full bg-gradient-brand text-neutral-900 border border-white/40 shadow-sm shadow-[#89d957]/10"
                        transition={{
                          type: 'spring',
                          stiffness: 150,
                          damping: 18,
                          mass: 0.85
                        }}
                        style={{ zIndex: -1 }}
                      />
                    )}
                    <span className={isActive ? 'text-neutral-900 font-bold' : ''}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Description after switching to selected part */}
            <motion.p
              key={productMode}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 text-sm text-neutral-600 max-w-md mx-auto leading-relaxed"
            >
              {productMode === 'individual'
                ? 'High-durability QR decals, smart tags, and reflective shields designed to protect solo riders, daily commuters, and active families.'
                : 'Centralized administration consoles, bulk deployment tools, and real-time incident logs engineered to scale for commercial transport fleets.'}
            </motion.p>
          </motion.div>

          {/* Catalog Grid exactly like Instagram Posts */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-12 justify-center">
            <AnimatePresence mode="popLayout">
              {activeProducts.map((product) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.45, ease }}
                  className="group relative aspect-square overflow-hidden rounded-2xl border border-neutral-100 bg-neutral-50 shadow-sm cursor-pointer"
                >
                  <Link href={`/products/${product.id}`} className="block w-full h-full">
                    {/* Image */}
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[3px] p-4 text-center">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white shadow-lg backdrop-blur-md transition-transform duration-300 scale-90 group-hover:scale-100">
                        <ArrowUpRight className="h-6 w-6" />
                      </div>
                      <h3 className="mt-3 text-sm font-bold text-white leading-tight">
                        {product.name}
                      </h3>
                      <span className="mt-1 text-xs font-semibold text-[#89d957]">
                        {product.price}
                      </span>
                      <span className="mt-4 text-[10px] font-bold text-[#89d957] tracking-wider uppercase bg-[#89d957]/10 px-3.5 py-1.5 rounded-full border border-[#89d957]/20">
                        Coming Soon
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {productMode === 'individual' && (
            <p className="mt-8 text-[10px] text-neutral-500 text-center leading-normal">
              * Inaugural offer of ₹349 per sticker is valid for up to 100 vehicles/profiles. For fleets exceeding 100, standard rates (₹499) apply.
            </p>
          )}
        </div>
      </MotionSection>

      <FAQSection />

      <CTABanner />
    </div>
  );
}

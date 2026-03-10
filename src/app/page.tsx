'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card3D } from '@/components/Card3D';
import { GlassCard } from '@/components/GlassCard';
import { MotionSection, staggerChildVariants } from '@/components/MotionSection';
import { CometCard } from '@/components/ui/comet-card';
import { MiniTimeline } from '@/components/ui/mini-timeline';
import Marquee from 'react-fast-marquee';
import { Shield, Smartphone, QrCode, PhoneCall, CheckCircle2, ArrowRight, Menu, X, User, Lock, Heart, Truck, LayoutDashboard, Users, CreditCard, PhoneOff, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const ease: [number, number, number, number] = [0.33, 1, 0.68, 1];
const easeBounce: [number, number, number, number] = [0.34, 1.56, 0.64, 1];
const navEase = { ease: [0.33, 1, 0.68, 1] as [number, number, number, number] };

type HomePageProps = {
  params?: Promise<Record<string, string | string[]>>;
  searchParams?: Promise<Record<string, string | string[]>>;
};

export default function Home(props: HomePageProps) {
  // Next.js 15: unwrap dynamic APIs so they are not enumerated/accessed by dev tooling
  if (props.params) React.use(props.params);
  if (props.searchParams) React.use(props.searchParams);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Typewriter effect for hero heading
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const fullText = "Scan. Connect. Save Lives.";
  const firstPart = "Scan. Connect. ";
  const secondPart = "Save Lives.";
  
  // Typewriter effect for price
  const [priceText, setPriceText] = useState('');
  const priceFullText = "₹299";
  
  useEffect(() => {
    let currentIndex = 0;
    let cursorInterval: NodeJS.Timeout;
    
    const typeInterval = setInterval(() => {
      if (currentIndex < fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typeInterval);
        setShowCursor(false); // Hide cursor when typing is complete
        if (cursorInterval) {
          clearInterval(cursorInterval);
        }
      }
    }, 80); // Typing speed
    
    // Cursor blink effect (only while typing)
    cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);
    
    return () => {
      clearInterval(typeInterval);
      if (cursorInterval) {
        clearInterval(cursorInterval);
      }
    };
  }, []);
  
  // Typewriter effect for price
  useEffect(() => {
    let currentIndex = 0;
    const priceInterval = setInterval(() => {
      if (currentIndex < priceFullText.length) {
        setPriceText(priceFullText.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(priceInterval);
      }
    }, 150); // Slower typing speed for price
    
    return () => clearInterval(priceInterval);
  }, [priceFullText]);
  
  return (
    <div className="min-h-screen bg-black text-foreground overflow-hidden">
      {/* Hero — uses provided texture image as background */}
      <section className="relative pt-32 md:pt-40 pb-20 sm:pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden bg-textured-hero">
        {/* Navbar content at the top of hero section */}
        <div className="absolute top-0 left-0 right-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-[4.25rem] items-center">
              <div className="flex items-center">
                <Link href="/" className="flex items-center gap-2 group">
                  <motion.div
                    className="h-12 w-auto"
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2, ...navEase }}
                  >
                    <img
                      src="/rexu-logo.png"
                      alt="REXU"
                      className="h-12 w-auto object-contain"
                    />
                  </motion.div>
                </Link>
              </div>

              <div className="hidden md:flex flex-1 items-center justify-center gap-8">
                {[
                  { href: '/#features', label: 'How it works' },
                  { href: '/#pricing', label: 'Pricing' },
                  { href: '/about', label: 'About Us' },
                ].map((item) => (
                  <motion.div
                    key={item.href}
                    whileHover={{ y: -1 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center"
                  >
                    <Link
                      href={item.href}
                      className="inline-flex items-center justify-center text-sm font-medium text-[#B7BEC4] hover:text-[#145A3A] transition-colors"
                    >
                      {item.label}
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* Signup/Login Button */}
              <div className="hidden md:flex items-center">
                <motion.div
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#9AC57A]/20 border border-[#9AC57A]/40 text-[#9AC57A] text-sm font-medium hover:bg-[#9AC57A]/30 transition-colors"
                  >
                    Signup/login
                  </Link>
                </motion.div>
              </div>

              <div className="md:hidden flex items-center">
                <motion.button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="text-[#E6ECEF] p-2 -m-2 rounded-lg hover:bg-[#2B3136]"
                  whileTap={{ scale: 0.92 }}
                  transition={{ duration: 0.15 }}
                >
                  {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </motion.button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ...navEase }}
                className="md:hidden overflow-hidden bg-[#1F2428] border-b border-[#2B3136]"
              >
                <div className="py-4 px-4 space-y-1">
                  {[
                    { href: '/#features', label: 'How it works' },
                    { href: '/#pricing', label: 'Pricing' },
                    { href: '/about', label: 'About Us' },
                  ].map((item, i) => (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * i, duration: 0.2, ...navEase }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setIsMenuOpen(false)}
                        className="block py-3 px-3 rounded-xl text-base font-medium text-[#B7BEC4] hover:bg-[#2B3136] hover:text-[#145A3A] transition-colors"
                      >
                        {item.label}
                      </Link>
                    </motion.div>
                  ))}
                  {/* Mobile Signup/Login Button */}
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * 3, duration: 0.2, ...navEase }}
                    className="pt-2"
                  >
                    <Link
                      href="/login"
                      onClick={() => setIsMenuOpen(false)}
                      className="block py-3 px-3 rounded-xl text-base font-medium bg-[#9AC57A]/20 border border-[#9AC57A]/40 text-[#9AC57A] hover:bg-[#9AC57A]/30 transition-colors text-center"
                    >
                      Signup/login
                    </Link>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Glowing green arc at the bottom */}
        <div className="hero-arc" aria-hidden />
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.1 }}
            className="space-y-10"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2, ease: easeBounce }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2B3136] border border-[#3A3F45] text-[11px] font-semibold tracking-[0.22em] text-[#B7BEC4]"
            >
              <Shield className="w-4 h-4 text-[#1F7A5A]" /> REXU · Digital Safety Shield
            </motion.div>

            <div className="min-h-[132px] flex items-start justify-center">
              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.28, ease }}
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight text-white leading-[1.1] w-full"
              >
                {displayedText.length <= firstPart.length ? (
                  <>
                    {displayedText}
                    {showCursor && (
                      <span className="inline-block w-[3px] h-[0.9em] bg-white ml-1 align-middle" />
                    )}
                  </>
                ) : (
                  <>
                    {firstPart}
                    <span className="block text-[#9AC57A]">
                      {displayedText.slice(firstPart.length)}
                      {showCursor && (
                        <span className="inline-block w-[3px] h-[0.9em] bg-[#9AC57A] ml-1 align-middle" />
                      )}
                    </span>
                  </>
                )}
              </motion.h1>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.7, delay: 0.38, ease }}
              className="max-w-2xl mx-auto text-base sm:text-lg text-[#D1D7DC] leading-relaxed"
            >
              A high‑trust safety layer for <strong className="text-white">personal riders</strong> and{' '}
              <strong className="text-white">commercial fleets</strong>. In an emergency, anyone
              can scan your REXU QR to reach your trusted contacts — securely, even when you
              can&apos;t use your phone.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.48, ease }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              {/* Personal / individual CTA */}
              <motion.div
                whileHover={{ scale: 1.01, y: -1 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2, ease }}
                className="w-full sm:w-auto"
              >
                <Link
                  href="/#pricing"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0A2A1F] text-white px-5 py-2.5 text-sm md:text-base font-semibold hover:bg-[#145A3A] active:bg-[#1E6F4E] border border-black shadow-[0_4px_12px_rgba(0,0,0,0.15)] h-[54px] transition-colors"
                >
                  Get started
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </motion.div>

              {/* About Us CTA */}
              <motion.div
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2, ease }}
                className="w-full sm:w-auto"
              >
                <Link
                  href="/about"
                  className="inline-flex items-center justify-center w-full sm:w-auto rounded-md border border-[#145A3A] text-[#145A3A] px-8 py-3.5 text-sm md:text-base font-semibold hover:bg-[#145A3A] hover:text-white transition-colors"
                >
                  About Us
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Brands love us section */}
      <MotionSection
        className="py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-black via-[#101518] to-black"
        stagger
        staggerDelay={0.05}
      >
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3">
              Brands love us
            </h2>
            <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto">
              REXU is trusted by the best companies who are serious about safety and reliability.
            </p>
          </div>
          
          {/* Scrolling logos - Single row */}
          <div className="space-y-6 py-4">
            <Marquee speed={38} gradient={false} className="gap-8">
              {[
                { name: 'REXU' },
                { name: 'Safety First' },
                { name: 'SecureRide' },
                { name: 'SafeGuard' },
                { name: 'ProtectMe' },
                { name: 'Guardian' },
              ].map((brand, i) => (
                <div key={i} className="flex items-center justify-center px-6 py-4 rounded-xl bg-[#1E2328]/50 border border-white/5 mx-4 w-[180px] h-[66px]">
                  <span className="text-white font-medium text-sm whitespace-nowrap">{brand.name}</span>
                </div>
              ))}
            </Marquee>
          </div>
        </div>
      </MotionSection>

      {/* What is RexU section */}
      <MotionSection
        className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-black via-[#101518] to-black relative overflow-hidden"
        stagger
        staggerDelay={0.08}
      >
        <div className="max-w-7xl mx-auto space-y-14 relative z-10">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4">
              What is <span className="text-[#9AC57A]">RexU</span>?
            </h2>
            <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto">
              A simple QR sticker on your vehicle or ID that connects a bystander to your emergency contacts in seconds.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1 – Instant QR Scanning */}
            <motion.div
              variants={staggerChildVariants}
              className="rounded-[28px] border border-white/10 bg-[#101518]/90 p-8 text-center transition-all duration-300 hover:border-[#145A3A]"
            >
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0F3D2E]/20 border border-[#0F3D2E]/30">
                <QrCode className="h-8 w-8 text-[#9AC57A]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Instant QR Scanning
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Anyone can scan your QR with any phone camera — no app needed.
              </p>
            </motion.div>

            {/* Card 2 – No Phone Number Exposed */}
            <motion.div
              variants={staggerChildVariants}
              className="rounded-[28px] border border-white/10 bg-[#101518]/90 p-8 text-center transition-all duration-300 hover:border-[#145A3A]"
            >
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0F3D2E]/20 border border-[#0F3D2E]/30">
                <PhoneOff className="h-8 w-8 text-[#9AC57A]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                No Phone Number Exposed
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Your privacy stays intact. Only emergency contacts are notified.
              </p>
            </motion.div>

            {/* Card 3 – Works When You Can't */}
            <motion.div
              variants={staggerChildVariants}
              className="rounded-[28px] border border-white/10 bg-[#101518]/90 p-8 text-center transition-all duration-300 hover:border-[#145A3A]"
            >
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0F3D2E]/20 border border-[#0F3D2E]/30">
                <ShieldCheck className="h-8 w-8 text-[#9AC57A]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Works When You Can&apos;t
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                If you&apos;re unconscious or unable to communicate, your QR speaks for you.
              </p>
            </motion.div>
          </div>
        </div>
      </MotionSection>

      {/* Features — Mini Timeline */}
      <MotionSection
        id="features"
        className="py-20 px-4 sm:px-6 lg:px-8 bg-black relative"
        stagger
        staggerDelay={0.12}
      >
        <div className="max-w-5xl mx-auto">
          <motion.div variants={staggerChildVariants} className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
              How it works
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto text-lg">
              Simple process designed for maximum reliability during emergencies.
            </p>
          </motion.div>
          <MiniTimeline
            steps={[
              {
                icon: <Smartphone className="w-5 h-5 text-white" />,
                title: 'Register & Setup',
                desc: 'Create your account and add emergency contacts.',
              },
              {
                icon: <QrCode className="w-5 h-5 text-white" />,
                title: 'Generate QR',
                desc: 'Get your unique vehicle QR code instantly.',
              },
              {
                icon: <PhoneCall className="w-5 h-5 text-white" />,
                title: 'Scan & Call',
                desc: 'Anyone scans the QR to reach your contacts.',
              },
              {
                icon: <Lock className="w-5 h-5 text-white" />,
                title: 'Secure & Private',
                desc: 'Info is encrypted and privacy-first.',
              },
              {
                icon: <Heart className="w-5 h-5 text-white" />,
                title: 'Always Protected',
                desc: 'Active 24/7 — help is one scan away.',
              },
            ]}
          />
        </div>
      </MotionSection>

      {/* Pricing — Choose Your Plan */}
      <MotionSection
        id="pricing"
        className="py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-black via-[#101518] to-black relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#145A3A]/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-5xl mx-auto relative space-y-12">
          <div className="text-center">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">
              Choose Your <span className="text-[#9AC57A]">Plan</span>
            </h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Whether you&apos;re an individual rider or managing a fleet — REXU has you covered.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-stretch">
            {/* Individuals & Families card */}
            <CometCard rotateDepth={3} translateDepth={4}>
              <div className="p-8 lg:p-10 rounded-[28px] border border-white/10 bg-[#101518]/90 h-full relative overflow-hidden flex flex-col">
                {/* Icon */}
                <div className="mb-6 p-4 rounded-2xl w-fit bg-[#0F3D2E]/20 border border-[#0F3D2E]/30">
                  <User className="w-8 h-8 text-[#9AC57A]" />
                </div>

                {/* Title */}
                <h3 className="text-2xl font-extrabold text-white mb-6">
                  Individuals &amp; Families
                </h3>

                {/* Features list */}
                <ul className="space-y-5 mb-10 flex-1">
                  {[
                    { icon: <User className="w-5 h-5 text-[#9AC57A]" />, text: 'Personal safety profile' },
                    { icon: <Heart className="w-5 h-5 text-[#9AC57A]" />, text: 'Family emergency contacts' },
                    { icon: <Shield className="w-5 h-5 text-[#9AC57A]" />, text: 'Medical info (optional)' },
                    { icon: <QrCode className="w-5 h-5 text-[#9AC57A]" />, text: 'One QR per person or vehicle' },
                    { icon: <CheckCircle2 className="w-5 h-5 text-[#9AC57A]" />, text: 'No subscriptions or hidden fees' },
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-zinc-300 text-sm sm:text-base">
                      {item.icon}
                      {item.text}
                    </li>
                  ))}
                </ul>

                {/* CTA button */}
                <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    href="/register"
                    className="block w-full bg-[#0F3D2E] hover:bg-[#145A3A] text-white py-4 rounded-2xl font-bold transition-all duration-300 text-center text-base"
                  >
                    Get Started
                  </Link>
                </motion.div>
              </div>
            </CometCard>

            {/* Commercial Fleets & Workplaces card */}
            <CometCard rotateDepth={3} translateDepth={4}>
              <div className="p-8 lg:p-10 rounded-[28px] border-2 border-[#145A3A] bg-[#101518]/90 h-full relative overflow-hidden flex flex-col">
                {/* Badge */}
                <div className="absolute top-6 right-6 px-4 py-1.5 rounded-full bg-[#145A3A] text-white text-xs font-bold">
                  For Business
                </div>

                {/* Icon */}
                <div className="mb-6 p-4 rounded-2xl w-fit bg-[#145A3A]/20 border border-[#145A3A]/30">
                  <Truck className="w-8 h-8 text-[#9AC57A]" />
                </div>

                {/* Title */}
                <h3 className="text-2xl font-extrabold text-white mb-6">
                  Commercial Fleets &amp; Workplaces
                </h3>

                {/* Features list */}
                <ul className="space-y-5 mb-10 flex-1">
                  {[
                    { icon: <LayoutDashboard className="w-5 h-5 text-[#9AC57A]" />, text: 'Admin dashboard' },
                    { icon: <Truck className="w-5 h-5 text-[#9AC57A]" />, text: 'Multiple vehicles & drivers' },
                    { icon: <Users className="w-5 h-5 text-[#9AC57A]" />, text: 'Driver assignment per day' },
                    { icon: <QrCode className="w-5 h-5 text-[#9AC57A]" />, text: 'Bulk QR generation' },
                    { icon: <CreditCard className="w-5 h-5 text-[#9AC57A]" />, text: 'Single consolidated payment' },
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-zinc-300 text-sm sm:text-base">
                      {item.icon}
                      {item.text}
                    </li>
                  ))}
                </ul>

                {/* CTA button */}
                <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    href="/register?segment=commercial"
                    className="block w-full bg-[#145A3A] hover:bg-[#1F7A5A] text-white py-4 rounded-2xl font-bold transition-all duration-300 text-center text-base"
                  >
                    Request Demo
                  </Link>
                </motion.div>
              </div>
            </CometCard>
          </div>
        </div>
      </MotionSection>

    </div>
  );
}

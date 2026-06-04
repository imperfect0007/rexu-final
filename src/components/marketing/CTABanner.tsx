'use client';

import { GradientButton } from './GradientButton';
import { MotionSection, staggerChildVariants } from '@/components/MotionSection';
import { motion } from 'framer-motion';

export function CTABanner() {
  return (
    <MotionSection className="px-4 py-16 sm:px-6" stagger staggerDelay={0.1}>
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-neutral-900 px-8 py-16 text-center sm:px-16">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#89d957]/30 to-transparent"
          aria-hidden
        />
        <motion.div variants={staggerChildVariants}>
          <h2 className="relative text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Let&apos;s protect what matters
          </h2>
        </motion.div>
        <motion.div variants={staggerChildVariants}>
          <p className="relative mx-auto mt-4 max-w-lg text-neutral-300">
            Get your REXU QR in minutes — for yourself, your family, or your entire fleet.
          </p>
        </motion.div>
        <motion.div className="relative mt-8 flex justify-center" variants={staggerChildVariants}>
          <GradientButton href="/register" variant="dark">
            Get started
          </GradientButton>
        </motion.div>
      </div>
    </MotionSection>
  );
}

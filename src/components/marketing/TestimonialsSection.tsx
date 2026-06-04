'use client';

import { SectionTag, SparkSheet } from './SparkSheet';
import { MotionSection, staggerChildVariants } from '@/components/MotionSection';
import { motion } from 'framer-motion';

const testimonials = [
  {
    quote:
      'REXU gave our delivery fleet a safety layer we did not have before. Setup was fast and drivers actually use it.',
    name: 'Fleet Operations',
    company: 'Logistics partner',
  },
  {
    quote:
      'As a parent, knowing anyone can reach us via the QR on my son’s bike — without exposing his number — is priceless.',
    name: 'Family user',
    company: 'Individual plan',
  },
  {
    quote:
      'The emergency page loads instantly. No app friction. That is exactly what you need in a crisis.',
    name: 'Safety consultant',
    company: 'Partner review',
  },
];

export function TestimonialsSection() {
  return (
    <MotionSection className="px-4 py-20 sm:px-6" stagger staggerDelay={0.08}>
      <div className="mx-auto max-w-6xl text-center">
        <motion.div variants={staggerChildVariants}>
          <SectionTag>Testimonials</SectionTag>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            What our Users Say
          </h2>
          <p className="mt-3 text-neutral-600">Real feedback from riders and fleets we help protect.</p>
        </motion.div>
      </div>

      <div className="mx-auto mt-12 grid max-w-6xl gap-6 md:grid-cols-3">
        {testimonials.map((t) => (
          <motion.div key={t.name} variants={staggerChildVariants}>
            <SparkSheet className="flex flex-col h-full !p-6">
              <p className="flex-1 text-sm leading-relaxed text-neutral-600">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-6 flex items-center gap-3 border-t border-neutral-100 pt-4">
                <div className="h-10 w-10 rounded-full bg-gradient-brand" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-neutral-900">{t.name}</p>
                  <p className="text-xs text-neutral-500">{t.company}</p>
                </div>
              </div>
            </SparkSheet>
          </motion.div>
        ))}
      </div>
    </MotionSection>
  );
}

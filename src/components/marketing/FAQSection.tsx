'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SectionTag, SparkSheet } from './SparkSheet';
import { cn } from '@/lib/utils';
import { MotionSection, staggerChildVariants } from '@/components/MotionSection';
import { motion, AnimatePresence } from 'framer-motion';

const faqs = [
  {
    q: 'Do people need the REXU app to scan my QR?',
    a: 'No. Anyone can scan with their phone camera. The emergency page opens instantly in the browser — no install required.',
  },
  {
    q: 'Is my phone number shown publicly?',
    a: 'Never. Only your chosen emergency contacts are reachable. Your personal number stays private.',
  },
  {
    q: 'Can fleets manage multiple drivers and vehicles?',
    a: 'Yes. Fleet admins get a dashboard to assign drivers, generate bulk QRs, and track check-ins from one place.',
  },
  {
    q: 'What happens if I lose my sticker?',
    a: 'You can deactivate the old QR from your dashboard and generate a new one in seconds.',
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <MotionSection id="faq" className="px-4 py-20 sm:px-6" stagger staggerDelay={0.08}>
      <div className="mx-auto max-w-3xl text-center">
        <motion.div variants={staggerChildVariants}>
          <SectionTag>FAQs</SectionTag>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl md:text-5xl">
            Have any Questions?
          </h2>
          <p className="mt-3 text-neutral-600">Find the answers here.</p>
        </motion.div>
      </div>

      <div className="mx-auto mt-12 max-w-4xl space-y-3">
        {faqs.map((item, i) => {
          const open = openIndex === i;
          return (
            <motion.div key={item.q} variants={staggerChildVariants}>
              <SparkSheet className="!p-0 overflow-hidden">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left focus:outline-none"
                  onClick={() => setOpenIndex(open ? -1 : i)}
                >
                  <span className="font-semibold text-neutral-900">{item.q}</span>
                  <ChevronDown
                    className={cn(
                      'h-5 w-5 shrink-0 text-neutral-400 transition-transform duration-200',
                      open && 'rotate-180'
                    )}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}
                      className="overflow-hidden border-t border-neutral-100 bg-neutral-50/30"
                    >
                      <p className="px-5 py-4 text-sm leading-relaxed text-neutral-600">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </SparkSheet>
            </motion.div>
          );
        })}
      </div>
    </MotionSection>
  );
}

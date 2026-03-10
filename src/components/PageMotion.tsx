'use client';

import { motion } from 'framer-motion';

const ease = [0.33, 1, 0.68, 1] as [number, number, number, number];

export function PageMotion({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Wraps main content so sections can use stagger when they're motion.section with variants */
export function MainMotion({ children }: { children: React.ReactNode }) {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, delay: 0.05, ease }}
      className="max-w-3xl mx-auto px-4 py-8 pb-16 space-y-12"
    >
      {children}
    </motion.main>
  );
}

export const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.33, 1, 0.68, 1] as [number, number, number, number] } },
};

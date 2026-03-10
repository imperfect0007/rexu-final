'use client';

import { motion, type Variants } from 'framer-motion';

type CubicBezier = [number, number, number, number];
const defaultEase: CubicBezier = [0.33, 1, 0.68, 1];

export const staggerChildVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: defaultEase } },
};

interface MotionSectionProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
  stagger?: boolean;
  staggerDelay?: number;
  once?: boolean;
  variants?: Variants;
}

export function MotionSection({
  children,
  id,
  className = '',
  stagger = false,
  staggerDelay = 0.08,
  once = true,
  variants,
}: MotionSectionProps) {
  const sectionVariants =
    variants ??
    (stagger
      ? {
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: staggerDelay, delayChildren: 0.1 },
          },
        }
      : {
          hidden: { opacity: 0, y: 16 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: defaultEase } },
        });

  return (
    <motion.section
      id={id}
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: '-60px' }}
      variants={sectionVariants}
    >
      {children}
    </motion.section>
  );
}

export function FadeUp({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay, ease: defaultEase }}
    >
      {children}
    </motion.div>
  );
}

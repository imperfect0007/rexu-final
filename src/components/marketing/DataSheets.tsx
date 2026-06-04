'use client';

import { SparkSheet } from './SparkSheet';
import { TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const stats = [
  {
    label: 'Emergency scans',
    value: '12,400+',
    change: '+18% vs last month',
    accent: 'from-[#89d957]/40 to-[#c9e265]/20',
  },
  {
    label: 'Active QR profiles',
    value: '8,200',
    change: '+12% vs last month',
    accent: 'from-[#c9e265]/35 to-[#89d957]/15',
  },
  {
    label: 'Fleet vehicles',
    value: '1,450',
    change: '+24% vs last month',
    accent: 'from-[#89d957]/30 to-emerald-100/50',
  },
];

const cubicBezierEase: [number, number, number, number] = [0.33, 1, 0.68, 1];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const sheetVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: cubicBezierEase },
  },
};

function MiniChart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 40" className={className} aria-hidden>
      <path
        d="M0 32 Q20 28 35 22 T70 18 T120 8"
        fill="none"
        stroke="url(#chartGrad)"
        strokeWidth="2.5"
      />
      <defs>
        <linearGradient id="chartGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#89d957" />
          <stop offset="100%" stopColor="#c9e265" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function DataSheets() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div
        className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#89d957]/25 via-[#c9e265]/15 to-white blur-sm"
        aria-hidden
      />
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        className="relative space-y-3 p-2"
      >
        {stats.map((stat) => (
          <motion.div key={stat.label} variants={sheetVariants}>
            <SparkSheet
              className="relative transition-transform hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-neutral-500">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-neutral-900">
                    {stat.value}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs font-medium text-[#5a9c32]">
                    <TrendingUp className="h-3.5 w-3.5" />
                    {stat.change}
                  </p>
                </div>
                <MiniChart className="h-10 w-24 shrink-0 opacity-90" />
              </div>
              <div
                className={`absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl bg-gradient-to-r ${stat.accent}`}
                aria-hidden
              />
            </SparkSheet>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

'use client';

import { SectionTag, SparkSheet } from './SparkSheet';
import { GradientButton } from './GradientButton';
import { MotionSection, staggerChildVariants } from '@/components/MotionSection';
import { motion } from 'framer-motion';

const team = [
  { name: 'Revanth Kumar S', role: 'Developer & Management' },
  { name: 'Sujith L B', role: 'Brand Strategist & Marketing' },
  { name: 'Tejasvi Jois S', role: 'Brand Strategist & Operations' },
  { name: 'Support', role: 'Customer Care' },
];

export function TeamSection() {
  return (
    <MotionSection className="px-4 py-20 sm:px-6" stagger staggerDelay={0.08}>
      <div className="mx-auto max-w-6xl rounded-3xl bg-neutral-50/80 px-6 py-16 sm:px-10">
        <motion.div className="text-center" variants={staggerChildVariants}>
          <SectionTag>Our team</SectionTag>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            Meet Founders
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-neutral-600">
            Experts focused on real-world safety — for riders, families, and commercial fleets.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {team.map((member) => (
            <motion.div key={member.name} variants={staggerChildVariants}>
              <SparkSheet className="text-center h-full !p-6">
                <div className="mx-auto mb-4 aspect-square w-full max-w-[140px] overflow-hidden rounded-2xl bg-gradient-to-br from-[#89d957]/30 to-[#c9e265]/20">
                  <div className="flex h-full items-center justify-center text-4xl font-bold text-[#5a9c32]/40">
                    {member.name.charAt(0)}
                  </div>
                </div>
                <h3 className="font-bold text-neutral-900">{member.name}</h3>
                <p className="mt-1 text-sm text-neutral-500">{member.role}</p>
              </SparkSheet>
            </motion.div>
          ))}
        </div>

        <motion.div className="mt-12 flex justify-center" variants={staggerChildVariants}>
          <GradientButton href="/contact">Contact us</GradientButton>
        </motion.div>
      </div>
    </MotionSection>
  );
}

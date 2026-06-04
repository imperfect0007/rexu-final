"use client";

import React from "react";
import { motion } from "framer-motion";

interface TimelineStep {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

export const MiniTimeline = ({ steps }: { steps: TimelineStep[] }) => {
  return (
    <div className="relative flex flex-col md:flex-row items-start md:items-stretch justify-between gap-0 w-full">
      {/* Horizontal connecting line (desktop) */}
      <div className="hidden md:block absolute top-6 left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-transparent via-[#89d957]/50 to-transparent z-0" />
      {/* Vertical connecting line (mobile) */}
      <div className="md:hidden absolute top-0 bottom-0 left-6 w-[2px] bg-gradient-to-b from-transparent via-[#89d957]/50 to-transparent z-0" />

      {steps.map((step, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4, delay: i * 0.1 }}
          className="relative z-10 flex md:flex-col items-start md:items-center gap-4 md:gap-3 flex-1 py-3 md:py-0 md:px-2"
        >
          {/* Dot / Icon */}
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-brand border border-[#89d957]/30 flex items-center justify-center shadow-md shadow-[#89d957]/20">
              {step.icon}
            </div>
            {/* Step number badge */}
            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-[#89d957]/40 flex items-center justify-center">
              <span className="text-[10px] font-bold text-[#5a9c32]">{i + 1}</span>
            </div>
          </div>

          {/* Text */}
          <div className="md:text-center">
            <p className="text-sm font-semibold text-neutral-900 leading-snug">
              {step.title}
            </p>
            <p className="text-xs text-neutral-500 mt-1 leading-relaxed max-w-[180px] md:max-w-[160px]">
              {step.desc}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

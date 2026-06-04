'use client';

import * as React from 'react';
import { motion } from 'framer-motion';

export type Step = {
    icon: React.ReactNode; // already rendered Lucide icon
    title: string;
    desc: string;
};

type Props = {
    steps: Step[];
};

export const HowItWorksGrid = ({ steps }: Props) => {
    const container = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.12 },
        },
    };

    const card = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: [0.33, 1, 0.68, 1] as const },
        },
    };

    return (
        <motion.div
            className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
            variants={container}
            initial="hidden"
            animate="visible"
        >
            {steps.map((step, i) => (
                <motion.div
                    key={i}
                    className="glass-card rounded-2xl p-6 text-center"
                    variants={card}
                    whileHover={{ scale: 1.03 }}
                >
                    <motion.div
                        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#89d957] to-[#c9e265] text-[#1a2e0f]"
                        whileHover={{ rotate: 15, scale: 1.1 }}
                    >
                        {step.icon}
                    </motion.div>
                    <h3 className="mb-2 text-lg font-bold text-neutral-900">{step.title}</h3>
                    <p className="text-sm text-neutral-600">{step.desc}</p>
                </motion.div>
            ))}
        </motion.div>
    );
};

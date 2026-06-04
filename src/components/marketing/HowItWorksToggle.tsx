'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HowItWorksGrid, type Step } from '@/components/marketing/HowItWorksGrid';
import {
    Smartphone,
    QrCode,
    PhoneCall,
    Lock,
    Heart,
    Truck,
    User,
} from 'lucide-react';

export const HowItWorksToggle = () => {
    const [mode, setMode] = useState<'personal' | 'fleet'>('personal');

    const personalSteps: Step[] = [
        {
            icon: <Smartphone className="h-6 w-6" />,
            title: 'Register & Setup',
            desc: 'Add emergency contacts and optional medical info.',
        },
        {
            icon: <QrCode className="h-6 w-6" />,
            title: 'Get your QR',
            desc: 'Print or stick on your vehicle or helmet.',
        },
        {
            icon: <PhoneCall className="h-6 w-6" />,
            title: 'Scan & Connect',
            desc: 'Bystanders reach your contacts instantly.',
        },
        {
            icon: <Lock className="h-6 w-6" />,
            title: 'Stay Private',
            desc: 'Encrypted, privacy‑first by design.',
        },
        {
            icon: <Heart className="h-6 w-6" />,
            title: 'Always On',
            desc: '24/7 protection — one scan away.',
        },
    ];

    const fleetSteps: Step[] = [
        {
            icon: <Truck className="h-6 w-6" />,
            title: 'Fleet Dashboard',
            desc: 'Manage many vehicles and drivers from one place.',
        },
        {
            icon: <User className="h-6 w-6" />,
            title: 'Bulk QR Generation',
            desc: 'Create QR codes for all assets in seconds.',
        },
        {
            icon: <Smartphone className="h-6 w-6" />,
            title: 'Driver On‑boarding',
            desc: 'Add drivers, assign vehicles, set permissions.',
        },
        {
            icon: <Lock className="h-6 w-6" />,
            title: 'Secure Data',
            desc: 'End‑to‑end encryption for fleet‑wide alerts.',
        },
        {
            icon: <Heart className="h-6 w-6" />,
            title: '24/7 Fleet Safety',
            desc: 'Instant emergency reach for every driver.',
        },
    ];

    const toggleItems = [
        { id: 'personal', label: 'Personal QR' },
        { id: 'fleet', label: 'Fleet QR' },
    ] as const;

    return (
        <section className="px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-5xl">
                {/* Heading */}
                <div className="mb-8 text-center">
                    <h2 className="text-3xl font-bold text-neutral-900 sm:text-4xl">
                        How it works
                    </h2>
                    <p className="mt-2 text-neutral-600">
                        Choose the flow that fits your needs.
                    </p>
                </div>

                {/* Pill‑style toggle */}
                <div className="mb-10 flex justify-center rounded-full bg-white/5 p-1 backdrop-blur-md">
                    {toggleItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setMode(item.id)}
                            className={`
                flex-1 rounded-full px-4 py-2 text-sm font-medium
                transition-colors
                ${mode === item.id
                                    ? 'bg-gradient-to-r from-[#89d957] to-[#c9e265] text-neutral-900'
                                    : 'text-neutral-500 hover:text-neutral-300'
                                }
              `}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                {/* Animated card grid */}
                <AnimatePresence mode="wait">
                    {mode === 'personal' ? (
                        <motion.div
                            key="personal"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.4 }}
                        >
                            <HowItWorksGrid steps={personalSteps} />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="fleet"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.4 }}
                        >
                            <HowItWorksGrid steps={fleetSteps} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
};

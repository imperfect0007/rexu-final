'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useMotionValueEvent, useSpring } from 'framer-motion';
import {
    Smartphone,
    QrCode,
    PhoneCall,
    Lock,
    Heart,
    Truck,
    User,
    ArrowDown
} from 'lucide-react';

type Mode = 'individual' | 'commercial';

type Step = {
    icon: React.ReactNode;
    title: string;
    desc: string;
};

export const HowItWorksToggle = () => {
    const [mode, setMode] = useState<Mode>('individual');

    // Preloading states
    const [indiImages, setIndiImages] = useState<HTMLImageElement[]>([]);
    const [commImages, setCommImages] = useState<HTMLImageElement[]>([]);
    const [indiProgress, setIndiProgress] = useState(0);
    const [commProgress, setCommProgress] = useState(0);
    const [indiLoaded, setIndiLoaded] = useState(false);
    const [commLoaded, setCommLoaded] = useState(false);

    // Timeline steps configuration
    const personalSteps: Step[] = [
        {
            icon: <Smartphone className="h-5 w-5" />,
            title: 'Register & Setup',
            desc: 'Add emergency contacts and optional medical info to your profile.',
        },
        {
            icon: <QrCode className="h-5 w-5" />,
            title: 'Get your QR',
            desc: 'Download and print, or order physical stickers for your helmet and vehicle.',
        },
        {
            icon: <PhoneCall className="h-5 w-5" />,
            title: 'Scan & Connect',
            desc: 'Bystanders scan with any phone to immediately alert your emergency contacts.',
        },
        {
            icon: <Lock className="h-5 w-5" />,
            title: 'Stay Private',
            desc: 'Your real phone number remains hidden. Communication is encrypted.',
        },
        {
            icon: <Heart className="h-5 w-5" />,
            title: 'Always On',
            desc: '24/7 protection that is always active and one quick scan away.',
        },
    ];

    const fleetSteps: Step[] = [
        {
            icon: <Truck className="h-5 w-5" />,
            title: 'Fleet Dashboard',
            desc: 'Access your centralized admin interface to manage vehicles and profiles.',
        },
        {
            icon: <User className="h-5 w-5" />,
            title: 'Bulk QR Generation',
            desc: 'Instantly generate batch QR assets for all commercial vehicles in seconds.',
        },
        {
            icon: <Smartphone className="h-5 w-5" />,
            title: 'Driver On-boarding',
            desc: 'Assign drivers dynamically, set trip routes, and assign check-in permissions.',
        },
        {
            icon: <Lock className="h-5 w-5" />,
            title: 'Secure Alerts',
            desc: 'End-to-end encryption secures incident reports and logs driver statuses.',
        },
        {
            icon: <Heart className="h-5 w-5" />,
            title: '24/7 Fleet Safety',
            desc: 'Maintain duty of care with real-time safety alerts and instant incident support.',
        },
    ];

    const toggleItems = [
        { id: 'individual', label: 'Individual' },
        { id: 'commercial', label: 'Commercial' },
    ] as const;

    // Preload Individual frames (Default View)
    useEffect(() => {
        let active = true;
        const loaded: HTMLImageElement[] = [];
        let loadedCount = 0;
        const total = 231;

        for (let i = 1; i <= total; i++) {
            const img = new Image();
            img.src = `/indi/ezgif-frame-${String(i).padStart(3, '0')}.jpg`;
            img.onload = () => {
                if (!active) return;
                loadedCount++;
                setIndiProgress(Math.round((loadedCount / total) * 100));
                if (loadedCount === total) {
                    setIndiImages(loaded);
                    setIndiLoaded(true);
                }
            };
            img.onerror = () => {
                if (!active) return;
                loadedCount++;
                if (loadedCount === total) {
                    setIndiImages(loaded);
                    setIndiLoaded(true);
                }
            };
            loaded.push(img);
        }

        return () => {
            active = false;
        };
    }, []);

    // Preload Commercial frames in background after Individual finishes
    useEffect(() => {
        if (!indiLoaded) return;

        let active = true;
        const loaded: HTMLImageElement[] = [];
        let loadedCount = 0;
        const total = 193;

        for (let i = 1; i <= total; i++) {
            const img = new Image();
            img.src = `/comm/ezgif-frame-${String(i).padStart(3, '0')}.jpg`;
            img.onload = () => {
                if (!active) return;
                loadedCount++;
                setCommProgress(Math.round((loadedCount / total) * 100));
                if (loadedCount === total) {
                    setCommImages(loaded);
                    setCommLoaded(true);
                }
            };
            img.onerror = () => {
                if (!active) return;
                loadedCount++;
                if (loadedCount === total) {
                    setCommImages(loaded);
                    setCommLoaded(true);
                }
            };
            loaded.push(img);
        }

        return () => {
            active = false;
        };
    }, [indiLoaded]);

    const activeSteps = mode === 'individual' ? personalSteps : fleetSteps;

    // Scroll & Sticky elements hooks
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ['start start', 'end end'],
    });

    // Smooth scroll progress to avoid visual stuttering on scroll speed variation
    const smoothProgress = useSpring(scrollYProgress, {
        damping: 35,
        stiffness: 180,
        mass: 0.1,
    });

    const modeFramesCount = mode === 'individual' ? 231 : 193;
    const frameIndex = useTransform(smoothProgress, [0, 1], [0, modeFramesCount - 1]);

    // Render Canvas sequences base frame
    const drawCanvasFrame = (idx: number) => {
        const images = mode === 'individual' ? indiImages : commImages;
        const isReady = mode === 'individual' ? indiLoaded : commLoaded;

        if (!isReady || images.length === 0 || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            const img = images[idx];
            if (img && img.complete) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            }
        }
    };

    // Draw frame on scroll scrubbing
    useMotionValueEvent(frameIndex, 'change', (latest) => {
        drawCanvasFrame(Math.round(latest));
    });

    // Draw initial frame on mount or mode swap
    useEffect(() => {
        const images = mode === 'individual' ? indiImages : commImages;
        const isReady = mode === 'individual' ? indiLoaded : commLoaded;

        if (isReady && images.length > 0 && canvasRef.current) {
            const currentProgress = scrollYProgress.get();
            const idx = Math.round(currentProgress * (images.length - 1));
            drawCanvasFrame(idx);
        }
    }, [mode, indiImages, commImages, indiLoaded, commLoaded]);

    // Active Step highlight state
    const [activeStep, setActiveStep] = useState(0);
    useMotionValueEvent(scrollYProgress, 'change', (latest) => {
        const currentStep = Math.min(Math.floor(latest * 5), 4);
        setActiveStep(currentStep);
    });

    // Centering left-column text cards during scrolling
    const stepsContainerY = useTransform(
        scrollYProgress,
        [0, 0.25, 0.5, 0.75, 1],
        [160, 20, -120, -260, -400]
    );
    const smoothStepsY = useSpring(stepsContainerY, {
        damping: 30,
        stiffness: 120,
    });

    const isCurrentModeLoaded = mode === 'individual' ? indiLoaded : commLoaded;
    const currentProgress = mode === 'individual' ? indiProgress : commProgress;

    return (
        <div ref={containerRef} className="relative w-full h-[320vh]">
            {/* Sticky Frame Section */}
            <div className="sticky top-0 h-screen w-full flex flex-col justify-between overflow-hidden py-8">
                {/* Switcher Header */}
                <div className="w-full flex flex-col items-center gap-4 px-4 z-20">
                    <h2 className="text-3xl font-extrabold text-neutral-900 tracking-tight text-center">
                        How it <span className="text-gradient-brand">works</span>
                    </h2>
                    
                    {/* Pill Toggle */}
                    <div className="relative flex w-full max-w-xs justify-center rounded-full bg-neutral-950/5 p-1 border border-neutral-200/50 backdrop-blur-md">
                        {/* Soft brand green glow behind switch */}
                        <div className="absolute inset-0 -z-20 rounded-full bg-gradient-brand opacity-25 blur-sm" />
                        
                        {toggleItems.map((item) => {
                            const isActive = mode === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setMode(item.id)}
                                    className="relative flex-1 rounded-full py-2 text-sm font-semibold transition-colors duration-300 z-10 text-neutral-500 hover:text-neutral-800 focus:outline-none cursor-pointer"
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="active-mode-bubble"
                                            className="absolute inset-0 rounded-full bg-gradient-brand text-neutral-900 border border-white/40 shadow-sm shadow-[#89d957]/10"
                                            transition={{
                                                type: 'spring',
                                                stiffness: 150,
                                                damping: 18,
                                                mass: 0.85
                                            }}
                                            style={{ zIndex: -1 }}
                                        />
                                    )}
                                    <span className={isActive ? 'text-neutral-900 font-bold' : ''}>
                                        {item.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Primary Dual Column Workspace */}
                <div className="flex-1 max-w-6xl w-full mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 items-center">
                    {/* Left Column: Text Scrollable Timeline */}
                    <div className="col-span-1 md:col-span-6 h-[40vh] md:h-[50vh] overflow-hidden relative flex items-center">
                        {/* Top and Bottom Fading Masks */}
                        <div className="absolute top-0 left-0 w-full h-16 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />

                        {/* Scrolling track line */}
                        <div className="absolute left-[26px] top-0 bottom-0 w-[2px] bg-neutral-100 z-0 hidden md:block">
                            <motion.div
                                className="absolute top-0 w-full bg-gradient-to-b from-[#89d957] to-[#c9e265] rounded-full shadow-sm"
                                style={{
                                    height: useTransform(scrollYProgress, [0, 1], ['0%', '100%']),
                                }}
                            />
                        </div>

                        {/* Moving Steps Wrapper */}
                        <motion.div 
                            style={{ y: smoothStepsY }} 
                            className="space-y-6 flex flex-col py-36 w-full pl-0 md:pl-12 z-10"
                        >
                            {activeSteps.map((step, idx) => {
                                const isActive = activeStep === idx;
                                return (
                                    <div
                                        key={step.title}
                                        className={`relative flex items-start gap-4 p-5 rounded-2xl transition-all duration-500 border border-transparent ${
                                            isActive
                                                ? 'bg-neutral-50/80 border-neutral-100 shadow-sm opacity-100 scale-100'
                                                : 'opacity-30 scale-95'
                                        }`}
                                    >
                                        {/* Icon Ring / Number */}
                                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                                            isActive
                                                ? 'bg-gradient-brand text-[#1a2e0f] border-white shadow-sm ring-4 ring-[#89d957]/10'
                                                : 'bg-white text-neutral-400 border-neutral-200'
                                        }`}>
                                            {step.icon}
                                        </div>

                                        {/* Content */}
                                        <div>
                                            <h3 className={`text-base font-bold transition-colors ${
                                                isActive ? 'text-neutral-900' : 'text-neutral-600'
                                            }`}>
                                                {step.title}
                                            </h3>
                                            <p className="mt-1 text-xs md:text-sm text-neutral-500 leading-relaxed">
                                                {step.desc}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </motion.div>
                    </div>

                    {/* Right Column: Floating Canvas Image Sequence */}
                    <div className="col-span-1 md:col-span-6 flex items-center justify-center relative">
                        {/* A very soft ambient glow behind the canvas to make it feel integrated and floaty */}
                        <div className="absolute inset-4 bg-gradient-brand opacity-[0.07] blur-[40px] rounded-full pointer-events-none" />
                        
                        <div className="relative flex items-center justify-center max-w-sm md:max-w-md w-full aspect-square overflow-hidden rounded-[2rem] border border-neutral-200/40 bg-white/20 backdrop-blur-sm shadow-sm">
                            {/* Preloader overlay */}
                            {!isCurrentModeLoaded && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 backdrop-blur-md rounded-[2rem] z-30">
                                    <div className="relative flex items-center justify-center">
                                        <svg className="w-16 h-16 transform -rotate-90">
                                            <circle
                                                cx="32"
                                                cy="32"
                                                r="26"
                                                className="stroke-neutral-100"
                                                strokeWidth="4"
                                                fill="transparent"
                                            />
                                            <circle
                                                cx="32"
                                                cy="32"
                                                r="26"
                                                className="stroke-[#89d957] transition-all duration-300"
                                                strokeWidth="4"
                                                fill="transparent"
                                                strokeDasharray={2 * Math.PI * 26}
                                                strokeDashoffset={2 * Math.PI * 26 * (1 - currentProgress / 100)}
                                            />
                                        </svg>
                                        <span className="absolute text-sm font-bold text-neutral-800">{currentProgress}%</span>
                                    </div>
                                    <span className="mt-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                        Loading sequence...
                                    </span>
                                </div>
                            )}

                            {/* HTML5 Interactive Canvas */}
                            <canvas
                                ref={canvasRef}
                                width={1080}
                                height={1080}
                                className="w-full h-full object-cover rounded-[2rem] bg-neutral-50/50"
                            />
                        </div>
                    </div>
                </div>

                {/* Bottom indicators */}
                <div className="w-full flex justify-center py-2 z-10 pointer-events-none">
                    <div className="flex flex-col items-center gap-1 opacity-40">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-500">Scroll to animate</span>
                        <motion.div
                            animate={{ y: [0, 4, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <ArrowDown className="h-3.5 w-3.5 text-neutral-500" />
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
};

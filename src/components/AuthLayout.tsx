'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

const ease = [0.33, 1, 0.68, 1] as [number, number, number, number];

export default function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="min-h-screen bg-rexu-grid flex relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#89d957]/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#c9e265]/15 blur-[100px] rounded-full pointer-events-none" />
      
      <Link 
        href="/" 
        className="absolute top-6 left-6 z-20 flex items-center gap-2 text-neutral-600 hover:text-[#5a9c32] transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">back</span>
      </Link>
      
      {/* Left Section - Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 sm:px-12 lg:px-16 xl:px-24 py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="max-w-md w-full"
        >
          {/* Logo */}
          <Link href="/" className="inline-flex items-center mb-8 group mx-auto">
            <img 
              src="/rexu-logo.png" 
              alt="REXU" 
              className="h-12 w-auto object-contain"
            />
          </Link>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease }}
            className="text-4xl sm:text-5xl font-bold text-neutral-900 mb-3 text-center"
          >
            {title}!
          </motion.h2>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="text-base text-neutral-600 mb-8 text-center"
          >
            {subtitle}
          </motion.p>

          {/* Form Content */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease }}
          >
            {children}
          </motion.div>
        </motion.div>
      </div>

      {/* Right Section - Testimonial */}
      <div className="hidden lg:flex flex-1 items-center justify-center px-8 xl:px-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#89d957]/20 via-[#c9e265]/10 to-transparent blur-3xl" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3, ease }}
          className="relative z-10 max-w-md"
        >
          <div className="rounded-2xl border border-neutral-100 bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
            <div className="flex gap-2 mb-6">
              <span className="px-3 py-1 rounded-full bg-[#89d957]/15 text-[#5a9c32] text-xs font-medium border border-[#89d957]/30">
                Safety Product
              </span>
              <span className="px-3 py-1 rounded-full bg-[#89d957]/15 text-[#5a9c32] text-xs font-medium border border-[#89d957]/30">
                Emergency Response
              </span>
            </div>

            <p className="text-neutral-800 text-lg leading-relaxed mb-6">
              &quot;REXU has completely changed how we approach vehicle safety. What used to take hours every week is now fully automated and accessible in emergencies.&quot;
            </p>

            <div>
              <p className="text-neutral-900 font-semibold">Fleet partner</p>
              <p className="text-neutral-500 text-sm">Commercial fleet user</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

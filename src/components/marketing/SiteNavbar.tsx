'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
const links = [
  { href: '/about', label: 'About' },
  { href: '/#features', label: 'How it works' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/#faq', label: 'FAQs' },
  { href: '/contact', label: 'Contact Us' },
];

export function SiteNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
      className="sticky top-0 z-50 px-4 pt-4 sm:px-6"
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-neutral-200/40 bg-white/35 px-4 py-2.5 shadow-sm backdrop-blur-xl sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <img src="/rexu-logo.png" alt="REXU" className="h-8 w-auto object-contain" />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="inline-flex h-9 items-center justify-center rounded-full border border-neutral-200/80 bg-white/40 px-5 text-sm font-semibold text-neutral-700 backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] hover:bg-neutral-50 hover:text-neutral-900 active:scale-[0.98]"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex h-9 items-center justify-center rounded-full bg-gradient-brand px-5 text-sm font-semibold text-[#1a2e0f] shadow-sm shadow-[#89d957]/10 transition-all duration-200 hover:scale-[1.02] hover:shadow-md hover:shadow-[#89d957]/20 active:scale-[0.98]"
          >
            Sign up
          </Link>
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-neutral-700 md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-auto mt-2 max-w-6xl overflow-hidden rounded-2xl border border-neutral-200 bg-white md:hidden"
          >
            <div className="flex flex-col gap-1 p-3">
              {links.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-2 flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex h-10 w-full items-center justify-center rounded-full border border-neutral-200/80 bg-white/40 text-sm font-semibold text-neutral-700 backdrop-blur-sm transition-all duration-200 hover:bg-neutral-50 hover:text-neutral-900"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setOpen(false)}
                  className="flex h-10 w-full items-center justify-center rounded-full bg-gradient-brand text-sm font-semibold text-[#1a2e0f] shadow-sm transition-all duration-200 hover:scale-[1.01]"
                >
                  Sign up
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

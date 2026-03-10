'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Shield } from 'lucide-react';

export default function ConditionalFooter() {
  const pathname = usePathname();
  const isAuthPage = pathname?.includes('/login') || pathname?.includes('/register');

  if (isAuthPage) {
    return null;
  }

  return (
    <>
      {/* Global footer */}
      <footer className="relative overflow-hidden border-t border-zinc-900 bg-black">
        {/* Watermark text in the background */}
        <div className="pointer-events-none select-none absolute inset-x-0 bottom-[-1.5rem] text-center text-[96px] sm:text-[140px] font-black tracking-tight text-zinc-800/50">
          REXU
        </div>
      </footer>

      {/* Footer content section */}
      <div className="bg-black relative overflow-hidden">
        {/* Logo background with low visibility */}
        <div
          className="pointer-events-none select-none absolute inset-0 bg-center bg-no-repeat opacity-[0.65]"
          style={{
            backgroundImage: 'url(/rexu-logo.png)',
            backgroundSize: 'contain',
          }}
        />

        {/* Black transparent overlay */}
        <div className="absolute inset-0 bg-black/70 z-[1]" />

        <div className="relative z-[2] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-10">
            {/* Brand + copyright */}
            <div className="space-y-4 w-full lg:w-auto flex flex-col items-center lg:items-start">
              <div className="flex items-center gap-3">
                <div className="bg-zinc-900 border border-zinc-700/70 p-2 rounded-xl">
                  <Shield className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-xs text-zinc-500 text-center lg:text-left">
                © {new Date().getFullYear()} REXU. All rights reserved.
              </p>
            </div>

            {/* Link columns */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-8 text-sm text-zinc-300">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Pages
                </p>
                <div className="space-y-1.5 flex flex-col">
                  <Link href="/" className="block hover:text-zinc-50 transition-colors">
                    Home
                  </Link>
                  <Link href="/#features" className="block hover:text-zinc-50 transition-colors">
                    How it works
                  </Link>
                  <Link href="/#pricing" className="block hover:text-zinc-50 transition-colors">
                    Pricing
                  </Link>
                  <Link href="/about" className="block hover:text-zinc-50 transition-colors">
                    About
                  </Link>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Socials
                </p>
                <div className="space-y-1.5 flex flex-col">
                  <a
                    href="https://instagram.com/rexu.app"
                    target="_blank"
                    rel="noreferrer"
                    className="block hover:text-zinc-50 transition-colors"
                  >
                    Instagram
                  </a>
                  <a
                    // TODO: Replace with your real WhatsApp number
                    href="https://wa.me/919876543210"
                    target="_blank"
                    rel="noreferrer"
                    className="block hover:text-zinc-50 transition-colors"
                  >
                    WhatsApp
                  </a>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Legal
                </p>
                <div className="space-y-1.5 flex flex-col">
                  <Link href="/privacy" className="block hover:text-zinc-50 transition-colors">
                    Privacy Policy
                  </Link>
                  <Link href="/terms" className="block hover:text-zinc-50 transition-colors">
                    Terms &amp; Conditions
                  </Link>
                  <Link href="/refund" className="block hover:text-zinc-50 transition-colors">
                    Refund Policy
                  </Link>
                  <Link href="/shipping" className="block hover:text-zinc-50 transition-colors">
                    Shipping &amp; Delivery
                  </Link>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Account
                </p>
                <div className="space-y-1.5 flex flex-col">
                  <Link href="/register" className="block hover:text-zinc-50 transition-colors">
                    Sign up
                  </Link>
                  <Link href="/login" className="block hover:text-zinc-50 transition-colors">
                    Login
                  </Link>
                  <Link href="/contact" className="block hover:text-zinc-50 transition-colors">
                    Contact Us
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

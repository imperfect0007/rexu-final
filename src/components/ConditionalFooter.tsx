'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Shield } from "lucide-react";

export default function ConditionalFooter() {
  const pathname = usePathname();
  const isAuthPage =
    pathname?.includes('/login') || pathname?.includes('/register');

  const isDashboardPage =
    pathname === '/dashboard' ||
    pathname?.startsWith('/fleet') ||
    pathname?.startsWith('/drivers') ||
    pathname?.startsWith('/documents') ||
    pathname?.startsWith('/logs') ||
    pathname?.startsWith('/profile') ||
    pathname?.startsWith('/notifications') ||
    pathname?.startsWith('/checkins');

  // Public scan surfaces — no marketing footer
  const isScanPage =
    pathname?.startsWith('/e/') ||
    pathname?.startsWith('/vehicle-checkin');

  if (isAuthPage || isDashboardPage || isScanPage) {
    return null;
  }

  return (
    <footer className="border-t border-neutral-200 bg-white/90 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-start justify-between gap-10 lg:flex-row lg:items-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-brand">
              <Plus className="h-4 w-4 text-[#1a2e0f]" strokeWidth={2.5} />
            </span>
            <img src="/rexu-logo.png" alt="REXU" className="h-9 w-auto" />
          </Link>

          <nav className="flex flex-wrap gap-6 text-sm font-medium text-neutral-600">
            <Link href="/about" className="hover:text-neutral-900">
              About
            </Link>
            <Link href="/#features" className="hover:text-neutral-900">
              How it works
            </Link>
            <Link href="/#pricing" className="hover:text-neutral-900">
              Pricing
            </Link>
            <Link href="/#faq" className="hover:text-neutral-900">
              FAQs
            </Link>
            <Link href="/contact" className="hover:text-neutral-900">
              Contact
            </Link>
          </nav>
        </div>

        <div className="mt-10 grid gap-8 border-t border-neutral-100 pt-10 sm:grid-cols-2 md:grid-cols-4 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Pages
            </p>
            <div className="mt-3 flex flex-col gap-2 text-neutral-600">
              <Link href="/" className="hover:text-neutral-900">
                Home
              </Link>
              <Link href="/about" className="hover:text-neutral-900">
                About
              </Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Legal
            </p>
            <div className="mt-3 flex flex-col gap-2 text-neutral-600">
              <Link href="/privacy" className="hover:text-neutral-900">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-neutral-900">
                Terms
              </Link>
              <Link href="/refund" className="hover:text-neutral-900">
                Refund
              </Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Account
            </p>
            <div className="mt-3 flex flex-col gap-2 text-neutral-600">
              <Link href="/register" className="hover:text-neutral-900">
                Sign up
              </Link>
              <Link href="/login" className="hover:text-neutral-900">
                Login
              </Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Social
            </p>
            <div className="mt-3 flex flex-col gap-2 text-neutral-600">
              <a
                href="https://www.instagram.com/rexu.india/"
                target="_blank"
                rel="noreferrer"
                className="hover:text-neutral-900"
              >
                Instagram
              </a>
            </div>
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-neutral-400 sm:text-left">
          © {new Date().getFullYear()} REXU. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

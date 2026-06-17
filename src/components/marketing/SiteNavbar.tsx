'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X, Bell, User, Shield, ArrowLeft, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

const links = [
  { href: '/about', label: 'About' },
  { href: '/#features', label: 'How it works' },
  { href: '/#solutions', label: 'Our products' },
  { href: '/#faq', label: 'FAQs' },
  { href: '/contact', label: 'Contact Us' },
];

interface SiteNavbarProps {
  title?: string;
  subtitle?: string;
  backUrl?: string;
  showNotification?: boolean;
  dark?: boolean;
}

export function SiteNavbar({
  title,
  subtitle,
  backUrl,
  showNotification = false,
  dark = false,
}: SiteNavbarProps) {
  const [open, setOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!title) return; // Only load profile if we are in dashboard mode

    async function loadProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle();
          setProfile(profileData || { full_name: (user.user_metadata?.full_name as string) || null });
        }
      } catch (err) {
        console.error('SiteNavbar profile load error:', err);
      }
    }
    void loadProfile();
  }, [title]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const isDashboardMode = !!title;

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
      className="sticky top-0 z-50 px-4 pt-4 sm:px-6"
    >
      <nav
        className={`mx-auto flex max-w-6xl items-center justify-between rounded-full border px-4 py-2.5 shadow-sm backdrop-blur-xl sm:px-6 transition-colors duration-300 ${dark
            ? 'border-neutral-850 bg-neutral-900/35 text-white'
            : 'border-neutral-200/40 bg-white/35 text-neutral-900'
          }`}
      >
        {/* Left Side: Logo or Back Button & Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          {isDashboardMode && backUrl && (
            <button
              type="button"
              onClick={() => router.push(backUrl)}
              className={`mr-1 w-8 h-8 rounded-full border flex items-center justify-center transition-colors shrink-0 ${dark
                  ? 'border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:text-white'
                  : 'border-neutral-200 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <img src="/rexu-logo.png" alt="REXU" className="h-8 w-auto object-contain" />
          </Link>

          {isDashboardMode && (
            <>
              <div className={`h-6 w-px shrink-0 ${dark ? 'bg-neutral-850' : 'bg-neutral-200/60'}`} />
              <div className="flex flex-col min-w-0">
                <span className={`text-sm font-bold truncate leading-tight ${dark ? 'text-white' : 'text-neutral-900'}`}>
                  {title}
                </span>
                {subtitle && (
                  <span className={`text-[10px] truncate leading-none hidden sm:block ${dark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    {subtitle}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Center: Standard Marketing Links */}
        {!isDashboardMode && (
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
        )}

        {/* Right Side: Actions */}
        {isDashboardMode ? (
          <div className="hidden items-center gap-4 md:flex shrink-0">
            {showNotification && (
              <button
                type="button"
                className={`p-2 rounded-full transition-colors ${dark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-550 hover:text-neutral-900'
                  }`}
              >
                <Bell className="w-5 h-5" />
              </button>
            )}

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className={`h-8 w-8 rounded-full border text-xs font-bold flex items-center justify-center transition-colors cursor-pointer ${dark
                    ? 'bg-neutral-800/80 border-neutral-700 text-neutral-200 hover:bg-neutral-700'
                    : 'bg-neutral-100 border-neutral-200 text-neutral-700 hover:bg-neutral-200 hover:text-neutral-900'
                  }`}
              >
                {profile?.full_name?.[0]?.toUpperCase() || 'R'}
              </button>

              <AnimatePresence>
                {profileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 8 }}
                    transition={{ duration: 0.15 }}
                    className={`absolute right-0 mt-2 w-44 rounded-2xl border shadow-xl py-1 text-sm z-50 ${dark
                        ? 'border-neutral-800 bg-neutral-900 text-neutral-250 shadow-neutral-950/80'
                        : 'border-neutral-200 bg-white text-neutral-800 shadow-neutral-200/50'
                      }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        router.push('/dashboard');
                      }}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors ${dark
                          ? 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                          : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                        }`}
                    >
                      <Shield className="w-4 h-4 text-neutral-400" />
                      <span>Dashboard</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        router.push('/profile');
                      }}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors ${dark
                          ? 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                          : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                        }`}
                    >
                      <User className="w-4 h-4 text-neutral-400" />
                      <span>Profile</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sign Out Button */}
            <button
              type="button"
              onClick={handleSignOut}
              className={`inline-flex h-9 items-center justify-center rounded-full border px-5 text-sm font-semibold backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${dark
                  ? 'border-neutral-850 bg-neutral-900/40 text-neutral-300 hover:bg-red-950/40 hover:text-red-400'
                  : 'border-neutral-200/80 bg-white/40 text-neutral-700 hover:bg-red-50 hover:text-red-600'
                }`}
            >
              Sign out
            </button>
          </div>
        ) : (
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
        )}

        {/* Mobile menu trigger */}
        <button
          type="button"
          className={`rounded-lg p-2 md:hidden ${dark ? 'text-neutral-300' : 'text-neutral-700'}`}
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile Menu Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`mx-auto mt-2 max-w-6xl overflow-hidden rounded-2xl border md:hidden ${dark
                ? 'border-neutral-800 bg-neutral-900'
                : 'border-neutral-200 bg-white'
              }`}
          >
            <div className="flex flex-col gap-1 p-3">
              {isDashboardMode ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${dark ? 'text-neutral-300 hover:bg-neutral-800 hover:text-white' : 'text-neutral-700 hover:bg-neutral-50'
                      }`}
                  >
                    <Shield className="w-4 h-4 text-neutral-400" />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${dark ? 'text-neutral-300 hover:bg-neutral-800 hover:text-white' : 'text-neutral-700 hover:bg-neutral-50'
                      }`}
                  >
                    <User className="w-4 h-4 text-neutral-400" />
                    <span>Profile Settings</span>
                  </Link>
                  <button
                    onClick={() => {
                      setOpen(false);
                      void handleSignOut();
                    }}
                    className={`mt-2 flex h-10 w-full items-center justify-center rounded-full border text-sm font-semibold transition-all duration-200 ${dark
                        ? 'border-red-900/30 bg-red-950/40 text-red-400 hover:bg-red-900/40'
                        : 'border-red-200 bg-red-50/50 text-red-600 hover:bg-red-100'
                      }`}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  {links.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="rounded-xl px-4 py-3 text-sm font-medium text-neutral-750 hover:bg-neutral-50"
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
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

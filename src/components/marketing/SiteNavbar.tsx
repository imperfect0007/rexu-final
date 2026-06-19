'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X, Bell, User, Shield, ArrowLeft, LogOut, Truck, Sparkles } from 'lucide-react';
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
  isIndividual?: boolean;
}

export function SiteNavbar({
  title,
  subtitle,
  backUrl,
  showNotification = false,
  dark = false,
  isIndividual = false,
}: SiteNavbarProps) {
  const [open, setOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string | null; account_type: string | null; is_paid?: boolean } | null>(null);
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [individualNotifications, setIndividualNotifications] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!title && !isIndividual) return;

    async function loadProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, account_type, is_paid')
            .eq('id', user.id)
            .maybeSingle();
          
          setProfile(profileData || { 
            full_name: (user.user_metadata?.full_name as string) || null, 
            account_type: (user.user_metadata?.account_type as string) || null,
            is_paid: false
          });

          if (isIndividual) {
            const { count: contactsCount } = await supabase
              .from('emergency_contacts')
              .select('*', { count: 'exact', head: true })
              .eq('profile_id', user.id);

            const alerts: string[] = [];
            const isPaid = profileData?.is_paid ?? false;
            
            if (!isPaid) {
              alerts.push('Your Safety QR sticker is locked. Click Buy Stickers to unlock.');
            } else {
              alerts.push('✓ Safety QR is active & ready.');
            }
            if (!contactsCount || contactsCount === 0) {
              alerts.push('Please add at least one Emergency Contact in Rider Profile.');
            }
            if (alerts.length === 0) {
              alerts.push('Welcome! Your REXU profile setup is complete.');
            }
            setIndividualNotifications(alerts);
          }
        }
      } catch (err) {
        console.error('SiteNavbar profile load error:', err);
      }
    }
  }, [title, isIndividual]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('choice') === 'true') {
        setShowChoiceModal(true);
        // Clean up query param from URL to avoid re-opening on page refresh
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const isDashboardMode = !!title;
  const showDashboardLayout = isDashboardMode || isIndividual;

  return (
    <>
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
                    <span className={`text-[10px] truncate leading-none hidden sm:block ${dark ? 'text-neutral-400' : 'text-neutral-550'}`}>
                      {subtitle}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Center: Standard Marketing Links */}
          {!showDashboardLayout && (
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
          {showDashboardLayout ? (
            <div className="hidden items-center gap-4 md:flex shrink-0">
               {showNotification && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (isIndividual) {
                        setNotificationsOpen(!notificationsOpen);
                      } else {
                        router.push('/notifications');
                      }
                    }}
                    className={`p-2 rounded-full transition-colors cursor-pointer relative ${dark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-550 hover:text-neutral-900'
                      }`}
                  >
                    <Bell className="w-5 h-5" />
                    {isIndividual && individualNotifications.length > 0 && !individualNotifications[0].includes('setup is complete') && !individualNotifications[0].includes('active & ready') && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    )}
                  </button>

                  <AnimatePresence>
                    {isIndividual && notificationsOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 8 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute right-0 mt-2 w-72 rounded-2xl border shadow-xl p-4 text-xs z-50 ${dark
                            ? 'border-neutral-850 bg-neutral-900 text-neutral-200 shadow-neutral-950/80'
                            : 'border-neutral-200 bg-white text-neutral-800 shadow-[#89d957]/10'
                          }`}
                      >
                        <h4 className="font-bold text-neutral-900 dark:text-white mb-2 pb-1 border-b border-neutral-100 dark:border-neutral-850">
                          Rider Alerts
                        </h4>
                        <div className="space-y-2">
                          {individualNotifications.map((notif, index) => (
                            <div key={index} className="flex gap-2 items-start py-0.5 text-neutral-600 dark:text-neutral-300">
                              <span className="text-[#5a9c32] shrink-0">•</span>
                              <p className="leading-relaxed">{notif}</p>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
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
                          router.push(profile?.account_type === 'personal' ? '/individual' : '/dashboard');
                        }}
                        className={`w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors cursor-pointer ${dark
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
                        className={`w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors cursor-pointer ${dark
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
              <button
                onClick={() => setShowChoiceModal(true)}
                className="inline-flex h-9 items-center justify-center rounded-full bg-gradient-brand px-6 text-sm font-semibold text-[#1a2e0f] shadow-sm shadow-[#89d957]/10 transition-all duration-200 hover:scale-[1.02] hover:shadow-md hover:shadow-[#89d957]/20 active:scale-[0.98] cursor-pointer"
              >
                Sign In/Up
              </button>
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
                {showDashboardLayout ? (
                  <>
                    <button
                      onClick={() => {
                        setOpen(false);
                        router.push(profile?.account_type === 'personal' ? '/individual' : '/dashboard');
                      }}
                      className={`w-full flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium cursor-pointer ${dark ? 'text-neutral-300 hover:bg-neutral-800 hover:text-white' : 'text-neutral-700 hover:bg-neutral-50'
                        }`}
                    >
                      <Shield className="w-4 h-4 text-neutral-400 text-left shrink-0" />
                      <span>Dashboard</span>
                    </button>
                    <Link
                      href="/profile"
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${dark ? 'text-neutral-300 hover:bg-neutral-800 hover:text-white' : 'text-neutral-700 hover:bg-neutral-50'
                        }`}
                    >
                      <User className="w-4 h-4 text-neutral-400 text-left shrink-0" />
                      <span>Profile Settings</span>
                    </Link>
                    <button
                      onClick={() => {
                        setOpen(false);
                        void handleSignOut();
                      }}
                      className={`mt-2 flex h-10 w-full items-center justify-center rounded-full border text-sm font-semibold transition-all duration-200 cursor-pointer ${dark
                          ? 'border-red-900/30 bg-red-950/40 text-red-400 hover:bg-red-900/40'
                          : 'border-red-200 bg-red-50/50 text-red-600 hover:bg-red-100'
                        }`}
                    >
                      <LogOut className="w-4 h-4 mr-2 text-left shrink-0" />
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
                      <button
                        onClick={() => setShowChoiceModal(true)}
                        className="flex h-10 w-full items-center justify-center rounded-full bg-gradient-brand text-sm font-semibold text-[#1a2e0f] shadow-sm transition-all duration-200 hover:scale-[1.01] cursor-pointer"
                      >
                        Sign In/Up
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Choice Modal */}
      <AnimatePresence>
        {showChoiceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowChoiceModal(false)}
              className="absolute inset-0 bg-neutral-950/60 backdrop-blur-sm"
            />

            {/* Modal Content - Coming Soon Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.33, 1, 0.68, 1] }}
              className={`relative w-full max-w-md overflow-hidden rounded-[32px] border p-8 shadow-2xl backdrop-blur-2xl text-center ${dark
                  ? 'border-neutral-800 bg-neutral-900/95 text-white shadow-neutral-950/80'
                  : 'border-neutral-200 bg-white/95 text-neutral-900 shadow-neutral-300/50'
                }`}
            >
              {/* Close button */}
              <button
                onClick={() => setShowChoiceModal(false)}
                className={`absolute right-4 top-4 p-2 rounded-full border transition-colors cursor-pointer ${dark
                    ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-white'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-550 hover:text-neutral-900'
                  }`}
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex flex-col items-center">
                <div className={`p-4 rounded-3xl mb-5 border ${dark
                    ? 'bg-[#89d957]/10 border-[#89d957]/20 text-[#89d957]'
                    : 'bg-[#89d957]/15 border-[#89d957]/30 text-[#5a9c32]'
                  }`}>
                  <Sparkles className="h-10 w-10 animate-pulse" />
                </div>
                
                <h3 className="text-2xl font-black tracking-tight mb-2">Coming Soon! 🚀</h3>
                
                <p className={`text-sm leading-relaxed mb-6 px-2 ${dark ? 'text-neutral-400' : 'text-neutral-550'}`}>
                  REXU smart safety decals and fleet management platforms are launching soon. Registration and individual/commercial account portals are currently under active development. Stay tuned!
                </p>

                <button
                  onClick={() => setShowChoiceModal(false)}
                  className="w-full inline-flex h-12 items-center justify-center rounded-full bg-gradient-brand text-sm font-bold text-[#1a2e0f] shadow-sm shadow-[#89d957]/15 transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] cursor-pointer"
                >
                  Great, Keep Me Posted!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

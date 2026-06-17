'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard,
  Truck,
  Users,
  Link2,
  FileText,
  ScrollText,
  Settings,
  Bell,
  CreditCard,
  HelpCircle,
  LogOut,
  Pencil,
  Shield,
} from 'lucide-react';

interface SidebarProps {
  activePath: string;
  dark?: boolean;
}

export function DashboardSidebar({ activePath, dark = false }: SidebarProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<{
    id: string;
    full_name: string | null;
    account_type: string;
    avatar_url: string | null;
  } | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const [stats, setStats] = useState({
    vehicles: 0,
    drivers: 0,
    expiringDocs: 0,
    notifications: 0,
  });

  useEffect(() => {
    async function loadData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch user profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, account_type, avatar_url')
          .eq('id', user.id)
          .maybeSingle();

        if (profileData) {
          const typed = profileData as typeof profile;
          setProfile(typed);
          
          if (typed?.avatar_url) {
            const { data: signed } = await supabase.storage
              .from('profile-photos')
              .createSignedUrl(typed.avatar_url, 60 * 60);
            setAvatarPreview(signed?.signedUrl ?? null);
          }
        }

        // Fetch counts for dashboard stats
        const isCommercial = (profileData?.account_type ?? 'personal') === 'commercial';
        if (isCommercial) {
          const [vehRes, drvRes, docRes] = await Promise.all([
            supabase.from('fleet_vehicles').select('*', { count: 'exact', head: true }).eq('owner_profile_id', user.id),
            supabase.from('fleet_drivers').select('*', { count: 'exact', head: true }).eq('owner_profile_id', user.id),
            supabase.from('fleet_documents').select('expiry_date').eq('owner_profile_id', user.id),
          ]);

          let expiringCount = 0;
          if (docRes.data) {
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            expiringCount = docRes.data.filter((doc) => {
              if (!doc.expiry_date) return false;
              const expiry = new Date(doc.expiry_date);
              const diff = expiry.getTime() - now.getTime();
              const days = diff / (1000 * 60 * 60 * 24);
              return days <= 30; // expired or expiring in 30 days
            }).length;
          }

          setStats({
            vehicles: vehRes.count || 0,
            drivers: drvRes.count || 0,
            expiringDocs: expiringCount,
            notifications: expiringCount,
          });
        }
      } catch (err) {
        console.error('Sidebar load data error:', err);
      }
    }
    void loadData();
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleLinkClick = (e: React.MouseEvent, path: string, hash?: string, query?: string) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      const isDashboard = window.location.pathname === '/dashboard';
      if (isDashboard) {
        if (hash) {
          const el = document.getElementById(hash);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
          }
        }
        if (path === '/dashboard' && !hash && !query) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      }
    }

    let url = path;
    if (query) url += `?${query}`;
    if (hash) url += `#${hash}`;
    router.push(url);
  };

  const isCommercial = profile?.account_type === 'commercial';

  interface SidebarItem {
    label: string;
    icon: any;
    path: string;
    hash?: string;
    badge?: number;
    badgeType?: string;
  }

  // Sidebar sections & links configuration
  const commercialItems: SidebarItem[] = [
    { label: 'Fleet Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Manage Vehicles', icon: Truck, path: '/fleet', badge: stats.vehicles },
    { label: 'Manage Drivers', icon: Users, path: '/drivers', badge: stats.drivers },
    { label: 'Assignments', icon: Link2, path: '/dashboard', hash: 'assignments-section' },
    { label: 'Documents', icon: FileText, path: '/documents', badge: stats.expiringDocs, badgeType: 'alert' },
    { label: 'Activity Logs', icon: ScrollText, path: '/logs' },
    { label: 'Notifications', icon: Bell, path: '/notifications', badge: stats.notifications, badgeType: 'pulse' },
    { label: 'Profile Settings', icon: Settings, path: '/profile' },
  ];

  const personalItems: SidebarItem[] = [
    { label: 'My Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Notifications', icon: Bell, path: '/notifications' },
    { label: 'Profile Settings', icon: Settings, path: '/profile' },
  ];

  const menuItems = isCommercial ? commercialItems : personalItems;

  return (
    <aside
      className={`hidden md:flex w-[250px] shrink-0 border-r flex-col sticky top-[72px] h-[calc(100vh-72px)] overflow-y-auto shadow-sm z-40 transition-colors duration-300 ${
        dark
          ? 'border-neutral-850 bg-neutral-900 text-white'
          : 'border-neutral-200 bg-white text-neutral-900'
      }`}
    >
      {/* Profile Header Block */}
      <div
        className={`px-5 pt-6 pb-5 flex flex-col items-center text-center border-b ${
          dark ? 'border-neutral-800' : 'border-neutral-100'
        }`}
      >
        <div className="relative group">
          <div
            className={`w-14 h-14 rounded-full mb-3 overflow-hidden border-2 flex items-center justify-center transition-all ${
              dark
                ? 'border-[#89d957]/50 bg-neutral-800 group-hover:border-[#89d957]'
                : 'border-[#89d957]/40 bg-neutral-50 group-hover:border-[#89d957]'
            }`}
          >
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className={`text-lg font-bold ${dark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                {profile?.full_name?.[0]?.toUpperCase() || 'R'}
              </span>
            )}
          </div>
          <button
            onClick={(e) => handleLinkClick(e, '/profile')}
            className={`absolute bottom-2 right-0 p-1.5 rounded-full border shadow-sm transition-transform hover:scale-105 active:scale-95 ${
              dark ? 'bg-neutral-800 border-neutral-700 text-[#89d957]' : 'bg-white border-neutral-200 text-[#5a9c32]'
            }`}
            title="Edit Profile"
          >
            <Pencil className="w-3 h-3" />
          </button>
        </div>
        <h2 className={`font-bold text-sm truncate w-full ${dark ? 'text-white' : 'text-neutral-900'}`}>
          {profile?.full_name || 'REXU User'}
        </h2>
        <p className={`text-[10px] font-semibold uppercase tracking-wider mt-0.5 ${dark ? 'text-[#89d957]/80' : 'text-[#5a9c32]'}`}>
          {isCommercial ? 'Fleet Account' : 'Personal Account'}
        </p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-5 px-3 space-y-1">
        <p className={`px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] ${dark ? 'text-neutral-500' : 'text-neutral-450'}`}>
          Navigation
        </p>
        
        {menuItems.map((item) => {
          const isItemActive = activePath === item.path && (!item.hash || (typeof window !== 'undefined' && window.location.hash.includes(item.hash)));
          
          return (
            <a
              key={item.label}
              href={item.path}
              onClick={(e) => handleLinkClick(e, item.path, item.hash)}
              className={`flex items-center gap-3 px-3.5 py-2.5 text-sm rounded-xl transition-all relative group cursor-pointer ${
                isItemActive
                  ? dark
                    ? 'font-bold text-[#89d957] bg-[#89d957]/10'
                    : 'font-bold text-[#5a9c32] bg-[#89d957]/10 border border-neutral-100/30 shadow-sm'
                  : dark
                    ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
                    : 'text-neutral-550 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              {/* Active Strip Accent */}
              {isItemActive && (
                <motion.div
                  layoutId="activeAccent"
                  className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-full bg-[#89d957]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              
              <item.icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isItemActive
                    ? 'text-[#89d957]'
                    : dark
                      ? 'text-neutral-500 group-hover:text-neutral-300'
                      : 'text-neutral-400 group-hover:text-neutral-800'
                }`}
              />
              
              <span className="flex-1 truncate">{item.label}</span>

              {/* Dynamic Badge Counters */}
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`ml-auto text-[9px] font-bold rounded-full px-2 py-0.5 leading-none shrink-0 border ${
                    item.badgeType === 'alert'
                      ? 'text-red-700 bg-red-100 border-red-200'
                      : item.badgeType === 'pulse'
                        ? 'text-amber-700 bg-amber-100 border-amber-200 animate-pulse'
                        : dark
                          ? 'text-neutral-300 bg-neutral-800 border-neutral-700'
                          : 'text-neutral-600 bg-neutral-100 border-neutral-200'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </a>
          );
        })}

        {isCommercial && (
          <>
            <p className={`px-3 mt-6 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] ${dark ? 'text-neutral-500' : 'text-neutral-450'}`}>
              Account Setup
            </p>
            <button
              onClick={(e) => handleLinkClick(e, '/dashboard', undefined, 'pay=true')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm rounded-xl text-left transition-colors group cursor-pointer ${
                dark
                  ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
                  : 'text-neutral-550 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <CreditCard className={`w-4 h-4 shrink-0 transition-colors ${dark ? 'text-neutral-500 group-hover:text-neutral-300' : 'text-neutral-400 group-hover:text-neutral-800'}`} />
              <span>Billing &amp; Plans</span>
            </button>
          </>
        )}
      </nav>

      {/* Bottom Block */}
      <div
        className={`border-t px-5 py-4 space-y-3 shrink-0 ${
          dark ? 'border-neutral-800' : 'border-neutral-100'
        }`}
      >
        <button
          type="button"
          className={`flex items-center gap-2.5 text-sm transition-colors w-full text-left ${
            dark ? 'text-neutral-400 hover:text-white' : 'text-neutral-550 hover:text-neutral-900'
          }`}
        >
          <HelpCircle className="w-4 h-4" /> Help &amp; Support
        </button>
        <button
          type="button"
          onClick={handleSignOut}
          className={`flex items-center gap-2.5 text-sm transition-colors w-full text-left ${
            dark ? 'text-neutral-450 hover:text-red-400' : 'text-neutral-500 hover:text-red-650'
          }`}
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </aside>
  );
}

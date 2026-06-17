'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  AlertTriangle,
  ClipboardCheck,
  Calendar,
  Loader2,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { SiteNavbar } from '@/components/marketing/SiteNavbar';
import { DashboardSidebar } from '@/components/DashboardSidebar';

interface NotificationItem {
  id: string;
  type: 'alert' | 'activity' | 'reminder';
  title: string;
  description: string;
  date: string;
  link?: string;
  status?: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ account_type: string } | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'alert' | 'activity' | 'reminder'>('all');

  useEffect(() => {
    async function loadNotifications() {
      try {
        setLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('account_type')
          .eq('id', user.id)
          .maybeSingle();

        setProfile(profileData);

        if (profileData?.account_type === 'commercial') {
          // 1. Fetch expiring documents
          const { data: docs } = await supabase
            .from('fleet_documents')
            .select('id, document_name, expiry_date, vehicle_id, fleet_vehicles(vehicle_number)')
            .eq('owner_profile_id', user.id);

          // 2. Fetch check-ins
          const { data: checkins } = await supabase
            .from('fleet_checkins')
            .select('id, check_type, created_at, fleet_vehicles(vehicle_number), fleet_drivers(name)')
            .eq('owner_profile_id', user.id)
            .order('created_at', { ascending: false })
            .limit(30);

          // 3. Fetch reminders
          const { data: reminders } = await supabase
            .from('fleet_maintenance_reminders')
            .select('id, title, due_date, status, vehicle_id, fleet_vehicles(vehicle_number)')
            .eq('owner_profile_id', user.id)
            .eq('status', 'pending');

          const items: NotificationItem[] = [];
          const now = new Date();
          now.setHours(0, 0, 0, 0);

          // Map documents
          if (docs) {
            docs.forEach((doc) => {
              if (!doc.expiry_date) return;
              const exp = new Date(doc.expiry_date);
              const days = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const isExpired = days < 0;
              const vehicleNum = (doc.fleet_vehicles as any)?.vehicle_number || '';

              if (days <= 30) {
                items.push({
                  id: `doc-${doc.id}`,
                  type: 'alert',
                  title: isExpired ? 'Document Expired' : 'Document Expiring Soon',
                  description: `${doc.document_name} ${vehicleNum ? `for ${vehicleNum}` : ''} ${
                    isExpired ? `expired ${Math.abs(days)} days ago` : `expires in ${days} days`
                  }.`,
                  date: doc.expiry_date,
                  link: `/documents?search=${encodeURIComponent(doc.document_name)}`,
                  status: isExpired ? 'expired' : 'expiring',
                });
              }
            });
          }

          // Map check-ins
          if (checkins) {
            checkins.forEach((c) => {
              const driverName = (c.fleet_drivers as any)?.name || 'Driver';
              const vehicleNum = (c.fleet_vehicles as any)?.vehicle_number || 'Vehicle';
              const checkLabel = c.check_type === 'check_in' ? 'checked in' : 'checked out';
              
              items.push({
                id: `check-${c.id}`,
                type: 'activity',
                title: c.check_type === 'check_in' ? 'Driver Checked In' : 'Driver Checked Out',
                description: `${driverName} ${checkLabel} vehicle ${vehicleNum}.`,
                date: c.created_at,
                link: '/logs',
              });
            });
          }

          // Map reminders
          if (reminders) {
            reminders.forEach((r) => {
              const due = new Date(r.due_date);
              const days = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const isOverdue = days < 0;
              const vehicleNum = (r.fleet_vehicles as any)?.vehicle_number || '';

              items.push({
                id: `rem-${r.id}`,
                type: 'reminder',
                title: isOverdue ? 'Overdue Maintenance' : 'Upcoming Maintenance Task',
                description: `"${r.title}" ${vehicleNum ? `for ${vehicleNum}` : ''} ${
                  isOverdue ? `is overdue by ${Math.abs(days)} days` : `is due in ${days} days`
                }.`,
                date: r.due_date,
                link: `/fleet`,
                status: isOverdue ? 'overdue' : 'pending',
              });
            });
          }

          // Sort all items by date (newest first)
          items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setNotifications(items);
        } else {
          // Seed some default notifications for personal accounts
          setNotifications([
            {
              id: 'personal-1',
              type: 'activity',
              title: 'Account Activated',
              description: 'Welcome to REXU! Your safety profile has been successfully activated and is linked to your QR sticker.',
              date: new Date().toISOString(),
              link: '/dashboard',
            },
            {
              id: 'personal-2',
              type: 'reminder',
              title: 'Complete Emergency Profile',
              description: 'Please complete your emergency details (allergies, emergency notes, medications) to ensure guardians can access it.',
              date: new Date(Date.now() - 3600 * 24 * 1000).toISOString(),
              link: '/profile',
            },
          ]);
        }
      } catch (err) {
        console.error('Notifications loading error:', err);
      } finally {
        setLoading(false);
      }
    }
    void loadNotifications();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#6eb84a]" />
      </div>
    );
  }

  const filteredItems =
    activeTab === 'all' ? notifications : notifications.filter((x) => x.type === activeTab);

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <SiteNavbar title="Notifications" subtitle="Recent Alerts & Activities" showNotification />
      <div className="flex-1 flex bg-white bg-rexu-grid text-neutral-900">
        <DashboardSidebar activePath="/notifications" />
        <div className="flex-1 flex flex-col min-h-[calc(100vh-72px)]">
          <motion.main
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
            className="flex-1 p-8 space-y-6 bg-transparent"
          >
            {/* Header section tag */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#5a9c32] bg-[#89d957]/10 w-fit px-2.5 py-1 rounded-full">
                Audit & Alerts
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-950">Recent Updates</h1>
              <p className="text-neutral-500 text-sm">
                Track compliance alerts, driver activities, and reminders for your safety profiles.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex border-b border-neutral-200 gap-1 pb-px overflow-x-auto">
              {[
                { id: 'all', label: 'All Updates', icon: Bell },
                { id: 'alert', label: 'Critical Alerts', icon: AlertTriangle },
                { id: 'activity', label: 'Driver Check-ins', icon: ClipboardCheck },
                { id: 'reminder', label: 'Maintenance Reminders', icon: Calendar },
              ].map((tab) => {
                const Icon = tab.icon;
                const count = tab.id === 'all' ? notifications.length : notifications.filter((x) => x.type === tab.id).length;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all relative shrink-0 ${
                      activeTab === tab.id
                        ? 'border-[#5a9c32] text-[#5a9c32]'
                        : 'border-transparent text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {count > 0 && (
                      <span
                        className={`text-[9px] font-bold rounded-full px-1.5 py-0.5 leading-none shrink-0 ${
                          activeTab === tab.id
                            ? 'bg-[#5a9c32] text-white'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Feed List */}
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.35, delay: i * 0.03 }}
                      onClick={() => item.link && router.push(item.link)}
                      className={`p-5 rounded-2xl border bg-white/70 backdrop-blur-sm shadow-[0_8px_30px_rgb(0,0,0,0.01)] transition-all hover:shadow-md hover:scale-[1.005] flex gap-4 items-start ${
                        item.link ? 'cursor-pointer hover:border-[#89d957]/50' : ''
                      } ${
                        item.status === 'expired' || item.status === 'overdue'
                          ? 'border-red-100 bg-red-50/20'
                          : item.status === 'expiring'
                            ? 'border-amber-100 bg-amber-50/20'
                            : 'border-neutral-200'
                      }`}
                    >
                      {/* Icon */}
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          item.type === 'alert'
                            ? 'bg-red-50 border-red-200/50 text-red-650'
                            : item.type === 'reminder'
                              ? 'bg-amber-50 border-amber-200/50 text-amber-600'
                              : 'bg-[#89d957]/10 border-[#89d957]/20 text-[#5a9c32]'
                        }`}
                      >
                        {item.type === 'alert' ? (
                          <AlertTriangle className="w-5 h-5" />
                        ) : item.type === 'reminder' ? (
                          <Calendar className="w-5 h-5" />
                        ) : (
                          <ClipboardCheck className="w-5 h-5" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-bold text-sm text-neutral-950 truncate">{item.title}</h3>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                              item.type === 'alert'
                                ? 'text-red-700 bg-red-100/50 border-red-200/40'
                                : item.type === 'reminder'
                                  ? 'text-amber-700 bg-amber-100/50 border-amber-200/40'
                                  : 'text-[#5a9c32] bg-[#89d957]/10 border-[#89d957]/20'
                            }`}
                          >
                            {item.type}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-600 leading-relaxed">{item.description}</p>
                        <span className="text-[10px] text-neutral-400 mt-2 block font-medium">
                          {new Date(item.date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Redirect Arrow indicator */}
                      {item.link && (
                        <div className="self-center p-1.5 rounded-lg border border-neutral-100 text-neutral-400 group-hover:text-neutral-900 group-hover:bg-neutral-50 shrink-0">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      )}
                    </motion.div>
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-12 text-center border border-neutral-200 border-dashed rounded-3xl bg-neutral-50 flex flex-col items-center gap-3"
                  >
                    <ShieldAlert className="w-8 h-8 text-neutral-350" />
                    <div>
                      <p className="text-sm font-semibold text-neutral-700">No notifications found</p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Updates or system alerts will appear here when generated.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.main>
        </div>
      </div>
    </div>
  );
}

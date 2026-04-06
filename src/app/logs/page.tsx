'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Shield,
  Loader2,
  User,
  ArrowLeft,
  ScrollText,
  Truck,
  Users,
  FileText,
  ClipboardCheck,
  QrCode,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ActivityLog {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

const ENTITY_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'vehicle', label: 'Vehicles' },
  { value: 'driver', label: 'Drivers' },
  { value: 'document', label: 'Documents' },
  { value: 'checkin', label: 'Check-in/out' },
];

function getEntityIcon(entityType: string | null) {
  switch (entityType) {
    case 'vehicle':
      return <Truck className="w-4 h-4" />;
    case 'driver':
      return <Users className="w-4 h-4" />;
    case 'document':
      return <FileText className="w-4 h-4" />;
    case 'checkin':
      return <ClipboardCheck className="w-4 h-4" />;
    default:
      return <QrCode className="w-4 h-4" />;
  }
}

function getEntityColor(entityType: string | null) {
  switch (entityType) {
    case 'vehicle':
      return 'text-blue-400 bg-blue-950/30 border-blue-500/30';
    case 'driver':
      return 'text-purple-400 bg-purple-950/30 border-purple-500/30';
    case 'document':
      return 'text-amber-400 bg-amber-950/30 border-amber-500/30';
    case 'checkin':
      return 'text-[#9AC57A] bg-[#0F3D2E]/30 border-[#145A3A]/40';
    default:
      return 'text-[#B7BEC4] bg-[#2B3136] border-[#3A3F45]';
  }
}

function formatAction(action: string) {
  return action
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function LogsPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filterEntity, setFilterEntity] = useState('all');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const PAGE_SIZE = 50;
  const router = useRouter();

  useEffect(() => {
    void fetchLogs(true);
  }, []);

  const fetchLogs = async (reset = false) => {
    try {
      if (reset) setLoading(true);
      else setLoadingMore(true);

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

      if ((profileData?.account_type ?? 'personal') !== 'commercial') {
        router.push('/dashboard');
        return;
      }

      const currentPage = reset ? 0 : page;
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('fleet_activity_logs')
        .select('*')
        .eq('owner_profile_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Logs: fetch error:', error);
        return;
      }

      const fetched = (data as ActivityLog[]) || [];
      setHasMore(fetched.length === PAGE_SIZE);

      if (reset) {
        setLogs(fetched);
        setPage(1);
      } else {
        setLogs((prev) => [...prev, ...fetched]);
        setPage(currentPage + 1);
      }
    } catch (err) {
      console.error('Logs: fetch error:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#9AC57A]" />
      </div>
    );
  }

  const filtered =
    filterEntity === 'all'
      ? logs
      : logs.filter((l) => l.entity_type === filterEntity);

  const grouped: Record<string, ActivityLog[]> = {};
  for (const log of filtered) {
    const dateKey = new Date(log.created_at).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(log);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#101518] to-black text-white pb-20">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.33, 1, 0.68, 1] as [number, number, number, number] }}
        className="bg-[#1F2428] border-b border-[#2B3136] sticky top-0 z-10"
      >
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="w-9 h-9 rounded-full border border-[#3A3F45] flex items-center justify-center text-[#B7BEC4] hover:bg-[#2B3136] hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="bg-[#145A3A] p-1.5 rounded-full">
              <ScrollText className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white leading-tight">Activity Logs</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#B7BEC4]">
                Fleet audit trail
              </span>
            </div>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileMenuOpen((o) => !o)}
              className="h-8 px-2.5 rounded-lg bg-[#2B3136] border border-[#3A3F45] text-white text-[11px] font-bold tracking-wide flex items-center justify-center hover:bg-[#3A3F45] transition-colors"
            >
              rexu
            </button>
            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-xl border border-[#3A3F45] bg-[#1F2428] shadow-lg py-1 text-sm z-20">
                <button type="button" onClick={() => { setProfileMenuOpen(false); router.push('/dashboard'); }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-[#B7BEC4] hover:bg-[#2B3136] hover:text-white">
                  <Shield className="w-4 h-4" /> Back to dashboard
                </button>
                <button type="button" onClick={() => { setProfileMenuOpen(false); router.push('/profile'); }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-[#B7BEC4] hover:bg-[#2B3136] hover:text-white">
                  <User className="w-4 h-4" /> Profile
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.header>

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="max-w-5xl mx-auto px-4 py-8 space-y-6"
      >
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-white/10 rounded-[28px] bg-[#101518]/90 p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-[#B7BEC4] mb-1">Total Log Entries</p>
              <p className="text-3xl font-bold text-white">{logs.length}{hasMore ? '+' : ''}</p>
            </div>
            <ScrollText className="w-6 h-6 text-[#B7BEC4]/40" />
          </div>
          <div className="border border-white/10 rounded-[28px] bg-[#101518]/90 p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-[#B7BEC4] mb-1">Categories</p>
              <p className="text-3xl font-bold text-[#9AC57A]">
                {new Set(logs.map((l) => l.entity_type).filter(Boolean)).size}
              </p>
            </div>
            <Filter className="w-6 h-6 text-[#9AC57A]/40" />
          </div>
        </div>

        {/* Filters */}
        <section className="bg-[#101518]/90 rounded-[28px] p-6 border border-white/10 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">All Activity</h2>
              <p className="text-sm text-[#B7BEC4] mt-0.5">
                Segregated logs of all fleet operations
              </p>
            </div>
          </div>

          {/* Entity type filter pills */}
          <div className="flex flex-wrap gap-2">
            {ENTITY_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilterEntity(f.value)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  filterEntity === f.value
                    ? 'bg-[#145A3A] text-white'
                    : 'bg-[#2B3136] text-[#B7BEC4] border border-[#3A3F45] hover:bg-[#3A3F45] hover:text-white'
                }`}
              >
                {f.label}
                {f.value !== 'all' && (
                  <span className="ml-1.5 opacity-60">
                    ({logs.filter((l) => l.entity_type === f.value).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Grouped timeline */}
          {Object.keys(grouped).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(grouped).map(([date, entries]) => (
                <div key={date}>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#B7BEC4]/60 font-semibold mb-3">
                    {date}
                  </p>
                  <div className="rounded-xl border border-white/5 divide-y divide-white/5">
                    {entries.map((log) => (
                      <div key={log.id} className="hover:bg-white/[0.02] transition-colors">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedLog(expandedLog === log.id ? null : log.id)
                          }
                          className="w-full px-4 py-3 flex items-center gap-3 text-left"
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${getEntityColor(log.entity_type)}`}
                          >
                            {getEntityIcon(log.entity_type)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <span className="font-semibold text-sm text-white">
                                {formatAction(log.action)}
                              </span>
                              {log.entity_type && (
                                <span
                                  className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full uppercase tracking-wider border ${getEntityColor(log.entity_type)}`}
                                >
                                  {log.entity_type}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#B7BEC4] truncate">
                              {log.description}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] text-[#B7BEC4]/60 font-mono">
                              {new Date(log.created_at).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {Object.keys(log.metadata).length > 0 && (
                              expandedLog === log.id ? (
                                <ChevronUp className="w-3.5 h-3.5 text-[#B7BEC4]/40" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-[#B7BEC4]/40" />
                              )
                            )}
                          </div>
                        </button>

                        {expandedLog === log.id && Object.keys(log.metadata).length > 0 && (
                          <div className="px-4 pb-3 pl-[60px]">
                            <div className="rounded-lg bg-[#2B3136]/50 border border-[#3A3F45]/50 p-3 space-y-1">
                              {Object.entries(log.metadata).map(([key, value]) =>
                                value != null ? (
                                  <div key={key} className="flex items-center justify-between text-xs">
                                    <span className="text-[#B7BEC4]/60 capitalize">
                                      {key.replace(/_/g, ' ')}
                                    </span>
                                    <span className="text-[#B7BEC4] font-mono">
                                      {String(value)}
                                    </span>
                                  </div>
                                ) : null
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#B7BEC4]/60 py-4 text-center">
              {filterEntity !== 'all'
                ? 'No log entries match this filter.'
                : 'No activity logs yet. Actions like uploading documents, check-ins, and driver changes will appear here.'}
            </p>
          )}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => fetchLogs(false)}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-[#3A3F45] text-sm font-medium text-[#B7BEC4] hover:bg-[#2B3136] hover:text-white transition disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                  </>
                ) : (
                  'Load more'
                )}
              </button>
            </div>
          )}
        </section>
      </motion.main>
    </div>
  );
}

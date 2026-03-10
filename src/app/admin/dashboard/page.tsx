import { redirect } from 'next/navigation';
import { AdminQrToggleButton } from '@/components/AdminQrToggleButton';
import { supabaseAdmin } from '../../../../backend/supabaseAdminClient';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '../../../../backend/adminAuth';

interface AdminDashboardPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
  const cookieStore = await cookies();
  const adminAuth = cookieStore.get('admin_auth');

  if (!adminAuth || !verifyAdminToken(adminAuth.value)) {
    redirect('/admin');
  }

  const { q } = await searchParams;
  const search = q?.trim() || '';

  const [
    { count: totalUsers },
    { count: totalPaidUsers },
    { count: paidNonFreeUsers },
    { count: totalQr },
    { data: recentUsers },
    { data: recentScans },
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
    supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_paid', true),
    supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_paid', true)
      .eq('is_free_customer', false),
    supabaseAdmin
      .from('qr_codes')
      .select('token', { count: 'exact', head: true }),
    supabaseAdmin
      .from('profiles')
      .select('id, full_name, mobile, is_paid, is_free_customer, created_at')
      .ilike('full_name', search ? `%${search}%` : '%')
      .order('created_at', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('scan_logs')
      .select('id, token, created_at, ip')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const userIds = (recentUsers || []).map((u: any) => u.id);
  const { data: qrForRecent } = userIds.length > 0
    ? await supabaseAdmin
        .from('qr_codes')
        .select('profile_id, token, is_active')
        .in('profile_id', userIds)
    : { data: [] as any[] };

  // Compute total revenue from activation payments (sum of amount_paise)
  const { data: activationPayments } = await supabaseAdmin
    .from('payments')
    .select('amount_paise')
    .eq('is_activation', true);

  const revenue =
    ((activationPayments || []) as { amount_paise: number | null }[]).reduce(
      (sum, p) => sum + (p.amount_paise ?? 0),
      0
    ) / 100;
  const qrByProfileId = new Map<string, { token: string; is_active: boolean }>();
  (qrForRecent || []).forEach((qr: any) => {
    qrByProfileId.set(qr.profile_id, { token: qr.token, is_active: qr.is_active });
  });

  return (
    <div className="min-h-screen bg-black text-white px-4 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Monitor users, QR activations, and emergency scans.
            </p>
          </div>
          <form className="flex items-center gap-2" method="GET">
            <input
              type="text"
              name="q"
              defaultValue={search}
              placeholder="Search by mobile..."
              className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 outline-none focus:ring-1 focus:ring-red-500"
            />
            <button
              type="submit"
              className="px-3 py-2 rounded-xl bg-red-600 text-xs font-semibold hover:bg-red-700"
            >
              Search
            </button>
          </form>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-4">
            <div className="text-xs text-zinc-400">Total Users</div>
            <div className="mt-2 text-2xl font-bold">
              {totalUsers ?? 0}
            </div>
          </div>
          <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-4">
            <div className="text-xs text-zinc-400">Paid Users</div>
            <div className="mt-2 text-2xl font-bold text-green-400">
              {totalPaidUsers ?? 0}
            </div>
          </div>
          <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-4">
            <div className="text-xs text-zinc-400">Free Activations</div>
            <div className="mt-2 text-2xl font-bold text-amber-300">
              {(totalPaidUsers || 0) - (paidNonFreeUsers || 0)}
            </div>
          </div>
          <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-4">
            <div className="text-xs text-zinc-400">QR Codes</div>
            <div className="mt-2 text-2xl font-bold">
              {totalQr ?? 0}
            </div>
          </div>
          <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-4">
            <div className="text-xs text-zinc-400">Total Revenue</div>
            <div className="mt-2 text-2xl font-bold">
              ₹{revenue}
            </div>
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-4">
            <h2 className="text-sm font-semibold mb-3">Users</h2>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
              {(recentUsers || []).map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between text-sm py-2 border-b border-zinc-900/70 last:border-b-0"
                >
                  <div>
                    <div className="font-medium">{user.full_name}</div>
                    <div className="text-xs text-zinc-500">
                      {user.mobile}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          user.is_paid
                            ? 'text-green-400 font-medium'
                            : 'text-zinc-500'
                        }
                      >
                        {user.is_paid ? 'Paid' : 'Unpaid'}
                      </span>
                      <span className="text-[10px] text-zinc-400 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800">
                        {user.is_free_customer ? 'FREE' : 'PAID'}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleString()
                        : ''}
                    </div>
                    {qrByProfileId.has(user.id) && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-zinc-500 max-w-[120px] truncate">
                          {qrByProfileId.get(user.id)?.token}
                        </span>
                        <AdminQrToggleButton
                          profileId={user.id}
                          isActive={qrByProfileId.get(user.id)?.is_active ?? false}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {(recentUsers || []).length === 0 && (
                <div className="text-xs text-zinc-500 py-4 text-center">
                  No users found.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-4">
            <h2 className="text-sm font-semibold mb-3">Recent Scan Logs</h2>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2 mt-1">
              {(recentScans || []).map((scan) => (
                <div
                  key={scan.id}
                  className="text-sm py-2 border-b border-zinc-900/70 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-xs text-zinc-300">
                      {scan.token}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {scan.created_at
                        ? new Date(scan.created_at).toLocaleString()
                        : ''}
                    </div>
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1">
                    IP: {scan.ip || 'unknown'}
                  </div>
                </div>
              ))}
              {(recentScans || []).length === 0 && (
                <div className="text-xs text-zinc-500 py-4 text-center">
                  No scans recorded yet.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}


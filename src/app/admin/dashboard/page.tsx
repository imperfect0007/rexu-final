import { redirect } from 'next/navigation';

const OPS_URL = (
  process.env.NEXT_PUBLIC_OPS_URL ||
  process.env.OPS_URL ||
  'https://inside.rexu.in'
).replace(/\/$/, '');

export default function AdminDashboardRedirectPage() {
  redirect(`${OPS_URL}/companies`);
}

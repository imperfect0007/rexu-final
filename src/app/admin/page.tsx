import { redirect } from 'next/navigation';

const OPS_URL = (
  process.env.NEXT_PUBLIC_OPS_URL ||
  process.env.OPS_URL ||
  'https://rexu-ops.vercel.app'
).replace(/\/$/, '');

export default function AdminRedirectPage() {
  redirect(OPS_URL);
}

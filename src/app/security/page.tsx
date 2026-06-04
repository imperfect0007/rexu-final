import { Lock, QrCode } from 'lucide-react';
import { PageMotion } from '@/components/PageMotion';
import { SiteNavbar } from '@/components/marketing/SiteNavbar';
import { SparkSheet } from '@/components/marketing/SparkSheet';
import { SectionTag } from '@/components/marketing/SparkSheet';

export const metadata = {
  title: 'Security Policy | REXU',
  description: 'REXU is built with security at every layer.',
};

export default function SecurityPage() {
  return (
    <PageMotion className="min-h-screen text-neutral-900">
      <SiteNavbar />
      <main className="max-w-3xl mx-auto px-4 py-12 pb-16 sm:px-6">
        <SectionTag>Security</SectionTag>
        <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">Security Policy</h1>
        <p className="text-neutral-600 text-sm mt-3 mb-10">
          REXU is built with security at every layer.
        </p>

        <SparkSheet className="mb-6 !p-6">
          <h2 className="text-base font-semibold text-neutral-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#6eb84a]" />
            How we keep things safe
          </h2>
          <ul className="list-disc list-inside space-y-2 text-sm text-neutral-600 mt-4">
            <li>Encrypted data storage and secure servers</li>
            <li>Controlled access to information through system-level safeguards</li>
            <li>No sensitive data embedded directly in QR codes</li>
            <li>Ability to update or disable access instantly if needed</li>
          </ul>
        </SparkSheet>

        <SparkSheet className="!p-6">
          <h2 className="text-base font-semibold text-neutral-900 flex items-center gap-2">
            <QrCode className="w-4 h-4 text-[#6eb84a]" />
            QR Safety
          </h2>
          <ul className="space-y-2 text-sm text-neutral-600 mt-4">
            <li>QR codes only act as a secure reference, not as data containers</li>
            <li>Even if a QR is scanned by the wrong person, private data remains protected</li>
          </ul>
        </SparkSheet>
      </main>
    </PageMotion>
  );
}

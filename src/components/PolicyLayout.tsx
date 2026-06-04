import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SiteNavbar } from '@/components/marketing/SiteNavbar';
import { SparkSheet } from '@/components/marketing/SparkSheet';

interface PolicyLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export default function PolicyLayout({ title, lastUpdated, children }: PolicyLayoutProps) {
  return (
    <div className="min-h-screen text-neutral-900">
      <SiteNavbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-[#5a9c32] transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <SparkSheet className="!p-8 sm:!p-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2 text-neutral-900">
            {title}
          </h1>
          <p className="text-sm text-neutral-500 mb-8">Last updated: {lastUpdated}</p>

          <div className="prose prose-neutral max-w-none prose-headings:font-semibold prose-headings:text-neutral-900 prose-p:text-neutral-600 prose-li:text-neutral-600 prose-a:text-[#5a9c32] prose-a:no-underline hover:prose-a:underline">
            {children}
          </div>
        </SparkSheet>
      </div>
    </div>
  );
}

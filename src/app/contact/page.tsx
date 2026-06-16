import { Metadata } from 'next';
import { Mail, MessageCircle, Clock, Shield } from 'lucide-react';
import Link from 'next/link';
import { SiteNavbar } from '@/components/marketing/SiteNavbar';
import { SparkSheet } from '@/components/marketing/SparkSheet';
import { SectionTag } from '@/components/marketing/SparkSheet';
import { InstagramSection } from '@/components/marketing/InstagramSection';

export const metadata: Metadata = {
  title: 'Contact Us – REXU',
  description: 'Get in touch with the REXU team for support, feedback, or business inquiries.',
};

const cardClass =
  'group rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm transition-all hover:border-[#89d957]/40 hover:shadow-md';

export default function ContactPage() {
  return (
    <div className="min-h-screen text-neutral-900">
      <SiteNavbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <SectionTag>Contact</SectionTag>
        <h1 className="mt-6 text-3xl sm:text-4xl font-bold tracking-tight">Contact Us</h1>
        <p className="text-neutral-600 mt-3 mb-10 leading-relaxed">
          Have a question, need help, or want to partner with us? We&apos;d love to hear from you.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mb-12">
          <a href="mailto:support@rexu.app" className={cardClass}>
            <Mail className="w-6 h-6 text-[#6eb84a] mb-3" />
            <h3 className="font-semibold text-neutral-900 mb-1">Email Support</h3>
            <p className="text-sm text-neutral-500 mb-3">General support and account issues</p>
            <span className="text-sm text-[#5a9c32] group-hover:underline">support@rexu.app</span>
          </a>

          <a
            href="https://wa.me/919686658055"
            target="_blank"
            rel="noreferrer"
            className={cardClass}
          >
            <MessageCircle className="w-6 h-6 text-[#6eb84a] mb-3" />
            <h3 className="font-semibold text-neutral-900 mb-1">WhatsApp</h3>
            <p className="text-sm text-neutral-500 mb-3">Quick queries and live assistance</p>
            <span className="text-sm text-[#5a9c32] group-hover:underline">Chat with us</span>
          </a>

          <a href="mailto:privacy@rexu.app" className={cardClass}>
            <Shield className="w-6 h-6 text-[#6eb84a] mb-3" />
            <h3 className="font-semibold text-neutral-900 mb-1">Privacy & Data</h3>
            <p className="text-sm text-neutral-500 mb-3">Data deletion or privacy concerns</p>
            <span className="text-sm text-[#5a9c32] group-hover:underline">privacy@rexu.app</span>
          </a>

          <SparkSheet className="!p-6">
            <Clock className="w-6 h-6 text-[#6eb84a] mb-3" />
            <h3 className="font-semibold text-neutral-900 mb-1">Response Time</h3>
            <p className="text-sm text-neutral-500 mb-3">We typically respond within</p>
            <span className="text-sm font-semibold text-neutral-800">24–48 hours (business days)</span>
          </SparkSheet>
        </div>

        <SparkSheet className="!p-6 space-y-4">
          <h2 className="text-lg font-semibold text-neutral-900">Registered Address</h2>
          <p className="text-sm text-neutral-600 leading-relaxed">
            REXU
            <br />
            [Mysuru, Karnataka, India]
            <br />
            India
          </p>
          <p className="text-xs text-neutral-400">
            CIN and GST details will be updated once the company is registered.
          </p>
        </SparkSheet>

        <div className="mt-10 pt-8 border-t border-neutral-100">
          <h2 className="text-lg font-semibold mb-4 text-neutral-900">Quick Links</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { href: '/privacy', label: 'Privacy Policy' },
              { href: '/terms', label: 'Terms & Conditions' },
              { href: '/refund', label: 'Refund Policy' },
              { href: '/shipping', label: 'Shipping Policy' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 rounded-full border border-neutral-200 text-sm text-neutral-600 hover:border-[#89d957]/50 hover:text-[#5a9c32] transition-colors bg-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <InstagramSection />
    </div>
  );
}

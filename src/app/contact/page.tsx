import { Metadata } from 'next';
import { Mail, MessageCircle, Clock, Shield } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contact Us – REXU',
  description: 'Get in touch with the REXU team for support, feedback, or business inquiries.',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-8"
        >
          <Shield className="w-4 h-4" />
          Back to home
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Contact Us</h1>
        <p className="text-zinc-400 mb-10 leading-relaxed">
          Have a question, need help, or want to partner with us? We&apos;d love to hear from you.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mb-12">
          <a
            href="mailto:support@rexu.app"
            className="group rounded-2xl border border-zinc-800 bg-zinc-950 p-6 hover:border-zinc-700 transition-colors"
          >
            <Mail className="w-6 h-6 text-[#9AC57A] mb-3" />
            <h3 className="font-semibold text-white mb-1">Email Support</h3>
            <p className="text-sm text-zinc-400 mb-3">For general support and account issues</p>
            <span className="text-sm text-[#9AC57A] group-hover:underline">support@rexu.app</span>
          </a>

          <a
            // TODO: Replace with your real WhatsApp number
            href="https://wa.me/919876543210"
            target="_blank"
            rel="noreferrer"
            className="group rounded-2xl border border-zinc-800 bg-zinc-950 p-6 hover:border-zinc-700 transition-colors"
          >
            <MessageCircle className="w-6 h-6 text-[#9AC57A] mb-3" />
            <h3 className="font-semibold text-white mb-1">WhatsApp</h3>
            <p className="text-sm text-zinc-400 mb-3">Quick queries and live assistance</p>
            <span className="text-sm text-[#9AC57A] group-hover:underline">Chat with us</span>
          </a>

          <a
            href="mailto:privacy@rexu.app"
            className="group rounded-2xl border border-zinc-800 bg-zinc-950 p-6 hover:border-zinc-700 transition-colors"
          >
            <Shield className="w-6 h-6 text-[#9AC57A] mb-3" />
            <h3 className="font-semibold text-white mb-1">Privacy & Data</h3>
            <p className="text-sm text-zinc-400 mb-3">Data deletion, access, or privacy concerns</p>
            <span className="text-sm text-[#9AC57A] group-hover:underline">privacy@rexu.app</span>
          </a>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <Clock className="w-6 h-6 text-[#9AC57A] mb-3" />
            <h3 className="font-semibold text-white mb-1">Response Time</h3>
            <p className="text-sm text-zinc-400 mb-3">We typically respond within</p>
            <span className="text-sm text-white font-semibold">24–48 hours (business days)</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Registered Address</h2>
          {/* TODO: Replace with your real registered business address */}
          <p className="text-sm text-zinc-400 leading-relaxed">
            REXU<br />
            [Your registered address here]<br />
            India
          </p>
          {/* TODO: Add CIN and GST once incorporated */}
          <p className="text-xs text-zinc-500">
            CIN and GST details will be updated once the company is registered.
          </p>
        </div>

        <div className="mt-10 pt-8 border-t border-zinc-800">
          <h2 className="text-lg font-semibold mb-4">Quick Links</h2>
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
                className="px-4 py-2 rounded-xl border border-zinc-800 text-sm text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

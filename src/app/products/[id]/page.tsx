import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, CheckCircle2, ShoppingCart } from 'lucide-react';
import { SiteNavbar } from '@/components/marketing/SiteNavbar';

const products: Record<
  string,
  {
    name: string;
    price: string;
    image: string;
    description: string;
    features: string[];
  }
> = {
  'personal-sticker': {
    name: 'Personal QR Safety Sticker',
    price: '₹349* (MRP ₹499)',
    image: '/productgalu/rexu-scan-card.png',
    description:
      'A high-durability, waterproof QR safety decal designed for helmet, motorcycle, or car window placement. One scan lets any bystander or emergency responder alert your emergency contacts instantly without installing any apps. * Inaugural offer of ₹349 per sticker is valid for up to 100 vehicles. For fleets exceeding 100 vehicles, standard rates apply.',
    features: [
      '1x Waterproof premium QR decal',
      'Personal emergency safety profile page',
      'Up to 2 Emergency contacts reachable',
      'Optional vital medical info (blood group, allergies)',
      'Free lifetime SMS routing (no subscription)',
    ],
  },
  'keychain-bundle': {
    name: 'Keychains & Tag Bundle',
    price: '₹499',
    image: '/productgalu/rexu-scan-card.png',
    description:
      'A premium-quality metal keychain with embedded QR protection. Perfect for keys, daily commuter bags, school backpacks, or elderly family members. Provides critical care info and priority alerts to emergency contacts.',
    features: [
      '1x High-durability metal QR keychain',
      '2x Additional mini QR tags for keychains or bags',
      'Unified dashboard to manage multiple tags',
      'Priority SMS alert routing to emergency contacts',
      'Child and senior profile safety pages',
    ],
  },
  'helmet-shield': {
    name: 'Helmet QR Shield',
    price: '₹399',
    image: '/productgalu/rexu-scan-card.png',
    description:
      'A reflective, weather-resistant micro-decal designed specifically for helmet application. Essential safety gear for motorcyclists, bicycle riders, and daily highway commuters.',
    features: [
      '1x Reflective micro-decal (helmet approved)',
      'Weatherproof, scratch-resistant coating',
      'Dedicated rider safety profile page',
      'Quick alert trigger button for responders',
      'Dynamic target updates anytime from dashboard',
    ],
  },
  'fleet-starter': {
    name: 'Fleet Starter Plan',
    price: '₹FREE',
    image: '/productgalu/rexu-scan-card.png',
    description:
      'Safety management platform designed for growing delivery networks, local logistics operations, and taxi chains with up to 15 commercial vehicles.',
    features: [
      'Up to 15 safety QR vehicle tags',
      'Centralized Fleet Admin Dashboard',
      'Dynamic driver-to-vehicle matching via check-in',
      'Daily vehicle check-in log records',
      'Priority email & SMS incident alert dispatch',
    ],
  },
  'fleet-enterprise': {
    name: 'Enterprise Custom Fleet',
    price: 'Custom Pricing',
    image: '/productgalu/rexu-scan-card.png',
    description:
      'Uncapped safety operations and compliance logging designed for major transport networks, large trucking enterprises, and international logistics operations.',
    features: [
      'Unlimited safety QR stickers/decals',
      'Custom branding (company logo) on driver QR profiles',
      'Developer API access to export logs & check-in data',
      'Daily automatic safety compliance reporting',
      '24/7 dedicated support & custom notification channels',
    ],
  },
};

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = products[id];

  if (!product) {
    return (
      <div className="relative min-h-screen text-neutral-900 bg-white flex flex-col justify-between">
        <SiteNavbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-3xl font-extrabold text-neutral-900">Product Not Found</h1>
          <p className="mt-2 text-neutral-600">The product you are looking for does not exist.</p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-brand px-6 py-3 text-sm font-semibold text-[#1a2e0f] transition-opacity hover:opacity-90"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen text-neutral-900 bg-white bg-rexu-grid flex flex-col justify-between">
      <SiteNavbar />

      <main className="flex-1 px-4 py-12 sm:px-6 lg:py-20 max-w-6xl mx-auto w-full z-10">
        <Link
          href="/#solutions"
          className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 hover:text-neutral-800 transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to solutions
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column: Image Card */}
          <div className="lg:col-span-5">
            <div className="relative aspect-square overflow-hidden rounded-3xl border border-neutral-200/50 bg-neutral-50/50 shadow-lg p-2">
              <div
                className="absolute inset-0 bg-gradient-to-br from-[#89d957]/10 via-[#c9e265]/5 to-transparent blur-2xl"
                aria-hidden
              />
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="(max-w-768px) 100vw, 400px"
                className="object-cover rounded-2xl z-10"
                priority
              />
            </div>
          </div>

          {/* Right Column: Content details */}
          <div className="lg:col-span-7 flex flex-col items-start">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5a9c32] bg-[#89d957]/10 px-3 py-1 rounded-full">
              Product Details
            </span>
            <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 leading-[1.1]">
              {product.name}
            </h1>
            <p className="mt-3 text-2xl font-bold text-[#5a9c32]">{product.price}</p>
            <p className="mt-6 text-neutral-600 leading-relaxed text-base sm:text-lg">
              {product.description}
            </p>

            <div className="mt-8 w-full border-t border-neutral-100 pt-8">
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500">
                Key Features
              </h3>
              <ul className="mt-4 space-y-3.5">
                {product.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-neutral-700">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-[#6eb84a] mt-0.5" />
                    <span className="leading-normal">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Editable note for user */}
            <div className="mt-8 p-4 rounded-xl bg-neutral-50 border border-neutral-100 text-xs text-neutral-500 leading-relaxed w-full">
              <p className="font-bold text-neutral-700 mb-1">📝 Developer Note:</p>
              This is a dynamic placeholder page. You can customize the details and pricing
              checkout forms for <strong>{id}</strong> by editing the file{' '}
              <code className="bg-neutral-200/50 px-1 py-0.5 rounded text-[10px] font-mono">
                src/app/products/[id]/page.tsx
              </code>.
            </div>

            <div className="mt-10 flex flex-wrap gap-4 w-full sm:w-auto">
              <button
                type="button"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-full bg-gradient-brand px-8 py-4 text-sm font-semibold text-[#1a2e0f] transition-opacity hover:opacity-90 shadow-lg shadow-[#89d957]/15 cursor-pointer"
              >
                <ShoppingCart className="h-4 w-4" />
                Purchase product
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

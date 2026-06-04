import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type GradientButtonProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  variant?: 'gradient' | 'outline' | 'dark';
};

export function GradientButton({
  href,
  children,
  className,
  variant = 'gradient',
}: GradientButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-3 rounded-full pl-6 pr-2 py-2.5 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]',
        variant === 'gradient' && 'bg-gradient-brand text-[#1a2e0f] shadow-md shadow-[#89d957]/25',
        variant === 'outline' &&
          'border border-neutral-200 bg-white text-neutral-800 hover:border-[#89d957]/60',
        variant === 'dark' && 'bg-neutral-900 text-white hover:bg-neutral-800',
        className
      )}
    >
      <span>{children}</span>
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          variant === 'gradient' && 'bg-white/90 text-[#1a2e0f]',
          variant === 'outline' && 'bg-gradient-brand text-[#1a2e0f]',
          variant === 'dark' && 'bg-white text-neutral-900'
        )}
      >
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

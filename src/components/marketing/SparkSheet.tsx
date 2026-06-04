import { cn } from '@/lib/utils';

export function SparkSheet({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-neutral-100 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]',
        className
      )}
    >
      {children}
    </div>
  );
}

export function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-xs font-medium text-neutral-600">
      {children}
    </span>
  );
}

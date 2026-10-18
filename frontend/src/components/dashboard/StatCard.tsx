import type { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  icon: LucideIcon;
  iconClassName?: string;
  value: string;
  label: string;
}

/**
 * One stat tile (icon, big number, label) in the dashboard's stats row.
 */
export function StatCard({ icon: Icon, iconClassName, value, label }: StatCardProps) {
  return (
    <div className="flex flex-1 flex-col gap-3.5 rounded-2xl border border-line bg-surface p-5">
      <span
        className={
          iconClassName ?? 'flex size-10 items-center justify-center rounded-[10px] bg-primary-soft'
        }
      >
        <Icon className="size-5 text-primary" />
      </span>
      <p className="font-display text-[32px] font-bold tracking-tight text-ink">{value}</p>
      <p className="font-sans text-sm text-ink-muted">{label}</p>
    </div>
  );
}

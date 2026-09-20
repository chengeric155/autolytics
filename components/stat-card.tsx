import { cn } from '@/lib/utils'

type StatCardProps = {
  label: string
  /** Replace with a real aggregate from your dataset. */
  value: string
  hint?: string
  className?: string
}

export function StatCard({ label, value, hint, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-lg border border-border bg-card px-4 py-4',
        className,
      )}
    >
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-2xl font-semibold tabular-nums text-card-foreground">
        {value}
      </span>
      {hint ? (
        <span className="text-xs text-muted-foreground text-pretty">{hint}</span>
      ) : null}
    </div>
  )
}

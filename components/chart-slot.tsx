import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type ChartSlotProps = {
  /** Short human title shown in the card header. */
  title: string
  /** One line explaining what the reader should take away from the graph. */
  description?: string
  /**
   * Stable identifier for the graph you are going to drop in here,
   * e.g. "price_vs_mileage". Rendered as a mono tag so you can match
   * the slot to the file/notebook cell it came from.
   */
  slotId?: string
  /** Optional path to a static image export, e.g. "/charts/price_vs_mileage.png". */
  src?: string
  /** Alt text — required when `src` is set. */
  alt?: string
  /** Height of the plot area. */
  height?: number
  /** Extra grid-span classes, e.g. "lg:col-span-2". */
  className?: string
  /** Render a live chart component instead of an image. */
  children?: ReactNode
}

/**
 * Card frame for a visualization.
 *
 * Two ways to fill it:
 *   1. <ChartSlot src="/data/foo.png" alt="..." />  → static export
 *   2. <ChartSlot><MyChart /></ChartSlot>            → live component
 */
export function ChartSlot({
  title,
  description,
  slotId,
  src,
  alt,
  height = 300,
  className,
  children,
}: ChartSlotProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          {slotId ? (
            <Badge variant="outline" className="font-mono text-[10px] font-normal">
              {slotId}
            </Badge>
          ) : null}
        </div>
        {description ? (
          <CardDescription className="text-pretty">{description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt ?? title}
            style={{ height }}
            className="w-full rounded-sm object-contain"
          />
        ) : children ? (
          <div style={{ height }} className="w-full">
            {children}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

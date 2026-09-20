'use client'

import { useMemo } from 'react'
import { EChart } from '@/components/charts/echart'
import { useChartData } from '@/lib/charts/use-chart-data'
import { useChartColors } from '@/lib/charts/use-chart-colors'
import { useChartTheme } from '@/lib/charts/echarts-theme'

type YearPoint = { year: number; price: number; se: number }

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 0,
})

/**
 * Median asking price by model year with a translucent area fill — a clean,
 * readable stand-in for the notebook's "Average Price for Age of Car" line.
 */
export function PriceByYearChart({ height = 300 }: { height?: number }) {
  const data = useChartData<YearPoint[]>('/data/price_by_year.json')
  const colors = useChartColors()
  const theme = useChartTheme()

  const option = useMemo(() => {
    const rows = data ?? []
    const years = rows.map((p) => p.year)
    const prices = rows.map((p) => p.price)
    // Keep x labels sparse — every decade (or ~7 labels for short series).
    const step = Math.max(1, Math.ceil((years.length || 1) / 7))
    const tickEvery = (i: number) => i % step === 0

    return {
      animationDuration: 500,
      grid: { top: 16, right: 24, bottom: 52, left: 84 },
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: {
          type: 'cross' as const,
          animation: true,
          animationDurationUpdate: 220,
          animationEasingUpdate: 'quinticOut' as const,
          label: {
            backgroundColor: theme.tooltipBg,
            color: theme.tooltipText,
            borderColor: theme.tooltipBorder,
            borderWidth: 1,
          },
          lineStyle: { color: theme.axisLine, type: 'dashed' as const },
          crossStyle: { color: theme.axisLine },
        },
        backgroundColor: theme.tooltipBg,
        borderColor: theme.tooltipBorder,
        textStyle: { color: theme.tooltipText, fontSize: 12 },
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [params]
          const p = arr[0] as { axisValue: number; value: number; marker?: string } | undefined
          if (!p) return ''
          return `<div style="font-weight:600">${p.axisValue}</div><div style="color:${theme.tooltipText};opacity:.8">${money.format(
            Number(p.value),
          )} median</div>`
        },
      },
      xAxis: {
        type: 'category' as const,
        data: years,
        name: 'Model year',
        nameLocation: 'middle' as const,
        nameGap: 34,
        boundaryGap: false,
        axisLine: { lineStyle: { color: theme.axisLine } },
        axisTick: { show: false },
        axisLabel: {
          color: theme.text,
          interval: (i: number) => tickEvery(i),
          hideOverlap: true,
        },
        nameTextStyle: { color: theme.text, fontSize: 11 },
      },
      yAxis: {
        type: 'value' as const,
        name: 'Median price',
        nameLocation: 'middle' as const,
        nameGap: 54,
        axisLabel: { color: theme.text, formatter: (v: number) => money.format(v) },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: theme.splitLine } },
        nameTextStyle: { color: theme.text, fontSize: 11 },
      },
      series: [
        {
          type: 'line' as const,
          data: prices,
          z: 5,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2.5, color: colors[0] },
          areaStyle: { color: colors[0], opacity: 0.12 },
        },
      ],
    }
  }, [data, colors, theme])

  if (!data) {
    return (
      <div style={{ height }} className="flex items-center justify-center font-mono text-xs text-muted-foreground">
        loading…
      </div>
    )
  }

  return <EChart option={option} height={height} />
}

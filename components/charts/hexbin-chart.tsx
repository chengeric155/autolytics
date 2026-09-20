'use client'

import { useMemo } from 'react'
import { EChart } from '@/components/charts/echart'
import { useChartData } from '@/lib/charts/use-chart-data'
import { useChartTheme } from '@/lib/charts/echarts-theme'
import { money, num, mileage } from '@/lib/charts/format'

export type HexCell = {
  mileage: number
  price: number
  count: number
  medianYear: number
}

/**
 * Price vs. mileage density, from the notebook's hexbin. The grid was
 * pre-aggregated to cells; we render each non-empty cell as a dot whose size
 * and color encode the listing count, producing a smooth density field.
 */
export function HexbinChart({ height = 320 }: { height?: number }) {
  const raw = useChartData<HexCell[]>('/data/price_vs_mileage_hex.json')
  const theme = useChartTheme()

  const maxCount = useMemo(() => {
    if (!raw) return 1
    let m = 1
    for (const c of raw) if (c.count > m) m = c.count
    return m
  }, [raw])

  const cellData = useMemo(() => {
    if (!raw) return []
    const logMax = Math.log10(maxCount + 1)
    return raw
      .filter((c) => c.count > 0)
      .map((c) => {
        // skip far-field zero-ish tail cells so density reads clearly
        const t = Math.min(1, Math.log10(c.count + 1) / logMax)
        return {
          value: [c.mileage, c.price, c.count],
          symbolSize: 2 + 18 * Math.pow(t, 0.55),
          count: c.count,
          medianYear: c.medianYear,
        }
      })
  }, [raw, maxCount])

  const option = useMemo(() => {
    return {
      animationDuration: 400,
      grid: { top: 16, right: 24, bottom: 60, left: 84 },
      tooltip: {
        trigger: 'item' as const,
        backgroundColor: theme.tooltipBg,
        borderColor: theme.tooltipBorder,
        textStyle: { color: theme.tooltipText, fontSize: 12 },
        formatter: (p: unknown) => {
          const it = p as { data: { count: number; medianYear: number } }
          if (!it.data) return ''
          return `<div style="font-weight:600">${num(it.data.count)} listings</div>
            <div style="margin-top:2px">Median model year: ${Math.round(it.data.medianYear)}</div>`
        },
      },
      xAxis: {
        type: 'value' as const,
        name: 'Mileage',
        nameLocation: 'middle' as const,
        nameGap: 38,
        nameTextStyle: { color: theme.text, fontSize: 11 },
        axisLine: { lineStyle: { color: theme.axisLine } },
        axisTick: { show: false },
        axisLabel: { color: theme.text, formatter: (v: number) => mileage(v) },
        splitLine: { lineStyle: { color: theme.splitLine } },
      },
      yAxis: {
        type: 'value' as const,
        name: 'Price',
        nameLocation: 'middle' as const,
        nameGap: 56,
        nameTextStyle: { color: theme.text, fontSize: 11 },
        axisLabel: { color: theme.text, formatter: (v: number) => money(v) },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: theme.splitLine } },
      },
      visualMap: {
        min: 0,
        max: maxCount,
        orient: 'horizontal' as const,
        left: 'center',
        bottom: 0,
        inRange: { color: ['#0e2a47', '#1f5fa8', '#3aa0c3', '#86d3a0', '#f2cf66', '#d94841'] },
        textStyle: { color: theme.text, fontSize: 10 },
      },
      series: [
        {
          type: 'scatter' as const,
          data: cellData,
          itemStyle: { opacity: 0.85 },
        },
      ],
    }
  }, [cellData, maxCount, theme])

  if (!raw) {
    return (
      <div style={{ height }} className="flex items-center justify-center font-mono text-xs text-muted-foreground">
        loading…
      </div>
    )
  }

  return <EChart option={option} height={height} />
}

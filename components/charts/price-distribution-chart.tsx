'use client'

import { useMemo } from 'react'
import { EChart } from '@/components/charts/echart'
import { useChartData } from '@/lib/charts/use-chart-data'
import { useChartColors } from '@/lib/charts/use-chart-colors'
import { useChartTheme } from '@/lib/charts/echarts-theme'

type Bin = { binStart: number; binEnd: number; count: number }

const fmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 0,
})

/**
 * Price distribution histogram (log-scaled x), mirroring the notebook's
 * "Price Distribution (Log Scaled)" chart.
 *
 * The x-position of each bar is its log10(binStart). We feed those values to a
 * category axis so every bar is spaced evenly in log space (identical to the
 * book's `/log/` axes in the notebook), and render sparse currency labels.
 */
export function PriceDistributionChart({ height = 280 }: { height?: number }) {
  const data = useChartData<Bin[]>('/data/price_distribution.json')
  const colors = useChartColors()
  const theme = useChartTheme()

  const { categories, counts, labels, tickIndices } = useMemo(() => {
    if (!data) return { categories: [], counts: [], labels: [], tickIndices: [] }
    const all = data
      .filter((b) => b.count > 0)
      .map((b, i) => ({
        idx: Math.log10(b.binStart),
        count: b.count,
        binStart: b.binStart,
        originalIndex: i,
      }))
    const step = Math.max(1, Math.floor(all.length / 7))
    const tickIndices = all
      .map((b, i) => ({ b, i }))
      .filter(({ i }) => i % step === 0)
      .map(({ b }) => b.originalIndex)
    if (all.length && tickIndices[tickIndices.length - 1] !== all[all.length - 1].originalIndex) {
      tickIndices.push(all[all.length - 1].originalIndex)
    }
    return {
      categories: all.map((b) => b.idx.toFixed(4)),
      counts: all.map((b) => b.count),
      labels: all.map((b) => fmt.format(b.binStart)),
      tickIndices,
    }
  }, [data])

  const option = useMemo(() => {
    const tickSet = new Set(tickIndices)
    const showTick = (index: number) => tickSet.has(index)
    return {
      animationDuration: 400,
      grid: { top: 8, right: 16, bottom: 52, left: 84 },
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: { type: 'shadow' as const },
        backgroundColor: theme.tooltipBg,
        borderColor: theme.tooltipBorder,
        textStyle: { color: theme.tooltipText, fontSize: 12 },
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [params]
          const p = arr[0] as { dataIndex: number; value: number } | undefined
          if (p == null) return ''
          const label = labels[p.dataIndex] ?? ''
          return `<div style="font-weight:600">${label} range</div><div style="color:${theme.tooltipText};opacity:.8">${Number(
            p.value,
          ).toLocaleString('en-US')} listings</div>`
        },
      },
      xAxis: {
        type: 'category' as const,
        data: categories,
        name: 'Listed price (log scale)',
        nameLocation: 'middle' as const,
        nameGap: 36,
        axisLine: { lineStyle: { color: theme.axisLine } },
        axisTick: { show: false },
        axisLabel: {
          color: theme.text,
          interval: (index: number) => showTick(index),
          hideOverlap: true,
          formatter: (_value: string, index: number) => labels[index] ?? '',
        },
        nameTextStyle: { color: theme.text, fontSize: 11 },
      },
      yAxis: {
        type: 'value' as const,
        name: 'Listings',
        nameLocation: 'middle' as const,
        nameGap: 54,
        axisLabel: { color: theme.text, formatter: (v: number) => Number(v).toLocaleString() },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: theme.splitLine } },
        nameTextStyle: { color: theme.text, fontSize: 11 },
      },
      series: [
        {
          type: 'bar' as const,
          data: counts,
          itemStyle: { color: colors[2], borderRadius: [2, 2, 0, 0] },
          barCategoryGap: '15%',
        },
      ],
    }
  }, [categories, counts, labels, tickIndices, colors, theme])

  if (!data) {
    return (
      <div style={{ height }} className="py-16 text-center font-mono text-xs text-muted-foreground">
        loading…
      </div>
    )
  }

  return <EChart option={option} height={height} />
}

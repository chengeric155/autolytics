'use client'

import { useMemo } from 'react'
import { EChart } from '@/components/charts/echart'
import { useChartData } from '@/lib/charts/use-chart-data'
import { useChartTheme } from '@/lib/charts/echarts-theme'

type FuelCurve = {
  fuelType: string
  data: { mileage: number; medianPrice: number }[]
}

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 0,
})

/**
 * Deliberately distinct categorical colors so the five fuel curves read
 * clearly apart from one another (unlike the sequential chart tokens, which
 * bunch several blues together).
 */
const PALETTE = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#a855f7']

/**
 * Depreciation curves by fuel type — median price against mileage binned
 * every 15k. Mirrors the notebook's multi-line lineplot: each powertrain's
 * value falls as the odometer climbs, with the steepness of the drop the story.
 */
export function DepreciationByFuelChart({ height = 300 }: { height?: number }) {
  const raw = useChartData<FuelCurve[]>('/data/depreciation_by_fuel.json')
  const theme = useChartTheme()

  // ECharts reserves the legend row for us, so the plot can't be clipped.
  const legendHeight = 26

  const option = useMemo(() => {
    const series = (raw ?? []).map((curve, i) => ({
      name: curve.fuelType,
      type: 'line' as const,
      data: curve.data.map((p) => [p.mileage, p.medianPrice]),
      z: 5,
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2.5, color: PALETTE[i % PALETTE.length] },
      itemStyle: { color: PALETTE[i % PALETTE.length] },
    }))

    return {
      animationDuration: 500,
      grid: { top: legendHeight, right: 24, bottom: 48, left: 84 },
      legend: {
        top: 0,
        right: 0,
        data: (raw ?? []).map((c) => c.fuelType),
        itemWidth: 9,
        itemHeight: 9,
        icon: 'circle',
        textStyle: { color: theme.text, fontSize: 11 },
        itemGap: 12,
      },
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: {
          type: 'cross' as const,
          animation: true,
          // A gentle, high-friction glide: the line takes a moment to settle
          // on its target instead of snapping instantly.
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
          const first = arr[0] as { axisValue: number; dataIndex: number } | undefined
          if (!first) return ''
          const title = `${Math.round(Number(first.axisValue) / 1000)}k mi`
          const rows = (arr as { seriesName: string; value: number[]; marker?: string }[])
            .filter((r) => Array.isArray(r.value))
            .map(
              (r) =>
                `<div>${r.marker ?? ''}${r.seriesName} &mdash; ${money.format(Number(r.value[1]))}</div>`,
            )
            .join('')
          return `<div style="font-weight:600;margin-bottom:2px">${title}</div>${rows}`
        },
      },
      xAxis: {
        type: 'value' as const,
        name: 'Mileage',
        nameLocation: 'middle' as const,
        nameGap: 34,
        min: 0,
        axisLine: { lineStyle: { color: theme.axisLine } },
        axisTick: { show: false },
        axisLabel: { color: theme.text, formatter: (v: number) => `${Math.round(Number(v) / 1000)}k mi` },
        splitLine: { show: false },
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
      series,
    }
  }, [raw, theme])

  if (!raw) {
    return (
      <div style={{ height }} className="flex items-center justify-center font-mono text-xs text-muted-foreground">
        loading…
      </div>
    )
  }

  return <EChart option={option} height={height} />
}

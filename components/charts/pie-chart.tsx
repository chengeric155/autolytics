'use client'

import { useMemo } from 'react'
import { EChart } from '@/components/charts/echart'
import { useChartTheme } from '@/lib/charts/echarts-theme'

type PieChartProps = {
  data: { name: string; value: number }[]
  height?: number
  valueFormat?: (v: number) => string
  colors?: string[]
}

/** Donut chart used for the binary vehicle-history flags (True/False). */
export function PieChart({
  data,
  height = 280,
  valueFormat = (v) => `${v.toLocaleString('en-US')}`,
  colors,
}: PieChartProps) {
  const theme = useChartTheme()
  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data])

  const option = useMemo(() => {
    return {
      animationDuration: 500,
      color: colors,
      tooltip: {
        trigger: 'item' as const,
        backgroundColor: theme.tooltipBg,
        borderColor: theme.tooltipBorder,
        textStyle: { color: theme.tooltipText, fontSize: 12 },
        formatter: (p: unknown) => {
          const it = p as { name: string; value: number; percent?: number; marker?: string }
          const pct = total ? ((it.value / total) * 100).toFixed(1) : '0'
          return `<div>${it.marker ?? ''}<b>${it.name}</b></div><div>${valueFormat(
            it.value,
          )} &middot; ${pct}%</div>`
        },
      },
      legend: {
        bottom: 0,
        left: 'center',
        data: data.map((d) => d.name),
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { color: theme.text, fontSize: 11 },
      },
      series: [
        {
          type: 'pie' as const,
          radius: ['58%', '78%'],
          center: ['50%', '44%'],
          avoidLabelOverlap: false,
          label: {
            show: true,
            position: 'inside' as const,
            color: '#ffffff',
            fontSize: 12,
            fontWeight: 'bold' as const,
            lineHeight: 16,
            backgroundColor: 'rgba(10, 15, 22, 0.62)',
            borderRadius: 4,
            padding: [3, 6],
            formatter: '{b}\n{d}%',
          },
          labelLine: { show: false },
          itemStyle: { borderColor: theme.tooltipBg, borderWidth: 2 },
          data,
        },
      ],
    }
  }, [data, colors, theme, total, valueFormat])

  return <EChart option={option} height={height} />
}

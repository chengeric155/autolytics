'use client'

import { useMemo } from 'react'
import { EChart } from '@/components/charts/echart'
import { useChartTheme } from '@/lib/charts/echarts-theme'

type KdeChartProps = {
  grid: number[]
  density: number[]
  height?: number
  xTitle?: string
  yTitle?: string
  xFormat?: (v: number) => string
  color?: string
  /** Omit to auto-scale from the data. */
  yMax?: number
}

/**
 * A smooth density curve (kernel density estimate) with a translucent area
 * fill — the closed-form, anti-aliased stand-in for a binned histogram.
 */
export function KdeChart({
  grid,
  density,
  height = 280,
  xTitle,
  yTitle,
  xFormat = (v) => String(v),
  color = '#2bb9c4',
  yMax,
}: KdeChartProps) {
  const theme = useChartTheme()

  const option = useMemo(() => {
    const peak = yMax ?? Math.max(...density, 0)
    return {
      animationDuration: 500,
      grid: { top: 16, right: 20, bottom: 50, left: 84 },
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
          const p = arr[0] as { axisValue: number; value: number } | undefined
          if (!p) return ''
          return `<div style="font-weight:600">${xFormat(Number(p.axisValue))}</div><div>relative density</div>`
        },
      },
      xAxis: {
        type: 'value' as const,
        name: xTitle,
        nameLocation: 'middle' as const,
        nameGap: 34,
        min: grid[0],
        max: grid[grid.length - 1],
        axisLine: { lineStyle: { color: theme.axisLine } },
        axisTick: { show: false },
        axisLabel: { color: theme.text, formatter: (v: number) => xFormat(v) },
        splitLine: { show: false },
        nameTextStyle: { color: theme.text, fontSize: 11 },
      },
      yAxis: {
        type: 'value' as const,
        name: yTitle,
        nameLocation: 'middle' as const,
        nameGap: 40,
        max: peak * 1.06,
        axisLabel: { show: false },
        axisLine: { show: false },
        splitLine: { show: false },
        nameTextStyle: { color: theme.text, fontSize: 11 },
      },
      series: [
        {
          type: 'line' as const,
          data: grid.map((x, i) => [x, density[i]]),
          z: 5,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2.5, color },
          areaStyle: { color, opacity: 0.18 },
        },
      ],
    }
  }, [grid, density, xTitle, yTitle, xFormat, color, yMax, theme])

  return <EChart option={option} height={height} />
}

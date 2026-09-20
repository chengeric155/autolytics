'use client'

import { useMemo } from 'react'
import { EChart } from '@/components/charts/echart'
import { useChartTheme } from '@/lib/charts/echarts-theme'
import { money, num } from '@/lib/charts/format'

type ScatterChartProps = {
  /** Points as [x, y, colorGroup?]. */
  data: [number, number][] | number[][]
  xTitle?: string
  yTitle?: string
  xFormat?: (v: number) => string
  yFormat?: (v: number) => string
  /** If set, encode a third dimension via color+size (density style). */
  sizeBy?: { min: number; max: number }
  colorBase?: string
  height?: number
}

export function ScatterChart({
  data,
  xTitle,
  yTitle,
  xFormat = (v) => num(v),
  yFormat = (v) => num(v),
  sizeBy,
  colorBase,
  height = 300,
}: ScatterChartProps) {
  const theme = useChartTheme()

  const option = useMemo(() => {
    const symbolSize = (val: number) => {
      if (!sizeBy) return 4
      const t = (val - sizeBy.min) / (sizeBy.max - sizeBy.min || 1)
      return 2 + 16 * Math.pow(t, 0.45)
    }

    const seriesData = sizeBy
      ? data.map((p) => ({ value: [p[0], p[1], p[2] ?? 0], symbolSize: symbolSize(p[2] ?? 0) }))
      : data.map((p) => [p[0], p[1]])

    return {
      animationDuration: 400,
      grid: { top: 16, right: 24, bottom: 52, left: 84 },
      tooltip: {
        trigger: 'item' as const,
        backgroundColor: theme.tooltipBg,
        borderColor: theme.tooltipBorder,
        textStyle: { color: theme.tooltipText, fontSize: 12 },
        formatter: (p: unknown) => {
          const it = p as { value: number[] }
          const [x, y, z] = it.value
          const rows = [
            `<div>${xTitle ?? 'x'}: ${xFormat(x)}</div>`,
            `<div>${yTitle ?? 'y'}: ${yFormat(y)}</div>`,
          ]
          if (z != null && sizeBy && z > 0) rows.push(`<div>Count: ${num(z)}</div>`)
          return `<div>${rows.join('')}</div>`
        },
      },
      xAxis: {
        type: 'value' as const,
        name: xTitle,
        nameLocation: 'middle' as const,
        nameGap: 36,
        nameTextStyle: { color: theme.text, fontSize: 11 },
        axisLine: { lineStyle: { color: theme.axisLine } },
        axisTick: { show: false },
        axisLabel: { color: theme.text, formatter: (v: number) => xFormat(v) },
        splitLine: { lineStyle: { color: theme.splitLine } },
      },
      yAxis: {
        type: 'value' as const,
        name: yTitle,
        nameLocation: 'middle' as const,
        nameGap: 54,
        nameTextStyle: { color: theme.text, fontSize: 11 },
        axisLabel: { color: theme.text, formatter: (v: number) => yFormat(v) },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: theme.splitLine } },
      },
      visualMap: sizeBy
        ? {
            min: sizeBy.min,
            max: sizeBy.max,
            orient: 'horizontal' as const,
            left: 'center',
            bottom: 0,
            inRange: { color: ['#2b4a7a', '#3aa0c3', '#86d3a0', '#f2cf66', '#d94841'] },
            textStyle: { color: theme.text, fontSize: 10 },
          }
        : undefined,
      series: [
        {
          type: 'scatter' as const,
          data: seriesData,
          symbolSize: sizeBy ? undefined : 4,
          itemStyle: { color: colorBase ?? '#3aa0c3', opacity: 0.6 },
        },
      ],
    }
  }, [data, xTitle, yTitle, xFormat, yFormat, sizeBy, colorBase, theme])

  return <EChart option={option} height={height} />
}

'use client'

import { useMemo } from 'react'
import { EChart } from '@/components/charts/echart'
import { useChartTheme } from '@/lib/charts/echarts-theme'

export type LineSeries = {
  name: string
  data: [number | string, number][] | number[]
  area?: boolean
  color?: string
}

type LineChartProps = {
  series: LineSeries[]
  xAxisType?: 'category' | 'value'
  xTitle?: string
  yTitle?: string
  xFormat?: (v: number | string) => string
  yFormat?: (v: number) => string
  /** Sparse x labels (category axis): show ~this many. */
  maxCatLabels?: number
  smooth?: boolean
  showLegend?: boolean
  legendTop?: number
  height?: number
}

export function LineChart({
  series,
  xAxisType = 'category',
  xTitle,
  yTitle,
  xFormat = (v) => String(v),
  yFormat = (v) => numFmt(v),
  maxCatLabels = 7,
  smooth = true,
  showLegend = false,
  legendTop = 0,
  height = 280,
}: LineChartProps) {
  const theme = useChartTheme()

  const option = useMemo(() => {
    const cats =
      xAxisType === 'category' && series[0]?.data.length
        ? (series[0].data as [string | number, number][]).map((p) => p[0])
        : []
    const step = Math.max(1, Math.ceil((cats.length || 1) / maxCatLabels))

    const xAxis =
      xAxisType === 'category'
        ? {
            type: 'category' as const,
            name: xTitle,
            boundaryGap: false as const,
            data: cats,
            axisLine: { lineStyle: { color: theme.axisLine } },
            axisTick: { show: false },
            axisLabel: {
              color: theme.text,
              formatter: (v: number | string) => xFormat(v),
              interval: (i: number) => i % step === 0,
              hideOverlap: true,
            },
            nameLocation: 'middle' as const,
            nameGap: 36,
            nameTextStyle: { color: theme.text, fontSize: 11 },
          }
        : {
            type: 'value' as const,
            name: xTitle,
            axisLine: { lineStyle: { color: theme.axisLine } },
            axisTick: { show: false },
            axisLabel: { color: theme.text, formatter: (v: number) => xFormat(v) },
            splitLine: { show: false },
            nameLocation: 'middle' as const,
            nameGap: 34,
            nameTextStyle: { color: theme.text, fontSize: 11 },
          }

    const yAxis = {
      type: 'value' as const,
      name: yTitle,
      axisLabel: { color: theme.text, formatter: (v: number) => yFormat(v) },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: theme.splitLine } },
      nameLocation: 'middle' as const,
      nameGap: 54,
      nameTextStyle: { color: theme.text, fontSize: 11 },
    }

    return {
      animationDuration: 500,
      grid: { top: showLegend ? legendTop + 26 : 16, right: 20, bottom: 50, left: 84 },
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
          const arr = (Array.isArray(params) ? params : [params]) as {
            axisValue: number | string;
            seriesName?: string;
            value: number | [number | string, number];
            marker?: string;
          }[]
          const first = arr[0]
          if (!first) return ''
          const axisVal =
            xAxisType === 'value'
              ? xFormat(Number(first.axisValue))
              : xFormat(first.axisValue)
          const rows = arr
            .map((r) => {
              const val = Array.isArray(r.value) ? r.value[1] : r.value
              return `<div>${r.marker ?? ''}${r.seriesName}: ${yFormat(Number(val))}</div>`
            })
            .join('')
          return `<div style="font-weight:600;margin-bottom:2px">${axisVal}</div>${rows}`
        },
      },
      legend: showLegend
        ? {
            top: legendTop,
            right: 0,
            data: series.map((s) => s.name),
            itemWidth: 12,
            itemHeight: 12,
            icon: 'rect' as const,
            textStyle: { color: theme.text, fontSize: 11 },
            itemGap: 14,
          }
        : undefined,
      xAxis,
      yAxis,
      series: series.map((s) => ({
        name: s.name,
        type: 'line' as const,
        // On a category axis ECharts reads bare values indexed to the category
        // list, so drop the [x, y] x-coordinate (it would otherwise be treated
        // as an array of category values and break rendering).
        data:
          xAxisType === 'category'
            ? s.data.map((d) => (Array.isArray(d) ? d[1] : d))
            : s.data,
        z: 5,
        smooth,
        showSymbol: false,
        lineStyle: { width: 2.5, color: s.color },
        itemStyle: { color: s.color },
        areaStyle: s.area ? { color: s.color, opacity: 0.12 } : undefined,
        emphasis: { focus: 'series' as const },
      })),
    }
  }, [series, xAxisType, xTitle, yTitle, xFormat, yFormat, maxCatLabels, smooth, showLegend, legendTop, theme])

  return <EChart option={option} height={height} />
}

function numFmt(v: number): string {
  if (v >= 1000) return `$${Math.round(v / 1000)}k`
  return String(Math.round(v))
}

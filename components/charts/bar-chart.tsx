'use client'

import { useMemo } from 'react'
import { EChart } from '@/components/charts/echart'
import { useChartTheme } from '@/lib/charts/echarts-theme'

type BarChartProps = {
  /** Row data keyed by field name. */
  data: Record<string, string | number>[]
  /** Name of the category field used on the category axis. */
  indexBy: string
  /** One or more numeric series to plot, in display order. */
  keys: string[]
  layout?: 'vertical' | 'horizontal'
  axisTitles?: { x?: string; y?: string }
  /** Formatter for category (x on vertical / y on horizontal) labels. */
  catFormat?: (v: string | number) => string
  /** Formatter for value axis labels. */
  valFormat?: (v: number) => string
  colors?: string[] | ((row: Record<string, string | number>) => string)
  /** Show only ~maxLabels category labels to avoid crowding. */
  maxCatLabels?: number
  height?: number
}

export function BarChart({
  data,
  indexBy,
  keys,
  layout = 'vertical',
  axisTitles,
  catFormat = (v) => String(v),
  valFormat = (v) => numFmt(v),
  colors,
  maxCatLabels = 7,
  height = 280,
}: BarChartProps) {
  const theme = useChartTheme()

  const option = useMemo(() => {
    const cats = data.map((r) => r[indexBy])
    const showAll = maxCatLabels <= 0
    const step = showAll ? 1 : Math.max(1, Math.ceil((cats.length || 1) / maxCatLabels))
    const horizontal = layout === 'horizontal'

    const catAxis = {
      name: horizontal ? axisTitles?.y : axisTitles?.x,
      type: 'category' as const,
      data: cats,
      inverse: horizontal ? true : undefined,
      axisLine: { lineStyle: { color: theme.axisLine } },
      axisTick: { show: false },
      axisLabel: {
        color: theme.text,
        fontSize: showAll ? 9 : 12,
        formatter: (v: string | number) => catFormat(v),
        // With showAll (maxCatLabels <= 0), render every label instead of a
        // sparse subset; otherwise keep labels sparse and always keep the last.
        interval: showAll
          ? (i: number) => true
          : (i: number, value: string | number) =>
              i % step === 0 || value === cats[cats.length - 1],
        hideOverlap: !showAll,
        rotate: horizontal ? 0 : 30,
      },
      nameLocation: horizontal ? ('middle' as const) : ('middle' as const),
      nameGap: horizontal ? 28 : 38,
      nameTextStyle: { color: theme.text, fontSize: 11 },
    }

    const valAxis = {
      name: horizontal ? axisTitles?.x : axisTitles?.y,
      type: 'value' as const,
      axisLabel: { color: theme.text, formatter: (v: number) => valFormat(v) },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: theme.splitLine } },
      nameLocation: 'middle' as const,
      nameGap: horizontal ? 46 : 54,
      nameTextStyle: { color: theme.text, fontSize: 11 },
    }

    const resolveColor = (row: Record<string, string | number>) =>
      typeof colors === 'function' ? colors(row) : undefined

    const series = keys.map((key) => ({
      type: 'bar' as const,
      name: key,
      data: data.map((row) => ({
        value: Number(row[key]),
        itemStyle:
          typeof colors === 'function'
            ? { color: resolveColor(row), borderRadius: [2, 2, 0, 0] }
            : undefined,
      })),
      itemStyle:
        typeof colors === 'function'
          ? undefined
          : { color: Array.isArray(colors) ? colors[keys.indexOf(key) % colors.length] : colors },
      barMaxWidth: horizontal ? 18 : 26,
      emphasis: { focus: 'series' as const },
    }))

    return {
      animationDuration: 500,
      grid: horizontal
        ? { top: 8, right: 40, bottom: 48, left: 90 }
        : { top: 8, right: 20, bottom: 52, left: 84 },
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: { type: 'shadow' as const },
        backgroundColor: theme.tooltipBg,
        borderColor: theme.tooltipBorder,
        textStyle: { color: theme.tooltipText, fontSize: 12 },
        formatter: (params: unknown) => {
          const arr = (Array.isArray(params) ? params : [params]) as {
            seriesName?: string;
            name: string | number;
            value: number;
            marker?: string;
          }[]
          const first = arr[0]
          if (!first) return ''
          const cat = catFormat(first.name)
          const body = arr
            .map(
              (r) =>
                `<div>${r.marker ?? ''}${r.seriesName ? `${r.seriesName}: ` : ''}${valFormat(Number(r.value))}</div>`,
            )
            .join('')
          return `<div style="font-weight:600;margin-bottom:2px">${cat}</div>${body}`
        },
      },
      xAxis: horizontal ? valAxis : catAxis,
      yAxis: horizontal ? catAxis : valAxis,
      series,
    }
  }, [data, indexBy, keys, layout, axisTitles, catFormat, valFormat, colors, maxCatLabels, theme])

  return <EChart option={option} height={height} />
}

function numFmt(v: number): string {
  return v >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v))
}

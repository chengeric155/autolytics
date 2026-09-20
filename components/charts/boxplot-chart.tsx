'use client'

import { useMemo } from 'react'
import { EChart } from '@/components/charts/echart'
import { useChartTheme } from '@/lib/charts/echarts-theme'
import { money } from '@/lib/charts/format'

export type BoxDatum = {
  name: string
  // [min, q1, median, q3, max] in the boxplot sense.
  box: [number, number, number, number, number]
  mean?: number
}

type BoxplotChartProps = {
  data: BoxDatum[]
  orient?: 'horizontal' | 'vertical'
  valueTitle?: string
  maxCatLabels?: number
  height?: number
}

export function BoxplotChart({
  data,
  orient = 'vertical',
  valueTitle = 'Price',
  maxCatLabels = 8,
  height = 300,
}: BoxplotChartProps) {
  const theme = useChartTheme()

  const option = useMemo(() => {
    const names = data.map((d) => d.name)
    const step = Math.max(1, Math.ceil((names.length || 1) / maxCatLabels))
    const horizontal = orient === 'horizontal'

    const catAxis = {
      type: 'category' as const,
      data: names,
      inverse: horizontal ? true : undefined,
      axisLine: { lineStyle: { color: theme.axisLine } },
      axisTick: { show: false },
      axisLabel: {
        color: theme.text,
        interval: (i: number, value: string) => i % step === 0 || value === names[names.length - 1],
        rotate: horizontal ? 0 : 35,
        hideOverlap: true,
      },
    }
    const valAxis = {
      type: 'value' as const,
      name: valueTitle,
      nameLocation: 'middle' as const,
      nameGap: horizontal ? 58 : 56,
      nameTextStyle: { color: theme.text, fontSize: 11 },
      axisLabel: { color: theme.text, formatter: (v: number) => money(v) },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: theme.splitLine } },
    }

    const boxSeries = {
      type: 'boxplot' as const,
      data: data.map((d) => d.box),
      itemStyle: { color: theme.boxColor, borderColor: theme.boxBorder },
      boxWidth: [8, 26],
    }

    const meanSeries = {
      type: 'scatter' as const,
      name: 'Mean',
      data: data.map((d, i) => [horizontal ? d.mean : i, horizontal ? i : d.mean]),
      symbol: 'diamond' as const,
      symbolSize: 6,
      itemStyle: { color: theme.boxMean },
      z: 6,
      tooltip: {
        show: true,
        formatter: (p: unknown) => {
          const it = p as { value: [number, number] }
          const i = horizontal ? it.value[1] : it.value[0]
          const d = data[i]
          return `<div><b>${d.name}</b></div><div>Mean: ${money(d.mean ?? 0)}</div>`
        },
      },
    }

    return {
      animationDuration: 500,
      grid: horizontal
        ? { top: 10, right: 46, bottom: 52, left: 96 }
        : { top: 10, right: 20, bottom: 62, left: 84 },
      tooltip: {
        trigger: 'item' as const,
        backgroundColor: theme.tooltipBg,
        borderColor: theme.tooltipBorder,
        textStyle: { color: theme.tooltipText, fontSize: 12 },
        formatter: (p: unknown) => {
          const it = p as { data: number[]; name: string }
          const [min, q1, med, q3, max] = it.data
          return `<div style="font-weight:600">${it.name}</div>
            <div>Min: ${money(min)}</div>
            <div>Q1: ${money(q1)}</div>
            <div>Median: ${money(med)}</div>
            <div>Q3: ${money(q3)}</div>
            <div>Max: ${money(max)}</div>`
        },
      },
      xAxis: horizontal ? valAxis : catAxis,
      yAxis: horizontal ? catAxis : valAxis,
      series: [boxSeries, meanSeries],
    }
  }, [data, orient, valueTitle, maxCatLabels, theme])

  return <EChart option={option} height={height} />
}

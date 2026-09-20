'use client'

import { useMemo } from 'react'
import { EChart } from '@/components/charts/echart'
import { useChartTheme } from '@/lib/charts/echarts-theme'

type HeatmapChartProps = {
  /** X-axis categories (left → right). */
  xData: (string | number)[]
  /** Y-axis categories (top → bottom; index 0 is the first row). */
  yData: (string | number)[]
  /** Cells as [xIndex, yIndex, value]. */
  cells: [number, number, number][]
  min: number
  max: number
  /** Formatter for the value shown in each cell's tooltip. */
  valueFormat?: (v: number) => string
  /** Formatter for x / y axis label. */
  catFormat?: (v: string | number) => string
  /** Symmetric diverging (e.g. correlation) vs. sequential (counts/prices). */
  palette?: 'diverging' | 'sequential'
  showVisualMap?: boolean
  height?: number
}

const DIVERGING = ['#2b4a9e', '#5b8bf3', '#dbe3f6', '#f6d0cf', '#d94841']
const SEQUENTIAL = ['#0e2a47', '#1f5fa8', '#3aa0c3', '#86d3a0', '#f2cf66']

export function HeatmapChart({
  xData,
  yData,
  cells,
  min,
  max,
  valueFormat = (v) => String(v),
  catFormat = (v) => String(v),
  palette = 'sequential',
  showVisualMap = true,
  height = 280,
}: HeatmapChartProps) {
  const theme = useChartTheme()
  const colors = palette === 'diverging' ? DIVERGING : SEQUENTIAL

  const option = useMemo(() => {
    return {
      animationDuration: 400,
      grid: { top: 10, right: showVisualMap ? 20 : 20, bottom: showVisualMap ? 74 : 50, left: 90 },
      tooltip: {
        trigger: 'item' as const,
        backgroundColor: theme.tooltipBg,
        borderColor: theme.tooltipBorder,
        textStyle: { color: theme.tooltipText, fontSize: 12 },
        formatter: (p: unknown) => {
          const it = p as { value: [number, number, number] }
          const [xi, yi, val] = it.value
          return `<div><b>${catFormat(xData[xi])}</b> &times; <b>${catFormat(yData[yi])}</b></div><div>${valueFormat(
            val,
          )}</div>`
        },
      },
      xAxis: {
        type: 'category' as const,
        data: xData,
        splitArea: { show: true },
        axisLine: { lineStyle: { color: theme.axisLine } },
        axisTick: { show: false },
        axisLabel: {
          color: theme.text,
          formatter: (v: string | number) => catFormat(v),
          interval: 0,
          rotate: 30,
          fontSize: 10,
        },
      },
      yAxis: {
        type: 'category' as const,
        data: yData,
        splitArea: { show: true },
        axisLine: { lineStyle: { color: theme.axisLine } },
        axisTick: { show: false },
        axisLabel: { color: theme.text, formatter: (v: string | number) => catFormat(v), fontSize: 10 },
      },
      visualMap: showVisualMap
        ? {
            min,
            max,
            calculable: true,
            orient: 'horizontal' as const,
            left: 'center',
            bottom: 0,
            inRange: { color: colors },
            textStyle: { color: theme.text, fontSize: 10 },
          }
        : undefined,
      series: [
        {
          type: 'heatmap' as const,
          data: cells,
          label: {
            show: false,
            color: theme.text,
            fontSize: 9,
            formatter: (p: unknown) => {
              const it = p as { value: [number, number, number] }
              return valueFormat(it.value[2])
            },
          },
          itemStyle: { borderColor: theme.tooltipBg, borderWidth: 2 },
          emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.25)' } },
        },
      ],
    }
  }, [xData, yData, cells, min, max, valueFormat, catFormat, palette, showVisualMap, theme, colors])

  return <EChart option={option} height={height} />
}

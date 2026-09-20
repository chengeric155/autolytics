'use client'

import { useMemo } from 'react'
import * as echarts from 'echarts'
import { EChart } from '@/components/charts/echart'
import { useChartTheme } from '@/lib/charts/echarts-theme'

const comparisonByModel = [
  { model: 'Trivial (median)', mae: 13460, r2: -0.04 },
  { model: 'OLS', mae: 11328, r2: 0.22 },
  { model: 'Logged OLS', mae: 10224, r2: 0.22 },
  { model: 'Ridge', mae: 10224, r2: 0.22 },
  { model: 'Polynomial', mae: 10752, r2: 0.24 },
  { model: 'Random forest', mae: 2523, r2: 0.86 },
  { model: 'LightGBM (tuned)', mae: 2260, r2: 0.94 },
]

const MAE_COLOR = '#2bb9c4'
const R2_COLOR = '#7a8cff'

export function ModelComparisonChart() {
  const theme = useChartTheme()

  const option = useMemo<echarts.EChartsOption>(() => {
    const cats = comparisonByModel.map((m) => m.model)
    const maeColor = (m: (typeof comparisonByModel)[number]) =>
      m.model === 'LightGBM (tuned)' ? MAE_COLOR : 'rgba(43,185,196,0.32)'
    const r2Color = (m: (typeof comparisonByModel)[number]) =>
      m.model === 'LightGBM (tuned)' ? R2_COLOR : 'rgba(122,140,255,0.32)'

    return {
      animationDuration: 500,
      color: [MAE_COLOR, R2_COLOR],
      legend: {
        top: 0,
        right: 12,
        itemWidth: 12,
        itemHeight: 8,
        textStyle: { color: theme.text, fontSize: 11 },
      },
      grid: { top: 40, right: 74, bottom: 12, left: 100 },
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
          const fmt = (p: (typeof arr)[number]) =>
            p.seriesName === 'R²'
              ? p.value.toFixed(3)
              : `$${p.value.toLocaleString('en-US')}`
          const body = arr
            .map(
              (p) =>
                `<div>${p.marker ?? ''}${p.seriesName ? `${p.seriesName}: ` : ''}${fmt(p)}</div>`,
            )
            .join('')
          return `<div style="font-weight:600;margin-bottom:2px">${first.name}</div>${body}`
        },
      },
      yAxis: {
        type: 'category' as const,
        data: cats,
        inverse: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: theme.text, fontSize: 11 },
      },
      xAxis: [
        {
          type: 'value' as const,
          name: 'MAE (USD)',
          nameLocation: 'middle' as const,
          nameGap: 26,
          nameTextStyle: { color: theme.text, fontSize: 11 },
          axisLabel: {
            color: theme.text,
            formatter: (v: number) => `$${Math.round(v / 1000)}k`,
          },
          axisLine: { show: false },
          splitLine: { lineStyle: { color: theme.splitLine } },
        },
        {
          type: 'value' as const,
          position: 'top' as const,
          name: 'R²',
          nameLocation: 'middle' as const,
          nameGap: 34,
          nameTextStyle: { color: theme.text, fontSize: 11 },
          min: 0,
          max: 1,
          axisLabel: { color: theme.text, formatter: (v: number) => v.toFixed(1) },
          axisLine: { show: false },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          type: 'bar' as const,
          name: 'MAE',
          xAxisIndex: 0,
          barMaxWidth: 14,
          emphasis: { focus: 'series' as const },
          data: comparisonByModel.map((m) => ({
            value: m.mae,
            itemStyle: { color: maeColor(m), borderRadius: 2 },
          })),
        },
        {
          type: 'bar' as const,
          name: 'R²',
          xAxisIndex: 1,
          barMaxWidth: 14,
          emphasis: { focus: 'series' as const },
          data: comparisonByModel.map((m) => ({
            value: m.r2,
            itemStyle: { color: r2Color(m), borderRadius: 2 },
          })),
        },
      ],
    }
  }, [theme])

  return <EChart option={option} height={300} />
}
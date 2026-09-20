'use client'

import { useMemo } from 'react'
import * as echarts from 'echarts'
import { EChart } from '@/components/charts/echart'
import { useChartTheme } from '@/lib/charts/echarts-theme'

type ViolinFlag = {
  label: string
  grid: number[]
  /** Density values for the "Yes" (right) half. */
  yes: number[]
  /** Density values for the "No" (left) half. */
  no: number[]
}

export type { ViolinFlag }

type SplitViolinChartProps = {
  flags: ViolinFlag[]
  height?: number
  valueTitle?: string
  valueFormat?: (v: number) => string
  catFormat?: (v: string) => string
  yesColor?: string
  noColor?: string
  /** Hard cap for the value (price) axis; omit to auto-scale to the grid. */
  valueMax?: number
  yesLabel?: string
  noLabel?: string
}

/** Weighted percentile of a density on a grid (used for the tooltip readout). */
function densityPercentile(dens: number[], grid: number[], q: number): number {
  let total = 0
  for (const d of dens) total += d
  if (total <= 0) return 0
  const target = total * q
  let cum = 0
  for (let i = 0; i < grid.length; i++) {
    cum += dens[i]
    if (cum >= target) return grid[i]
  }
  return grid[grid.length - 1]
}

function medianOf(dens: number[], grid: number[]): number {
  return densityPercentile(dens, grid, 0.5)
}

/**
 * A split violin: for each flag, the price distribution of the "Yes" cohort
 * is mirrored to the right of the spine and "No" to the left, so the full
 * shape of each group is visible side by side rather than reduced to a box.
 *
 * Rendered with an ECharts `custom` series: each flag is a single data item
 * whose polygon vertices are positioned through `api.coord` so the shapes
 * reflow correctly on resize and theme change.
 */
export function SplitViolinChart({
  flags,
  height = 320,
  valueTitle = 'Listed price',
  valueFormat = (v) => String(v),
  catFormat = (v) => v,
  yesColor = '#2bb9c4',
  noColor = '#8a94a6',
  valueMax,
  yesLabel = 'Yes',
  noLabel = 'No',
}: SplitViolinChartProps) {
  const theme = useChartTheme()

  const option = useMemo(() => {
    const cats = flags.map((f) => f.label)
    const maxVals = flags.map((f) => Math.max(1e-9, ...f.yes, ...f.no))
    const gridMin = flags.length ? flags[0].grid[0] : 0
    const gridMax = flags.length ? flags[0].grid[flags[0].grid.length - 1] : 1

    const makeRenderItem =
      (side: 'yes' | 'no'): echarts.CustomSeriesRenderItem =>
      (params, api) => {
        const idx = params.dataIndex
        const f = flags[idx]
        if (!f || !f.grid || f.grid.length === 0) return null

        const maxD = maxVals[idx] ?? 1
        const y0 = 0
        const cx = api.coord([idx, y0])[0]
        const bandW = api.coord([1, y0])[0] - api.coord([0, y0])[0]
        const halfBand = (bandW * 0.42) / maxD

        const pts: [number, number][] = []
        for (let g = 0; g < f.grid.length; g++) {
          const cy = api.coord([idx, f.grid[g]])[1]
          const dens = side === 'yes' ? f.yes[g] : f.no[g]
          pts.push([cx + (side === 'yes' ? dens * halfBand : -dens * halfBand), cy])
        }

        const spineBottom = api.coord([idx, gridMin])[1]
        const spineTop = api.coord([idx, gridMax])[1]
        const poly: [number, number][] = [[cx, spineBottom]]
        for (const pt of pts) poly.push(pt)
        poly.push([cx, spineTop])

        return {
          type: 'polygon',
          shape: { points: poly },
          style: {
            fill: side === 'yes' ? yesColor : noColor,
            opacity: side === 'yes' ? 0.5 : 0.4,
            stroke: side === 'yes' ? yesColor : noColor,
            lineWidth: 1.2,
          },
          silent: false,
        }
      }

    return {
      animationDuration: 500,
      grid: { top: 18, right: 20, bottom: 54, left: 84 },
      tooltip: {
        trigger: 'item' as const,
        backgroundColor: theme.tooltipBg,
        borderColor: theme.tooltipBorder,
        textStyle: { color: theme.tooltipText, fontSize: 12 },
        formatter: (p: unknown) => {
          const pp = p as { dataIndex: number }
          const f = flags[pp.dataIndex]
          if (!f) return ''
          const yesMed = medianOf(f.yes, f.grid)
          const noMed = medianOf(f.no, f.grid)
          return (
            `<div style="font-weight:600">${catFormat(f.label)}</div>` +
            `<div><span style="color:${yesColor}">■</span> ${yesLabel}: ${valueFormat(yesMed)}</div>` +
            `<div><span style="color:${noColor}">■</span> ${noLabel}: ${valueFormat(noMed)}</div>`
          )
        },
      },
      xAxis: {
        type: 'category' as const,
        data: cats,
        axisLine: { lineStyle: { color: theme.axisLine } },
        axisTick: { show: false },
        axisLabel: {
          color: theme.text,
          interval: 0,
          formatter: (v: string | number) => catFormat(String(v)),
        },
        nameTextStyle: { color: theme.text, fontSize: 11 },
      },
      yAxis: {
        type: 'value' as const,
        name: valueTitle,
        nameLocation: 'middle' as const,
        nameGap: 54,
        max: valueMax ?? gridMax * 1.02,
        min: 0,
        axisLabel: { color: theme.text, formatter: (v: number) => valueFormat(v) },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: theme.splitLine } },
        nameTextStyle: { color: theme.text, fontSize: 11 },
      },
      series: [
        {
          name: yesLabel,
          type: 'custom' as const,
          renderItem: makeRenderItem('yes'),
          data: flags,
          z: 5,
          clip: true,
          silent: false,
          itemStyle: { color: yesColor },
        },
        {
          name: noLabel,
          type: 'custom' as const,
          renderItem: makeRenderItem('no'),
          data: flags,
          z: 5,
          clip: true,
          silent: false,
          itemStyle: { color: noColor },
        },
      ],
      legend: {
        top: 0,
        right: 0,
        data: [yesLabel, noLabel],
        itemWidth: 12,
        itemHeight: 12,
        icon: 'roundRect' as const,
        textStyle: { color: theme.text, fontSize: 11 },
        itemGap: 14,
      },
    }
  }, [flags, valueTitle, valueFormat, catFormat, yesColor, noColor, valueMax, yesLabel, noLabel, theme])

  return <EChart option={option} height={height} />
}

'use client'

import { useMemo } from 'react'
import * as echarts from 'echarts'
import { EChart } from '@/components/charts/echart'
import { useChartTheme } from '@/lib/charts/echarts-theme'

type RidgelineRow = {
  label: string
  grid: number[]
  density: number[]
}

type RidgelineChartProps = {
  rows: RidgelineRow[]
  height?: number
  valueTitle?: string
  valueFormat?: (v: number) => string
  valueMax?: number
  /** Two hex stops interpolated by rank (top make -> bottom make). */
  fromColor?: string
  toColor?: string
  fillOpacity?: number
}

export type { RidgelineRow }

/** Interpolate between two hex colours by t in [0, 1], returning hex. */
function lerpHex(a: string, c2: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pc = parseInt(c2.slice(1), 16)
  const ar = (pa >> 16) & 255, ag = (pa >> 8) & 255, ab = pa & 255
  const br = (pc >> 16) & 255, bg = (pc >> 8) & 255, bb = pc & 255
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`
}

/** Lighten a hex colour toward white so outlines read crisply over overlaps. */
function lighten(hex: string, amt: number): string {
  const c = parseInt(hex.slice(1), 16)
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255
  const mix = (ch: number) => Math.round(ch + (255 - ch) * amt)
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`
}

/** Parse a hex (or #rrggbb) colour into [r, g, b] 0-255 integers. */
function parseRgb(hex: string): [number, number, number] {
  const c = parseInt(hex.slice(1), 16)
  return [(c >> 16) & 255, (c >> 8) & 255, c & 255]
}

type FillStrip = { rowIdx: number; segIdx: number }

/**
 * A ridgeline (joyplot): each manufacturer's price distribution is drawn as a
 * filled curve stacked down the page, the top-most corresponding to the
 * highest median price. Rendering uses a `custom` series so the overlapping
 * "mountain range" depth reads at a glance.
 */
export function RidgelineChart({
  rows,
  height = 460,
  valueTitle = 'Listed price',
  valueFormat = (v) => String(v),
  valueMax,
  fromColor = '#2bb9c4',
  toColor = '#2f5fe0',
  fillOpacity = 0.42,
}: RidgelineChartProps) {
  const theme = useChartTheme()

  const option = useMemo(() => {
    const cats = rows.map((r) => r.label)
    const maxVals = rows.map((r) => Math.max(1e-9, ...r.density))
    const gridMin = rows.length ? rows[0].grid[0] : 0
    const gridMax = rows.length ? rows[0].grid[rows[0].grid.length - 1] : 1

    const colors = rows.map((_, i) =>
      lerpHex(fromColor, toColor, rows.length === 1 ? 0.5 : i / (rows.length - 1)),
    )

    // Proven in this ECharts v6.1.0 build (canvas): custom-series `polygon`
    // fills never paint (the body collapses to a thin edge), but the `rect`
    // primitive fills reliably. So each ridge is rasterised into vertical
    // `rect` strips (one per grid interval) whose solid colour is brightened
    // toward white as density rises toward that ridge's peak — no gradient
    // object involved, so the "bright at the peak" effect is robust.
    const flatStrips: FillStrip[] = []
    rows.forEach((r, rowIdx) => {
      for (let segIdx = 0; segIdx < r.grid.length - 1; segIdx++) {
        flatStrips.push({ rowIdx, segIdx })
      }
    })

    // True median price per ridge, computed from the density histogram (the
    // price at cumulative density 50%, interpolated within its bin). The old
    // shortcut — the middle bin of the shared grid — was identical for every
    // make, which is why the tooltip claimed the same median everywhere.
    const medians = rows.map((r) => {
      const tot = r.density.reduce((a, b) => a + b, 0)
      if (tot <= 0) return r.grid[r.grid.length - 1]
      const half = tot / 2
      let acc = 0
      for (let i = 0; i < r.density.length; i++) {
        acc += r.density[i]
        if (acc >= half && i + 1 < r.grid.length) {
          const dens = r.density[i]
          const frac = dens > 0 ? (half - (acc - dens)) / dens : 0
          return r.grid[i] + frac * (r.grid[i + 1] - r.grid[i])
        }
      }
      return r.grid[r.grid.length - 1]
    })

    const renderFill: echarts.CustomSeriesRenderItem = (params, api) => {
      const { rowIdx, segIdx } = flatStrips[params.dataIndex] as FillStrip
      const r = rows[rowIdx]
      const maxD = maxVals[rowIdx] ?? 1
      const baseline = api.coord([0, rowIdx])[1]
      const bandH = api.coord([0, 1])[1] - api.coord([0, 0])[1]
      const sy = (bandH / maxD) * 1.55

      const g0 = segIdx
      const g1 = segIdx + 1
      const x0 = api.coord([r.grid[g0], rowIdx])[0]
      const x1 = api.coord([r.grid[g1], rowIdx])[0]
      const top = Math.min(r.density[g0], r.density[g1]) * sy
      if (top <= 0.01) return null

      const col = colors[rowIdx] ?? fromColor
      const frac = Math.min(1, (r.density[g0] + r.density[g1]) / 2 / maxD)
      const bright = lerpHex(col, '#ffffff', frac * 0.55)
      const alpha = fillOpacity * (0.55 + 0.65 * frac)

      return {
        type: 'rect',
        shape: { x: x0, y: baseline - top, width: Math.max(1, x1 - x0), height: top },
        style: { fill: `rgba(${parseRgb(bright).join(',')},${alpha.toFixed(3)})`, stroke: 'transparent' },
        silent: false,
      }
    }

    const buildCurve = (idx: number, api: echarts.CustomSeriesRenderItemAPI) => {
      const r = rows[idx]
      if (!r || !r.grid || r.grid.length === 0) return null
      const maxD = maxVals[idx] ?? 1
      const baseline = api.coord([0, idx])[1]
      const bandH = api.coord([0, 1])[1] - api.coord([0, 0])[1]
      const sy = (bandH / maxD) * 1.55
      const pts: [number, number][] = []
      for (let g = 0; g < r.grid.length; g++) {
        const x = api.coord([r.grid[g], idx])[0]
        const y = baseline - r.density[g] * sy
        pts.push([x, y])
      }
      return { baseline, pts }
    }

    const renderOutline: echarts.CustomSeriesRenderItem = (params, api) => {
      const idx = params.dataIndex
      const c = buildCurve(idx, api)
      if (!c) return null
      const col = colors[idx] ?? fromColor
      return {
        type: 'polyline',
        shape: { points: c.pts },
        style: { stroke: lighten(col, 0.5), strokeOpacity: 1, lineWidth: 1.8 },
        silent: true,
      }
    }

    return {
      animationDuration: 500,
      // Reserve headroom above the first band so the topmost ridge's peak
      // (which rises ~1.55 bands over its baseline) isn't cut off. Rough band
      // height ≈ plot height / row count.
      grid: { top: Math.max(20, 1.55 * (height / Math.max(1, rows.length)) + 10), right: 20, bottom: 50, left: 96 },
      tooltip: {
        trigger: 'item' as const,
        backgroundColor: theme.tooltipBg,
        borderColor: theme.tooltipBorder,
        textStyle: { color: theme.tooltipText, fontSize: 12 },
        formatter: (p: unknown) => {
          const pp = p as { dataIndex: number }
          // The hovered element is one fill strip; map it back to its ridge.
          const strip = flatStrips[pp.dataIndex]
          const r = strip ? rows[strip.rowIdx] : undefined
          if (!r) return ''
          const med = strip ? medians[strip.rowIdx] : undefined
          return `<div style="font-weight:600">${r.label}</div><div style="opacity:.85">median ${valueFormat(med ?? r.grid[Math.round(r.grid.length * 0.5)])}</div>`
        },
      },
      xAxis: {
        type: 'value' as const,
        name: valueTitle,
        nameLocation: 'middle' as const,
        nameGap: 34,
        min: gridMin,
        max: valueMax ?? gridMax,
        axisLine: { lineStyle: { color: theme.axisLine } },
        axisTick: { show: false },
        axisLabel: { color: theme.text, formatter: (v: number) => valueFormat(v) },
        splitLine: { show: false },
        nameTextStyle: { color: theme.text, fontSize: 11 },
      },
      yAxis: {
        type: 'category' as const,
        data: cats,
        inverse: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: theme.text,
          fontSize: 11,
          formatter: (v: string | number) => String(v),
        },
      },
      series: [
        {
          type: 'custom' as const,
          renderItem: renderFill,
          data: flatStrips,
          z: 5,
          clip: false,
          silent: false,
        },
        {
          type: 'custom' as const,
          renderItem: renderOutline,
          data: rows,
          z: 6,
          clip: false,
          silent: true,
        },
      ],
    }
  }, [rows, height, valueTitle, valueFormat, valueMax, fromColor, toColor, fillOpacity, theme])

  return <EChart option={option} height={height} />
}

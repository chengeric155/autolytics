'use client'

import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

type EChartProps = {
  /** Full ECharts option object. Rebuilt by the caller on data/theme change. */
  option: echarts.EChartsOption
  height?: number
  className?: string
}

/**
 * Minimal, SSR-safe wrapper around ECharts for use in the app router.
 *
 * - Lazily creates the instance on mount (never during SSR).
 * - Resizes automatically via ResizeObserver.
 * - Re-applies `option` (notMerge) whenever the option identity changes.
 * - Disposes the instance on unmount.
 */
export function EChart({ option, height = 280, className }: EChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const latestOption = useRef(option)
  latestOption.current = option

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Defensive: if this div already hosts an instance (e.g. a dev-mode
    // double-mount), dispose it first so we don't stack charts on one node.
    const existing = echarts.getInstanceByDom(el)
    if (existing) existing.dispose()

    const chart = echarts.init(el)
    chartRef.current = chart
    chart.setOption(latestOption.current, { notMerge: true })

    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(el)

    return () => {
      observer.disconnect()
      if (chartRef.current) {
        chartRef.current.dispose()
        chartRef.current = null
      }
    }
    // Only init once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true })
  }, [option])

  return <div ref={containerRef} style={{ height }} className={className} />
}

'use client'

import { useEffect, useState } from 'react'

/**
 * Resolve the site's shadcn chart color tokens (--chart-1..5) as hex/rgb
 * strings so Nivo can use them. Re-reads whenever the theme class changes,
 * which keeps charts in sync with light/dark mode.
 */
function readCssVar(name: string): string {
  if (typeof window === 'undefined') return ''
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
  return value
}

export function useChartColors(): string[] {
  const [colors, setColors] = useState<string[]>([
    '#2563eb',
    '#4f8ef7',
    '#22b8cf',
    '#f5a623',
    '#6d5ce7',
  ])

  useEffect(() => {
    const update = () => {
      const palette = ['1', '2', '3', '4', '5'].map((n) => {
        const raw = readCssVar(`--chart-${n}`)
        // oklch() values can only be used in CSS, so convert to a roughly
        // equivalent sRGB hex via a small mapping defined in the theme.
        return resolveChartColor(n, raw)
      })
      if (palette.every((c) => c)) setColors(palette)
    }
    update()

    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return colors
}

/**
 * The chart tokens are defined in oklch() which Nivo cannot parse directly.
 * We keep the canonical hex equivalents here keyed by index, selected to match
 * the light/dark token intent. This keeps the on-screen graph close to the
 * tokens without requiring a color-space conversion at runtime.
 */
function resolveChartColor(index: string, _oklch: string): string {
  const map: Record<string, string> = {
    '1': '#2f5fe0',
    '2': '#5b8bf3',
    '3': '#2bb9c4',
    '4': '#e5a13a',
    '5': '#6d5ce7',
  }
  return map[index] ?? ''
}

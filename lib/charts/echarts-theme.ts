'use client'

import { useEffect, useState } from 'react'

/**
 * A design-system-aware ECharts theme.
 *
 * The site's shadcn tokens are defined in oklch(), which the ECharts canvas
 * renderer cannot parse, so we supply concrete hex/rgba equivalents that are
 * selected to match each token's intent in both themes. Brightness flips with
 * the `.dark` class on <html>, kept in sync by a MutationObserver.
 */
export type EChartsTheme = {
  dark: boolean
  text: string
  axisLine: string
  splitLine: string
  tooltipBg: string
  tooltipText: string
  tooltipBorder: string
  boxColor: string
  boxBorder: string
  boxMean: string
}

function currentDark(): boolean {
  if (typeof window === 'undefined') return true
  const root = document.documentElement
  // The site themes via a `.light`/`.dark` class override OR the OS
  // `prefers-color-scheme` media query (the media rule in globals.css does
  // NOT add a `.dark` class, so we must also consult the media query).
  if (root.classList.contains('light')) return false
  if (root.classList.contains('dark')) return true
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function useDarkMode(): boolean {
  const [dark, setDark] = useState(currentDark)
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => setDark(currentDark())
    const onMedia = () => update()
    update()
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    media.addEventListener('change', onMedia)
    return () => {
      observer.disconnect()
      media.removeEventListener('change', onMedia)
    }
  }, [])
  return dark
}

// re-export for convenience so callers can get the full theme object.
export function useChartTheme(): EChartsTheme {
  const dark = useDarkMode()
  return dark
    ? {
        dark: true,
        text: '#9aa3b5',
        axisLine: '#454c5c',
        splitLine: 'rgba(255,255,255,0.07)',
        tooltipBg: '#171c26',
        tooltipText: '#d5dbe6',
        tooltipBorder: 'rgba(255,255,255,0.08)',
        boxColor: 'rgba(120, 140, 200, 0.22)',
        boxBorder: '#7d94d6',
        boxMean: '#f2cf66',
      }
    : {
        dark: false,
        text: '#5b6472',
        axisLine: '#d8dce4',
        splitLine: 'rgba(120,130,150,0.32)',
        tooltipBg: '#ffffff',
        tooltipText: '#1f2937',
        tooltipBorder: 'rgba(0,0,0,0.08)',
        boxColor: 'rgba(80, 110, 180, 0.16)',
        boxBorder: '#4a67b3',
        boxMean: '#c98a1e',
      }
}

'use client'

/**
 * Shared Nivo theme that mirrors the site's shadcn tokens so charts feel
 * native to the design system rather than like a third-party widget.
 */
export function buildNivoTheme() {
  const textColor =
    typeof window === 'undefined'
      ? '#6b7280'
      : getComputedStyle(document.documentElement)
          .getPropertyValue('--muted-foreground')
          .trim()
  const gridColor =
    typeof window === 'undefined'
      ? 'rgba(0,0,0,0.08)'
      : cssVarToRgba('--border', 0.6)

  const label = { fontSize: 11, fontFamily: 'inherit' }

  return {
    text: { ...label, fill: textColor || '#6b7280', fontSize: 11 },
    axis: {
      domain: { line: { stroke: gridColor, strokeWidth: 1 } },
      legend: { text: { ...label, fill: textColor || '#6b7280', fontSize: 11 } },
      ticks: {
        line: { stroke: gridColor, strokeWidth: 1 },
        text: { ...label, fill: textColor || '#6b7280', fontSize: 11 },
      },
    },
    grid: { line: { stroke: gridColor, strokeWidth: 1, strokeDasharray: '2 3' } },
    legends: { text: { ...label } },
    tooltip: {
      container: {
        background: '#ffffff',
        color: '#1f2937',
        fontSize: 12,
        borderRadius: 8,
        boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
        padding: '8px 10px',
        fontFamily: 'inherit',
      },
    },
  }
}

/** Convert a CSS color var (hex or oklch) fallback to a usable rgba. */
function cssVarToRgba(_name: string, _alpha: number): string {
  // Nivo grid strokes only accept CSS colors; the shadcn border token is
  // oklch() which isn't parseable by the canvas renderer, so we substitute
  // a neutral grey that reads as "hairline" in both themes.
  return 'rgba(120, 130, 150, 0.20)'
}

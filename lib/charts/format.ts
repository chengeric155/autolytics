'use client'

const moneyCompact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 0,
})

const moneyFull = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const int = new Intl.NumberFormat('en-US')

/** $28K style — compact currency for axis labels and tooltips. */
export function money(v: number): string {
  return moneyCompact.format(v)
}

/** $27,886 style — full currency for precise tooltips / spot values. */
export function moneyFullUsd(v: number): string {
  return moneyFull.format(v)
}

/** 118,233 style — plain grouped integer. */
export function num(v: number): string {
  return int.format(v)
}

/** 75k mi style, and a plain mileage number formatter. */
export function mileage(v: number): string {
  if (v >= 9000) return `${Math.round(v / 1000)}k mi`
  return `${int.format(v)} mi`
}

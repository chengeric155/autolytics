'use client'

import { useMemo } from 'react'
import { BarChart } from '@/components/charts/bar-chart'
import { LineChart } from '@/components/charts/line-chart'
import { PieChart } from '@/components/charts/pie-chart'
import { HeatmapChart } from '@/components/charts/heatmap-chart'
import { ScatterChart } from '@/components/charts/scatter-chart'
import { KdeChart } from '@/components/charts/kde-chart'
import { SplitViolinChart, type ViolinFlag } from '@/components/charts/split-violin-chart'
import { RidgelineChart, type RidgelineRow } from '@/components/charts/ridgeline-chart'
import { useChartData } from '@/lib/charts/use-chart-data'
import { money, num, mileage } from '@/lib/charts/format'

function Loading({ height }: { height: number }) {
  return (
    <div style={{ height }} className="flex items-center justify-center font-mono text-xs text-muted-foreground">
      loading…
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 01 — Supply */
/* ------------------------------------------------------------------ */

const COUNTRY_COLORS: Record<string, string> = {
  'United States': '#2f5fe0',
  Japan: '#e5a13a',
  Germany: '#8a94a6',
  'South Korea': '#2bb9c4',
  'United Kingdom': '#6d5ce7',
  Sweden: '#e0533d',
}

type MakeCount = { manufacturer: string; count: number; country: string }

export function ByMakeCountChart({ height = 360 }: { height?: number }) {
  const data = useChartData<MakeCount[]>('/data/by_make_count.json')
  if (!data) return <Loading height={height} />
  return (
    <BarChart
      height={height}
      data={data}
      indexBy="manufacturer"
      keys={['count']}
      layout="horizontal"
      axisTitles={{ x: 'Listings' }}
      valFormat={(v) => `${Math.round(v / 1000)}k`}
      colors={(row) => COUNTRY_COLORS[(row as MakeCount).country] ?? '#9aa3b5'}
      maxCatLabels={0}
    />
  )
}

type RawCount = Record<string, unknown> & { count: number }

function CountBar({
  url,
  indexField,
  height = 280,
  xTitle,
  catFormat = (v) => String(v),
  exclude = [],
}: {
  url: string
  indexField: string
  height?: number
  xTitle?: string
  catFormat?: (v: string | number) => string
  exclude?: string[]
}) {
  const data = useChartData<RawCount[]>('/data/' + url)
  const rows = useMemo(
    () =>
      (data ?? [])
        .filter((r) => !exclude.includes(String(r[indexField])))
        .map((r) => ({ label: String(r[indexField]), count: Number(r.count) })),
    [data, indexField, exclude],
  )
  if (!data) return <Loading height={height} />
  return (
    <BarChart
      height={height}
      data={rows}
      indexBy="label"
      keys={['count']}
      axisTitles={{ x: xTitle }}
      valFormat={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
      catFormat={catFormat}
      maxCatLabels={7}
    />
  )
}

export function FuelTypeCountChart({ height = 280 }: { height?: number }) {
  return (
    <CountBar
      url="fuel_type_count.json"
      indexField="fuel_type"
      height={height}
      exclude={['Compressed Natural Gas', 'Plug-In Hybrid', 'Hydrogen Fuel Cell']}
    />
  )
}

export function DrivetrainCountChart({ height = 280 }: { height?: number }) {
  return <CountBar url="drivetrain_count.json" indexField="drivetrain" height={height} />
}

export function YearDistributionChart({ height = 280 }: { height?: number }) {
  return <CountBar url="year_distribution.json" indexField="year" height={height} xTitle="Model year" />
}

export function MileageDistributionChart({ height = 280 }: { height?: number }) {
  const data = useChartData<{ grid: number[]; density: number[] }>('/data/mileage_kde.json')
  if (!data) return <Loading height={height} />
  return (
    <KdeChart
      height={height}
      grid={data.grid}
      density={data.density}
      xTitle="Odometer (miles)"
      xFormat={(v) => mileage(v)}
      color="#2bb9c4"
    />
  )
}

/* ------------------------------------------------------------------ */
/* 02 — Price spread */
/* ------------------------------------------------------------------ */

type Bin = { binStart: number; binEnd: number; count: number }

export function PriceWindowChart({ height = 280 }: { height?: number }) {
  const data = useChartData<Bin[]>('/data/price_window_distribution.json')
  if (!data) return <Loading height={height} />
  const rows = data.map((b) => ({ label: String(b.binStart), count: b.count }))
  return (
    <BarChart
      height={height}
      data={rows}
      indexBy="label"
      keys={['count']}
      axisTitles={{ x: 'Listed price', y: 'Listings' }}
      valFormat={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
      catFormat={(v) => money(Number(v))}
      maxCatLabels={9}
    />
  )
}

type MakeDensity = {
  makes: string[]
  priceGrid: number[]
  density: number[][]
}

export function PriceByMakeBoxChart({ height = 560 }: { height?: number }) {
  const data = useChartData<MakeDensity>('/data/price_by_make_density.json')
  const rows = useMemo<RidgelineRow[]>(
    () =>
      (data?.makes ?? []).map((m, i) => ({
        label: m,
        grid: data?.priceGrid ?? [],
        density: data?.density?.[i] ?? [],
      })),
    [data],
  )
  if (!data) return <Loading height={height} />
  return (
    <RidgelineChart
      height={height}
      rows={rows}
      valueTitle="Listed price"
      valueFormat={(v) => money(v)}
    />
  )
}

/* ------------------------------------------------------------------ */
/* 03 — Price & odometer */
/* ------------------------------------------------------------------ */

const FLAG_LABEL: Record<string, string> = {
  accidents_or_damage: 'Accidents / damage',
  one_owner: 'Single owner',
  personal_use_only: 'Personal use only',
}

type FlagDensity = {
  priceGrid: number[]
  series: { flag: string; yes: number[]; no: number[] }[]
}

export function PriceByFlagBoxChart({ height = 320 }: { height?: number }) {
  const data = useChartData<FlagDensity>('/data/price_by_vehicle_flag_density.json')
  const flags = useMemo<ViolinFlag[]>(
    () =>
      (data?.series ?? []).map((s) => ({
        label: FLAG_LABEL[s.flag] ?? s.flag,
        grid: data?.priceGrid ?? [],
        yes: s.yes,
        no: s.no,
      })),
    [data],
  )
  if (!data) return <Loading height={height} />
  return (
    <SplitViolinChart
      height={height}
      flags={flags}
      valueTitle="Listed price"
      valueFormat={(v) => money(v)}
      valueMax={80000}
    />
  )
}

/* ------------------------------------------------------------------ */
/* 04 — Age & usage */
/* ------------------------------------------------------------------ */

type YearPrice = { year: number; price: number; se: number }
type YearMileage = { year: number; mileage: number; se: number }

export function PriceByYearLineChart({ height = 280 }: { height?: number }) {
  const data = useChartData<YearPrice[]>('/data/price_by_year.json')
  const s = useMemo(
    () => [{ name: 'Price', data: (data ?? []).map((p) => [p.year, p.price] as [number, number]), area: true }],
    [data],
  )
  if (!data) return <Loading height={height} />
  return (
    <LineChart
      height={height}
      series={s}
      xAxisType="category"
      xTitle="Model year"
      yTitle="Average price"
      yFormat={(v) => money(v)}
      maxCatLabels={7}
    />
  )
}

export function MileageByYearLineChart({ height = 280 }: { height?: number }) {
  const data = useChartData<YearMileage[]>('/data/mileage_by_year.json')
  const s = useMemo(
    () => [{ name: 'Mileage', data: (data ?? []).map((p) => [p.year, p.mileage] as [number, number]), area: true }],
    [data],
  )
  if (!data) return <Loading height={height} />
  return (
    <LineChart
      height={height}
      series={s}
      xAxisType="category"
      xTitle="Model year"
      yTitle="Avg. odometer"
      yFormat={(v) => mileage(v)}
      maxCatLabels={7}
    />
  )
}

/* ------------------------------------------------------------------ */
/* 05 — Fuel economy & drivetrain */
/* ------------------------------------------------------------------ */

type MpgRow = { drivetrain: string; City: number; Highway: number }

export function MpgByDrivetrainChart({ height = 280 }: { height?: number }) {
  const data = useChartData<MpgRow[]>('/data/mpg_by_drivetrain.json')
  if (!data) return <Loading height={height} />
  const rows = data.map((r) => ({
    cell_drivetrain: r.drivetrain,
    City: Math.round(r.City * 10) / 10,
    Highway: Math.round(r.Highway * 10) / 10,
  }))
  return (
    <BarChart
      height={height}
      data={rows}
      indexBy="cell_drivetrain"
      keys={['City', 'Highway']}
      axisTitles={{ x: 'Drivetrain', y: 'Avg. MPG' }}
      valFormat={(v) => `${Math.round(v)} mpg`}
      colors={['#2bb9c4', '#2f5fe0']}
      maxCatLabels={6}
    />
  )
}

type FuelHeat = {
  drivetrains: string[]
  fuelTypes: string[]
  rows: Record<string, string | number | null>[]
}

function extractHeat(heat: FuelHeat): {
  xData: string[]
  yData: string[]
  cells: [number, number, number][]
  min: number
  max: number
} {
  const xData = heat.fuelTypes
  const yData = heat.drivetrains
  const cells: [number, number, number][] = []
  let min = Infinity
  let max = -Infinity
  heat.rows.forEach((row, yi) => {
    xData.forEach((f, xi) => {
      const v = row[f]
      if (typeof v === 'number' && Number.isFinite(v)) {
        cells.push([xi, yi, v])
        if (v < min) min = v
        if (v > max) max = v
      }
    })
  })
  if (min === Infinity) min = 0
  return { xData, yData, cells, min, max }
}

export function DrivetrainFuelHeatChart({ height = 320 }: { height?: number }) {
  const data = useChartData<FuelHeat>('/data/price_drivetrain_fuel_heat.json')
  const { xData, yData, cells, min, max } = useMemo(() => (data ? extractHeat(data) : { xData: [], yData: [], cells: [], min: 0, max: 0 }), [data])
  if (!data) return <Loading height={height} />
  return (
    <HeatmapChart
      height={height}
      xData={xData}
      yData={yData}
      cells={cells}
      min={min}
      max={max}
      valueFormat={(v) => money(v)}
      catFormat={(v) => (v as string)}
      palette="sequential"
    />
  )
}

/* ------------------------------------------------------------------ */
/* 06 — History & ownership donuts */
/* ------------------------------------------------------------------ */

type FlagPie = { label: string; count: number }

const PIE_COLORS = ['#2bb9c4', '#5d6470']

function FlagDonut({
  url,
  height = 260,
  yesLabel,
  noLabel = 'No',
}: {
  url: string
  height?: number
  yesLabel: string
  noLabel?: string
}) {
  const data = useChartData<FlagPie[]>('/data/' + url)
  const pie = useMemo(
    () =>
      (data ?? []).map((d) => ({
        name: d.label === 'True' ? yesLabel : noLabel,
        value: d.count,
      })),
    [data, yesLabel, noLabel],
  )
  if (!data) return <Loading height={height} />
  return <PieChart data={pie} height={height} colors={[PIE_COLORS[0], PIE_COLORS[1]]} />
}

export function AccidentsDonutChart({ height = 260 }: { height?: number }) {
  return (
    <FlagDonut
      url="accidents_distribution.json"
      height={height}
      yesLabel="Reported accident(s)"
      noLabel="No accident reported"
    />
  )
}

export function OneOwnerDonutChart({ height = 260 }: { height?: number }) {
  return (
    <FlagDonut
      url="one_owner_distribution.json"
      height={height}
      yesLabel="Single owner"
      noLabel="Multiple previous owners"
    />
  )
}

export function PersonalUseDonutChart({ height = 260 }: { height?: number }) {
  return <FlagDonut url="personal_use_distribution.json" height={height} yesLabel="Personal use only" />
}

/* ------------------------------------------------------------------ */
/* 07 — Relationships */
/* ------------------------------------------------------------------ */

type CorrRow = { feature: string } & Record<string, number | null>

export function CorrelationHeatChart({ height = 340 }: { height?: number }) {
  const data = useChartData<CorrRow[]>('/data/correlation_matrix.json')
  const { xData, cells } = useMemo(() => {
    const xData = (data ?? []).map((r) => r.feature)
    const cells: [number, number, number][] = []
    ;(data ?? []).forEach((row, yi) => {
      xData.forEach((f, xi) => {
        const v = row[f]
        if (typeof v === 'number' && Number.isFinite(v)) cells.push([xi, yi, v])
      })
    })
    return { xData, cells }
  }, [data])
  if (!data) return <Loading height={height} />
  return (
    <HeatmapChart
      height={height}
      xData={xData}
      yData={xData}
      cells={cells}
      min={-1}
      max={1}
      valueFormat={(v) => v.toFixed(2)}
      catFormat={(v) => (v as string)}
      palette="diverging"
    />
  )
}

type ScatterRow = { price: number; priceDrop: number }

export function PriceVsPriceDropChart({ height = 320 }: { height?: number }) {
  const data = useChartData<ScatterRow[]>('/data/price_vs_price_drop.json')
  const pts = useMemo(() => (data ?? []).map((r) => [r.price, r.priceDrop] as [number, number]), [data])
  if (!data) return <Loading height={height} />
  return (
    <ScatterChart
      height={height}
      data={pts}
      xTitle="Listed price"
      yTitle="Price drop"
      xFormat={(v) => money(v)}
      yFormat={(v) => money(v)}
      colorBase="#3aa0c3"
    />
  )
}

type RatingCell = { sellerRating: number; driverRating: number; count: number }

export function RatingHeatChart({ height = 320 }: { height?: number }) {
  const data = useChartData<RatingCell[]>('/data/rating_2d.json')
  const { xData, yData, cells, max } = useMemo(() => {
    const xData = Array.from(new Set((data ?? []).map((r) => r.sellerRating))).sort((a, b) => a - b)
    const yData = Array.from(new Set((data ?? []).map((r) => r.driverRating))).sort((a, b) => a - b)
    const cells: [number, number, number][] = []
    let max = 0
    for (const r of data ?? []) {
      const xi = xData.indexOf(r.sellerRating)
      const yi = yData.indexOf(r.driverRating)
      if (xi >= 0 && yi >= 0) {
        cells.push([xi, yi, r.count])
        if (r.count > max) max = r.count
      }
    }
    return { xData, yData, cells, max }
  }, [data])
  if (!data) return <Loading height={height} />
  return (
    <HeatmapChart
      height={height}
      xData={xData}
      yData={yData}
      cells={cells}
      min={0}
      max={max}
      valueFormat={(v) => num(v)}
      catFormat={(v) => Number(v).toFixed(1)}
      palette="sequential"
    />
  )
}

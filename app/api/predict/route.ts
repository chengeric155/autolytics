import { NextResponse } from 'next/server'
import { estimatePrice } from '@/lib/model/lgbm-scorer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export type PredictInput = {
  manufacturer: string
  baseModel?: string
  model: string
  year: number
  mileage: number
  transmission?: string
  drivetrain?: string
  fuelType?: string
  accidentsOrDamage?: boolean
  oneOwner?: boolean
}

export type PredictResult = {
  /** Point estimate. */
  price: number
  /** Lower / upper bound of the prediction interval. */
  low: number
  high: number
  currency: string
  /** True once a real model is answering — false means this is the stub. */
  modelReady: boolean
  /** Per-feature contribution to this prediction, for the explanation panel. */
  contributions: { feature: string; effect: number }[]
}

const FEATURE_LABELS: Record<string, string> = {
  manufacturer: 'Make',
  base_model: 'Series',
  model: 'Trim',
  mileage: 'Mileage',
  transmission: 'Transmission',
  drivetrain: 'Drivetrain',
  fuel_type: 'Fuel type',
  mpg_city: 'City MPG',
  mpg_highway: 'Highway MPG',
  accidents_or_damage: 'Accident history',
  one_owner: 'One-owner history',
  car_age: 'Vehicle age',
}

export async function POST(request: Request) {
  let body: Partial<PredictInput>

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const manufacturer = String(body.manufacturer ?? '').trim()
  const model = String(body.model ?? '').trim()
  const year = Number(body.year)
  const mileage = Number(body.mileage)

  if (!manufacturer || !model) {
    return NextResponse.json(
      { error: 'Manufacturer and model are required.' },
      { status: 422 },
    )
  }

  if (!Number.isFinite(year)) {
    return NextResponse.json(
      { error: 'A valid model year is required.' },
      { status: 422 },
    )
  }

  if (!Number.isFinite(mileage) || mileage < 0 || mileage > 2_000_000) {
    return NextResponse.json(
      { error: 'Mileage must be a number between 0 and 2,000,000.' },
      { status: 422 },
    )
  }

  const estimate = estimatePrice({
    manufacturer,
    baseModel: String(body.baseModel ?? ''),
    model,
    year,
    mileage,
    transmission: String(body.transmission ?? ''),
    drivetrain: String(body.drivetrain ?? ''),
    fuelType: String(body.fuelType ?? ''),
    accidentsOrDamage: Boolean(body.accidentsOrDamage),
    oneOwner: Boolean(body.oneOwner),
  })

  return NextResponse.json({
    ...estimate,
    currency: 'USD',
    modelReady: true,
    contributions: estimate.contributions.map((c) => ({
      feature: FEATURE_LABELS[c.feature] ?? c.feature,
      effect: c.effect,
    })),
  } satisfies PredictResult)
}
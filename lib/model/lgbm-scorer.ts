import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import path from 'node:path'

/**
 * Server-side scorer for the compiled LightGBM model (lgbm.bin.gz).
 *
 * The binary is produced by `scripts/export_model.py` — see the header
 * comment there for the exact layout. This module reproduces LightGBM's
 * prediction branch-for-branch; parity is checked against the exported
 * `model-assets/verify.json` oracle rows.
 */

export type ModelMeta = {
  version: number
  features: string[]
  objective: string
  nTrees: number
  categorical: Record<string, Record<string, number>>
  maxYear: number
  minYear: number
  mpgCityMedian: number
  mpgHighwayMedian: number
  mpgByModel: Record<string, [number, number]>
  baseline: Record<string, number>
  baselineLabels: Record<string, string | null>
  intervalQuantiles: [number, number]
  featureImportanceGain: Record<string, number>
}

export type PredictionInput = {
  manufacturer: string
  baseModel: string
  model: string
  year: number
  mileage: number
  transmission: string
  drivetrain: string
  fuelType: string
  accidentsOrDamage: boolean
  oneOwner: boolean
}

export type LgbmFrame = {
  nTrees: number
  nodeCounts: Int32Array
  catCodes: Int32Array
  flags: Uint8Array
  features: Int16Array
  values: Float64Array
  catStarts: Int32Array
  catLens: Int32Array
  rightStarts: Int32Array
  defaultLefts: Uint8Array
}

const MAGIC = 0x4c47424d // 'LGBM'

export function parseFrame(buf: ArrayBuffer): LgbmFrame {
  const view = new DataView(buf)
  if (view.getUint32(0, true) !== MAGIC) throw new Error('bad lgbm magic')
  const version = view.getUint32(4, true)
  const nTrees = view.getUint32(8, true)
  const totalNodes = view.getUint32(12, true)
  const catCount = view.getUint32(16, true)
  if (version < 3) throw new Error('lgbm version too old: ' + version)

  let off = 20
  const read = (length: number): ArrayBuffer => buf.slice(off, (off += length))

  const nodeCounts = new Int32Array(read(nTrees * 4))
  const catCodes = new Int32Array(read(catCount * 4))
  const flags = new Uint8Array(read(totalNodes))
  const features = new Int16Array(read(totalNodes * 2))
  const values = new Float64Array(read(totalNodes * 8))
  const catStarts = new Int32Array(read(totalNodes * 4))
  const catLens = new Int32Array(read(totalNodes * 4))
  const rightStarts = new Int32Array(read(totalNodes * 4))
  const defaultLefts = new Uint8Array(read(totalNodes))

  return {
    nTrees,
    nodeCounts,
    catCodes,
    flags,
    features,
    values,
    catStarts,
    catLens,
    rightStarts,
    defaultLefts,
  }
}

function framePath(): string {
  return path.join(process.cwd(), 'model-assets')
}

let cached: { meta: ModelMeta; frame: LgbmFrame } | null = null

export function loadModel(): { meta: ModelMeta; frame: LgbmFrame } {
  if (cached) return cached
  const dir = framePath()
  const meta: ModelMeta = JSON.parse(readFileSync(path.join(dir, 'meta.json'), 'utf8'))
  const gz = readFileSync(path.join(dir, 'lgbm.bin.gz'))
  const raw = gunzipSync(gz)
  const buf =
    raw.buffer.byteLength === raw.byteLength
      ? (raw.buffer as ArrayBuffer)
      : (raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer)
  cached = { meta, frame: parseFrame(buf) }
  return cached
}

/** Sum of leaf values across all trees. Returns 0 when x is empty/null. */
export function predict(frame: LgbmFrame, x: Float64Array): number {
  const { nTrees, nodeCounts, catCodes } = frame
  let total = 0
  let start = 0
  for (let t = 0; t < nTrees; t++) {
    const end = start + nodeCounts[t]
    let node = start
    while (frame.flags[node] !== 0) {
      const feat = frame.features[node]
      const v = x[feat]
      const missing = Number.isNaN(v)
      const dl = frame.defaultLefts[node] === 1
      let left: boolean
      if (frame.flags[node] === 1) {
        left = missing ? dl : v <= frame.values[node]
      } else {
        if (missing) {
          left = dl
        } else {
          const lo = frame.catStarts[node]
          const hi = lo + frame.catLens[node]
          left = false
          for (let k = lo; k < hi; k++) {
            if (catCodes[k] === v) {
              left = true
              break
            }
          }
        }
      }
      node = left ? node + 1 : frame.rightStarts[node]
    }
    total += frame.values[node]
    start = end
  }
  return total
}

function catCode(meta: ModelMeta, feature: string, value: string): number {
  return meta.categorical[feature]?.[value] ?? -1
}

/** Map a form submission into the 12-value feature vector the model expects. */
export function buildFeatures(meta: ModelMeta, input: PredictionInput): Float64Array {
  const mpg =
    meta.mpgByModel[input.model] ??
    meta.mpgByModel[input.baseModel] ??
    [meta.mpgCityMedian, meta.mpgHighwayMedian]
  const raw: Record<string, number> = {
    manufacturer: catCode(meta, 'manufacturer', input.manufacturer),
    base_model: catCode(meta, 'base_model', input.baseModel),
    model: catCode(meta, 'model', input.model),
    mileage: input.mileage,
    transmission: catCode(meta, 'transmission', input.transmission),
    drivetrain: catCode(meta, 'drivetrain', input.drivetrain),
    fuel_type: catCode(meta, 'fuel_type', input.fuelType),
    mpg_city: mpg[0],
    mpg_highway: mpg[1],
    accidents_or_damage: input.accidentsOrDamage ? 1 : 0,
    one_owner: input.oneOwner ? 1 : 0,
    car_age: meta.maxYear - input.year,
  }
  const x = new Float64Array(meta.features.length)
  for (let i = 0; i < meta.features.length; i++) x[i] = raw[meta.features[i]]
  return x
}

export type Contribution = { feature: string; effect: number }

export type Estimate = {
  price: number
  low: number
  high: number
  contributions: Contribution[]
}

const clamp = (n: number) => Math.round(n)

/** Predicted price + interval + per-feature effect vs the median/mode car. */
export function estimatePrice(input: PredictionInput): Estimate {
  const { meta, frame } = loadModel()
  const x = buildFeatures(meta, input)
  const price = predict(frame, x)

  const [p10, p90] = meta.intervalQuantiles
  const low = Math.max(0, clamp(price + p10))
  const high = clamp(price + p90)

  const base = new Float64Array(meta.features.length)
  for (let i = 0; i < meta.features.length; i++) base[i] = meta.baseline[meta.features[i]]
  const baselinePrice = predict(frame, base)

  const contributions: Contribution[] = []
  for (let i = 0; i < meta.features.length; i++) {
    const probe = base.slice()
    probe[i] = x[i]
    contributions.push({ feature: meta.features[i], effect: predict(frame, probe) - baselinePrice })
  }
  contributions.sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect))

  return { price: clamp(price), low, high, contributions }
}
import { loadModel, predict, buildFeatures, estimatePrice } from '../lib/model/lgbm-scorer.ts'
import { readFileSync } from 'node:fs'

const meta = JSON.parse(readFileSync(new URL('../model-assets/meta.json', import.meta.url), 'utf8'))
const verify = JSON.parse(readFileSync(new URL('../model-assets/verify.json', import.meta.url), 'utf8'))

const { frame } = loadModel()

let ok = true
for (const r of verify) {
  const x = buildFeatures(meta, {
    manufacturer: r.manufacturer,
    baseModel: r.base_model,
    model: r.model,
    year: r.year,
    mileage: r.mileage,
    transmission: r.transmission,
    drivetrain: r.drivetrain,
    fuelType: r.fuel_type,
    accidentsOrDamage: r.accidents_or_damage === 1,
    oneOwner: r.one_owner === 1,
  })
  const x2 = x.slice()
  x2[7] = r.mpg_city === null ? NaN : r.mpg_city
  x2[8] = r.mpg_highway === null ? NaN : r.mpg_highway
  const got = predict(frame, x2)
  const want = r.expected
  const d = Math.abs(got - want)
  ok = ok && d < 0.1
  console.log(r.manufacturer.padEnd(10), r.model.padEnd(26), got.toFixed(2).padStart(11), 'vs', want.toFixed(2).padStart(11), d.toFixed(3))
}

const est = estimatePrice({
  manufacturer: 'Audi', baseModel: 'Q7', model: 'Q7 3.0T Premium',
  year: 2017, mileage: 60800, transmission: '8-Speed Automatic',
  drivetrain: 'All-wheel Drive', fuelType: 'Gasoline',
  accidentsOrDamage: true, oneOwner: false,
})
console.log('estimate:', est.price, est.low, est.high)
console.log('top effects:', est.contributions.slice(0, 4).map((c) => `${c.feature}=${c.effect.toFixed(0)}`).join(' | '))

console.log(ok ? 'TS SCORER MATCHES PYTHON' : 'TS SCORER MISMATCH')
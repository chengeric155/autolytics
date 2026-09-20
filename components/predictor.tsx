'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Car, Loader2 } from 'lucide-react'
import type { PredictResult } from '@/app/api/predict/route'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

type PredictMeta = {
  makes: { name: string; baseModels: { name: string; models: string[] }[] }[]
  transmissions: string[]
  drivetrains: string[]
  fuelTypes: string[]
  minYear: number
  maxYear: number
  priceP50: number
}

type FormState = {
  manufacturer: string
  baseModel: string
  model: string
  year: string
  mileage: string
  transmission: string
  drivetrain: string
  fuelType: string
  accidentsOrDamage: boolean
  oneOwner: boolean
}

const emptyForm: FormState = {
  manufacturer: '',
  baseModel: '',
  model: '',
  year: '',
  mileage: '50000',
  transmission: '',
  drivetrain: '',
  fuelType: '',
  accidentsOrDamage: false,
  oneOwner: false,
}

export function Predictor() {
  const [meta, setMeta] = useState<PredictMeta | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [result, setResult] = useState<PredictResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/data/predict-meta.json')
      .then((res) => res.json())
      .then((data: PredictMeta) => {
        setMeta(data)
        const first = data.makes[0]
        const base = first?.baseModels[0]
        setForm((prev) => ({
          ...prev,
          year: String(data.maxYear - 4),
          transmission: '6-Speed Automatic',
          drivetrain: data.drivetrains[0] ?? '',
          fuelType: data.fuelTypes[0] ?? '',
          manufacturer: first?.name ?? '',
          baseModel: base?.name ?? '',
          model: base?.models[0] ?? '',
        }))
      })
      .catch(() => setError('Could not load vehicle reference data.'))
  }, [])

  const activeMake = meta?.makes.find((m) => m.name === form.manufacturer)
  const activeBase = activeMake?.baseModels.find((b) => b.name === form.baseModel)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function selectMake(name: string | null) {
    if (!name) return
    const make = meta?.makes.find((m) => m.name === name)
    const base = make?.baseModels[0]
    setForm((prev) => ({
      ...prev,
      manufacturer: name,
      baseModel: base?.name ?? '',
      model: base?.models[0] ?? '',
    }))
  }

  function selectBase(name: string | null) {
    if (!name) return
    const base = activeMake?.baseModels.find((b) => b.name === name)
    setForm((prev) => ({
      ...prev,
      baseModel: name,
      model: base?.models[0] ?? '',
    }))
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manufacturer: form.manufacturer,
          baseModel: form.baseModel,
          model: form.model,
          year: Number(form.year),
          mileage: Number(form.mileage),
          transmission: form.transmission,
          drivetrain: form.drivetrain,
          fuelType: form.fuelType,
          accidentsOrDamage: form.accidentsOrDamage,
          oneOwner: form.oneOwner,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Prediction failed.')
        return
      }

      setResult(data as PredictResult)
    } catch {
      setError('Could not reach the prediction service.')
    } finally {
      setLoading(false)
    }
  }

  const money = (n: number) =>
    n.toLocaleString('en-US', {
      style: 'currency',
      currency: result?.currency ?? 'USD',
      maximumFractionDigits: 0,
    })

  const years = meta
    ? Array.from({ length: meta.maxYear - meta.minYear + 1 }, (_, i) => String(meta.maxYear - i))
    : []

  if (!meta) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
        Loading vehicle reference data…
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-8">
      {/* ---------------- Input form ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vehicle specification</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Select value={form.manufacturer} onValueChange={selectMake}>
                <SelectTrigger id="manufacturer">
                  <SelectValue placeholder="Select a manufacturer" />
                </SelectTrigger>
                <SelectContent>
                  {meta.makes.map((m) => (
                    <SelectItem key={m.name} value={m.name}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="baseModel">Series</Label>
              <Select
                value={form.baseModel}
                onValueChange={selectBase}
                disabled={!activeMake}
              >
                <SelectTrigger id="baseModel">
                  <SelectValue placeholder="Select a series" />
                </SelectTrigger>
                <SelectContent>
                  {activeMake?.baseModels.map((b) => (
                    <SelectItem key={b.name} value={b.name}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="model">Trim</Label>
              <Select
                value={form.model}
                onValueChange={(v) => set('model', v ?? '')}
                disabled={!activeBase}
              >
                <SelectTrigger id="model">
                  <SelectValue placeholder="Select a trim" />
                </SelectTrigger>
                <SelectContent>
                  {activeBase?.models.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="year">Model year</Label>
              <Select value={form.year} onValueChange={(v) => set('year', v ?? '')}>
                <SelectTrigger id="year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="mileage">Mileage</Label>
              <Input
                id="mileage"
                type="number"
                min={0}
                value={form.mileage}
                onChange={(e) => set('mileage', e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="transmission">Transmission</Label>
              <Input
                id="transmission"
                list="transmission-options"
                placeholder="Start typing, e.g. Automatic"
                value={form.transmission}
                onChange={(e) => set('transmission', e.target.value)}
                autoComplete="off"
              />
              <datalist id="transmission-options">
                {meta.transmissions.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="drivetrain">Drivetrain</Label>
              <Select value={form.drivetrain} onValueChange={(v) => set('drivetrain', v ?? '')}>
                <SelectTrigger id="drivetrain">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {meta.drivetrains.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fuelType">Fuel type</Label>
              <Select value={form.fuelType} onValueChange={(v) => set('fuelType', v ?? '')}>
                <SelectTrigger id="fuelType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {meta.fuelTypes.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <div className="divide-y divide-border rounded-lg border border-border">
                <label className="flex cursor-pointer items-center justify-between gap-4 p-4">
                  <span className="grid gap-0.5">
                    <span className="text-sm font-medium">Reported accident or damage</span>
                    <span className="text-xs text-muted-foreground">
                      Disclosed accident history on the listing.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    className="size-5 shrink-0 accent-primary"
                    checked={form.accidentsOrDamage}
                    onChange={(e) => set('accidentsOrDamage', e.target.checked)}
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-between gap-4 p-4">
                  <span className="grid gap-0.5">
                    <span className="text-sm font-medium">Single-owner vehicle</span>
                    <span className="text-xs text-muted-foreground">
                      The original owner has held it since purchase.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    className="size-5 shrink-0 accent-primary"
                    checked={form.oneOwner}
                    onChange={(e) => set('oneOwner', e.target.checked)}
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : null}
                {loading ? 'Estimating' : 'Estimate price'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setForm(emptyForm)
                  setResult(null)
                  setError(null)
                }}
              >
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ---------------- Readout (the signature element) ---------------- */}
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Estimated price
          </p>

          {result ? (
            <>
              <p
                aria-live="polite"
                className="mt-3 font-mono text-5xl font-semibold tabular-nums tracking-tight text-card-foreground"
              >
                {money(result.price)}
              </p>
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                90% interval {money(result.low)} – {money(result.high)}
              </p>
            </>
          ) : (
            <div className="mt-6 flex flex-col items-center gap-2 text-center">
              <Car className="size-5 text-muted-foreground/70" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                Complete the vehicle spec — the estimate appears here.
              </p>
            </div>
          )}

          {error ? (
            <p
              role="alert"
              className="mt-4 flex items-start gap-2 text-sm text-destructive"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          ) : null}

          {result ? (
            <>
              <Separator className="my-5" />
              <p className="flex items-baseline gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <Car className="size-3.5" aria-hidden="true" />
                {form.manufacturer} {form.model} · {form.year}
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {result.contributions.map((c) => (
                  <li
                    key={c.feature}
                    className="flex items-center justify-between gap-4 text-sm"
                  >
                    <span className="text-muted-foreground">{c.feature}</span>
                    <span
                      className={
                        c.effect >= 0
                          ? 'font-mono tabular-nums text-primary'
                          : 'font-mono tabular-nums text-muted-foreground'
                      }
                    >
                      {c.effect >= 0 ? '+' : '−'}
                      {money(Math.abs(Math.round(c.effect)))}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
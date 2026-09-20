import Link from 'next/link'
import { ArrowRight, BarChart3, Database, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChartSlot } from '@/components/chart-slot'
import { StatCard } from '@/components/stat-card'
import { SectionHeading } from '@/components/page-header'
import { datasetSummary } from '@/lib/site-data'
import { PriceDistributionChart } from '@/components/charts/price-distribution-chart'
import { PriceByYearChart } from '@/components/charts/price-by-year-chart'
import { DepreciationByFuelChart } from '@/components/charts/depreciation-by-fuel-chart'

const entryPoints = [
  {
    href: '/analytics',
    icon: BarChart3,
    title: 'Analytics',
    body: 'Price distributions, depreciation curves, mileage effects and brand comparisons.',
  },
  {
    href: '/predict',
    icon: Sparkles,
    title: 'Price predictor',
    body: 'Enter a vehicle spec and get an estimated resale price with a confidence range.',
  },
  {
    href: '/model',
    icon: Database,
    title: 'Model card',
    body: 'Algorithm, features, evaluation metrics and known limitations of the estimator.',
  },
]

export default function HomePage() {
  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16 lg:px-8 lg:py-24">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Used car market · exploratory analysis + ML
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-6xl">
              What a used car is actually worth.
            </h1>
            <p className="mt-5 max-w-xl leading-relaxed text-muted-foreground text-pretty">
              An analytics workspace over a used vehicle listings dataset, paired
              with a regression model that estimates resale price from make,
              age, mileage and condition.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" nativeButton={false} render={<Link href="/predict" />}>
                Estimate a price
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                nativeButton={false}
                render={<Link href="/analytics" />}
              >
                Browse the analytics
              </Button>
            </div>
          </div>

          {/* Price distribution — the headline visual */}
          <ChartSlot
            title="Listing prices across the market"
            slotId="hero_price_distribution"
            description="List prices from $259 to $2M on a log scale — most used cars sit well under $40k."
            height={280}
          >
            <PriceDistributionChart height={280} />
          </ChartSlot>
        </div>
      </section>

      {/* ---------- Dataset at a glance ---------- */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <SectionHeading
          title="Dataset at a glance"
          description="A snapshot of the cleaned dataset that sits behind every chart on this site."
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {datasetSummary.map((stat) => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              hint={stat.hint}
            />
          ))}
        </div>
      </section>

      {/* ---------- Featured findings ---------- */}
      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <SectionHeading
          title="Featured findings"
          description="Two of the strongest patterns in the data — the full set lives in Analytics."
        />
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <ChartSlot
            title="Price by model year"
            slotId="price_vs_age"
            description="How asking price rises with newer model years, and where the curve steeps."
          >
            <PriceByYearChart />
          </ChartSlot>
          <ChartSlot
            title="Depreciation curves by fuel type"
            slotId="price_vs_mileage"
            description="Median price as the odometer climbs — electric drops fastest, diesel holds value best."
          >
            <DepreciationByFuelChart />
          </ChartSlot>
        </div>
      </section>

      {/* ---------- Entry points ---------- */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {entryPoints.map(({ href, icon: Icon, title, body }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/60"
            >
              <Icon className="size-5 text-primary" aria-hidden="true" />
              <h3 className="font-medium text-card-foreground">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                {body}
              </p>
              <span className="mt-auto inline-flex items-center gap-1 pt-2 font-mono text-xs text-muted-foreground group-hover:text-foreground">
                open
                <ArrowRight
                  className="size-3 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}

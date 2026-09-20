import type { Metadata } from 'next'
import { PageHeader, SectionHeading } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { datasetSummary, featureSchema } from '@/lib/site-data'
import sampleListings from '@/public/data/sample_listings.json'

type SampleListing = (typeof sampleListings)[number]

const sampleColumns: { key: keyof SampleListing; align?: 'left' | 'right' }[] = [
  { key: 'manufacturer' },
  { key: 'model' },
  { key: 'year', align: 'right' },
  { key: 'mileage', align: 'right' },
  { key: 'engine' },
  { key: 'transmission' },
  { key: 'drivetrain' },
  { key: 'fuel_type' },
  { key: 'exterior_color' },
  { key: 'interior_color' },
  { key: 'accidents_or_damage' },
  { key: 'one_owner' },
  { key: 'personal_use_only' },
  { key: 'seller_name' },
  { key: 'seller_rating', align: 'right' },
  { key: 'driver_rating', align: 'right' },
  { key: 'driver_reviews_num', align: 'right' },
  { key: 'mpg_city', align: 'right' },
  { key: 'mpg_highway', align: 'right' },
  { key: 'price_drop', align: 'right' },
  { key: 'price', align: 'right' },
]

function formatSampleCell(key: keyof SampleListing, value: SampleListing[keyof SampleListing]) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (key === 'price' || key === 'price_drop') return `$${value.toLocaleString('en-US')}`
  if (typeof value === 'number') {
    if (key === 'year') return String(value)
    return value.toLocaleString('en-US')
  }
  return String(value ?? '')
}

export const metadata: Metadata = {
  title: 'Dataset',
  description:
    'Source, schema and cleaning steps behind the used car listings dataset.',
}

const cleaningSteps = [
  'Loaded the raw listings and profiled shape, data types, memory usage and missingness of every column.',
  'Normalised drivetrain — collapsed synonym spellings (FWD, front wheel drive, 4x4, …) into four categories: Front-, Rear-, All- and Four-wheel Drive — and nulled anything unidentifiable.',
  'Normalised fuel_type into eight categories (Gasoline, Diesel, Hybrid, Plug-In Hybrid, Electric, E85 Flex Fuel, Hydrogen Fuel Cell, Compressed Natural Gas) and nulled the rest.',
  'Split the combined mpg field ("city-highway") into separate numeric mpg_city and mpg_highway columns and dropped the original.',
  'Downcast data types: booleans for the yes/no flags, int16 for year and review counts, float32 for mileage, ratings and prices, category for manufacturer, drivetrain and fuel_type.',
  'Dropped rows missing any of personal_use_only, accidents_or_damage, one_owner or mileage.',
  'Imputed price_drop nulls with 0 (a null price_drop meant "not discounted") and seller/driver ratings with their mean.',
  'Filled missing transmission, engine, drivetrain and fuel_type from the first-seen value of the same manufacturer/model/year group, then dropped any rows still unknown.',
  'Removed price outliers — listings at exactly the $1 minimum or the ~$1B maximum.',
  'Derived a coarser base_model (first word of the model name), dropped fully duplicated rows, reordered columns, and saved the result as cars_cleaned.csv and cars_cleaned.parquet.',
]

export default function DatasetPage() {
  return (
    <>
      <PageHeader
        eyebrow="Source data"
        title="Dataset"
        description="Where the numbers come from, what each column means, and what was done to the raw data before any of it was plotted or modelled."
      />

      <div className="mx-auto flex max-w-7xl flex-col gap-14 px-4 py-12 sm:px-6 lg:px-8">
        <section>
          <SectionHeading index="01" title="Summary" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {datasetSummary.map((stat) => (
              <StatCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                hint={stat.hint}
              />
            ))}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Source:{' '}
            <a
              href="https://www.kaggle.com/datasets/andreinovikov/used-cars-dataset"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Kaggle — Used Cars Dataset by Andrey Novikov
            </a>
          </p>
        </section>

        <section>
          <SectionHeading
            index="02"
            title="Schema"
            description="The columns available after cleaning, and which one is the prediction target."
          />
          <div className="mt-5 overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-xs">column</TableHead>
                  <TableHead className="font-mono text-xs">type</TableHead>
                  <TableHead className="font-mono text-xs">description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {featureSchema.map((field) => (
                  <TableRow key={field.name}>
                    <TableCell className="font-mono text-sm">{field.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={field.type === 'target' ? 'default' : 'secondary'}
                        className="font-mono text-[10px] font-normal"
                      >
                        {field.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {field.description}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <section>
          <SectionHeading
            index="03"
            title="Cleaning steps"
            description="What was done to the raw listings before any of it was plotted or modelled."
          />
          <ol className="mt-5 flex flex-col gap-3">
            {cleaningSteps.map((step, i) => (
              <li key={step} className="flex gap-3 text-sm leading-relaxed">
                <span className="font-mono text-xs text-muted-foreground">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-pretty">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <SectionHeading
            index="04"
            title="Sample rows"
            description="A handful of real rows straight from the cleaned dataset, one per make."
          />
          <div className="mt-5 overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  {sampleColumns.map((col) => (
                    <TableHead
                      key={col.key}
                      className={
                        col.align === 'right'
                          ? 'text-right font-mono text-xs'
                          : 'font-mono text-xs'
                      }
                    >
                      {col.key}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleListings.map((row, i) => (
                  <TableRow key={i}>
                    {sampleColumns.map((col) => {
                      const value = row[col.key]
                      const numeric = typeof value === 'number'
                      return (
                        <TableCell
                          key={col.key}
                          className={
                            numeric
                              ? 'text-right font-mono text-sm tabular-nums'
                              : 'whitespace-nowrap text-sm'
                          }
                        >
                          {formatSampleCell(col.key, value)}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </>
  )
}

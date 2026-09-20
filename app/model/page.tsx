import type { Metadata } from 'next'
import { PageHeader, SectionHeading } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { ChartSlot } from '@/components/chart-slot'
import { ModelComparisonChart } from '@/components/charts/model-comparison-chart'
import { featureImportance, modelMetrics } from '@/lib/site-data'

export const metadata: Metadata = {
  title: 'Model card',
  description:
    'Algorithm, training setup, evaluation metrics and limitations of the used car price estimator.',
}

const spec = [
  { key: 'Algorithm', value: 'LightGBM — tuned gradient-boosted trees' },
  {
    key: 'Objective',
    value: 'Regression optimising mean absolute error (L1); held-out MAE on the final model',
  },
  { key: 'Target', value: 'Price — continuous, fed to the model on the natural scale' },
  { key: 'Train / test split', value: '569,188 / 142,298 rows (80 / 20, random_state 42)' },
  {
    key: 'Validation',
    value: 'Hyperparameters tuned with 5-fold cross-validation; the final model is early-stopped on the 20% holdout (best iteration 1,981 of n_estimators 2,000)',
  },
  {
    key: 'Categorical encoding',
    value: 'LightGBM native categoricals for manufacturer, base_model, model, transmission, drivetrain and fuel_type — no one-hot needed',
  },
  {
    key: 'Numeric scaling',
    value: 'None — tree model; missing mpg_city / mpg_highway imputed with the column median',
  },
  {
    key: 'Hyperparameter search',
    value: 'Optuna, 50 trials over 5-fold CV, minimising MAE',
  },
  {
    key: 'Final hyperparameters',
    value: 'learning_rate 0.0508 · num_leaves 208 · max_depth 11 · min_child_samples 9 · subsample 0.566 · colsample_bytree 0.633 · reg_alpha 0.089 · reg_lambda 0.002',
  },
]

const limitations = [
  'Trained on listing prices, not final transaction prices — asking prices skew high.',
  'Rare makes and models are thinly represented, so estimates there are unreliable.',
  'No regional or seasonal adjustment; the market moves and the dataset has a fixed snapshot date.',
  'Condition is self-reported in the source data and is therefore noisy.',
  'Vehicle history (accidents, service records) is not a feature.',
]

export default function ModelPage() {
  return (
    <>
      <PageHeader
        eyebrow="Model card"
        title="The price estimator"
        description="Full disclosure on how the model was built, how well it performs, and where it should not be trusted."
      />

      <div className="mx-auto flex max-w-7xl flex-col gap-14 px-4 py-12 sm:px-6 lg:px-8">
        <section>
          <SectionHeading
            index="01"
            title="Performance"
            description="Tuned LightGBM on the held-out 20% test split (142,298 listings)."
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {modelMetrics.map((metric) => (
              <StatCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                hint={metric.hint}
              />
            ))}
          </div>
        </section>

        <section>
          <SectionHeading index="02" title="Training setup" />
          <dl className="mt-5 divide-y divide-border overflow-hidden rounded-lg border border-border">
            {spec.map((row) => (
              <div
                key={row.key}
                className="grid gap-1 bg-card px-4 py-3 sm:grid-cols-[220px_1fr] sm:gap-4"
              >
                <dt className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  {row.key}
                </dt>
                <dd className="text-sm text-card-foreground">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <SectionHeading
            index="03"
            title="Feature importance"
            description="Split-gain importance from the tuned LightGBM, normalised to share of total gain."
          />
          <ul className="mt-5 flex flex-col gap-3">
            {featureImportance.map((item) => (
              <li key={item.feature} className="flex items-center gap-4">
                <span className="w-32 shrink-0 font-mono text-xs text-muted-foreground">
                  {item.feature}
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${Math.round(item.weight * 100)}%` }}
                  />
                </span>
                <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
                  {item.weight ? `${Math.round(item.weight * 100)}%` : '—'}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <SectionHeading
            index="04"
            title="Diagnostics"
            description="Evaluation plots from the trained model — MAE by baseline, residuals on the test split, and the SHAP summary."
          />
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <ChartSlot
              className="lg:col-span-2"
              title="MAE and R² by model"
              slotId="model_comparison"
              description="Every baseline vs. the tuned LightGBM on the same 20% holdout. MAE on the bottom axis, R² on the top axis."
              height={300}
            >
              <ModelComparisonChart />
            </ChartSlot>
            <ChartSlot
              title="Residuals vs. actual price"
              slotId="residual_plot"
              description="Tuned LightGBM on the test split. Errors stay tight and symmetric up to the $50k x-range."
              src="/data/residual_plot.png"
              alt="Residual plot for the tuned LightGBM model on the held-out test split"
              height={420}
            />
            <ChartSlot
              title="SHAP summary"
              slotId="shap_summary"
              description="Feature contributions per prediction, coloured by feature value. Model and age dominate; accident record and fuel type have little effect."
              src="/data/shap_summary.png"
              alt="SHAP summary plot for the tuned LightGBM model"
              height={420}
            />
          </div>
        </section>

        <section>
          <SectionHeading index="05" title="Limitations" />
          <ul className="mt-5 flex flex-col gap-3">
            {limitations.map((item) => (
              <li
                key={item}
                className="border-l border-border pl-4 text-sm leading-relaxed text-muted-foreground text-pretty"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}

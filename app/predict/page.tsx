import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { Predictor } from '@/components/predictor'

export const metadata: Metadata = {
  title: 'Price predictor',
  description:
    'Estimate the resale price of a used car from its make, series, trim, model year, mileage, drivetrain and ownership history.',
}

export default function PredictPage() {
  return (
    <>
      <PageHeader
        eyebrow="Inference"
        title="Price predictor"
        description="A gradient-boosted model prices the vehicle you describe — a point estimate, a 90% prediction interval, and each input's contribution."
      />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <Predictor />
      </div>
    </>
  )
}

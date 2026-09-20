import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="font-mono text-xs text-muted-foreground">
          autolytics — used car market analytics & price prediction
        </p>
        <p className="text-xs text-muted-foreground">
          Data from{' '}
          <a
            href="https://www.kaggle.com/datasets/andreinovikov/used-cars-dataset"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            Kaggle: Used Cars Dataset by Andrey Novikov
          </a>
        </p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link
            href="/analytics"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Analytics
          </Link>
          <Link
            href="/predict"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Predictor
          </Link>
          <Link
            href="/dataset"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Dataset
          </Link>
          <Link
            href="/model"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Model card
          </Link>
        </nav>
      </div>
    </footer>
  )
}

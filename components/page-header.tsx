type PageHeaderProps = {
  eyebrow?: string
  title: string
  description?: string
}

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <div className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {eyebrow ? (
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground text-pretty">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export function SectionHeading({
  index,
  title,
  description,
}: {
  index?: string
  title: string
  description?: string
}) {
  return (
    <div className="flex flex-col gap-1 border-l-0">
      <div className="flex items-baseline gap-3">
        {index ? (
          <span className="font-mono text-xs text-muted-foreground">{index}</span>
        ) : null}
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      </div>
      {description ? (
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
          {description}
        </p>
      ) : null}
    </div>
  )
}

/** Skeleton placeholders shown while homepage sections stream in. */

export function HeroSkeleton() {
  return (
    <section className="bg-gradient-to-br from-fusion-800 via-fusion-700 to-fusion-950">
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-4 px-4 py-16 sm:py-24">
        <div className="h-6 w-40 animate-pulse rounded-full bg-white/15" />
        <div className="h-10 w-3/4 max-w-2xl animate-pulse rounded-lg bg-white/15 sm:h-14" />
        <div className="h-5 w-1/2 max-w-xl animate-pulse rounded bg-white/10" />
        <div className="flex gap-3">
          <div className="h-12 w-32 animate-pulse rounded-xl bg-white/15" />
          <div className="h-12 w-36 animate-pulse rounded-xl bg-white/10" />
        </div>
      </div>
    </section>
  );
}

export function CategorySkeleton() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10">
      <div className="mb-4 h-7 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
            <div className="h-14 w-14 shrink-0 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProductGridSkeleton({ titleWidth = "w-40" }: { titleWidth?: string }) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10">
      <div className="mb-4 flex items-center justify-between">
        <div className={`h-7 ${titleWidth} animate-pulse rounded bg-slate-200 dark:bg-slate-800`} />
        <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="aspect-square animate-pulse bg-slate-200 dark:bg-slate-800" />
            <div className="space-y-2 p-3">
              <div className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-5 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

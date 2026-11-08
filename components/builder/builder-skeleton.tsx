/** Shown while the saved build loads from localStorage. Same footprint as the real layout. */
export function BuilderSkeleton() {
  const block = "animate-pulse rounded-btn border border-line bg-surface";
  return (
    <div
      aria-busy="true"
      aria-label="Loading builder"
      className="flex flex-1 flex-col"
    >
      <div className="mx-auto grid w-full max-w-[1600px] flex-1 gap-3 px-4 py-4 xl:h-[calc(100dvh-4rem-2.5rem)] xl:grid-cols-[340px_1fr_340px] xl:px-6">
        <div className="hidden flex-col gap-2 xl:flex">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className={`${block} h-16`} />
          ))}
        </div>
        <div
          className={`${block} h-[42vh] min-h-[280px] rounded-card xl:h-auto`}
        />
        <div className={`${block} hidden rounded-card xl:block`} />
        <div className={`${block} h-80 rounded-tile xl:hidden`} />
      </div>
    </div>
  );
}

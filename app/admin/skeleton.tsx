/** The neutral loading shell shown while the admin check runs (no admin wording). */
export function AdminSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className="container-page flex flex-col gap-8 py-10 md:py-14"
    >
      <div className="h-16 w-64 animate-pulse rounded-card bg-surface" />
      <div className="h-64 animate-pulse rounded-card border border-line bg-surface" />
    </div>
  );
}

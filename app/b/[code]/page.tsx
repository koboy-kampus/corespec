import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SharedBuildView } from "@/components/shared/shared-build";
import { deriveBuild } from "@/lib/derive";
import { formatIDR } from "@/lib/format";
import { decodeBuild } from "@/lib/share";
import { loadCatalogue } from "@/lib/catalogue/load";

export async function generateMetadata({
  params,
}: PageProps<"/b/[code]">): Promise<Metadata> {
  const { code } = await params;
  await loadCatalogue();
  const shared = decodeBuild(code);
  if (!shared) return { title: "Build not found" };
  const d = deriveBuild(shared.parts);
  const description = `${d.filled} parts · ${formatIDR(d.totalIDR)} (approximate) · Planned with CoreSpec`;
  return {
    title: shared.name,
    description,
    // Personal snapshots: fine to preview, not to list in search results.
    robots: { index: false, follow: true },
    openGraph: { title: shared.name, description, type: "website" },
    twitter: { card: "summary_large_image", title: shared.name, description },
  };
}

async function SharedBuild({ params }: Pick<PageProps<"/b/[code]">, "params">) {
  const { code } = await params;
  await loadCatalogue();
  const shared = decodeBuild(code);
  if (!shared) notFound();
  return <SharedBuildView shared={shared} />;
}

function SharedSkeleton() {
  const block = "animate-pulse rounded-card border border-line bg-surface";
  return (
    <div
      aria-busy="true"
      aria-label="Loading shared build"
      className="container-page flex flex-col gap-6 py-8 md:py-12"
    >
      <div className={`${block} h-32`} />
      <div className="grid gap-3 lg:grid-cols-[1fr_380px]">
        <div className={`${block} h-[44vh] min-h-[300px] lg:h-[600px]`} />
        <div className={`${block} h-96`} />
      </div>
    </div>
  );
}

/** /b/<code>: a read-only build someone shared. The whole build lives in the code. */
export default function Page({ params }: PageProps<"/b/[code]">) {
  return (
    <Suspense fallback={<SharedSkeleton />}>
      <SharedBuild params={params} />
    </Suspense>
  );
}

import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ItemForm } from "@/components/admin/item-form";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { itemFormValues } from "@/lib/admin/catalogue-form";
import { requireAdmin } from "@/lib/auth/dal";
import { ALL_CATEGORIES, CATEGORY_LABEL } from "@/lib/categories";
import { isCategory } from "@/lib/catalogue/schema";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import models from "@/data/models.json";
import { AdminSkeleton } from "../../skeleton";

export const metadata: Metadata = {
  title: "Add item · Admin",
  robots: { index: false },
};

export default function Page({ searchParams }: PageProps<"/admin/items/new">) {
  if (!isSupabaseConfigured()) notFound();
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <NewItem searchParams={searchParams} />
    </Suspense>
  );
}

async function NewItem({
  searchParams,
}: Pick<PageProps<"/admin/items/new">, "searchParams">) {
  await requireAdmin();
  const raw = (await searchParams).category;
  const category = typeof raw === "string" && isCategory(raw) ? raw : null;

  return (
    <div className="container-page flex flex-col gap-8 py-10 md:py-14">
      <Link
        href="/admin/items"
        className="flex w-fit items-center gap-1.5 label-micro text-fg-3 hover:text-fg"
      >
        <ArrowLeft className="size-3.5" aria-hidden /> Catalogue
      </Link>
      <SectionHeader
        as="h1"
        eyebrow="Admin"
        title="Add an item"
        subtitle={
          category
            ? `A new ${CATEGORY_LABEL[category].toLowerCase()}. Fill in what the builder needs; add listings after saving.`
            : "First, which category?"
        }
        layout="split"
      />
      {category ? (
        <ItemForm
          mode="new"
          category={category}
          initial={{
            ...itemFormValues({ category }),
            id: `${category}-`,
          }}
          presetLocked={false}
          modelIds={Object.keys(models)}
        />
      ) : (
        <ul className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {ALL_CATEGORIES.map((c) => (
            <li key={c}>
              <Button
                asChild
                variant="secondary"
                className="w-full justify-start"
              >
                <Link href={`/admin/items/new?category=${c}`}>
                  {CATEGORY_LABEL[c]}
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

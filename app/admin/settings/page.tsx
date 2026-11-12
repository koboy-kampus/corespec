import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SettingsForm } from "@/components/admin/settings-form";
import { SectionHeader } from "@/components/ui/section-header";
import { requireAdmin } from "@/lib/auth/dal";
import { todayJakarta } from "@/lib/catalogue/listings";
import { JSON_ESTIMATES_AS_OF } from "@/lib/parts";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { AdminSkeleton } from "../skeleton";

export const metadata: Metadata = {
  title: "Settings · Admin",
  robots: { index: false },
};

export default function Page() {
  if (!isSupabaseConfigured()) notFound();
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <Settings />
    </Suspense>
  );
}

async function Settings() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "estimates_as_of")
    .maybeSingle();
  const asOf =
    typeof data?.value === "string" ? data.value : JSON_ESTIMATES_AS_OF;

  return (
    <div className="container-page flex flex-col gap-8 py-10 md:py-14">
      <Link
        href="/admin"
        className="flex w-fit items-center gap-1.5 label-micro text-fg-3 hover:text-fg"
      >
        <ArrowLeft className="size-3.5" aria-hidden /> Admin
      </Link>
      <SectionHeader
        as="h1"
        eyebrow="Admin"
        title="Settings"
        subtitle="Values the site shows that aren't part of any one item."
        layout="split"
      />
      <SettingsForm estimatesAsOf={asOf} today={todayJakarta()} />
    </div>
  );
}

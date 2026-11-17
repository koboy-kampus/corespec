import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminInbox } from "@/components/chat/admin-inbox";
import { SectionHeader } from "@/components/ui/section-header";
import { requireAdmin } from "@/lib/auth/dal";
import type { InboxRow } from "@/lib/chat/inbox";
import { supabaseAdminChat } from "@/lib/chat/store";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { AdminSkeleton } from "../skeleton";

export const metadata: Metadata = {
  title: "Chat · Admin",
  robots: { index: false },
};

/** The admin's chat inbox (Phase 18b). Admins only, like every /admin page. */
export default function Page() {
  if (!isSupabaseConfigured()) notFound();
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <Inbox />
    </Suspense>
  );
}

async function Inbox() {
  const { supabase } = await requireAdmin();
  let rows: InboxRow[] = [];
  let failed = false;
  try {
    rows = await supabaseAdminChat(supabase).inbox();
  } catch {
    failed = true;
  }
  return (
    <div className="container-page flex flex-col gap-6 py-10 md:py-14">
      <Link
        href="/admin"
        className="flex w-fit items-center gap-1.5 label-micro text-fg-3 hover:text-fg"
      >
        <ArrowLeft className="size-3.5" aria-hidden /> Admin
      </Link>
      <SectionHeader
        as="h1"
        eyebrow="Admin"
        title="Chat"
        subtitle="Users' questions. The bot answers common ones; “Needs admin” means it passed the question on."
        layout="split"
      />
      {failed ? (
        <p role="alert" className="text-body text-fg-2">
          Couldn&apos;t load the conversations. Reload to try again.
        </p>
      ) : (
        <AdminInbox initialRows={rows} />
      )}
    </div>
  );
}

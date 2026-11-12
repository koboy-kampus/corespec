import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { RoleForm } from "@/components/account/role-form";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import { requireAdmin } from "@/lib/auth/dal";
import { formatShortDate } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { AdminSkeleton } from "../skeleton";

export const metadata: Metadata = {
  title: "Users · Admin",
  robots: { index: false },
};

export default function Page() {
  if (!isSupabaseConfigured()) notFound();
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <Users />
    </Suspense>
  );
}

async function Users() {
  const { supabase, viewer } = await requireAdmin();
  const { data: users, error } = await supabase.rpc("admin_list_users");

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
        title="Users"
        subtitle="Make someone an admin, or take it back. You can't change your own role, and there is always at least one admin."
        layout="split"
      />
      {error ? (
        <p role="alert" className="text-body text-fg-2">
          Couldn&apos;t load the users. Reload to try again.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line">
          <table className="w-full min-w-[640px] text-left text-[14px] leading-5">
            <caption className="sr-only">Every account</caption>
            <thead className="border-b border-line bg-surface label-micro text-fg-3">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Name
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Email
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Joined
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Builds
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Role
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  <span className="sr-only">Change role</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(users ?? []).map((u) => (
                <tr key={u.id} className="align-middle text-fg-2">
                  <th
                    scope="row"
                    className="max-w-48 truncate px-4 py-3 font-medium text-fg"
                  >
                    {u.display_name}
                    {u.id === viewer.id ? (
                      <span className="ml-2 text-fg-3">(you)</span>
                    ) : null}
                  </th>
                  <td className="max-w-56 truncate px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatShortDate(u.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right spec">{u.build_count}</td>
                  <td className="px-4 py-3">
                    <Badge variant={u.role === "admin" ? "accent" : "neutral"}>
                      {u.role === "admin" ? "Admin" : "User"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.id === viewer.id ? null : (
                      <RoleForm
                        userId={u.id}
                        name={u.display_name}
                        role={u.role}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

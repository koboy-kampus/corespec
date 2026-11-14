"use server";

import { refresh } from "next/cache";
import { getSession } from "@/lib/auth/dal";
import type { FormState } from "@/lib/auth/actions";

/**
 * Admin Server Actions. Each re-checks that the caller is an admin (the page
 * being /admin proves nothing), and the database checks again inside
 * public.set_role().
 */
export async function setRole(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const session = await getSession();
  if (!session || session.viewer.role !== "admin")
    return { error: "Only admins can change roles." };

  const target = form.get("userId");
  const role = form.get("role");
  if (typeof target !== "string" || (role !== "user" && role !== "admin"))
    return { error: "That request wasn't valid." };
  if (target === session.viewer.id)
    return { error: "You can't change your own role." };

  const { error } = await session.supabase.rpc("set_role", {
    target,
    new_role: role,
  });
  if (error)
    return {
      error: /at least one admin/i.test(error.message)
        ? "There must always be at least one admin."
        : "Couldn't change the role. Try again.",
    };
  refresh();
  return { done: "saved" };
}

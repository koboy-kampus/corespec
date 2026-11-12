"use server";

import { createSupabase, setHint } from "@/lib/supabase/server";
import { runSync, type SyncResponse } from "./sync-core";

/**
 * Syncs this browser's account builds (components/account/account-sync.tsx calls
 * it about a second after each change). It runs as a POST to whatever page is
 * open, usually /builder, where proxy.ts doesn't run, so the Supabase client
 * renews an expired access token right here and writes the new cookies. If that
 * fails the answer is "signed-out" and the browser asks the user to log in again;
 * their builds stay in this browser meanwhile.
 */
export async function syncBuilds(input: unknown): Promise<SyncResponse> {
  const result = await runSync(await createSupabase(), input);
  // Only ever set here, never cleared: a "signed-out" answer can also come from
  // two tabs renewing the same token at once, and the browser retries first.
  if (result.ok) await setHint(result.role);
  return result;
}

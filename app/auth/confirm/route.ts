import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { safeNext } from "@/lib/auth/dal";
import { createSupabase, setHint } from "@/lib/supabase/server";

const TYPES: EmailOtpType[] = [
  "signup",
  "email",
  "recovery",
  "invite",
  "magiclink",
  "email_change",
];

/**
 * Where links in Supabase's emails land (only used with email confirmation on,
 * or for password resets): checks the one-time token, which logs the user in,
 * then continues to `next`.
 *
 * The email templates must link here, e.g. for "Confirm signup":
 * {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/account
 * (docs/accounts.md has all of them).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(url.searchParams.get("next"));
  const fail = new URL("/login?error=link", request.url);

  const supabase = await createSupabase();
  if (!supabase || !tokenHash || !type || !TYPES.includes(type))
    return NextResponse.redirect(fail);

  const { data, error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });
  if (error || !data.user) return NextResponse.redirect(fail);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  await setHint(profile?.role ?? "user");
  return NextResponse.redirect(new URL(next, request.url));
}

"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import type { AuthError } from "@supabase/supabase-js";
import { getSession, safeNext } from "@/lib/auth/dal";
import { authEmailEnabled } from "@/lib/supabase/config";
import {
  clearSessionCookies,
  createSupabase,
  setHint,
} from "@/lib/supabase/server";
import {
  checkDisplayName,
  checkEmail,
  checkNewPassword,
  hasErrors,
  readLogin,
  readRegister,
} from "./validate";

/**
 * The account Server Actions behind the forms in components/account/. Each one
 * checks its own input and, where it needs a login, the session (lib/auth/dal.ts)
 * itself: never the page it was called from.
 */

export interface FormState {
  /** One message for the whole form. */
  error?: string;
  /** Messages per field. */
  fields?: Record<string, string>;
  /** What to put back in the fields (never the password). */
  values?: Record<string, string>;
  /** Finished: what to tell the user. */
  done?: "check-email" | "saved" | "sent" | "deleted" | "signed-out";
}

const NOT_SET_UP = "Accounts aren't set up on this site.";
const LOG_IN_AGAIN = "Your session has ended. Please log in again.";

function authMessage(error: AuthError | null, fallback: string): string {
  switch (error?.code) {
    case "invalid_credentials":
      return "That email and password don't match an account.";
    case "email_not_confirmed":
      return "Confirm your email first: open the link we sent you.";
    case "user_already_exists":
    case "email_exists":
      return "There's already an account with this email. Log in instead.";
    case "weak_password":
      return "Choose a stronger password: longer is better.";
    case "same_password":
      return "That's your current password. Choose a new one.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts. Wait a few minutes and try again.";
    case "signup_disabled":
      return "New accounts are switched off right now.";
    default:
      return fallback;
  }
}

/** This site's address, for links in emails (must be in Supabase's redirect list). */
async function siteOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await createSupabase();
  if (!supabase) return { error: NOT_SET_UP };
  const { email, password, errors } = readLogin(form);
  if (hasErrors(errors)) return { fields: errors, values: { email } };

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user)
    return {
      error: authMessage(error, "Couldn't log you in. Try again."),
      values: { email },
    };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  await setHint(profile?.role ?? "user");
  redirect(safeNext(form.get("next")));
}

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await createSupabase();
  if (!supabase) return { error: NOT_SET_UP };
  const { displayName, email, password, errors } = readRegister(form);
  const values = { displayName, email };
  if (hasErrors(errors)) return { fields: errors, values };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Only the display name: the database ignores anything else and always
      // makes a new account a plain user.
      data: { display_name: displayName },
      emailRedirectTo: `${await siteOrigin()}/auth/confirm?next=/account`,
    },
  });
  if (error)
    return {
      error: authMessage(error, "Couldn't create your account. Try again."),
      values,
    };

  // Email confirmation off: logged in straight away.
  if (data.session) {
    await setHint("user");
    redirect("/account");
  }
  // Confirmation on: the link in the email finishes it (/auth/confirm).
  return { done: "check-email", values: { email } };
}

/** Logs out this browser only (other devices stay logged in). */
export async function signOut(): Promise<FormState> {
  const supabase = await createSupabase();
  if (supabase) await supabase.auth.signOut({ scope: "local" });
  await clearSessionCookies();
  await setHint(null);
  return { done: "signed-out" };
}

export async function updateDisplayName(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const session = await getSession();
  if (!session) return { error: LOG_IN_AGAIN };
  const raw = form.get("displayName");
  const name = checkDisplayName(typeof raw === "string" ? raw : "");
  if (name.error)
    return {
      fields: { displayName: name.error },
      values: { displayName: name.value },
    };

  const { error } = await session.supabase
    .from("profiles")
    .update({ display_name: name.value })
    .eq("id", session.viewer.id);
  if (error)
    return {
      error: "Couldn't save your name. Try again.",
      values: { displayName: name.value },
    };
  refresh();
  return { done: "saved", values: { displayName: name.value } };
}

export async function changePassword(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const session = await getSession();
  if (!session) return { error: LOG_IN_AGAIN };
  const password = form.get("password");
  const value = typeof password === "string" ? password : "";
  const problem = checkNewPassword(value);
  if (problem) return { fields: { password: problem } };

  const { error } = await session.supabase.auth.updateUser({ password: value });
  if (error)
    return {
      error: authMessage(error, "Couldn't change your password. Try again."),
    };
  return { done: "saved" };
}

/** Always says "sent", so nobody can find out which emails have an account. */
export async function requestPasswordReset(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const supabase = await createSupabase();
  if (!supabase || !authEmailEnabled()) return { error: NOT_SET_UP };
  const raw = form.get("email");
  const email = checkEmail(typeof raw === "string" ? raw : "");
  if (email.error)
    return { fields: { email: email.error }, values: { email: email.value } };

  const { error } = await supabase.auth.resetPasswordForEmail(email.value, {
    redirectTo: `${await siteOrigin()}/auth/confirm?next=/account/password`,
  });
  if (error?.code === "over_email_send_rate_limit")
    return { error: authMessage(error, ""), values: { email: email.value } };
  return { done: "sent", values: { email: email.value } };
}

/** Deletes the account and everything in it, then logs out. */
export async function deleteAccount(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const session = await getSession();
  if (!session) return { error: LOG_IN_AGAIN };
  if (
    String(form.get("confirm") ?? "")
      .trim()
      .toLowerCase() !== "delete"
  )
    return { fields: { confirm: 'Type "delete" to confirm.' } };

  const { error } = await session.supabase.rpc("delete_my_account");
  if (error)
    return {
      error: /last admin/i.test(error.message)
        ? "You're the only admin. Make someone else an admin first."
        : "Couldn't delete your account. Try again.",
    };
  await clearSessionCookies();
  await setHint(null);
  return { done: "deleted" };
}

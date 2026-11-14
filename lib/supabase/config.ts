/**
 * Accounts (Phase 16) switch on only when both public Supabase settings are set
 * (see .env.example). Without them CoreSpec works exactly as before: no login,
 * no account menu, no cookies, and no Supabase code runs anywhere.
 *
 * Both values are public by design (the publishable key only allows what the
 * database's Row Level Security allows), so they are NEXT_PUBLIC_ and Next
 * inlines them into the build. Read them through these functions so that
 * inlining happens and tests can change them.
 */
export interface SupabaseConfig {
  url: string;
  key: string;
}

export function supabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}

export function isSupabaseConfigured(): boolean {
  return supabaseConfig() !== null;
}

/**
 * Whether the project can send email (confirmation and password-reset links).
 * Off by default: Supabase's built-in sender only reaches the project's own team,
 * so "Forgot password?" is only offered once a real sender is set up and this is
 * set to "on" (docs/accounts.md).
 */
export function authEmailEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_EMAIL === "on";
}

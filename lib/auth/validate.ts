/**
 * Checks for the account forms. Shared by the forms (instant hints) and the
 * Server Actions (the real check: never trust the browser). The database checks
 * the same limits again (supabase/migrations/).
 */

export const NAME_MAX = 50;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72; // bcrypt, which Supabase Auth uses, ignores the rest

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

const str = (v: FormDataEntryValue | null | undefined): string =>
  typeof v === "string" ? v : "";

/** Like the database: no control characters, spaces collapsed, trimmed. */
export function cleanDisplayName(raw: string): string {
  return raw
    .replace(/\p{Cc}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function checkDisplayName(raw: string): {
  value: string;
  error?: string;
} {
  const value = cleanDisplayName(raw);
  if (!value) return { value, error: "Enter a display name." };
  if ([...value].length > NAME_MAX)
    return { value, error: `Keep it to ${NAME_MAX} characters or fewer.` };
  return { value };
}

export function checkEmail(raw: string): { value: string; error?: string } {
  const value = raw.trim().toLowerCase();
  if (!value) return { value, error: "Enter your email address." };
  if (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    return { value, error: "That doesn't look like an email address." };
  return { value };
}

export function checkNewPassword(value: string): string | undefined {
  if (value.length < PASSWORD_MIN)
    return `Use at least ${PASSWORD_MIN} characters.`;
  if (value.length > PASSWORD_MAX)
    return `Use ${PASSWORD_MAX} characters or fewer.`;
  return undefined;
}

/** A rough hint shown while typing: never a rule, length matters most. */
export function passwordStrength(value: string): "weak" | "okay" | "strong" {
  if (value.length < PASSWORD_MIN) return "weak";
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) =>
    r.test(value),
  ).length;
  if (value.length >= 14 || (value.length >= 10 && kinds >= 3)) return "strong";
  return kinds >= 2 || value.length >= 12 ? "okay" : "weak";
}

export function readLogin(form: FormData) {
  const email = checkEmail(str(form.get("email")));
  const password = str(form.get("password"));
  const errors: FieldErrors<"email" | "password"> = {};
  if (email.error) errors.email = email.error;
  if (!password) errors.password = "Enter your password.";
  return { email: email.value, password, errors };
}

export function readRegister(form: FormData) {
  const name = checkDisplayName(str(form.get("displayName")));
  const email = checkEmail(str(form.get("email")));
  const password = str(form.get("password"));
  const errors: FieldErrors<"displayName" | "email" | "password"> = {};
  if (name.error) errors.displayName = name.error;
  if (email.error) errors.email = email.error;
  const pw = checkNewPassword(password);
  if (pw) errors.password = pw;
  return { displayName: name.value, email: email.value, password, errors };
}

export const hasErrors = (errors: object) => Object.keys(errors).length > 0;

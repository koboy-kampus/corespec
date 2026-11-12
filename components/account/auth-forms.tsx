"use client";

import { Suspense, useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  requestPasswordReset,
  signIn,
  signUp,
  type FormState,
} from "@/lib/auth/actions";
import {
  NAME_MAX,
  PASSWORD_MAX,
  PASSWORD_MIN,
  passwordStrength,
} from "@/lib/auth/validate";
import { Field, FormMessage } from "./field";

const initial: FormState = {};

const linkClass =
  "text-fg underline decoration-line-strong underline-offset-4 hover:decoration-accent";

/** /login. Reads `?next=` (where to go after) behind Suspense, as Cache Components needs. */
export function LoginForm({ forgotPassword }: { forgotPassword: boolean }) {
  return (
    <Suspense fallback={<Login next="" forgotPassword={forgotPassword} />}>
      <LoginWithNext forgotPassword={forgotPassword} />
    </Suspense>
  );
}

function LoginWithNext({ forgotPassword }: { forgotPassword: boolean }) {
  const params = useSearchParams();
  return (
    <Login
      next={params.get("next") ?? ""}
      linkError={params.get("error") === "link"}
      forgotPassword={forgotPassword}
    />
  );
}

function Login({
  next,
  linkError,
  forgotPassword,
}: {
  next: string;
  linkError?: boolean;
  forgotPassword: boolean;
}) {
  const [state, action, pending] = useActionState(signIn, initial);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error ? (
        <FormMessage tone="error">{state.error}</FormMessage>
      ) : null}
      {linkError && !state.error ? (
        <FormMessage tone="error">
          That link has expired or was already used. Log in, or ask for a new
          one.
        </FormMessage>
      ) : null}
      <input type="hidden" name="next" value={next} />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        error={state.fields?.email}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={state.fields?.password}
        hint={
          forgotPassword ? (
            <Link href="/forgot-password" className={linkClass}>
              Forgot password?
            </Link>
          ) : undefined
        }
      />
      <Button type="submit" size="lg" disabled={pending} className="mt-2">
        {pending ? "Logging in…" : "Log in"}
      </Button>
      <p className="text-center text-[14px] leading-5 text-fg-2">
        New here?{" "}
        <Link href="/register" className={linkClass}>
          Create an account
        </Link>
      </p>
    </form>
  );
}

const STRENGTH_LABEL = {
  weak: "Too short or too simple",
  okay: "Okay",
  strong: "Strong",
} as const;

export function RegisterForm() {
  const [state, action, pending] = useActionState(signUp, initial);
  const [password, setPassword] = useState("");
  const strength = passwordStrength(password);

  if (state.done === "check-email") {
    return (
      <div
        className="flex flex-col items-center gap-4 text-center"
        role="status"
      >
        <span className="flex size-11 items-center justify-center rounded-btn bg-accent-soft text-accent">
          <MailCheck className="size-5" aria-hidden />
        </span>
        <p className="text-h3 text-fg">Check your email</p>
        <p className="text-[14px] leading-5 text-fg-2">
          We sent a link to{" "}
          <strong className="text-fg">{state.values?.email}</strong>. Open it to
          finish creating your account.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error ? (
        <FormMessage tone="error">{state.error}</FormMessage>
      ) : null}
      <Field
        label="Display name"
        name="displayName"
        autoComplete="nickname"
        required
        maxLength={NAME_MAX}
        defaultValue={state.values?.displayName}
        error={state.fields?.displayName}
        hint="Shown in the account menu. Up to 50 characters."
      />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        error={state.fields?.email}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN}
        maxLength={PASSWORD_MAX}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={state.fields?.password}
        hint={
          <span aria-live="polite">
            At least {PASSWORD_MIN} characters
            {password ? ` · ${STRENGTH_LABEL[strength]}` : ""}
          </span>
        }
      />
      <Button type="submit" size="lg" disabled={pending} className="mt-2">
        {pending ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-center text-[14px] leading-5 text-fg-2">
        Already have an account?{" "}
        <Link href="/login" className={linkClass}>
          Log in
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(
    requestPasswordReset,
    initial,
  );
  if (state.done === "sent") {
    return (
      <FormMessage tone="ok">
        If there&apos;s an account for {state.values?.email}, we&apos;ve sent it
        a link to choose a new password.
      </FormMessage>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error ? (
        <FormMessage tone="error">{state.error}</FormMessage>
      ) : null}
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        error={state.fields?.email}
      />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}

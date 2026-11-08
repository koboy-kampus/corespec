// Runs once when the server starts. Sets up Sentry only when a DSN is configured.
import type { Instrumentation } from "next";
import { SENTRY_DSN, sentryOptions } from "@/lib/sentry";

export async function register() {
  if (!SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.init(sentryOptions);
}

/** Reports errors thrown while rendering on the server (no-op while Sentry is off). */
export const onRequestError: Instrumentation.onRequestError = async (
  ...args
) => {
  if (!SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
};

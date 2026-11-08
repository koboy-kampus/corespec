/**
 * Error reporting with Sentry, switched on only when NEXT_PUBLIC_SENTRY_DSN is set.
 *
 * The DSN is safe in the browser (Sentry designs it to be public: it can only send
 * events, not read them), which is why it may carry the NEXT_PUBLIC_ prefix. The
 * SENTRY_AUTH_TOKEN used to upload source maps IS secret and is only read at build
 * time in next.config.ts.
 *
 * With no DSN the SDK is never even imported, so it adds nothing to the pages.
 */
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

export const sentryOptions = {
  dsn: SENTRY_DSN,
  environment:
    process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
  // Sample a tenth of page loads for performance; every error is still reported.
  tracesSampleRate: 0.1,
  // No IP addresses, cookies or request bodies (see the Privacy page).
  sendDefaultPii: false,
};

/** Report an error caught by one of our error boundaries. No-op when Sentry is off. */
export function reportError(error: unknown): void {
  if (!SENTRY_DSN) return;
  void import("@sentry/nextjs").then((Sentry) =>
    Sentry.captureException(error),
  );
}

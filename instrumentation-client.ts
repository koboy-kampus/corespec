// Runs in the browser before the app starts. Sets up Sentry only when a DSN is configured.
import { SENTRY_DSN, sentryOptions } from "@/lib/sentry";

type RouterTransition = (href: string, navigationType: string) => void;
let captureTransition: RouterTransition | undefined;

if (SENTRY_DSN) {
  void import("@sentry/nextjs").then((Sentry) => {
    Sentry.init(sentryOptions);
    captureTransition = Sentry.captureRouterTransitionStart;
  });
}

/** Lets Sentry time client-side navigations (does nothing while Sentry is off). */
export function onRouterTransitionStart(href: string, navigationType: string) {
  captureTransition?.(href, navigationType);
}

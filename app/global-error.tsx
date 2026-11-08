"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/sentry";

/**
 * Last-resort error page, used when the root layout itself fails. It replaces the
 * whole document, so it brings its own <html> and inline styles (no app CSS).
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => reportError(error), [error]);
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0f0e0e",
          color: "#c9c6c9",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <title>Something went wrong · CoreSpec</title>
        <main style={{ maxWidth: 440, padding: 24 }}>
          <p style={{ color: "#fe2e4b", letterSpacing: 2, fontSize: 12 }}>
            CORESPEC
          </p>
          <h1 style={{ color: "#fff", fontSize: 32, margin: "8px 0 12px" }}>
            Something went wrong
          </h1>
          <p style={{ lineHeight: 1.5 }}>
            The app failed to load. Your saved builds are stored in this browser
            and are safe.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: 16,
              padding: "10px 18px",
              borderRadius: 14,
              border: 0,
              background: "#fe2e4b",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}

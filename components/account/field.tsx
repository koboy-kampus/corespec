import { useId, type ComponentProps, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "cn";

/** A labelled text input with an optional hint and error, wired up for screen readers. */
export function Field({
  label,
  error,
  hint,
  className,
  ...input
}: ComponentProps<"input"> & {
  label: string;
  error?: string;
  hint?: ReactNode;
}) {
  const id = useId();
  const described = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[13px] leading-5 font-medium text-fg">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={described || undefined}
        className={cn(
          "h-10 w-full rounded-input border bg-canvas px-3 text-ui text-fg transition-colors placeholder:text-fg-3 focus-visible:outline-none",
          error
            ? "border-accent/60 focus-visible:border-accent"
            : "border-line-strong/70 hover:border-line-strong focus-visible:border-accent",
        )}
        {...input}
      />
      {hint ? (
        <div id={`${id}-hint`} className="text-[12px] leading-4 text-fg-3">
          {hint}
        </div>
      ) : null}
      {error ? (
        <p
          id={`${id}-error`}
          className="flex items-center gap-1.5 text-[12px] leading-4 text-accent"
        >
          <CircleAlert className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** The form-wide message (an error, or a success note). */
export function FormMessage({
  tone,
  children,
}: {
  tone: "error" | "ok";
  children: ReactNode;
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-input border px-3 py-2 text-[13px] leading-5",
        tone === "error"
          ? "border-accent/40 bg-accent-soft text-fg"
          : "border-ok/30 bg-ok/10 text-fg",
      )}
    >
      {children}
    </p>
  );
}

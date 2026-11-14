"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "cn";

/** Select, checkbox and checkbox-group inputs styled like components/account/field.tsx. */

const control =
  "h-10 w-full rounded-input border bg-canvas px-3 text-ui text-fg transition-colors focus-visible:outline-none";
const ok =
  "border-line-strong/70 hover:border-line-strong focus-visible:border-accent";
const bad = "border-accent/60 focus-visible:border-accent";

export function FieldError({ id, error }: { id: string; error?: string }) {
  return error ? (
    <p
      id={id}
      className="flex items-center gap-1.5 text-[12px] leading-4 text-accent"
    >
      <CircleAlert className="size-3.5 shrink-0" aria-hidden />
      {error}
    </p>
  ) : null;
}

export function SelectField({
  label,
  error,
  hint,
  options,
  className,
  ...select
}: ComponentProps<"select"> & {
  label: string;
  error?: string;
  hint?: ReactNode;
  options: { value: string; label: string }[];
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
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={described || undefined}
        className={cn(control, error ? bad : ok)}
        {...select}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint ? (
        <div id={`${id}-hint`} className="text-[12px] leading-4 text-fg-3">
          {hint}
        </div>
      ) : null}
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

export function CheckField({
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
      <label
        htmlFor={id}
        className="flex min-h-10 items-center gap-2.5 text-[13px] leading-5 font-medium text-fg"
      >
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={described || undefined}
          className="size-4 accent-accent"
          {...input}
        />
        {label}
      </label>
      {hint ? (
        <div id={`${id}-hint`} className="text-[12px] leading-4 text-fg-3">
          {hint}
        </div>
      ) : null}
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

export function CheckGroup({
  label,
  name,
  options,
  selected,
  error,
}: {
  label: string;
  name: string;
  options: readonly string[];
  selected: string[];
  error?: string;
}) {
  const id = useId();
  return (
    <fieldset
      className="flex flex-col gap-1.5"
      aria-describedby={error ? `${id}-error` : undefined}
    >
      <legend className="mb-1.5 text-[13px] leading-5 font-medium text-fg">
        {label}
      </legend>
      <div className="flex min-h-10 flex-wrap items-center gap-x-4 gap-y-2">
        {options.map((o) => (
          <label
            key={o}
            className="flex items-center gap-2 text-[13px] leading-5 text-fg-2"
          >
            <input
              type="checkbox"
              name={name}
              value={o}
              defaultChecked={selected.includes(o)}
              className="size-4 accent-accent"
            />
            {o}
          </label>
        ))}
      </div>
      <FieldError id={`${id}-error`} error={error} />
    </fieldset>
  );
}

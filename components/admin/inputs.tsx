"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
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

/**
 * One material of an item's finish (Phase 19b): a colour input and "Reset to
 * default". The colour only goes into the form ("finish.<material>") once it's
 * been picked; reset sends it empty, so the material keeps the palette's
 * colour, which the input shows meanwhile.
 */
export function FinishField({
  name,
  material,
  defaultColour,
  initial,
}: {
  name: string;
  material: string;
  /** The palette's colour for it, shown while it has none of its own. */
  defaultColour: string;
  initial: string;
}) {
  const id = useId();
  const [colour, setColour] = useState(initial);
  const own = colour !== "";
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] leading-5 font-medium text-fg">
        {material}
      </label>
      <div className="flex min-h-10 items-center gap-3">
        <input
          id={id}
          type="color"
          value={(own ? colour : defaultColour).toLowerCase()}
          onChange={(e) => setColour(e.target.value.toUpperCase())}
          aria-describedby={`${id}-state`}
          className="h-10 w-14 shrink-0 cursor-pointer rounded-input border border-line-strong/70 bg-canvas p-1"
        />
        <input type="hidden" name={name} value={colour} />
        <span
          id={`${id}-state`}
          className="min-w-0 flex-1 font-mono text-[12px] leading-4 text-fg-3"
        >
          {own ? colour.toUpperCase() : "Default"}
        </span>
        <button
          type="button"
          onClick={() => setColour("")}
          disabled={!own}
          aria-label={`Reset ${material} to default`}
          className="h-10 shrink-0 rounded-input px-2 text-[13px] leading-5 text-fg-2 underline-offset-4 hover:text-fg hover:underline disabled:cursor-default disabled:no-underline disabled:opacity-40"
        >
          Reset to default
        </button>
      </div>
    </div>
  );
}

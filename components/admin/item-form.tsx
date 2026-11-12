"use client";

import { useActionState } from "react";
import { Field, FormMessage } from "@/components/account/field";
import { Button } from "@/components/ui/button";
import { saveItem, type AdminFormState } from "@/lib/admin/catalogue-actions";
import { CATEGORY_LABEL } from "@/lib/categories";
import {
  SPEC_FIELDS,
  TIERS,
  type Field as SpecField,
} from "@/lib/catalogue/schema";
import { TIER_LABEL } from "@/lib/picker";
import type { Category } from "@/types/parts";
import { CheckField, CheckGroup, SelectField } from "./inputs";

type Values = Record<string, string | string[]>;

const one = (v: string | string[] | undefined) =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
const many = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v : v ? [v] : [];

/**
 * Add or edit an item. The spec inputs are generated from the category's fields
 * (lib/catalogue/schema.ts), the same list that checks the item on the server.
 * After a save the form starts again from the saved values (`key`); after an
 * error it keeps what was typed (`state.values`).
 */
export function ItemForm({
  mode,
  category,
  initial,
  presetLocked,
  modelIds,
}: {
  mode: "new" | "edit";
  category: Category;
  initial: Values;
  /** A preset uses this item, so it can't be taken out of the picker. */
  presetLocked: boolean;
  modelIds: string[];
}) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(
    saveItem,
    {},
  );
  // After an error, refill what was typed; otherwise the saved values.
  const v: Values = state.values ?? initial;
  const err = state.fields ?? {};
  const submitted = state.values !== undefined;
  const checked = (name: string) =>
    submitted ? one(v[name]) === "on" : one(initial[name]) === "on";

  const spec = (f: SpecField) => {
    const name = `spec.${f.key}`;
    const error = err[f.key];
    switch (f.type) {
      case "int":
      case "number":
        return (
          <Field
            key={name}
            label={f.label}
            name={name}
            type="number"
            inputMode={f.type === "int" ? "numeric" : "decimal"}
            step={f.type === "int" ? 1 : (f.step ?? "any")}
            min={f.min}
            max={f.max}
            required
            defaultValue={one(v[name])}
            error={error}
          />
        );
      case "enum":
        return (
          <SelectField
            key={name}
            label={f.label}
            name={name}
            hint={f.hint}
            defaultValue={one(v[name]) || String(f.options[0])}
            options={f.options.map((o) => ({
              value: String(o),
              label: String(o),
            }))}
            error={error}
          />
        );
      case "multi":
        return (
          <CheckGroup
            key={name}
            label={f.label}
            name={name}
            options={f.options}
            selected={many(v[name])}
            error={error}
          />
        );
      case "bool":
        return (
          <CheckField
            key={name}
            label={f.label}
            name={name}
            defaultChecked={checked(name)}
            error={error}
          />
        );
      case "text":
        return (
          <Field
            key={name}
            label={f.label}
            name={name}
            maxLength={f.max}
            required
            defaultValue={one(v[name])}
            error={error}
          />
        );
    }
  };

  return (
    <form
      // A save refreshes the page's data: start again from what's now saved.
      key={JSON.stringify(initial)}
      action={action}
      noValidate
      className="flex flex-col gap-8"
    >
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="category" value={category} />
      {mode === "edit" ? (
        <input type="hidden" name="id" value={one(initial.id)} />
      ) : null}

      <section className="flex flex-col gap-4" aria-labelledby="item-basics">
        <h2 id="item-basics" className="text-h3 text-fg">
          {CATEGORY_LABEL[category]}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {mode === "new" ? (
            <Field
              label="Id"
              name="id"
              required
              spellCheck={false}
              autoCapitalize="none"
              defaultValue={one(v.id)}
              hint={`Lower-case words joined by "-", starting with "${category}-". It can't change later: share links use it.`}
              error={err.id}
              className="sm:col-span-2"
            />
          ) : null}
          <Field
            label="Brand"
            name="brand"
            required
            maxLength={60}
            defaultValue={one(v.brand)}
            error={err.brand}
          />
          <Field
            label="Name"
            name="name"
            required
            maxLength={100}
            defaultValue={one(v.name)}
            error={err.name}
          />
          <Field
            label="Estimate (Rp)"
            name="priceIDR"
            inputMode="numeric"
            required
            defaultValue={one(v.priceIDR)}
            hint="Whole rupiah. Dots are fine: 1.650.000."
            error={err.priceIDR}
          />
          <SelectField
            label="Tier"
            name="tier"
            defaultValue={one(v.tier) || "mid"}
            options={TIERS.map((t) => ({ value: t, label: TIER_LABEL[t] }))}
            error={err.tier}
          />
          <CheckField
            label="In the picker (active)"
            name="active"
            defaultChecked={presetLocked || checked("active")}
            disabled={presetLocked}
            hint={
              presetLocked
                ? "A preset uses this item, so it stays in the picker."
                : "Untick to take it out of the builder's picker. Saved builds and share links that use it keep working."
            }
            error={err.active}
            className="sm:col-span-2"
          />
          {presetLocked ? (
            <input type="hidden" name="active" value="on" />
          ) : null}
        </div>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="item-size">
        <h2 id="item-size" className="text-h3 text-fg">
          Size and 3D
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {(["l", "w", "h"] as const).map((k) => (
            <Field
              key={k}
              label={{ l: "Length (mm)", w: "Width (mm)", h: "Height (mm)" }[k]}
              name={`dims.${k}`}
              type="number"
              inputMode="decimal"
              step="any"
              min={1}
              defaultValue={one(v[`dims.${k}`])}
            />
          ))}
        </div>
        {err.dims ? <FormMessage tone="error">{err.dims}</FormMessage> : null}
        <SelectField
          label="3D model"
          name="modelId"
          defaultValue={one(v.modelId)}
          hint="Optional: its own model from data/models.json. Otherwise the category's."
          options={[
            { value: "", label: "The category's model" },
            ...modelIds.map((m) => ({ value: m, label: m })),
          ]}
          error={err.modelId}
          className="sm:max-w-sm"
        />
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="item-specs">
        <h2 id="item-specs" className="text-h3 text-fg">
          Specs
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {SPEC_FIELDS[category].map(spec)}
        </div>
      </section>

      <div className="flex flex-col gap-3">
        {state.error ? (
          <FormMessage tone="error">{state.error}</FormMessage>
        ) : null}
        {Object.keys(err).length ? (
          <FormMessage tone="error">Some fields need fixing.</FormMessage>
        ) : null}
        {state.done === "saved" ? (
          <FormMessage tone="ok">
            Saved. The site shows it within a few seconds.
          </FormMessage>
        ) : null}
        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? "Saving…" : mode === "new" ? "Add item" : "Save item"}
        </Button>
      </div>
    </form>
  );
}

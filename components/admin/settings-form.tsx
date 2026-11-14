"use client";

import { useActionState } from "react";
import { Field, FormMessage } from "@/components/account/field";
import { Button } from "@/components/ui/button";
import {
  saveSettings,
  type AdminFormState,
} from "@/lib/admin/catalogue-actions";

export function SettingsForm({
  estimatesAsOf,
  today,
}: {
  estimatesAsOf: string;
  today: string;
}) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(
    saveSettings,
    {},
  );
  const value = state.values?.estimatesAsOf;
  return (
    <form action={action} noValidate className="flex max-w-sm flex-col gap-4">
      <Field
        label="Estimates as of"
        name="estimatesAsOf"
        type="date"
        max={today}
        required
        defaultValue={typeof value === "string" ? value : estimatesAsOf}
        hint="When the estimated prices were last looked over. Shown under the builder, on shared builds and on /prices."
        error={state.fields?.estimatesAsOf}
      />
      {state.error ? (
        <FormMessage tone="error">{state.error}</FormMessage>
      ) : null}
      {state.done ? (
        <FormMessage tone="ok">
          Saved. The site shows it within a few seconds.
        </FormMessage>
      ) : null}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

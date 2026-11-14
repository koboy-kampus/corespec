"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { setRole } from "@/lib/admin/actions";
import type { FormState } from "@/lib/auth/actions";
import type { Role } from "@/types/supabase";

const initial: FormState = {};

/** Promote to admin or back to user (the server and the database both check). */
export function RoleForm({
  userId,
  name,
  role,
}: {
  userId: string;
  name: string;
  role: Role;
}) {
  const [state, action, pending] = useActionState(setRole, initial);
  const next: Role = role === "admin" ? "user" : "admin";
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="role" value={next} />
      <Button
        type="submit"
        variant="secondary"
        size="sm"
        disabled={pending}
        aria-label={`${next === "admin" ? "Make" : "Remove"} ${name} ${next === "admin" ? "an admin" : "as admin"}`}
      >
        {pending ? "Saving…" : next === "admin" ? "Make admin" : "Remove admin"}
      </Button>
      {state.error ? (
        <p role="alert" className="text-[12px] leading-4 text-accent">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

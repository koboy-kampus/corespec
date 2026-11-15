"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { Field, FormMessage } from "@/components/account/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteItem, type AdminFormState } from "@/lib/admin/catalogue-actions";

/**
 * "Delete item" on /admin/items/[id]. When the item can't be deleted (from the
 * repo, in a preset, in saved builds) only the reason shows: deactivating it
 * in the form above is the way out. Otherwise a dialog asks for the item's id.
 */
export function ItemDelete({
  itemId,
  label,
  listings,
  blocked,
}: {
  itemId: string;
  label: string;
  listings: number;
  /** Why it can't be deleted, or null. */
  blocked: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [state, action, pending] = useActionState<AdminFormState, FormData>(
    deleteItem,
    {},
  );

  return (
    <section
      aria-labelledby="delete-item"
      className="flex flex-col gap-3 rounded-card border border-accent/30 bg-surface p-5"
    >
      <h2 id="delete-item" className="text-h3 text-fg">
        Delete item
      </h2>
      {blocked ? (
        <p
          data-testid="delete-blocked"
          className="text-[14px] leading-5 text-fg-2"
        >
          {blocked}
        </p>
      ) : (
        <>
          <p className="text-[14px] leading-5 text-fg-2">
            Removes the item and its listings for good. Share links that include
            it still open, without it. The audit log keeps a copy.
          </p>
          <Button
            variant="danger"
            className="self-start"
            icon={<Trash2 />}
            onClick={() => setOpen(true)}
          >
            Delete…
          </Button>
        </>
      )}

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setTyped("");
        }}
      >
        <DialogContent>
          <form action={action} className="flex flex-col gap-4" noValidate>
            <input type="hidden" name="itemId" value={itemId} />
            <DialogHeader>
              <DialogTitle>Delete {label}?</DialogTitle>
              <DialogDescription>
                The item
                {listings
                  ? ` and its ${listings === 1 ? "listing" : `${listings} listings`}`
                  : ""}{" "}
                {listings ? "are" : "is"} deleted for good. Share links that
                include it open without it. This can&apos;t be undone.
              </DialogDescription>
            </DialogHeader>
            <Field
              label={`Type "${itemId}" to confirm`}
              name="confirmId"
              autoComplete="off"
              spellCheck={false}
              required
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              error={state.fields?.confirmId}
            />
            {state.error ? (
              <FormMessage tone="error">{state.error}</FormMessage>
            ) : null}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                variant="danger"
                icon={<Trash2 />}
                disabled={pending || typed.trim() !== itemId}
              >
                {pending ? "Deleting…" : "Delete item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

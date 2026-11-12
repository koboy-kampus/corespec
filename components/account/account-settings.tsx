"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CloudUpload, LogOut, Trash2 } from "lucide-react";
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
import { useBuildHydration } from "@/hooks/use-build";
import {
  changePassword,
  deleteAccount,
  updateDisplayName,
  type FormState,
} from "@/lib/auth/actions";
import { guestBuilds } from "@/lib/account/merge";
import { NAME_MAX, PASSWORD_MAX, PASSWORD_MIN } from "@/lib/auth/validate";
import { useAccountStore } from "@/store/account";
import { isBlank, useBuildStore } from "@/store/build";
import { logOutHere } from "./account-menu";
import { announceAuthChange } from "./use-auth-hint";
import { Field, FormMessage } from "./field";

const initial: FormState = {};

export function DisplayNameForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState(updateDisplayName, initial);
  const setName = useAccountStore((s) => s.set);
  const role = useAccountStore((s) => s.role);
  useEffect(() => {
    if (state.done === "saved" && state.values?.displayName)
      setName(state.values.displayName, role ?? "user");
  }, [state, setName, role]);

  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <Field
        label="Display name"
        name="displayName"
        autoComplete="nickname"
        required
        maxLength={NAME_MAX}
        defaultValue={state.values?.displayName ?? current}
        error={state.fields?.displayName}
      />
      {state.error ? (
        <FormMessage tone="error">{state.error}</FormMessage>
      ) : null}
      {state.done === "saved" ? (
        <FormMessage tone="ok">Saved.</FormMessage>
      ) : null}
      <Button
        type="submit"
        variant="secondary"
        disabled={pending}
        className="w-fit"
      >
        {pending ? "Saving…" : "Save name"}
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, initial);
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN}
        maxLength={PASSWORD_MAX}
        error={state.fields?.password}
        hint={`At least ${PASSWORD_MIN} characters.`}
      />
      {state.error ? (
        <FormMessage tone="error">{state.error}</FormMessage>
      ) : null}
      {state.done === "saved" ? (
        <FormMessage tone="ok">Password changed.</FormMessage>
      ) : null}
      <Button
        type="submit"
        variant="secondary"
        disabled={pending}
        className="w-fit"
      >
        {pending ? "Saving…" : "Change password"}
      </Button>
    </form>
  );
}

/** How many builds are in the account and in this browser only, with "Import". */
export function AccountBuilds() {
  const hydrated = useBuildHydration();
  const build = useBuildStore((s) => s.build);
  const saved = useBuildStore((s) => s.saved);
  const account = useBuildStore((s) => s.account);
  const importGuestBuilds = useBuildStore((s) => s.importGuestBuilds);
  const [imported, setImported] = useState<number | null>(null);

  const { inAccount, guests } = useMemo(() => {
    const all = [build, ...saved].filter((b) => !isBlank(b));
    return {
      inAccount: all.filter((b) => account && b.owner === account).length,
      guests: guestBuilds({ build, saved }, isBlank).length,
    };
  }, [build, saved, account]);

  if (!hydrated)
    return (
      <div
        className="h-24 animate-pulse rounded-input bg-surface-2"
        aria-busy="true"
      />
    );

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-input border border-line bg-canvas p-3">
          <dt className="label-micro text-fg-3">In your account</dt>
          <dd className="mt-1 spec text-[22px] leading-7 text-fg">
            {account ? inAccount : "…"}
          </dd>
        </div>
        <div className="rounded-input border border-line bg-canvas p-3">
          <dt className="label-micro text-fg-3">This browser only</dt>
          <dd className="mt-1 spec text-[22px] leading-7 text-fg">{guests}</dd>
        </div>
      </dl>
      {imported !== null ? (
        <FormMessage tone="ok">
          Imported {imported === 1 ? "1 build" : `${imported} builds`}. They
          sync to your account now.
        </FormMessage>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {guests > 0 && account ? (
          <Button
            variant="secondary"
            icon={<CloudUpload />}
            onClick={() => setImported(importGuestBuilds())}
          >
            Import {guests === 1 ? "1 build" : `${guests} builds`} from this
            browser
          </Button>
        ) : null}
        <Button asChild variant="secondary">
          <Link href="/builds">Open My builds</Link>
        </Button>
      </div>
    </div>
  );
}

export function LogOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="secondary"
      icon={<LogOut />}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await logOutHere();
          router.push("/");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Logging out…" : "Log out"}
    </Button>
  );
}

export function DeleteAccount() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteAccount, initial);

  useEffect(() => {
    if (state.done !== "deleted") return;
    useBuildStore.getState().forgetAccount();
    useAccountStore.getState().clear();
    announceAuthChange();
    router.push("/");
  }, [state, router]);

  return (
    <>
      <Button
        variant="secondary"
        icon={<Trash2 />}
        onClick={() => setOpen(true)}
      >
        Delete account
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form action={action} className="flex flex-col gap-4" noValidate>
            <DialogHeader>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription>
                Your account and every build in it are deleted for good, on all
                devices. Builds only saved in this browser stay here. Share
                links you sent keep working, because they hold their own copy.
              </DialogDescription>
            </DialogHeader>
            <Field
              label='Type "delete" to confirm'
              name="confirm"
              autoComplete="off"
              required
              error={state.fields?.confirm}
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
              <Button type="submit" icon={<Trash2 />} disabled={pending}>
                {pending ? "Deleting…" : "Delete account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

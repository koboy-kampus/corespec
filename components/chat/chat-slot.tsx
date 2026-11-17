"use client";

import dynamic from "next/dynamic";
import { useAuthHint } from "@/components/account/use-auth-hint";

/**
 * Where the chat button goes (Phase 18b). This is all the layout ships: the
 * button's own code (and everything behind it) loads only in a browser whose
 * login cookie says it's logged in, so guests' pages don't grow.
 */
const ChatLauncher = dynamic(
  () => import("./chat-launcher").then((m) => m.ChatLauncher),
  { ssr: false },
);

export function ChatSlot() {
  return useAuthHint() ? <ChatLauncher /> : null;
}

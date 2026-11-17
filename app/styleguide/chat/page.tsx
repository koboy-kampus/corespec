import type { Metadata } from "next";
import { ChatSamples } from "@/components/chat/chat-samples";

export const metadata: Metadata = {
  title: "Chat pieces",
  robots: { index: false },
};

/**
 * Internal: the live chat's panel and admin inbox (Phase 18b) with sample
 * messages in every state, so the e2e suite can run axe and a phone-width
 * check on them without a login (the real ones need one).
 */
export default function Page() {
  return (
    <div className="container-page flex flex-col gap-6 py-10">
      <h1 className="text-h2 text-fg">Chat pieces</h1>
      <ChatSamples />
    </div>
  );
}

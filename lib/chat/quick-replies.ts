/**
 * The chat's quick-reply chips (Phase 18). Each one sends a canned question
 * that hits a bot rule (lib/chat/bot.ts tests that). In its own module so the
 * panel doesn't ship the bot's rules to the browser.
 */
export const QUICK_REPLIES = [
  "Are the prices real?",
  "Why is my build incompatible?",
  "How does checkout work?",
  "Download receipt",
  "Talk to admin",
] as const;

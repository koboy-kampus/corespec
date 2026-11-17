import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  asMessage,
  lastAt,
  mergeMessages,
  POLL_MS,
  startLive,
  SUBSCRIBE_TIMEOUT_MS,
  type ChannelState,
  type Connect,
  type LiveStatus,
} from "./live";

/** A fake Realtime connection the test drives by hand. */
function fakeConnect(opts: { fail?: boolean } = {}) {
  let state: ((s: ChannelState) => void) | null = null;
  let message: ((p: unknown) => void) | null = null;
  const left = vi.fn();
  const connect: Connect = async (_topic, handlers) => {
    if (opts.fail) throw new Error("no realtime");
    state = handlers.onState;
    message = handlers.onMessage;
    return left;
  };
  return {
    connect,
    left,
    state: (s: ChannelState) => state!(s),
    message: (p: unknown) => message!(p),
  };
}

function run(connect: Connect) {
  const statuses: LiveStatus[] = [];
  const messages: unknown[] = [];
  const poll = vi.fn();
  const stop = startLive(
    {
      topic: "chat:x",
      onMessage: (p) => messages.push(p),
      onStatus: (s) => statuses.push(s),
      poll,
    },
    connect,
  );
  return { statuses, messages, poll, stop };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("startLive", () => {
  it("goes live when the channel subscribes, and doesn't poll", async () => {
    const rt = fakeConnect();
    const s = run(rt.connect);
    await vi.advanceTimersByTimeAsync(0);
    rt.state("SUBSCRIBED");
    await vi.advanceTimersByTimeAsync(60_000);
    expect(s.statuses).toEqual(["connecting", "live"]);
    expect(s.poll).not.toHaveBeenCalled();
    rt.message({ id: "1" });
    expect(s.messages).toEqual([{ id: "1" }]);
  });

  it("polls every 5 s when the channel isn't subscribed within 10 s", async () => {
    const rt = fakeConnect();
    const s = run(rt.connect);
    await vi.advanceTimersByTimeAsync(SUBSCRIBE_TIMEOUT_MS - 1);
    expect(s.poll).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(s.statuses).toEqual(["connecting", "reconnecting"]);
    expect(s.poll).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(POLL_MS * 3);
    expect(s.poll).toHaveBeenCalledTimes(4);
  });

  it("stops polling once Realtime is back, after one catch-up poll", async () => {
    const rt = fakeConnect();
    const s = run(rt.connect);
    await vi.advanceTimersByTimeAsync(SUBSCRIBE_TIMEOUT_MS + POLL_MS);
    expect(s.poll).toHaveBeenCalledTimes(2);
    rt.state("SUBSCRIBED");
    await vi.advanceTimersByTimeAsync(0);
    expect(s.poll).toHaveBeenCalledTimes(3); // the catch-up
    await vi.advanceTimersByTimeAsync(POLL_MS * 4);
    expect(s.poll).toHaveBeenCalledTimes(3);
    expect(s.statuses.at(-1)).toBe("live");
  });

  it("starts polling at once when a live channel drops", async () => {
    const rt = fakeConnect();
    const s = run(rt.connect);
    await vi.advanceTimersByTimeAsync(0);
    rt.state("SUBSCRIBED");
    rt.state("CHANNEL_ERROR");
    expect(s.statuses).toEqual(["connecting", "live", "reconnecting"]);
    await vi.advanceTimersByTimeAsync(0);
    expect(s.poll).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(s.poll).toHaveBeenCalledTimes(2);
    for (const st of ["TIMED_OUT", "CLOSED"] as const) rt.state(st);
    // Still one polling loop, not three.
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(s.poll).toHaveBeenCalledTimes(3);
  });

  it("polls when Realtime can't even load", async () => {
    const s = run(fakeConnect({ fail: true }).connect);
    await vi.advanceTimersByTimeAsync(0);
    expect(s.statuses).toEqual(["connecting", "reconnecting"]);
    expect(s.poll).toHaveBeenCalledTimes(1);
  });

  it("doesn't start a second poll while one is still running", async () => {
    const rt = fakeConnect();
    const statuses: LiveStatus[] = [];
    let calls = 0;
    const stop = startLive(
      {
        topic: "chat:x",
        onMessage: () => {},
        onStatus: (st) => statuses.push(st),
        poll: () => {
          calls++;
          return new Promise(() => {}); // never settles (a slow network)
        },
      },
      rt.connect,
    );
    await vi.advanceTimersByTimeAsync(SUBSCRIBE_TIMEOUT_MS + POLL_MS * 5);
    expect(calls).toBe(1);
    stop();
  });

  it("stop leaves the channel and ends polling", async () => {
    const rt = fakeConnect();
    const s = run(rt.connect);
    await vi.advanceTimersByTimeAsync(SUBSCRIBE_TIMEOUT_MS);
    s.stop();
    expect(rt.left).toHaveBeenCalled();
    const before = s.poll.mock.calls.length;
    await vi.advanceTimersByTimeAsync(POLL_MS * 3);
    expect(s.poll).toHaveBeenCalledTimes(before);
    rt.message({ id: "late" });
    expect(s.messages).toEqual([]);
  });
});

describe("mergeMessages, asMessage, lastAt", () => {
  const m = (id: string, t: string) => ({
    id,
    created_at: `2026-11-18T10:00:${t}Z`,
  });

  it("keeps messages unique and in time order", () => {
    const a = [m("1", "01"), m("3", "03")];
    const merged = mergeMessages(a, [m("2", "02"), m("3", "03")]);
    expect(merged.map((x) => x.id)).toEqual(["1", "2", "3"]);
    expect(mergeMessages(merged, [m("2", "02")])).toBe(merged);
    expect(mergeMessages(merged, [])).toBe(merged);
  });

  it("accepts only rows shaped like a chat message", () => {
    const row = {
      id: "1",
      conversation_id: "c",
      sender_role: "bot",
      sender_id: null,
      body: "Hi",
      bot_rule: "greeting",
      created_at: "2026-11-18T10:00:00Z",
    };
    expect(asMessage(row)).toEqual(row);
    expect(asMessage({ ...row, sender_role: "system" })).toBeNull();
    expect(asMessage({ ...row, body: 1 })).toBeNull();
    expect(asMessage(null)).toBeNull();
    expect(asMessage("hi")).toBeNull();
  });

  it("finds the latest time", () => {
    expect(lastAt([])).toBeNull();
    expect(lastAt([m("1", "05"), m("2", "02")])).toBe("2026-11-18T10:00:05Z");
  });
});

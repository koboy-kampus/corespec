import { describe, expect, it } from "vitest";
import {
  dropPending,
  newPending,
  setPendingState,
  settlePending,
  withPending,
} from "./pending";

describe("optimistic sending", () => {
  it("starts as sending, with a local id that isn't a database id", () => {
    const a = newPending("halo", 1000);
    const b = newPending("halo", 1000);
    expect(a).toMatchObject({ body: "halo", state: "sending" });
    expect(a.id).toMatch(/^pending-/);
    expect(a.id).not.toBe(b.id);
  });

  it("marks a failed send and retries it", () => {
    const a = newPending("harga?");
    const failed = setPendingState([a], a.id, "failed");
    expect(failed[0].state).toBe("failed");
    expect(setPendingState(failed, a.id, "sending")[0].state).toBe("sending");
    expect(dropPending(failed, a.id)).toEqual([]);
  });

  it("drops a sending message once its saved row arrives (e.g. over Realtime first)", () => {
    const a = newPending("harga?");
    const b = newPending("harga?");
    const list = [a, b];
    const after = settlePending(list, [
      { sender_role: "user", body: "harga?" },
      { sender_role: "bot", body: "harga?" },
    ]);
    expect(after).toEqual([b]); // one saved row settles one pending message
    expect(settlePending(list, [])).toBe(list);
  });

  it("keeps failed messages until they're retried", () => {
    const a = { ...newPending("x"), state: "failed" as const };
    expect(settlePending([a], [{ sender_role: "user", body: "x" }])).toEqual([
      a,
    ]);
  });

  it("lists pending messages after the saved ones, as the user's", () => {
    const p = newPending("hi");
    const rows = withPending([{ id: "1" }], [p]);
    expect(rows.map((r) => r.id)).toEqual(["1", p.id]);
    expect(rows[1]).toMatchObject({ sender_role: "user", state: "sending" });
  });
});

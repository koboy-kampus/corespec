import type { AuditAction } from "@/types/supabase";

/**
 * How one audit_log row reads in the admin overview's "Recent changes".
 * Trigger rows (insert/update/delete) say what happened to which row;
 * verify_order's rows (Phase 20a) say who verified which order. Anything the
 * site doesn't know yet still shows, with its raw action, rather than breaking.
 */

export interface AuditEntry {
  action: AuditAction | string;
  table_name: string;
  row_id: string;
  diff: Record<string, unknown>;
}

export interface AuditLabel {
  /** The badge: "Item", "Order", … */
  kind: string;
  /** "Changed", "Verified order", … */
  verb: string;
  /** The row, in a monospace font: an item id, an order number. */
  row: string;
  /** Extra detail after it: the changed fields, or "by Admin Rei". */
  detail: string | null;
}

const ACTION_LABEL: Record<string, string> = {
  insert: "Added",
  update: "Changed",
  delete: "Deleted",
  "order.verify": "Verified order",
};

const TABLE_LABEL: Record<string, string> = {
  items: "Item",
  listings: "Listing",
  site_settings: "Setting",
  profiles: "Role",
  orders: "Order",
};

export function auditLabel(e: AuditEntry): AuditLabel {
  const diff = e.diff && typeof e.diff === "object" ? e.diff : {};
  let detail: string | null = null;
  if (e.action === "update") {
    const keys = Object.keys(diff);
    detail = keys.length ? keys.join(", ") : null;
  } else if (e.action === "order.verify") {
    const who = diff.verified_by_name;
    detail = `by ${typeof who === "string" && who ? who : "an admin"}`;
  }
  return {
    kind: TABLE_LABEL[e.table_name] ?? e.table_name,
    verb: ACTION_LABEL[e.action] ?? e.action,
    row: e.row_id,
    detail,
  };
}

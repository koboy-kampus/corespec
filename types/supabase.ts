/**
 * The database as the website sees it (supabase/migrations/). Written by hand to
 * match the migrations; the shape follows what `supabase gen types typescript`
 * produces, so it can be replaced by the generated file later.
 */

export type Role = "user" | "admin";

export type OrderStatus =
  "pending" | "paid" | "failed" | "expired" | "cancelled";

/** One line of an order's price snapshot (orders.items). */
export type OrderItem = {
  id: string;
  category: string;
  brand: string;
  name: string;
  priceIDR: number;
  priceKind: "checked" | "estimate";
};

export type OrderRow = {
  id: string;
  order_no: string;
  owner: string;
  build_name: string;
  parts: Record<string, string>;
  items: OrderItem[];
  pc_idr: number;
  setup_idr: number;
  total_idr: number;
  status: OrderStatus;
  payment_type: string | null;
  midtrans_transaction_id: string | null;
  snap_token: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
};

export type ConversationStatus = "open" | "closed";
export type ChatSenderRole = "user" | "admin" | "bot";

export type ConversationRow = {
  id: string;
  owner: string;
  status: ConversationStatus;
  last_message_at: string | null;
  user_last_read_at: string | null;
  admin_last_read_at: string | null;
  created_at: string;
};

export type ChatMessageRow = {
  id: string;
  conversation_id: string;
  sender_role: ChatSenderRole;
  /** The user or admin who wrote it; null for the bot. */
  sender_id: string | null;
  body: string;
  /** Which bot rule answered (lib/chat/bot.ts); bot messages only. */
  bot_rule: string | null;
  created_at: string;
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          role: Role;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: { display_name?: string };
        Relationships: [];
      };
      builds: {
        Row: {
          owner: string;
          id: string;
          name: string;
          parts: Record<string, string>;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          owner?: string;
          id: string;
          name: string;
          parts?: Record<string, string>;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          name?: string;
          parts?: Record<string, string>;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      items: {
        Row: {
          id: string;
          category: string;
          brand: string;
          name: string;
          tier: string;
          price_idr: number;
          dims: { l: number; w: number; h: number } | null;
          specs: Record<string, unknown>;
          model_id: string | null;
          active: boolean;
          position: number;
          created_at: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id: string;
          category: string;
          brand: string;
          name: string;
          tier: string;
          price_idr: number;
          dims?: { l: number; w: number; h: number } | null;
          specs?: Record<string, unknown>;
          model_id?: string | null;
          active?: boolean;
          position?: number;
        };
        Update: {
          brand?: string;
          name?: string;
          tier?: string;
          price_idr?: number;
          dims?: { l: number; w: number; h: number } | null;
          specs?: Record<string, unknown>;
          model_id?: string | null;
          active?: boolean;
          position?: number;
        };
        Relationships: [];
      };
      listings: {
        Row: {
          id: string;
          item_id: string;
          marketplace: string;
          url: string;
          price_idr: number;
          checked_at: string;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          item_id: string;
          marketplace: string;
          url: string;
          price_idr: number;
          checked_at: string;
        };
        Update: {
          marketplace?: string;
          url?: string;
          price_idr?: number;
          checked_at?: string;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          key: string;
          value: unknown;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: { key: string; value: unknown };
        Update: { value?: unknown };
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: number;
          at: string;
          actor: string | null;
          action: "insert" | "update" | "delete";
          table_name: string;
          row_id: string;
          diff: Record<string, unknown>;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      orders: {
        Row: OrderRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      conversations: {
        Row: ConversationRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      chat_messages: {
        Row: ChatMessageRow;
        /** Users post as "user", admins as "admin"; id and created_at are set by the database. */
        Insert: {
          conversation_id: string;
          sender_role: "user" | "admin";
          sender_id: string;
          body: string;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      set_role: {
        Args: { target: string; new_role: Role };
        Returns: undefined;
      };
      delete_my_account: { Args: Record<string, never>; Returns: undefined };
      item_usage_count: { Args: { p_item_id: string }; Returns: number };
      admin_stats: {
        Args: Record<string, never>;
        Returns: {
          user_count: number;
          admin_count: number;
          build_count: number;
          users_with_builds: number;
          new_users_7d: number;
        }[];
      };
      admin_list_users: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          display_name: string;
          email: string;
          role: Role;
          created_at: string;
          build_count: number;
        }[];
      };
      create_order: {
        Args: {
          p_secret: string;
          p_owner: string;
          p_order_no: string;
          p_build_name: string;
          p_parts: Record<string, string>;
          p_items: OrderItem[];
          p_pc_idr: number;
          p_setup_idr: number;
          p_total_idr: number;
        };
        Returns: OrderRow;
      };
      set_order_payment: {
        Args: {
          p_secret: string;
          p_order_no: string;
          p_status: OrderStatus | null;
          p_payment_type: string | null;
          p_transaction_id: string | null;
          p_snap_token: string | null;
        };
        Returns: OrderRow[];
      };
      get_or_create_conversation: {
        Args: Record<string, never>;
        Returns: ConversationRow;
      };
      mark_chat_read: {
        Args: { p_conversation_id: string };
        Returns: undefined;
      };
      set_conversation_status: {
        Args: { p_conversation_id: string; p_status: ConversationStatus };
        Returns: ConversationRow;
      };
      post_bot_reply: {
        Args: {
          p_secret: string;
          p_conversation_id: string;
          p_body: string;
          p_bot_rule: string;
        };
        Returns: ChatMessageRow;
      };
      can_join_chat_topic: { Args: { p_topic: string }; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

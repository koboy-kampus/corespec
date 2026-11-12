/**
 * The database as the website sees it (supabase/migrations/). Written by hand to
 * match the migrations; the shape follows what `supabase gen types typescript`
 * produces, so it can be replaced by the generated file later.
 */

export type Role = "user" | "admin";

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
    };
    Views: { [_ in never]: never };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      set_role: {
        Args: { target: string; new_role: Role };
        Returns: undefined;
      };
      delete_my_account: { Args: Record<string, never>; Returns: undefined };
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
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

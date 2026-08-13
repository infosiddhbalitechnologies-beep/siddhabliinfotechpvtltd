export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      chat_messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          role: string;
          session_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          role: string;
          session_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          role?: string;
          session_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "chat_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_sessions: {
        Row: {
          created_at: string;
          guest_token: string | null;
          id: string;
          stage: string;
          ticket_draft: Json;
          title: string | null;
          updated_at: string;
          user_id: string | null;
          visitor_contact: string | null;
          visitor_name: string | null;
        };
        Insert: {
          created_at?: string;
          guest_token?: string | null;
          id?: string;
          stage?: string;
          ticket_draft?: Json;
          title?: string | null;
          updated_at?: string;
          user_id?: string | null;
          visitor_contact?: string | null;
          visitor_name?: string | null;
        };
        Update: {
          created_at?: string;
          guest_token?: string | null;
          id?: string;
          stage?: string;
          ticket_draft?: Json;
          title?: string | null;
          updated_at?: string;
          user_id?: string | null;
          visitor_contact?: string | null;
          visitor_name?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          full_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ticket_comments: {
        Row: {
          author_id: string | null;
          author_name: string;
          body: string;
          created_at: string;
          id: string;
          is_admin: boolean;
          is_internal: boolean;
          ticket_id: string;
        };
        Insert: {
          author_id?: string | null;
          author_name: string;
          body: string;
          created_at?: string;
          id?: string;
          is_admin?: boolean;
          is_internal?: boolean;
          ticket_id: string;
        };
        Update: {
          author_id?: string | null;
          author_name?: string;
          body?: string;
          created_at?: string;
          id?: string;
          is_admin?: boolean;
          is_internal?: boolean;
          ticket_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets";
            referencedColumns: ["id"];
          },
        ];
      };
      ticket_status_history: {
        Row: {
          changed_by: string | null;
          changed_by_name: string | null;
          created_at: string;
          from_assigned: string | null;
          from_status: Database["public"]["Enums"]["ticket_status"] | null;
          id: string;
          note: string | null;
          ticket_id: string;
          to_assigned: string | null;
          to_status: Database["public"]["Enums"]["ticket_status"] | null;
        };
        Insert: {
          changed_by?: string | null;
          changed_by_name?: string | null;
          created_at?: string;
          from_assigned?: string | null;
          from_status?: Database["public"]["Enums"]["ticket_status"] | null;
          id?: string;
          note?: string | null;
          ticket_id: string;
          to_assigned?: string | null;
          to_status?: Database["public"]["Enums"]["ticket_status"] | null;
        };
        Update: {
          changed_by?: string | null;
          changed_by_name?: string | null;
          created_at?: string;
          from_assigned?: string | null;
          from_status?: Database["public"]["Enums"]["ticket_status"] | null;
          id?: string;
          note?: string | null;
          ticket_id?: string;
          to_assigned?: string | null;
          to_status?: Database["public"]["Enums"]["ticket_status"] | null;
        };
        Relationships: [
          {
            foreignKeyName: "ticket_status_history_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets";
            referencedColumns: ["id"];
          },
        ];
      };
      tickets: {
        Row: {
          assigned_to: string | null;
          category: string | null;
          company: string | null;
          contact_email: string;
          contact_name: string;
          contact_phone: string | null;
          created_at: string;
          details: Json;
          id: string;
          industry: string | null;
          message: string;
          priority: Database["public"]["Enums"]["ticket_priority"];
          resolved_at: string | null;
          status: Database["public"]["Enums"]["ticket_status"];
          subject: string;
          submitted_by: string | null;
          ticket_number: string;
          type: Database["public"]["Enums"]["ticket_type"];
          updated_at: string;
        };
        Insert: {
          assigned_to?: string | null;
          category?: string | null;
          company?: string | null;
          contact_email: string;
          contact_name: string;
          contact_phone?: string | null;
          created_at?: string;
          details?: Json;
          id?: string;
          industry?: string | null;
          message: string;
          priority?: Database["public"]["Enums"]["ticket_priority"];
          resolved_at?: string | null;
          status?: Database["public"]["Enums"]["ticket_status"];
          subject: string;
          submitted_by?: string | null;
          ticket_number: string;
          type: Database["public"]["Enums"]["ticket_type"];
          updated_at?: string;
        };
        Update: {
          assigned_to?: string | null;
          category?: string | null;
          company?: string | null;
          contact_email?: string;
          contact_name?: string;
          contact_phone?: string | null;
          created_at?: string;
          details?: Json;
          id?: string;
          industry?: string | null;
          message?: string;
          priority?: Database["public"]["Enums"]["ticket_priority"];
          resolved_at?: string | null;
          status?: Database["public"]["Enums"]["ticket_status"];
          subject?: string;
          submitted_by?: string | null;
          ticket_number?: string;
          type?: Database["public"]["Enums"]["ticket_type"];
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "user" | "admin";
      ticket_priority: "low" | "normal" | "high" | "urgent";
      ticket_status:
        "open" | "in_progress" | "waiting_on_user" | "resolved" | "closed";
      ticket_type: "contact" | "career" | "enquiry" | "it_support";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "admin"],
      ticket_priority: ["low", "normal", "high", "urgent"],
      ticket_status: [
        "open",
        "in_progress",
        "waiting_on_user",
        "resolved",
        "closed",
      ],
      ticket_type: ["contact", "career", "enquiry", "it_support"],
    },
  },
} as const;

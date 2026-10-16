export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      content_reviews: {
        Row: {
          clarity_score: number | null
          created_at: string
          created_by: string
          criteria: string
          id: string
          pages: Json
          result: Json
          suitability_score: number | null
          updated_at: string
          utility_score: number | null
        }
        Insert: {
          clarity_score?: number | null
          created_at?: string
          created_by: string
          criteria: string
          id?: string
          pages?: Json
          result?: Json
          suitability_score?: number | null
          updated_at?: string
          utility_score?: number | null
        }
        Update: {
          clarity_score?: number | null
          created_at?: string
          created_by?: string
          criteria?: string
          id?: string
          pages?: Json
          result?: Json
          suitability_score?: number | null
          updated_at?: string
          utility_score?: number | null
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee: string
          created_at: string
          id: string
          requester: string
          responded_at: string | null
          status: string
        }
        Insert: {
          addressee: string
          created_at?: string
          id?: string
          requester: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          addressee?: string
          created_at?: string
          id?: string
          requester?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: []
      }
      league_wins: {
        Row: {
          created_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      professional_clients: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          invite_email: string
          notes: string | null
          professional_id: string
          status: Database["public"]["Enums"]["client_link_status"]
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          invite_email: string
          notes?: string | null
          professional_id: string
          status?: Database["public"]["Enums"]["client_link_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          invite_email?: string
          notes?: string | null
          professional_id?: string
          status?: Database["public"]["Enums"]["client_link_status"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          goal: string | null
          id: string
          invite_code: string | null
          preferences: Json
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          goal?: string | null
          id: string
          invite_code?: string | null
          preferences?: Json
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          goal?: string | null
          id?: string
          invite_code?: string | null
          preferences?: Json
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      progress_entries: {
        Row: {
          created_at: string
          entry_date: string
          id: string
          kind: string
          label: string
          notes: string | null
          unit: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          entry_date?: string
          id?: string
          kind: string
          label: string
          notes?: string | null
          unit: string
          updated_at?: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          entry_date?: string
          id?: string
          kind?: string
          label?: string
          notes?: string | null
          unit?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      public_events: {
        Row: {
          ad_slot: string | null
          created_at: string
          event_type: string
          id: number
          page_path: string
        }
        Insert: {
          ad_slot?: string | null
          created_at?: string
          event_type: string
          id?: never
          page_path: string
        }
        Update: {
          ad_slot?: string | null
          created_at?: string
          event_type?: string
          id?: never
          page_path?: string
        }
        Relationships: []
      }
      push_cron_token: {
        Row: {
          id: number
          token: string
        }
        Insert: {
          id?: number
          token?: string
        }
        Update: {
          id?: number
          token?: string
        }
        Relationships: []
      }
      push_sent: {
        Row: {
          reminder_key: string
          sent_at: string
          user_id: string
        }
        Insert: {
          reminder_key: string
          sent_at?: string
          user_id: string
        }
        Update: {
          reminder_key?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          timezone: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          timezone?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          timezone?: string
          user_id?: string
        }
        Relationships: []
      }
      streak_freezes: {
        Row: {
          created_at: string
          day: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          user_id?: string
        }
        Relationships: []
      }
      user_data: {
        Row: {
          created_at: string
          meals: Json
          plan: Json
          settings: Json
          shopping_state: Json
          updated_at: string
          user_id: string
          workouts: Json
        }
        Insert: {
          created_at?: string
          meals?: Json
          plan?: Json
          settings?: Json
          shopping_state?: Json
          updated_at?: string
          user_id: string
          workouts?: Json
        }
        Update: {
          created_at?: string
          meals?: Json
          plan?: Json
          settings?: Json
          shopping_state?: Json
          updated_at?: string
          user_id?: string
          workouts?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      xp_events: {
        Row: {
          created_at: string
          day: string
          id: string
          kind: string
          photo_path: string | null
          points: number
          ref: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          id?: string
          kind: string
          photo_path?: string | null
          points: number
          ref: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          kind?: string
          photo_path?: string | null
          points?: number
          ref?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_league_awards: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      league_week: {
        Args: { _start: string }
        Returns: {
          avatar_url: string
          comeback: boolean
          display_name: string
          first_mark_sec: number
          habit_days: number
          habits: number
          meals: number
          streak: number
          today_xp: number
          total_xp: number
          user_id: string
          username: string
          week_xp: number
          workouts: number
        }[]
      }
      my_friend_requests: {
        Args: never
        Returns: {
          avatar_url: string
          created_at: string
          display_name: string
          id: string
          requester: string
          username: string
        }[]
      }
      search_profiles: {
        Args: { _q: string }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
          username: string
        }[]
      }
    }
    Enums: {
      app_role: "user" | "professional" | "admin"
      client_link_status: "pending" | "active" | "declined" | "ended"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "professional", "admin"],
      client_link_status: ["pending", "active", "declined", "ended"],
    },
  },
} as const

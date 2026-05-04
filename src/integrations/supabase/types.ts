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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      import_batches: {
        Row: {
          created_at: string
          error_log: Json | null
          failed_rows: number
          file_name: string
          id: string
          imported_rows: number
          status: string
          total_rows: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_log?: Json | null
          failed_rows?: number
          file_name: string
          id?: string
          imported_rows?: number
          status?: string
          total_rows?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_log?: Json | null
          failed_rows?: number
          file_name?: string
          id?: string
          imported_rows?: number
          status?: string
          total_rows?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          bias: string | null
          confidence_level: number | null
          created_at: string
          energy_level: number | null
          entry_date: string
          id: string
          lesson: string | null
          mistakes: string | null
          mood: string | null
          notes: string | null
          rule_adherence: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bias?: string | null
          confidence_level?: number | null
          created_at?: string
          energy_level?: number | null
          entry_date?: string
          id?: string
          lesson?: string | null
          mistakes?: string | null
          mood?: string | null
          notes?: string | null
          rule_adherence?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bias?: string | null
          confidence_level?: number | null
          created_at?: string
          energy_level?: number | null
          entry_date?: string
          id?: string
          lesson?: string | null
          mistakes?: string | null
          mood?: string | null
          notes?: string | null
          rule_adherence?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      playbooks: {
        Row: {
          best_market_conditions: string | null
          checklist: string | null
          created_at: string
          description: string | null
          entry_rules: string | null
          exit_rules: string | null
          id: string
          risk_rules: string | null
          rules: string | null
          rules_array: string[]
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          best_market_conditions?: string | null
          checklist?: string | null
          created_at?: string
          description?: string | null
          entry_rules?: string | null
          exit_rules?: string | null
          id?: string
          risk_rules?: string | null
          rules?: string | null
          rules_array?: string[]
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          best_market_conditions?: string | null
          checklist?: string | null
          created_at?: string
          description?: string | null
          entry_rules?: string | null
          exit_rules?: string | null
          id?: string
          risk_rules?: string | null
          rules?: string | null
          rules_array?: string[]
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          default_account_type: string
          display_name: string | null
          email: string | null
          full_name: string | null
          id: string
          preferred_market: string | null
          risk_per_trade: number | null
          subscription_plan: string
          timezone: string
          trading_style: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          default_account_type?: string
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          preferred_market?: string | null
          risk_per_trade?: number | null
          subscription_plan?: string
          timezone?: string
          trading_style?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          default_account_type?: string
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          preferred_market?: string | null
          risk_per_trade?: number | null
          subscription_plan?: string
          timezone?: string
          trading_style?: string
          updated_at?: string
        }
        Relationships: []
      }
      replay_sessions: {
        Row: {
          created_at: string
          execution_score: number | null
          id: string
          notes: string | null
          pair: string
          replay_date: string
          result: number | null
          setup: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          execution_score?: number | null
          id?: string
          notes?: string | null
          pair: string
          replay_date?: string
          result?: number | null
          setup?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          execution_score?: number | null
          id?: string
          notes?: string | null
          pair?: string
          replay_date?: string
          result?: number | null
          setup?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          created_at: string
          discipline_score: number | null
          entry_price: number | null
          execution_score: number | null
          exit_price: number | null
          id: string
          notes: string | null
          outcome: string | null
          pair: string
          quantity: number | null
          result: number | null
          rr: number | null
          session: string | null
          setup: string | null
          side: string | null
          stop_loss: number | null
          take_profit: number | null
          trade_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discipline_score?: number | null
          entry_price?: number | null
          execution_score?: number | null
          exit_price?: number | null
          id?: string
          notes?: string | null
          outcome?: string | null
          pair: string
          quantity?: number | null
          result?: number | null
          rr?: number | null
          session?: string | null
          setup?: string | null
          side?: string | null
          stop_loss?: number | null
          take_profit?: number | null
          trade_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discipline_score?: number | null
          entry_price?: number | null
          execution_score?: number | null
          exit_price?: number | null
          id?: string
          notes?: string | null
          outcome?: string | null
          pair?: string
          quantity?: number | null
          result?: number | null
          rr?: number | null
          session?: string | null
          setup?: string | null
          side?: string | null
          stop_loss?: number | null
          take_profit?: number | null
          trade_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

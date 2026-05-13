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
      admin_users: {
        Row: {
          created_at: string
          id: string
          notes: string | null
        }
        Insert: {
          created_at?: string
          id: string
          notes?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
        }
        Relationships: []
      }
      ai_insights: {
        Row: {
          content: string
          created_at: string
          id: string
          insight_type: string
          period_end: string | null
          period_start: string | null
          trades_analyzed: number
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          insight_type: string
          period_end?: string | null
          period_start?: string | null
          trades_analyzed?: number
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          insight_type?: string
          period_end?: string | null
          period_start?: string | null
          trades_analyzed?: number
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
          plan_type: string
          preferred_market: string | null
          risk_per_trade: number | null
          subscription_plan: string
          subscription_status: string
          timezone: string
          trading_style: string
          trial_ends_at: string | null
          updated_at: string
          upgraded_at: string | null
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
          plan_type?: string
          preferred_market?: string | null
          risk_per_trade?: number | null
          subscription_plan?: string
          subscription_status?: string
          timezone?: string
          trading_style?: string
          trial_ends_at?: string | null
          updated_at?: string
          upgraded_at?: string | null
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
          plan_type?: string
          preferred_market?: string | null
          risk_per_trade?: number | null
          subscription_plan?: string
          subscription_status?: string
          timezone?: string
          trading_style?: string
          trial_ends_at?: string | null
          updated_at?: string
          upgraded_at?: string | null
        }
        Relationships: []
      }
      replay_sessions: {
        Row: {
          created_at: string
          execution_score: number | null
          id: string
          instrument: string | null
          notes: string | null
          pair: string | null
          replay_date: string
          result: number | null
          setup: string | null
          status: string
          title: string | null
          trades: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          execution_score?: number | null
          id?: string
          instrument?: string | null
          notes?: string | null
          pair?: string | null
          replay_date?: string
          result?: number | null
          setup?: string | null
          status?: string
          title?: string | null
          trades?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          execution_score?: number | null
          id?: string
          instrument?: string | null
          notes?: string | null
          pair?: string | null
          replay_date?: string
          result?: number | null
          setup?: string | null
          status?: string
          title?: string | null
          trades?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
          subject: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
          subject: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          subject?: string
          user_id?: string | null
        }
        Relationships: []
      }
      trade_plans: {
        Row: {
          created_at: string
          focus: string | null
          id: string
          market_bias: string
          max_daily_loss: number | null
          max_risk_per_trade: number | null
          notes: string | null
          plan_date: string
          setups_to_trade: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          focus?: string | null
          id?: string
          market_bias?: string
          max_daily_loss?: number | null
          max_risk_per_trade?: number | null
          notes?: string | null
          plan_date?: string
          setups_to_trade?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          focus?: string | null
          id?: string
          market_bias?: string
          max_daily_loss?: number | null
          max_risk_per_trade?: number | null
          notes?: string | null
          plan_date?: string
          setups_to_trade?: string[]
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
          playbook_id: string | null
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
          playbook_id?: string | null
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
          playbook_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "trades_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      upgrade_requests: {
        Row: {
          created_at: string
          id: string
          payment_method: string
          payoneer_ref: string | null
          requested_plan: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
          user_message: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          payment_method?: string
          payoneer_ref?: string | null
          requested_plan: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
          user_message?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          payment_method?: string
          payoneer_ref?: string | null
          requested_plan?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          user_message?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_upgrade_user: {
        Args: {
          new_plan: string
          notes?: string
          target_user_id: string
          trial_days?: number
        }
        Returns: undefined
      }
      get_admin_stats: { Args: never; Returns: Json }
      get_admin_users_list: { Args: never; Returns: Json }
      get_my_profile: { Args: never; Returns: Json }
      get_user_plan_info: { Args: never; Returns: Json }
      is_admin: { Args: { _uid: string }; Returns: boolean }
      request_upgrade: {
        Args: { p_message: string; p_payoneer_ref: string; p_plan: string }
        Returns: string
      }
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

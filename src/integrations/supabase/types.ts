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
          created_at: string | null
          email: string
          id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
      ai_insights: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          insight_type: string
          period_end: string | null
          period_start: string | null
          trade_id: string | null
          trades_analyzed: number | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          insight_type?: string
          period_end?: string | null
          period_start?: string | null
          trade_id?: string | null
          trades_analyzed?: number | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          insight_type?: string
          period_end?: string | null
          period_start?: string | null
          trade_id?: string | null
          trades_analyzed?: number | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_insights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_checkout_attempts: {
        Row: {
          billing: string
          checkout_url: string | null
          created_at: string
          id: string
          plan: string
          session_id: string | null
          status: string
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing: string
          checkout_url?: string | null
          created_at?: string
          id?: string
          plan: string
          session_id?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing?: string
          checkout_url?: string | null
          created_at?: string
          id?: string
          plan?: string
          session_id?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_checkout_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_webhook_events: {
        Row: {
          event_id: string
          processed_at: string
          subscription_id: string
        }
        Insert: {
          event_id: string
          processed_at?: string
          subscription_id: string
        }
        Update: {
          event_id?: string
          processed_at?: string
          subscription_id?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string | null
          id: string
          messages: Json
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          messages?: Json
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          messages?: Json
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      checklist_models: {
        Row: {
          created_at: string
          id: string
          items: Json
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      economic_calendar_preferences: {
        Row: {
          created_at: string
          default_filters: Json
          preferred_view: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_filters?: Json
          preferred_view?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_filters?: Json
          preferred_view?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      economic_calendar_presets: {
        Row: {
          created_at: string
          filters: Json
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      economic_events: {
        Row: {
          actual: string | null
          affected_pairs: string[] | null
          category: string | null
          country: string
          country_code: string
          created_at: string
          currency: string
          description: string | null
          event_date: string
          event_name: string
          event_time: string | null
          forecast: string | null
          id: string
          impact: string
          previous: string | null
          source: string | null
          source_id: string | null
          starts_at: string | null
          timezone: string | null
          unit: string | null
          updated_at: string
          volatility_score: number | null
        }
        Insert: {
          actual?: string | null
          affected_pairs?: string[] | null
          category?: string | null
          country: string
          country_code: string
          created_at?: string
          currency: string
          description?: string | null
          event_date: string
          event_name: string
          event_time?: string | null
          forecast?: string | null
          id?: string
          impact?: string
          previous?: string | null
          source?: string | null
          source_id?: string | null
          starts_at?: string | null
          timezone?: string | null
          unit?: string | null
          updated_at?: string
          volatility_score?: number | null
        }
        Update: {
          actual?: string | null
          affected_pairs?: string[] | null
          category?: string | null
          country?: string
          country_code?: string
          created_at?: string
          currency?: string
          description?: string | null
          event_date?: string
          event_name?: string
          event_time?: string | null
          forecast?: string | null
          id?: string
          impact?: string
          previous?: string | null
          source?: string | null
          source_id?: string | null
          starts_at?: string | null
          timezone?: string | null
          unit?: string | null
          updated_at?: string
          volatility_score?: number | null
        }
        Relationships: []
      }
      event_alerts: {
        Row: {
          created_at: string
          event_id: string
          id: string
          notified: boolean
          remind_mins: number
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          notified?: boolean
          remind_mins?: number
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          notified?: boolean
          remind_mins?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "economic_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_bookmarks: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_bookmarks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "economic_events"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          created_at: string | null
          error_log: Json | null
          failed_rows: number | null
          file_name: string | null
          id: string
          imported_rows: number | null
          status: string | null
          total_rows: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          error_log?: Json | null
          failed_rows?: number | null
          file_name?: string | null
          id?: string
          imported_rows?: number | null
          status?: string | null
          total_rows?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          error_log?: Json | null
          failed_rows?: number | null
          file_name?: string | null
          id?: string
          imported_rows?: number | null
          status?: string | null
          total_rows?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          ai_review: Json | null
          bias: string | null
          confidence_level: number | null
          confidence_score: number | null
          created_at: string | null
          emotional_trigger: string | null
          energy_level: number | null
          entry_date: string
          id: string
          lesson: string | null
          mistakes: string | null
          mistakes_list: string[] | null
          mood: string | null
          notes: string | null
          rule_adherence: number | null
          session: string | null
          session_time: string | null
          stress_label: string | null
          stress_score: number | null
          summary: string | null
          updated_at: string | null
          user_id: string
          what_went_well: string | null
        }
        Insert: {
          ai_review?: Json | null
          bias?: string | null
          confidence_level?: number | null
          confidence_score?: number | null
          created_at?: string | null
          emotional_trigger?: string | null
          energy_level?: number | null
          entry_date?: string
          id?: string
          lesson?: string | null
          mistakes?: string | null
          mistakes_list?: string[] | null
          mood?: string | null
          notes?: string | null
          rule_adherence?: number | null
          session?: string | null
          session_time?: string | null
          stress_label?: string | null
          stress_score?: number | null
          summary?: string | null
          updated_at?: string | null
          user_id: string
          what_went_well?: string | null
        }
        Update: {
          ai_review?: Json | null
          bias?: string | null
          confidence_level?: number | null
          confidence_score?: number | null
          created_at?: string | null
          emotional_trigger?: string | null
          energy_level?: number | null
          entry_date?: string
          id?: string
          lesson?: string | null
          mistakes?: string | null
          mistakes_list?: string[] | null
          mood?: string | null
          notes?: string | null
          rule_adherence?: number | null
          session?: string | null
          session_time?: string | null
          stress_label?: string | null
          stress_score?: number | null
          summary?: string | null
          updated_at?: string | null
          user_id?: string
          what_went_well?: string | null
        }
        Relationships: []
      }
      nova_conversations: {
        Row: {
          created_at: string
          id: string
          preview: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          preview?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          preview?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nova_debug_logs: {
        Row: {
          conversation_id: string | null
          created_at: string
          detail: string | null
          id: string
          meta: Json | null
          stage: string
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          meta?: Json | null
          stage: string
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          meta?: Json | null
          stage?: string
          user_id?: string | null
        }
        Relationships: []
      }
      nova_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nova_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "nova_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      nova_preferences: {
        Row: {
          created_at: string
          custom_notes: string | null
          main_session: string | null
          markets: string[]
          response_style: string
          trading_style: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_notes?: string | null
          main_session?: string | null
          markets?: string[]
          response_style?: string
          trading_style?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_notes?: string | null
          main_session?: string | null
          markets?: string[]
          response_style?: string
          trading_style?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nova_usage: {
        Row: {
          credits_used: number
          period_start: string
          updated_at: string
          user_id: string
        }
        Insert: {
          credits_used?: number
          period_start: string
          updated_at?: string
          user_id: string
        }
        Update: {
          credits_used?: number
          period_start?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_profiles: {
        Row: {
          account_size: number | null
          broker: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          current_step: number
          daily_loss_limit_pct: number | null
          experience_level: string | null
          funded_firm: string | null
          goals: string[] | null
          id: string
          journal_template: Json | null
          main_trading_problem: string | null
          market_types: string[] | null
          preferred_risk_pct: number | null
          primary_strategy: string | null
          recommended_daily_loss_pct: number | null
          recommended_risk_pct: number | null
          risk_profile: string | null
          risk_rules: Json | null
          selected_billing: string | null
          selected_plan: string | null
          trade_plan_template: Json | null
          trader_type: string | null
          trading_style: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_size?: number | null
          broker?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_step?: number
          daily_loss_limit_pct?: number | null
          experience_level?: string | null
          funded_firm?: string | null
          goals?: string[] | null
          id?: string
          journal_template?: Json | null
          main_trading_problem?: string | null
          market_types?: string[] | null
          preferred_risk_pct?: number | null
          primary_strategy?: string | null
          recommended_daily_loss_pct?: number | null
          recommended_risk_pct?: number | null
          risk_profile?: string | null
          risk_rules?: Json | null
          selected_billing?: string | null
          selected_plan?: string | null
          trade_plan_template?: Json | null
          trader_type?: string | null
          trading_style?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_size?: number | null
          broker?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_step?: number
          daily_loss_limit_pct?: number | null
          experience_level?: string | null
          funded_firm?: string | null
          goals?: string[] | null
          id?: string
          journal_template?: Json | null
          main_trading_problem?: string | null
          market_types?: string[] | null
          preferred_risk_pct?: number | null
          primary_strategy?: string | null
          recommended_daily_loss_pct?: number | null
          recommended_risk_pct?: number | null
          risk_profile?: string | null
          risk_rules?: Json | null
          selected_billing?: string | null
          selected_plan?: string | null
          trade_plan_template?: Json | null
          trader_type?: string | null
          trading_style?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_risk_map: {
        Row: {
          daily_loss_pct: number
          description: string
          max_trades_per_day: number
          recommended_risk_pct: number
          risk_profile: string
          weekly_loss_pct: number
        }
        Insert: {
          daily_loss_pct: number
          description: string
          max_trades_per_day: number
          recommended_risk_pct: number
          risk_profile: string
          weekly_loss_pct: number
        }
        Update: {
          daily_loss_pct?: number
          description?: string
          max_trades_per_day?: number
          recommended_risk_pct?: number
          risk_profile?: string
          weekly_loss_pct?: number
        }
        Relationships: []
      }
      playbook_setups: {
        Row: {
          best_market_conditions: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          rules: string[]
          screenshot_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          best_market_conditions?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          rules?: string[]
          screenshot_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          best_market_conditions?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          rules?: string[]
          screenshot_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      playbooks: {
        Row: {
          ai_insight: string | null
          best_market_conditions: string | null
          checklist: string | null
          color: string | null
          conditions: string | null
          created_at: string | null
          description: string | null
          emoji: string | null
          entry_checklist: Json | null
          entry_rules: string | null
          exit_checklist: Json | null
          exit_rules: string | null
          id: string
          invalidation: string | null
          max_loss: number | null
          name: string | null
          pairs: string[] | null
          psych_checklist: Json | null
          risk_percent: number | null
          risk_rules: string | null
          rules: string | null
          rules_array: string[]
          screenshot_url: string | null
          sessions: string[] | null
          status: string | null
          strategy_type: string | null
          tags: string[] | null
          target_rr: number | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_insight?: string | null
          best_market_conditions?: string | null
          checklist?: string | null
          color?: string | null
          conditions?: string | null
          created_at?: string | null
          description?: string | null
          emoji?: string | null
          entry_checklist?: Json | null
          entry_rules?: string | null
          exit_checklist?: Json | null
          exit_rules?: string | null
          id?: string
          invalidation?: string | null
          max_loss?: number | null
          name?: string | null
          pairs?: string[] | null
          psych_checklist?: Json | null
          risk_percent?: number | null
          risk_rules?: string | null
          rules?: string | null
          rules_array?: string[]
          screenshot_url?: string | null
          sessions?: string[] | null
          status?: string | null
          strategy_type?: string | null
          tags?: string[] | null
          target_rr?: number | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_insight?: string | null
          best_market_conditions?: string | null
          checklist?: string | null
          color?: string | null
          conditions?: string | null
          created_at?: string | null
          description?: string | null
          emoji?: string | null
          entry_checklist?: Json | null
          entry_rules?: string | null
          exit_checklist?: Json | null
          exit_rules?: string | null
          id?: string
          invalidation?: string | null
          max_loss?: number | null
          name?: string | null
          pairs?: string[] | null
          psych_checklist?: Json | null
          risk_percent?: number | null
          risk_rules?: string | null
          rules?: string | null
          rules_array?: string[]
          screenshot_url?: string | null
          sessions?: string[] | null
          status?: string | null
          strategy_type?: string | null
          tags?: string[] | null
          target_rr?: number | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_account_id: string | null
          ai_credits_limit: number
          ai_credits_used: number
          avatar_url: string | null
          bio: string | null
          connected_accounts: number
          created_at: string | null
          current_period_end: string | null
          default_account: string | null
          default_account_type: string | null
          display_name: string | null
          dodo_customer_id: string | null
          dodo_payment_id: string | null
          dodo_product_id: string | null
          dodo_subscription_id: string | null
          email: string | null
          full_name: string | null
          id: string
          is_online: boolean | null
          last_seen_at: string | null
          plan_type: string | null
          preferred_market: string | null
          risk_per_trade: number | null
          subscription_plan: string | null
          subscription_status: string | null
          timezone: string
          trades_this_month: number
          trading_style: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string | null
          upgrade_notes: string | null
          upgraded_at: string | null
          upgraded_by: string | null
          upgraded_manually: boolean | null
        }
        Insert: {
          active_account_id?: string | null
          ai_credits_limit?: number
          ai_credits_used?: number
          avatar_url?: string | null
          bio?: string | null
          connected_accounts?: number
          created_at?: string | null
          current_period_end?: string | null
          default_account?: string | null
          default_account_type?: string | null
          display_name?: string | null
          dodo_customer_id?: string | null
          dodo_payment_id?: string | null
          dodo_product_id?: string | null
          dodo_subscription_id?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_online?: boolean | null
          last_seen_at?: string | null
          plan_type?: string | null
          preferred_market?: string | null
          risk_per_trade?: number | null
          subscription_plan?: string | null
          subscription_status?: string | null
          timezone?: string
          trades_this_month?: number
          trading_style?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
          upgrade_notes?: string | null
          upgraded_at?: string | null
          upgraded_by?: string | null
          upgraded_manually?: boolean | null
        }
        Update: {
          active_account_id?: string | null
          ai_credits_limit?: number
          ai_credits_used?: number
          avatar_url?: string | null
          bio?: string | null
          connected_accounts?: number
          created_at?: string | null
          current_period_end?: string | null
          default_account?: string | null
          default_account_type?: string | null
          display_name?: string | null
          dodo_customer_id?: string | null
          dodo_payment_id?: string | null
          dodo_product_id?: string | null
          dodo_subscription_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_online?: boolean | null
          last_seen_at?: string | null
          plan_type?: string | null
          preferred_market?: string | null
          risk_per_trade?: number | null
          subscription_plan?: string | null
          subscription_status?: string | null
          timezone?: string
          trades_this_month?: number
          trading_style?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
          upgrade_notes?: string | null
          upgraded_at?: string | null
          upgraded_by?: string | null
          upgraded_manually?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_account_id_fkey"
            columns: ["active_account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_interval: string | null
          billing_provider: string | null
          cancel_at_period_end: boolean | null
          card_brand: string | null
          card_last_four: string | null
          created_at: string | null
          current_period_end: string | null
          dodo_customer_id: string | null
          dodo_payment_id: string | null
          dodo_product_id: string | null
          dodo_subscription_id: string | null
          ends_at: string | null
          id: string
          plan: string | null
          price_id: string | null
          provider_observed_at: string | null
          renews_at: string | null
          status: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          billing_interval?: string | null
          billing_provider?: string | null
          cancel_at_period_end?: boolean | null
          card_brand?: string | null
          card_last_four?: string | null
          created_at?: string | null
          current_period_end?: string | null
          dodo_customer_id?: string | null
          dodo_payment_id?: string | null
          dodo_product_id?: string | null
          dodo_subscription_id?: string | null
          ends_at?: string | null
          id?: string
          plan?: string | null
          price_id?: string | null
          provider_observed_at?: string | null
          renews_at?: string | null
          status?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          billing_interval?: string | null
          billing_provider?: string | null
          cancel_at_period_end?: boolean | null
          card_brand?: string | null
          card_last_four?: string | null
          created_at?: string | null
          current_period_end?: string | null
          dodo_customer_id?: string | null
          dodo_payment_id?: string | null
          dodo_product_id?: string | null
          dodo_subscription_id?: string | null
          ends_at?: string | null
          id?: string
          plan?: string | null
          price_id?: string | null
          provider_observed_at?: string | null
          renews_at?: string | null
          status?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          email: string
          escalated_at: string | null
          id: string
          message: string
          name: string
          status: string
          subject: string
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          email: string
          escalated_at?: string | null
          id?: string
          message: string
          name: string
          status?: string
          subject?: string
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          email?: string
          escalated_at?: string | null
          id?: string
          message?: string
          name?: string
          status?: string
          subject?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_plan_checklists: {
        Row: {
          account_id: string | null
          account_key: string
          checklist_type: string
          created_at: string
          data: Json
          id: string
          period_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          account_key?: string
          checklist_type: string
          created_at?: string
          data?: Json
          id?: string
          period_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          account_key?: string
          checklist_type?: string
          created_at?: string
          data?: Json
          id?: string
          period_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_plan_checklists_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_plans: {
        Row: {
          account_protection: boolean | null
          ai_analysis: Json | null
          avoid_before_news: boolean | null
          checklist: Json | null
          confidence: number | null
          created_at: string
          daily_target: number | null
          discipline_score: number | null
          emotion: string | null
          focus: string | null
          id: string
          layout_config: Json | null
          market_bias: string
          max_consec_losses: number | null
          max_daily_loss: number | null
          max_risk_per_trade: number | null
          max_trades: number | null
          mental_state: string | null
          news_events: Json | null
          news_impact: string | null
          notes: string | null
          plan_date: string
          psych_notes: string | null
          secondary_setup: string | null
          session: string | null
          setups_to_trade: string[]
          sleep_quality: string | null
          stop_on_rule_break: boolean | null
          updated_at: string
          user_id: string
          volatility: string | null
          wait_after_news: number | null
        }
        Insert: {
          account_protection?: boolean | null
          ai_analysis?: Json | null
          avoid_before_news?: boolean | null
          checklist?: Json | null
          confidence?: number | null
          created_at?: string
          daily_target?: number | null
          discipline_score?: number | null
          emotion?: string | null
          focus?: string | null
          id?: string
          layout_config?: Json | null
          market_bias?: string
          max_consec_losses?: number | null
          max_daily_loss?: number | null
          max_risk_per_trade?: number | null
          max_trades?: number | null
          mental_state?: string | null
          news_events?: Json | null
          news_impact?: string | null
          notes?: string | null
          plan_date?: string
          psych_notes?: string | null
          secondary_setup?: string | null
          session?: string | null
          setups_to_trade?: string[]
          sleep_quality?: string | null
          stop_on_rule_break?: boolean | null
          updated_at?: string
          user_id: string
          volatility?: string | null
          wait_after_news?: number | null
        }
        Update: {
          account_protection?: boolean | null
          ai_analysis?: Json | null
          avoid_before_news?: boolean | null
          checklist?: Json | null
          confidence?: number | null
          created_at?: string
          daily_target?: number | null
          discipline_score?: number | null
          emotion?: string | null
          focus?: string | null
          id?: string
          layout_config?: Json | null
          market_bias?: string
          max_consec_losses?: number | null
          max_daily_loss?: number | null
          max_risk_per_trade?: number | null
          max_trades?: number | null
          mental_state?: string | null
          news_events?: Json | null
          news_impact?: string | null
          notes?: string | null
          plan_date?: string
          psych_notes?: string | null
          secondary_setup?: string | null
          session?: string | null
          setups_to_trade?: string[]
          sleep_quality?: string | null
          stop_on_rule_break?: boolean | null
          updated_at?: string
          user_id?: string
          volatility?: string | null
          wait_after_news?: number | null
        }
        Relationships: []
      }
      trade_playbooks: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          playbook_id: string
          score: number | null
          trade_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          playbook_id: string
          score?: number | null
          trade_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          playbook_id?: string
          score?: number | null
          trade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_playbooks_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_playbooks_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          account_id: string | null
          account_type: string | null
          ai_review: Json | null
          before_screenshot_url: string | null
          created_at: string | null
          daily_bias: string | null
          direction: string | null
          discipline_score: number | null
          duration_min: number | null
          emotion: string | null
          entry_price: number | null
          execution_score: number | null
          exit_price: number | null
          external_id: string | null
          id: string
          is_starred: boolean | null
          market: string | null
          mistakes: string[]
          notes: string | null
          outcome: string | null
          pair: string
          playbook_id: string | null
          pnl: number | null
          pnl_percent: number | null
          position_size: number | null
          quantity: number | null
          r_multiple: number | null
          result: number | null
          risk_amount: number | null
          risk_reward: number | null
          rr: number | null
          screenshot_url: string | null
          session: string | null
          setup: string | null
          side: string | null
          status: string | null
          stop_loss: number | null
          symbol: string | null
          tags: string[] | null
          take_profit: number | null
          timeframe: string | null
          trade_date: string
          trading_account_id: string | null
          updated_at: string | null
          user_id: string
          weekly_context: string | null
          win_loss: string | null
        }
        Insert: {
          account_id?: string | null
          account_type?: string | null
          ai_review?: Json | null
          before_screenshot_url?: string | null
          created_at?: string | null
          daily_bias?: string | null
          direction?: string | null
          discipline_score?: number | null
          duration_min?: number | null
          emotion?: string | null
          entry_price?: number | null
          execution_score?: number | null
          exit_price?: number | null
          external_id?: string | null
          id?: string
          is_starred?: boolean | null
          market?: string | null
          mistakes?: string[]
          notes?: string | null
          outcome?: string | null
          pair: string
          playbook_id?: string | null
          pnl?: number | null
          pnl_percent?: number | null
          position_size?: number | null
          quantity?: number | null
          r_multiple?: number | null
          result?: number | null
          risk_amount?: number | null
          risk_reward?: number | null
          rr?: number | null
          screenshot_url?: string | null
          session?: string | null
          setup?: string | null
          side?: string | null
          status?: string | null
          stop_loss?: number | null
          symbol?: string | null
          tags?: string[] | null
          take_profit?: number | null
          timeframe?: string | null
          trade_date?: string
          trading_account_id?: string | null
          updated_at?: string | null
          user_id: string
          weekly_context?: string | null
          win_loss?: string | null
        }
        Update: {
          account_id?: string | null
          account_type?: string | null
          ai_review?: Json | null
          before_screenshot_url?: string | null
          created_at?: string | null
          daily_bias?: string | null
          direction?: string | null
          discipline_score?: number | null
          duration_min?: number | null
          emotion?: string | null
          entry_price?: number | null
          execution_score?: number | null
          exit_price?: number | null
          external_id?: string | null
          id?: string
          is_starred?: boolean | null
          market?: string | null
          mistakes?: string[]
          notes?: string | null
          outcome?: string | null
          pair?: string
          playbook_id?: string | null
          pnl?: number | null
          pnl_percent?: number | null
          position_size?: number | null
          quantity?: number | null
          r_multiple?: number | null
          result?: number | null
          risk_amount?: number | null
          risk_reward?: number | null
          rr?: number | null
          screenshot_url?: string | null
          session?: string | null
          setup?: string | null
          side?: string | null
          status?: string | null
          stop_loss?: number | null
          symbol?: string | null
          tags?: string[] | null
          take_profit?: number | null
          timeframe?: string | null
          trade_date?: string
          trading_account_id?: string | null
          updated_at?: string | null
          user_id?: string
          weekly_context?: string | null
          win_loss?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_trading_account_id_fkey"
            columns: ["trading_account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_accounts: {
        Row: {
          account_name: string
          account_number: string
          account_type: string | null
          balance: number | null
          broker: string
          challenge: Json
          created_at: string
          currency: string | null
          equity: number | null
          firm: string | null
          free_margin: number | null
          id: string
          initial_balance: number | null
          is_active: boolean
          is_default: boolean
          last_connected_at: string | null
          last_synced_at: string | null
          login: string | null
          margin: number | null
          metaapi_account_id: string | null
          metrics: Json
          nickname: string | null
          platform: string
          server: string | null
          status: string
          sync_error: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          account_type?: string | null
          balance?: number | null
          broker: string
          challenge?: Json
          created_at?: string
          currency?: string | null
          equity?: number | null
          firm?: string | null
          free_margin?: number | null
          id?: string
          initial_balance?: number | null
          is_active?: boolean
          is_default?: boolean
          last_connected_at?: string | null
          last_synced_at?: string | null
          login?: string | null
          margin?: number | null
          metaapi_account_id?: string | null
          metrics?: Json
          nickname?: string | null
          platform?: string
          server?: string | null
          status?: string
          sync_error?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          account_type?: string | null
          balance?: number | null
          broker?: string
          challenge?: Json
          created_at?: string
          currency?: string | null
          equity?: number | null
          firm?: string | null
          free_margin?: number | null
          id?: string
          initial_balance?: number | null
          is_active?: boolean
          is_default?: boolean
          last_connected_at?: string | null
          last_synced_at?: string | null
          login?: string | null
          margin?: number | null
          metaapi_account_id?: string | null
          metrics?: Json
          nickname?: string | null
          platform?: string
          server?: string | null
          status?: string
          sync_error?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_chart_preferences: {
        Row: {
          active_layout_id: string | null
          auto_center_chart: boolean | null
          background_color: string | null
          bearish_color: string | null
          border_color: string | null
          bullish_color: string | null
          chart_type: string | null
          created_at: string
          crosshair_color: string | null
          default_speed: number | null
          drawing_color: string | null
          drawing_prefs: Json | null
          favorite_symbols: Json | null
          grid_color: string | null
          preferred_symbol: string | null
          preferred_theme: string | null
          recent_symbols: Json | null
          saved_layouts: Json | null
          show_economic_events: boolean | null
          show_execution_markers: boolean | null
          show_trade_zones: boolean | null
          updated_at: string
          user_id: string
          wick_color: string | null
        }
        Insert: {
          active_layout_id?: string | null
          auto_center_chart?: boolean | null
          background_color?: string | null
          bearish_color?: string | null
          border_color?: string | null
          bullish_color?: string | null
          chart_type?: string | null
          created_at?: string
          crosshair_color?: string | null
          default_speed?: number | null
          drawing_color?: string | null
          drawing_prefs?: Json | null
          favorite_symbols?: Json | null
          grid_color?: string | null
          preferred_symbol?: string | null
          preferred_theme?: string | null
          recent_symbols?: Json | null
          saved_layouts?: Json | null
          show_economic_events?: boolean | null
          show_execution_markers?: boolean | null
          show_trade_zones?: boolean | null
          updated_at?: string
          user_id: string
          wick_color?: string | null
        }
        Update: {
          active_layout_id?: string | null
          auto_center_chart?: boolean | null
          background_color?: string | null
          bearish_color?: string | null
          border_color?: string | null
          bullish_color?: string | null
          chart_type?: string | null
          created_at?: string
          crosshair_color?: string | null
          default_speed?: number | null
          drawing_color?: string | null
          drawing_prefs?: Json | null
          favorite_symbols?: Json | null
          grid_color?: string | null
          preferred_symbol?: string | null
          preferred_theme?: string | null
          recent_symbols?: Json | null
          saved_layouts?: Json | null
          show_economic_events?: boolean | null
          show_execution_markers?: boolean | null
          show_trade_zones?: boolean | null
          updated_at?: string
          user_id?: string
          wick_color?: string | null
        }
        Relationships: []
      }
      workspace_layouts: {
        Row: {
          created_at: string | null
          id: string
          layout: Json
          page: string
          preferences: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          layout?: Json
          page?: string
          preferences?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          layout?: Json
          page?: string
          preferences?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      user_analytics: {
        Row: {
          avg_loss: number | null
          avg_result: number | null
          avg_rr: number | null
          avg_win: number | null
          best_trade: number | null
          breakevens: number | null
          expectancy: number | null
          gross_loss: number | null
          gross_profit: number | null
          losses: number | null
          net_pnl: number | null
          profit_factor: number | null
          result_stddev: number | null
          total_trades: number | null
          user_id: string | null
          win_rate: number | null
          wins: number | null
          worst_trade: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_dodo_snapshot: {
        Args: {
          p_attempt_id?: string
          p_event_id?: string
          p_observed_at: string
          p_snapshot: Json
          p_user: string
        }
        Returns: Json
      }
      check_feature_access:
        | { Args: { feature_name: string }; Returns: boolean }
        | { Args: { p_feature: string; p_user_id?: string }; Returns: boolean }
      consume_nova_credit: { Args: never; Returns: Json }
      expire_trials: { Args: never; Returns: undefined }
      get_access_state: { Args: never; Returns: Json }
      get_active_users_now: { Args: never; Returns: Json }
      get_admin_analytics: { Args: { days_back?: number }; Returns: Json }
      get_admin_users_list: { Args: never; Returns: Json }
      get_dashboard_stats: {
        Args: { p_account_id?: string; p_user_id?: string }
        Returns: Json
      }
      get_my_analytics: {
        Args: never
        Returns: {
          avg_loss: number
          avg_result: number
          avg_rr: number
          avg_win: number
          best_trade: number
          breakevens: number
          expectancy: number
          gross_loss: number
          gross_profit: number
          losses: number
          net_pnl: number
          profit_factor: number
          result_stddev: number
          total_trades: number
          win_rate: number
          wins: number
          worst_trade: number
        }[]
      }
      get_my_plan: { Args: never; Returns: string }
      get_my_profile: { Args: never; Returns: Json }
      get_my_subscription: {
        Args: never
        Returns: {
          billing_interval: string
          billing_provider: string
          cancel_at_period_end: boolean
          current_period_end: string
          dodo_customer_id: string
          dodo_payment_id: string
          dodo_product_id: string
          dodo_subscription_id: string
          plan: string
          sub_status: string
          trial_end: string
        }[]
      }
      get_nova_usage: { Args: never; Returns: Json }
      get_user_plan_info:
        | { Args: never; Returns: Json }
        | { Args: { p_user_id?: string }; Returns: Json }
      has_feature: { Args: { feature_name: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      save_onboarding: {
        Args: {
          p_billing?: string
          p_completed?: boolean
          p_experience?: string
          p_market_types?: string[]
          p_plan?: string
          p_problem?: string
          p_step?: number
        }
        Returns: Json
      }
      set_active_account: { Args: { p_account_id: string }; Returns: Json }
      update_last_seen: { Args: never; Returns: undefined }
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
    Enums: {},
  },
} as const

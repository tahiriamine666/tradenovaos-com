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
      academy_drill_ai_reviews: {
        Row: {
          answer: string
          attempt_id: string | null
          created_at: string
          id: string
          lesson_id: string
          mode: string
          prompt: string
          user_id: string
        }
        Insert: {
          answer: string
          attempt_id?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          mode: string
          prompt: string
          user_id: string
        }
        Update: {
          answer?: string
          attempt_id?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          mode?: string
          prompt?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_drill_ai_reviews_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "academy_drill_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_drill_ai_reviews_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_drill_attempts: {
        Row: {
          answers: Json
          dimension_scores: Json
          duration_sec: number
          id: string
          lesson_id: string
          max_score: number
          passed: boolean
          scenario_id: string
          score: number
          started_at: string
          submitted_at: string
          user_id: string
          xp_awarded: number
        }
        Insert: {
          answers?: Json
          dimension_scores?: Json
          duration_sec?: number
          id?: string
          lesson_id: string
          max_score?: number
          passed?: boolean
          scenario_id: string
          score?: number
          started_at?: string
          submitted_at?: string
          user_id: string
          xp_awarded?: number
        }
        Update: {
          answers?: Json
          dimension_scores?: Json
          duration_sec?: number
          id?: string
          lesson_id?: string
          max_score?: number
          passed?: boolean
          scenario_id?: string
          score?: number
          started_at?: string
          submitted_at?: string
          user_id?: string
          xp_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "academy_drill_attempts_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_drill_progress: {
        Row: {
          attempts: number
          best_score: number
          completed: boolean
          last_attempt_at: string
          lesson_id: string
          scenario_id: string
          user_id: string
        }
        Insert: {
          attempts?: number
          best_score?: number
          completed?: boolean
          last_attempt_at?: string
          lesson_id: string
          scenario_id: string
          user_id: string
        }
        Update: {
          attempts?: number
          best_score?: number
          completed?: boolean
          last_attempt_at?: string
          lesson_id?: string
          scenario_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_drill_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_drill_scores: {
        Row: {
          attempts: number
          avg_score: number
          best_score: number
          first_attempt_passed: boolean
          last_score: number
          lesson_id: string
          strongest_dimension: string | null
          total_time_sec: number
          updated_at: string
          user_id: string
          weakest_dimension: string | null
        }
        Insert: {
          attempts?: number
          avg_score?: number
          best_score?: number
          first_attempt_passed?: boolean
          last_score?: number
          lesson_id: string
          strongest_dimension?: string | null
          total_time_sec?: number
          updated_at?: string
          user_id: string
          weakest_dimension?: string | null
        }
        Update: {
          attempts?: number
          avg_score?: number
          best_score?: number
          first_attempt_passed?: boolean
          last_score?: number
          lesson_id?: string
          strongest_dimension?: string | null
          total_time_sec?: number
          updated_at?: string
          user_id?: string
          weakest_dimension?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academy_drill_scores_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
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
      community_bookmarks: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          like_count: number
          parent_comment_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          like_count?: number
          parent_comment_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          like_count?: number
          parent_comment_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: []
      }
      community_likes: {
        Row: {
          created_at: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      community_posts: {
        Row: {
          bookmark_count: number
          category: string
          comment_count: number
          content: string
          created_at: string
          id: string
          image_urls: string[]
          is_pinned: boolean
          like_count: number
          tags: string[]
          title: string
          trade_idea: Json | null
          type: string
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          bookmark_count?: number
          category?: string
          comment_count?: number
          content?: string
          created_at?: string
          id?: string
          image_urls?: string[]
          is_pinned?: boolean
          like_count?: number
          tags?: string[]
          title: string
          trade_idea?: Json | null
          type?: string
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          bookmark_count?: number
          category?: string
          comment_count?: number
          content?: string
          created_at?: string
          id?: string
          image_urls?: string[]
          is_pinned?: boolean
          like_count?: number
          tags?: string[]
          title?: string
          trade_idea?: Json | null
          type?: string
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      community_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          experience_level: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          experience_level?: string
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          experience_level?: string
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      community_reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reporter_id: string
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
          target_id?: string
          target_type?: string
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
          ai_review: Json
          bias: string | null
          confidence_level: number | null
          confidence_score: number | null
          created_at: string
          emotional_trigger: string | null
          energy_level: number | null
          entry_date: string
          id: string
          lesson: string | null
          mistakes: string | null
          mistakes_list: string[]
          mood: string | null
          notes: string | null
          rule_adherence: number | null
          session: string | null
          session_time: string | null
          stress_label: string | null
          stress_score: number | null
          summary: string | null
          updated_at: string
          user_id: string
          what_went_well: string | null
        }
        Insert: {
          ai_review?: Json
          bias?: string | null
          confidence_level?: number | null
          confidence_score?: number | null
          created_at?: string
          emotional_trigger?: string | null
          energy_level?: number | null
          entry_date?: string
          id?: string
          lesson?: string | null
          mistakes?: string | null
          mistakes_list?: string[]
          mood?: string | null
          notes?: string | null
          rule_adherence?: number | null
          session?: string | null
          session_time?: string | null
          stress_label?: string | null
          stress_score?: number | null
          summary?: string | null
          updated_at?: string
          user_id: string
          what_went_well?: string | null
        }
        Update: {
          ai_review?: Json
          bias?: string | null
          confidence_level?: number | null
          confidence_score?: number | null
          created_at?: string
          emotional_trigger?: string | null
          energy_level?: number | null
          entry_date?: string
          id?: string
          lesson?: string | null
          mistakes?: string | null
          mistakes_list?: string[]
          mood?: string | null
          notes?: string | null
          rule_adherence?: number | null
          session?: string | null
          session_time?: string | null
          stress_label?: string | null
          stress_score?: number | null
          summary?: string | null
          updated_at?: string
          user_id?: string
          what_went_well?: string | null
        }
        Relationships: []
      }
      learning_categories: {
        Row: {
          created_at: string
          description: string | null
          emoji: string
          gradient: string
          id: string
          is_locked: boolean
          name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          emoji?: string
          gradient?: string
          id?: string
          is_locked?: boolean
          name: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          emoji?: string
          gradient?: string
          id?: string
          is_locked?: boolean
          name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      learning_stats: {
        Row: {
          current_focus: string | null
          hours_studied: number
          last_study_date: string | null
          streak_days: number
          updated_at: string
          user_id: string
          xp_total: number
        }
        Insert: {
          current_focus?: string | null
          hours_studied?: number
          last_study_date?: string | null
          streak_days?: number
          updated_at?: string
          user_id: string
          xp_total?: number
        }
        Update: {
          current_focus?: string | null
          hours_studied?: number
          last_study_date?: string | null
          streak_days?: number
          updated_at?: string
          user_id?: string
          xp_total?: number
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          id: string
          lesson_id: string
          notes: string | null
          progress_pct: number
          saved: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          lesson_id: string
          notes?: string | null
          progress_pct?: number
          saved?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          lesson_id?: string
          notes?: string | null
          progress_pct?: number
          saved?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          callouts: Json
          category: string
          content: string | null
          created_at: string
          description: string | null
          difficulty: string
          drill_config: Json
          id: string
          is_premium: boolean
          is_pro: boolean
          key_takeaways: string[]
          learning_outcomes: string[]
          order_index: number
          quiz_questions: Json
          read_time_min: number
          sections: Json
          slug: string
          subcategory: string | null
          tags: string[]
          thumbnail_url: string | null
          title: string
          video_url: string | null
          xp_reward: number
        }
        Insert: {
          callouts?: Json
          category: string
          content?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string
          drill_config?: Json
          id?: string
          is_premium?: boolean
          is_pro?: boolean
          key_takeaways?: string[]
          learning_outcomes?: string[]
          order_index?: number
          quiz_questions?: Json
          read_time_min?: number
          sections?: Json
          slug: string
          subcategory?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          title: string
          video_url?: string | null
          xp_reward?: number
        }
        Update: {
          callouts?: Json
          category?: string
          content?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string
          drill_config?: Json
          id?: string
          is_premium?: boolean
          is_pro?: boolean
          key_takeaways?: string[]
          learning_outcomes?: string[]
          order_index?: number
          quiz_questions?: Json
          read_time_min?: number
          sections?: Json
          slug?: string
          subcategory?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          title?: string
          video_url?: string | null
          xp_reward?: number
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
          created_at: string
          description: string | null
          emoji: string | null
          entry_checklist: Json
          entry_rules: string | null
          exit_checklist: Json
          exit_rules: string | null
          id: string
          invalidation: string | null
          max_loss: number | null
          name: string | null
          pairs: string[]
          psych_checklist: Json
          risk_percent: number | null
          risk_rules: string | null
          rules: string | null
          rules_array: string[]
          sessions: string[]
          status: string
          strategy_type: string | null
          tags: string[]
          target_rr: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_insight?: string | null
          best_market_conditions?: string | null
          checklist?: string | null
          color?: string | null
          conditions?: string | null
          created_at?: string
          description?: string | null
          emoji?: string | null
          entry_checklist?: Json
          entry_rules?: string | null
          exit_checklist?: Json
          exit_rules?: string | null
          id?: string
          invalidation?: string | null
          max_loss?: number | null
          name?: string | null
          pairs?: string[]
          psych_checklist?: Json
          risk_percent?: number | null
          risk_rules?: string | null
          rules?: string | null
          rules_array?: string[]
          sessions?: string[]
          status?: string
          strategy_type?: string | null
          tags?: string[]
          target_rr?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_insight?: string | null
          best_market_conditions?: string | null
          checklist?: string | null
          color?: string | null
          conditions?: string | null
          created_at?: string
          description?: string | null
          emoji?: string | null
          entry_checklist?: Json
          entry_rules?: string | null
          exit_checklist?: Json
          exit_rules?: string | null
          id?: string
          invalidation?: string | null
          max_loss?: number | null
          name?: string | null
          pairs?: string[]
          psych_checklist?: Json
          risk_percent?: number | null
          risk_rules?: string | null
          rules?: string | null
          rules_array?: string[]
          sessions?: string[]
          status?: string
          strategy_type?: string | null
          tags?: string[]
          target_rr?: number | null
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
          current_period_end: string | null
          default_account_type: string
          display_name: string | null
          email: string | null
          full_name: string | null
          id: string
          last_seen_at: string | null
          paddle_customer_id: string | null
          paddle_price_id: string | null
          paddle_subscription_id: string | null
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
          upgraded_manually: boolean
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          current_period_end?: string | null
          default_account_type?: string
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          last_seen_at?: string | null
          paddle_customer_id?: string | null
          paddle_price_id?: string | null
          paddle_subscription_id?: string | null
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
          upgraded_manually?: boolean
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          current_period_end?: string | null
          default_account_type?: string
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          last_seen_at?: string | null
          paddle_customer_id?: string | null
          paddle_price_id?: string | null
          paddle_subscription_id?: string | null
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
          upgraded_manually?: boolean
        }
        Relationships: []
      }
      replay_ai_reviews: {
        Row: {
          created_at: string
          emotional_discipline: string | null
          entry_quality: string | null
          execution_quality: string | null
          generated_at: string
          id: string
          improvements: string | null
          market_context: string | null
          missed_opportunities: string | null
          model: string | null
          risk_management: string | null
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emotional_discipline?: string | null
          entry_quality?: string | null
          execution_quality?: string | null
          generated_at?: string
          id?: string
          improvements?: string | null
          market_context?: string | null
          missed_opportunities?: string | null
          model?: string | null
          risk_management?: string | null
          session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emotional_discipline?: string | null
          entry_quality?: string | null
          execution_quality?: string | null
          generated_at?: string
          id?: string
          improvements?: string | null
          market_context?: string | null
          missed_opportunities?: string | null
          model?: string | null
          risk_management?: string | null
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "replay_ai_reviews_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "replay_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      replay_executions: {
        Row: {
          action: string
          created_at: string
          id: string
          order_index: number
          pnl: number | null
          price: number | null
          session_id: string
          size: number | null
          time: string
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          order_index?: number
          pnl?: number | null
          price?: number | null
          session_id: string
          size?: number | null
          time?: string
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          order_index?: number
          pnl?: number | null
          price?: number | null
          session_id?: string
          size?: number | null
          time?: string
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "replay_executions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "replay_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      replay_markers: {
        Row: {
          color: string | null
          created_at: string
          id: string
          kind: string
          label: string | null
          price: number | null
          session_id: string
          time: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          kind: string
          label?: string | null
          price?: number | null
          session_id: string
          time?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          kind?: string
          label?: string | null
          price?: number | null
          session_id?: string
          time?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "replay_markers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "replay_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      replay_notes: {
        Row: {
          created_at: string
          id: string
          last_saved_at: string
          lessons: string | null
          mistakes: string | null
          session_id: string
          updated_at: string
          user_id: string
          what_i_saw: string | null
          why_entered: string | null
          why_exited: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_saved_at?: string
          lessons?: string | null
          mistakes?: string | null
          session_id: string
          updated_at?: string
          user_id: string
          what_i_saw?: string | null
          why_entered?: string | null
          why_exited?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_saved_at?: string
          lessons?: string | null
          mistakes?: string | null
          session_id?: string
          updated_at?: string
          user_id?: string
          what_i_saw?: string | null
          why_entered?: string | null
          why_exited?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "replay_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "replay_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      replay_scores: {
        Row: {
          created_at: string
          execution: number | null
          final_score: number | null
          id: string
          plan_adherence: number | null
          psychology: number | null
          risk: number | null
          session_id: string
          tier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          execution?: number | null
          final_score?: number | null
          id?: string
          plan_adherence?: number | null
          psychology?: number | null
          risk?: number | null
          session_id: string
          tier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          execution?: number | null
          final_score?: number | null
          id?: string
          plan_adherence?: number | null
          psychology?: number | null
          risk?: number | null
          session_id?: string
          tier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "replay_scores_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "replay_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      replay_screenshots: {
        Row: {
          annotations: Json
          created_at: string
          file_name: string | null
          file_size: number | null
          id: string
          mime_type: string | null
          order_index: number
          session_id: string | null
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          annotations?: Json
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          order_index?: number
          session_id?: string | null
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          annotations?: Json
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          order_index?: number
          session_id?: string | null
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "replay_screenshots_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "replay_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      replay_sessions: {
        Row: {
          ai_review: Json
          bias: string | null
          created_at: string
          discipline_score: number | null
          duration_min: number | null
          entry_price: number | null
          execution_score: number | null
          executions: Json
          id: string
          instrument: string | null
          mistakes: string[]
          news_context: string | null
          notes: string | null
          outcome: string | null
          pair: string | null
          playbook_id: string | null
          replay_date: string
          result: number | null
          risk_amount: number | null
          rr: number | null
          session_name: string | null
          setup: string | null
          status: string
          stop_loss: number | null
          tags: string[]
          take_profit: number | null
          timeframe: string | null
          title: string | null
          trades: Json
          updated_at: string
          user_id: string
          volatility: string | null
          what_went_well: string | null
        }
        Insert: {
          ai_review?: Json
          bias?: string | null
          created_at?: string
          discipline_score?: number | null
          duration_min?: number | null
          entry_price?: number | null
          execution_score?: number | null
          executions?: Json
          id?: string
          instrument?: string | null
          mistakes?: string[]
          news_context?: string | null
          notes?: string | null
          outcome?: string | null
          pair?: string | null
          playbook_id?: string | null
          replay_date?: string
          result?: number | null
          risk_amount?: number | null
          rr?: number | null
          session_name?: string | null
          setup?: string | null
          status?: string
          stop_loss?: number | null
          tags?: string[]
          take_profit?: number | null
          timeframe?: string | null
          title?: string | null
          trades?: Json
          updated_at?: string
          user_id: string
          volatility?: string | null
          what_went_well?: string | null
        }
        Update: {
          ai_review?: Json
          bias?: string | null
          created_at?: string
          discipline_score?: number | null
          duration_min?: number | null
          entry_price?: number | null
          execution_score?: number | null
          executions?: Json
          id?: string
          instrument?: string | null
          mistakes?: string[]
          news_context?: string | null
          notes?: string | null
          outcome?: string | null
          pair?: string | null
          playbook_id?: string | null
          replay_date?: string
          result?: number | null
          risk_amount?: number | null
          rr?: number | null
          session_name?: string | null
          setup?: string | null
          status?: string
          stop_loss?: number | null
          tags?: string[]
          take_profit?: number | null
          timeframe?: string | null
          title?: string | null
          trades?: Json
          updated_at?: string
          user_id?: string
          volatility?: string | null
          what_went_well?: string | null
        }
        Relationships: []
      }
      subscription_overrides: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          notes: string | null
          plan: string
          status: string
          trial_days: number
          user_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          notes?: string | null
          plan: string
          status: string
          trial_days?: number
          user_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          plan?: string
          status?: string
          trial_days?: number
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
          account_protection: boolean
          ai_analysis: Json
          avoid_before_news: boolean
          checklist: Json
          confidence: number
          created_at: string
          daily_target: number | null
          discipline_score: number
          emotion: string
          focus: string | null
          id: string
          market_bias: string
          max_consec_losses: number
          max_daily_loss: number | null
          max_risk_per_trade: number | null
          max_trades: number | null
          mental_state: string | null
          name: string | null
          news_events: Json
          news_impact: string
          notes: string | null
          plan_date: string
          psych_notes: string | null
          secondary_setup: string | null
          session: string | null
          setups_to_trade: string[]
          sleep_quality: string
          stop_on_rule_break: boolean
          updated_at: string
          user_id: string
          volatility: string
          wait_after_news: number
        }
        Insert: {
          account_protection?: boolean
          ai_analysis?: Json
          avoid_before_news?: boolean
          checklist?: Json
          confidence?: number
          created_at?: string
          daily_target?: number | null
          discipline_score?: number
          emotion?: string
          focus?: string | null
          id?: string
          market_bias?: string
          max_consec_losses?: number
          max_daily_loss?: number | null
          max_risk_per_trade?: number | null
          max_trades?: number | null
          mental_state?: string | null
          name?: string | null
          news_events?: Json
          news_impact?: string
          notes?: string | null
          plan_date?: string
          psych_notes?: string | null
          secondary_setup?: string | null
          session?: string | null
          setups_to_trade?: string[]
          sleep_quality?: string
          stop_on_rule_break?: boolean
          updated_at?: string
          user_id: string
          volatility?: string
          wait_after_news?: number
        }
        Update: {
          account_protection?: boolean
          ai_analysis?: Json
          avoid_before_news?: boolean
          checklist?: Json
          confidence?: number
          created_at?: string
          daily_target?: number | null
          discipline_score?: number
          emotion?: string
          focus?: string | null
          id?: string
          market_bias?: string
          max_consec_losses?: number
          max_daily_loss?: number | null
          max_risk_per_trade?: number | null
          max_trades?: number | null
          mental_state?: string | null
          name?: string | null
          news_events?: Json
          news_impact?: string
          notes?: string | null
          plan_date?: string
          psych_notes?: string | null
          secondary_setup?: string | null
          session?: string | null
          setups_to_trade?: string[]
          sleep_quality?: string
          stop_on_rule_break?: boolean
          updated_at?: string
          user_id?: string
          volatility?: string
          wait_after_news?: number
        }
        Relationships: []
      }
      trades: {
        Row: {
          account_type: string
          ai_review: Json
          created_at: string
          discipline_score: number | null
          emotion: string | null
          entry_price: number | null
          execution_score: number | null
          exit_price: number | null
          id: string
          is_starred: boolean
          mistakes: string[]
          notes: string | null
          outcome: string | null
          pair: string
          playbook_id: string | null
          quantity: number | null
          result: number | null
          rr: number | null
          screenshot_url: string | null
          session: string | null
          setup: string | null
          side: string | null
          stop_loss: number | null
          tags: string[]
          take_profit: number | null
          trade_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type?: string
          ai_review?: Json
          created_at?: string
          discipline_score?: number | null
          emotion?: string | null
          entry_price?: number | null
          execution_score?: number | null
          exit_price?: number | null
          id?: string
          is_starred?: boolean
          mistakes?: string[]
          notes?: string | null
          outcome?: string | null
          pair: string
          playbook_id?: string | null
          quantity?: number | null
          result?: number | null
          rr?: number | null
          screenshot_url?: string | null
          session?: string | null
          setup?: string | null
          side?: string | null
          stop_loss?: number | null
          tags?: string[]
          take_profit?: number | null
          trade_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string
          ai_review?: Json
          created_at?: string
          discipline_score?: number | null
          emotion?: string | null
          entry_price?: number | null
          execution_score?: number | null
          exit_price?: number | null
          id?: string
          is_starred?: boolean
          mistakes?: string[]
          notes?: string | null
          outcome?: string | null
          pair?: string
          playbook_id?: string | null
          quantity?: number | null
          result?: number | null
          rr?: number | null
          screenshot_url?: string | null
          session?: string | null
          setup?: string | null
          side?: string | null
          stop_loss?: number | null
          tags?: string[]
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
        Relationships: [
          {
            foreignKeyName: "upgrade_requests_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          created_at: string
          id: string
          layout: Json
          page: string
          preferences: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          layout?: Json
          page: string
          preferences?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          layout?: Json
          page?: string
          preferences?: Json
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
      admin_extend_trial: {
        Args: { p_days?: number; p_email: string }
        Returns: Json
      }
      admin_search_users: { Args: { p_query: string }; Returns: Json }
      admin_upgrade_by_email: {
        Args: {
          p_email: string
          p_notes?: string
          p_plan: string
          p_status?: string
          p_trial_days?: number
        }
        Returns: Json
      }
      admin_upgrade_user: {
        Args: {
          new_plan: string
          notes?: string
          target_user_id: string
          trial_days?: number
        }
        Returns: undefined
      }
      award_drill_xp: {
        Args: {
          p_first_attempt_success: boolean
          p_lesson_id: string
          p_passed: boolean
          p_score: number
        }
        Returns: number
      }
      community_user_tier: { Args: never; Returns: string }
      get_active_users_now: { Args: never; Returns: Json }
      get_admin_analytics: { Args: { days_back?: number }; Returns: Json }
      get_admin_stats: { Args: never; Returns: Json }
      get_admin_users_list: { Args: never; Returns: Json }
      get_leaderboard: {
        Args: never
        Returns: {
          display_name: string
          level: number
          streak_days: number
          user_id: string
          xp_total: number
        }[]
      }
      get_my_profile: { Args: never; Returns: Json }
      get_user_plan_info: { Args: never; Returns: Json }
      is_admin:
        | { Args: never; Returns: boolean }
        | { Args: { _uid: string }; Returns: boolean }
      request_upgrade: {
        Args: { p_message: string; p_payoneer_ref: string; p_plan: string }
        Returns: string
      }
      update_last_seen: { Args: never; Returns: undefined }
      update_learning_streak: {
        Args: { p_user_id: string }
        Returns: undefined
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

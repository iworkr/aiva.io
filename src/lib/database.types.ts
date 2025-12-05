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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      account_delete_tokens: {
        Row: {
          token: string
          user_id: string
        }
        Insert: {
          token?: string
          user_id: string
        }
        Update: {
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_delete_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_action_logs: {
        Row: {
          action_type: Database["public"]["Enums"]["ai_action_type"]
          completion_tokens: number | null
          confidence_score: number | null
          created_at: string
          error_message: string | null
          id: string
          input_data: Json | null
          input_ref: string | null
          model_used: string | null
          output_data: Json | null
          output_ref: string | null
          processing_time_ms: number | null
          prompt_tokens: number | null
          success: boolean | null
          total_tokens: number | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["ai_action_type"]
          completion_tokens?: number | null
          confidence_score?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_data?: Json | null
          input_ref?: string | null
          model_used?: string | null
          output_data?: Json | null
          output_ref?: string | null
          processing_time_ms?: number | null
          prompt_tokens?: number | null
          success?: boolean | null
          total_tokens?: number | null
          user_id: string
          workspace_id: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["ai_action_type"]
          completion_tokens?: number | null
          confidence_score?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_data?: Json | null
          input_ref?: string | null
          model_used?: string | null
          output_data?: Json | null
          output_ref?: string | null
          processing_time_ms?: number | null
          prompt_tokens?: number | null
          success?: boolean | null
          total_tokens?: number | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_action_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_action_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          id: boolean
          settings: Json
          updated_at: string
        }
        Insert: {
          id?: boolean
          settings?: Json
          updated_at?: string
        }
        Update: {
          id?: boolean
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      attachments: {
        Row: {
          channel_connection_id: string | null
          content_preview: string | null
          content_type: string | null
          created_at: string | null
          download_url: string | null
          extracted_summary: string | null
          extracted_title: string | null
          filename: string
          id: string
          is_downloaded: boolean | null
          keywords: string[] | null
          local_path: string | null
          message_id: string
          mime_type: string | null
          provider_attachment_id: string | null
          size_bytes: number | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          channel_connection_id?: string | null
          content_preview?: string | null
          content_type?: string | null
          created_at?: string | null
          download_url?: string | null
          extracted_summary?: string | null
          extracted_title?: string | null
          filename: string
          id?: string
          is_downloaded?: boolean | null
          keywords?: string[] | null
          local_path?: string | null
          message_id: string
          mime_type?: string | null
          provider_attachment_id?: string | null
          size_bytes?: number | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          channel_connection_id?: string | null
          content_preview?: string | null
          content_type?: string | null
          created_at?: string | null
          download_url?: string | null
          extracted_summary?: string | null
          extracted_title?: string | null
          filename?: string
          id?: string
          is_downloaded?: boolean | null
          keywords?: string[] | null
          local_path?: string | null
          message_id?: string
          mime_type?: string | null
          provider_attachment_id?: string | null
          size_bytes?: number | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_channel_connection_id_fkey"
            columns: ["channel_connection_id"]
            isOneToOne: false
            referencedRelation: "channel_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_customers: {
        Row: {
          billing_email: string
          default_currency: string | null
          gateway_customer_id: string
          gateway_name: string
          metadata: Json | null
          workspace_id: string
        }
        Insert: {
          billing_email: string
          default_currency?: string | null
          gateway_customer_id: string
          gateway_name: string
          metadata?: Json | null
          workspace_id: string
        }
        Update: {
          billing_email?: string
          default_currency?: string | null
          gateway_customer_id?: string
          gateway_name?: string
          metadata?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_customers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_invoices: {
        Row: {
          amount: number
          currency: string
          due_date: string | null
          gateway_customer_id: string
          gateway_invoice_id: string
          gateway_name: string
          gateway_price_id: string | null
          gateway_product_id: string | null
          hosted_invoice_url: string | null
          paid_date: string | null
          status: string
        }
        Insert: {
          amount: number
          currency: string
          due_date?: string | null
          gateway_customer_id: string
          gateway_invoice_id: string
          gateway_name: string
          gateway_price_id?: string | null
          gateway_product_id?: string | null
          hosted_invoice_url?: string | null
          paid_date?: string | null
          status: string
        }
        Update: {
          amount?: number
          currency?: string
          due_date?: string | null
          gateway_customer_id?: string
          gateway_invoice_id?: string
          gateway_name?: string
          gateway_price_id?: string | null
          gateway_product_id?: string | null
          hosted_invoice_url?: string | null
          paid_date?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_invoices_gateway_customer_id_fkey"
            columns: ["gateway_customer_id"]
            isOneToOne: false
            referencedRelation: "billing_customers"
            referencedColumns: ["gateway_customer_id"]
          },
          {
            foreignKeyName: "billing_invoices_gateway_price_id_fkey"
            columns: ["gateway_price_id"]
            isOneToOne: false
            referencedRelation: "billing_prices"
            referencedColumns: ["gateway_price_id"]
          },
          {
            foreignKeyName: "billing_invoices_gateway_product_id_fkey"
            columns: ["gateway_product_id"]
            isOneToOne: false
            referencedRelation: "billing_products"
            referencedColumns: ["gateway_product_id"]
          },
        ]
      }
      billing_one_time_payments: {
        Row: {
          amount: number
          charge_date: string
          currency: string
          gateway_charge_id: string
          gateway_customer_id: string
          gateway_invoice_id: string
          gateway_name: string
          gateway_price_id: string
          gateway_product_id: string
          status: string
        }
        Insert: {
          amount: number
          charge_date: string
          currency: string
          gateway_charge_id: string
          gateway_customer_id: string
          gateway_invoice_id: string
          gateway_name: string
          gateway_price_id: string
          gateway_product_id: string
          status: string
        }
        Update: {
          amount?: number
          charge_date?: string
          currency?: string
          gateway_charge_id?: string
          gateway_customer_id?: string
          gateway_invoice_id?: string
          gateway_name?: string
          gateway_price_id?: string
          gateway_product_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_one_time_payments_gateway_customer_id_fkey"
            columns: ["gateway_customer_id"]
            isOneToOne: false
            referencedRelation: "billing_customers"
            referencedColumns: ["gateway_customer_id"]
          },
          {
            foreignKeyName: "billing_one_time_payments_gateway_invoice_id_fkey"
            columns: ["gateway_invoice_id"]
            isOneToOne: false
            referencedRelation: "billing_invoices"
            referencedColumns: ["gateway_invoice_id"]
          },
          {
            foreignKeyName: "billing_one_time_payments_gateway_price_id_fkey"
            columns: ["gateway_price_id"]
            isOneToOne: false
            referencedRelation: "billing_prices"
            referencedColumns: ["gateway_price_id"]
          },
          {
            foreignKeyName: "billing_one_time_payments_gateway_product_id_fkey"
            columns: ["gateway_product_id"]
            isOneToOne: false
            referencedRelation: "billing_products"
            referencedColumns: ["gateway_product_id"]
          },
        ]
      }
      billing_payment_methods: {
        Row: {
          gateway_customer_id: string
          id: string
          is_default: boolean
          payment_method_details: Json
          payment_method_id: string
          payment_method_type: string
        }
        Insert: {
          gateway_customer_id: string
          id?: string
          is_default?: boolean
          payment_method_details: Json
          payment_method_id: string
          payment_method_type: string
        }
        Update: {
          gateway_customer_id?: string
          id?: string
          is_default?: boolean
          payment_method_details?: Json
          payment_method_id?: string
          payment_method_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_payment_methods_gateway_customer_id_fkey"
            columns: ["gateway_customer_id"]
            isOneToOne: false
            referencedRelation: "billing_customers"
            referencedColumns: ["gateway_customer_id"]
          },
        ]
      }
      billing_prices: {
        Row: {
          active: boolean
          amount: number
          currency: string
          free_trial_days: number | null
          gateway_name: string
          gateway_price_id: string
          gateway_product_id: string
          recurring_interval: string
          recurring_interval_count: number
          tier: string | null
        }
        Insert: {
          active?: boolean
          amount: number
          currency: string
          free_trial_days?: number | null
          gateway_name: string
          gateway_price_id?: string
          gateway_product_id: string
          recurring_interval: string
          recurring_interval_count?: number
          tier?: string | null
        }
        Update: {
          active?: boolean
          amount?: number
          currency?: string
          free_trial_days?: number | null
          gateway_name?: string
          gateway_price_id?: string
          gateway_product_id?: string
          recurring_interval?: string
          recurring_interval_count?: number
          tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_prices_gateway_product_id_fkey"
            columns: ["gateway_product_id"]
            isOneToOne: false
            referencedRelation: "billing_products"
            referencedColumns: ["gateway_product_id"]
          },
        ]
      }
      billing_products: {
        Row: {
          active: boolean
          description: string | null
          features: Json | null
          gateway_name: string
          gateway_product_id: string
          is_visible_in_ui: boolean
          name: string
        }
        Insert: {
          active?: boolean
          description?: string | null
          features?: Json | null
          gateway_name: string
          gateway_product_id: string
          is_visible_in_ui?: boolean
          name: string
        }
        Update: {
          active?: boolean
          description?: string | null
          features?: Json | null
          gateway_name?: string
          gateway_product_id?: string
          is_visible_in_ui?: boolean
          name?: string
        }
        Relationships: []
      }
      billing_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          currency: string
          current_period_end: string
          current_period_start: string
          gateway_customer_id: string
          gateway_name: string
          gateway_price_id: string
          gateway_product_id: string
          gateway_subscription_id: string
          id: string
          is_trial: boolean
          quantity: number | null
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
        }
        Insert: {
          cancel_at_period_end: boolean
          currency: string
          current_period_end: string
          current_period_start: string
          gateway_customer_id: string
          gateway_name: string
          gateway_price_id: string
          gateway_product_id: string
          gateway_subscription_id: string
          id?: string
          is_trial: boolean
          quantity?: number | null
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean
          currency?: string
          current_period_end?: string
          current_period_start?: string
          gateway_customer_id?: string
          gateway_name?: string
          gateway_price_id?: string
          gateway_product_id?: string
          gateway_subscription_id?: string
          id?: string
          is_trial?: boolean
          quantity?: number | null
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_subscriptions_gateway_customer_id_fkey"
            columns: ["gateway_customer_id"]
            isOneToOne: false
            referencedRelation: "billing_customers"
            referencedColumns: ["gateway_customer_id"]
          },
          {
            foreignKeyName: "billing_subscriptions_gateway_price_id_fkey"
            columns: ["gateway_price_id"]
            isOneToOne: false
            referencedRelation: "billing_prices"
            referencedColumns: ["gateway_price_id"]
          },
          {
            foreignKeyName: "billing_subscriptions_gateway_product_id_fkey"
            columns: ["gateway_product_id"]
            isOneToOne: false
            referencedRelation: "billing_products"
            referencedColumns: ["gateway_product_id"]
          },
        ]
      }
      billing_usage_logs: {
        Row: {
          feature: string
          gateway_customer_id: string
          id: string
          timestamp: string
          usage_amount: number
        }
        Insert: {
          feature: string
          gateway_customer_id: string
          id?: string
          timestamp?: string
          usage_amount: number
        }
        Update: {
          feature?: string
          gateway_customer_id?: string
          id?: string
          timestamp?: string
          usage_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "billing_usage_logs_gateway_customer_id_fkey"
            columns: ["gateway_customer_id"]
            isOneToOne: false
            referencedRelation: "billing_customers"
            referencedColumns: ["gateway_customer_id"]
          },
        ]
      }
      billing_volume_tiers: {
        Row: {
          gateway_price_id: string
          id: string
          max_quantity: number | null
          min_quantity: number
          unit_price: number
        }
        Insert: {
          gateway_price_id: string
          id?: string
          max_quantity?: number | null
          min_quantity: number
          unit_price: number
        }
        Update: {
          gateway_price_id?: string
          id?: string
          max_quantity?: number | null
          min_quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "billing_volume_tiers_gateway_price_id_fkey"
            columns: ["gateway_price_id"]
            isOneToOne: false
            referencedRelation: "billing_prices"
            referencedColumns: ["gateway_price_id"]
          },
        ]
      }
      calendar_connections: {
        Row: {
          access_token: string
          created_at: string
          id: string
          last_sync_at: string | null
          metadata: Json | null
          provider: Database["public"]["Enums"]["calendar_provider"]
          provider_account_email: string | null
          provider_account_id: string
          refresh_token: string | null
          scopes: string[] | null
          status: Database["public"]["Enums"]["channel_connection_status"]
          sync_cursor: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          last_sync_at?: string | null
          metadata?: Json | null
          provider: Database["public"]["Enums"]["calendar_provider"]
          provider_account_email?: string | null
          provider_account_id: string
          refresh_token?: string | null
          scopes?: string[] | null
          status?: Database["public"]["Enums"]["channel_connection_status"]
          sync_cursor?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          last_sync_at?: string | null
          metadata?: Json | null
          provider?: Database["public"]["Enums"]["calendar_provider"]
          provider_account_email?: string | null
          provider_account_id?: string
          refresh_token?: string | null
          scopes?: string[] | null
          status?: Database["public"]["Enums"]["channel_connection_status"]
          sync_cursor?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_connections: {
        Row: {
          access_token: string
          created_at: string
          id: string
          last_sync_at: string | null
          metadata: Json | null
          next_sync_at: string | null
          provider: Database["public"]["Enums"]["channel_provider"]
          provider_account_id: string
          provider_account_name: string | null
          refresh_token: string | null
          scopes: string[] | null
          status: Database["public"]["Enums"]["channel_connection_status"]
          sync_cursor: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
          webhook_enabled: boolean | null
          webhook_expires_at: string | null
          webhook_subscription_id: string | null
          workspace_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          last_sync_at?: string | null
          metadata?: Json | null
          next_sync_at?: string | null
          provider: Database["public"]["Enums"]["channel_provider"]
          provider_account_id: string
          provider_account_name?: string | null
          refresh_token?: string | null
          scopes?: string[] | null
          status?: Database["public"]["Enums"]["channel_connection_status"]
          sync_cursor?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
          webhook_enabled?: boolean | null
          webhook_expires_at?: string | null
          webhook_subscription_id?: string | null
          workspace_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          last_sync_at?: string | null
          metadata?: Json | null
          next_sync_at?: string | null
          provider?: Database["public"]["Enums"]["channel_provider"]
          provider_account_id?: string
          provider_account_name?: string | null
          refresh_token?: string | null
          scopes?: string[] | null
          status?: Database["public"]["Enums"]["channel_connection_status"]
          sync_cursor?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
          webhook_enabled?: boolean | null
          webhook_expires_at?: string | null
          webhook_subscription_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          created_at: string
          id: string
          payload: Json | null
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          payload?: Json | null
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json | null
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_channels: {
        Row: {
          channel_display_name: string | null
          channel_id: string
          channel_type: string
          contact_id: string
          created_at: string | null
          id: string
          is_primary: boolean | null
          is_verified: boolean | null
          last_message_at: string | null
          message_count: number | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          channel_display_name?: string | null
          channel_id: string
          channel_type: string
          contact_id: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          last_message_at?: string | null
          message_count?: number | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          channel_display_name?: string | null
          channel_id?: string
          channel_type?: string
          contact_id?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          last_message_at?: string | null
          message_count?: number | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_channels_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_channels_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          first_name: string | null
          full_name: string
          id: string
          interaction_count: number | null
          is_favorite: boolean | null
          job_title: string | null
          last_interaction_at: string | null
          last_name: string | null
          notes: string | null
          phone: string | null
          tags: string[] | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          first_name?: string | null
          full_name: string
          id?: string
          interaction_count?: number | null
          is_favorite?: boolean | null
          job_title?: string | null
          last_interaction_at?: string | null
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string
          id?: string
          interaction_count?: number | null
          is_favorite?: boolean | null
          job_title?: string | null
          last_interaction_at?: string | null
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          attendees: Json | null
          calendar_connection_id: string
          conference_data: Json | null
          created_at: string
          created_from_message_id: string | null
          description: string | null
          end_time: string
          id: string
          is_all_day: boolean | null
          is_recurring: boolean | null
          location: string | null
          organizer: Json | null
          provider_calendar_id: string | null
          provider_event_id: string
          raw_data: Json | null
          recurrence_rule: string | null
          start_time: string
          status: string | null
          timezone: string
          title: string
          updated_at: string
          visibility: string | null
          workspace_id: string
        }
        Insert: {
          attendees?: Json | null
          calendar_connection_id: string
          conference_data?: Json | null
          created_at?: string
          created_from_message_id?: string | null
          description?: string | null
          end_time: string
          id?: string
          is_all_day?: boolean | null
          is_recurring?: boolean | null
          location?: string | null
          organizer?: Json | null
          provider_calendar_id?: string | null
          provider_event_id: string
          raw_data?: Json | null
          recurrence_rule?: string | null
          start_time: string
          status?: string | null
          timezone?: string
          title: string
          updated_at?: string
          visibility?: string | null
          workspace_id: string
        }
        Update: {
          attendees?: Json | null
          calendar_connection_id?: string
          conference_data?: Json | null
          created_at?: string
          created_from_message_id?: string | null
          description?: string | null
          end_time?: string
          id?: string
          is_all_day?: boolean | null
          is_recurring?: boolean | null
          location?: string | null
          organizer?: Json | null
          provider_calendar_id?: string | null
          provider_event_id?: string
          raw_data?: Json | null
          recurrence_rule?: string | null
          start_time?: string
          status?: string | null
          timezone?: string
          title?: string
          updated_at?: string
          visibility?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_calendar_connection_id_fkey"
            columns: ["calendar_connection_id"]
            isOneToOne: false
            referencedRelation: "calendar_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_from_message_id_fkey"
            columns: ["created_from_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      frequent_contacts: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          updated_at: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "frequent_contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_author_profiles: {
        Row: {
          avatar_url: string
          bio: string
          created_at: string
          display_name: string
          facebook_handle: string | null
          id: string
          instagram_handle: string | null
          linkedin_handle: string | null
          slug: string
          twitter_handle: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          avatar_url: string
          bio: string
          created_at?: string
          display_name: string
          facebook_handle?: string | null
          id?: string
          instagram_handle?: string | null
          linkedin_handle?: string | null
          slug: string
          twitter_handle?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          avatar_url?: string
          bio?: string
          created_at?: string
          display_name?: string
          facebook_handle?: string | null
          id?: string
          instagram_handle?: string | null
          linkedin_handle?: string | null
          slug?: string
          twitter_handle?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      marketing_blog_author_posts: {
        Row: {
          author_id: string
          post_id: string
        }
        Insert: {
          author_id: string
          post_id: string
        }
        Update: {
          author_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_blog_author_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "marketing_author_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_blog_author_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "marketing_blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_blog_post_tags_relationship: {
        Row: {
          blog_post_id: string
          tag_id: string
        }
        Insert: {
          blog_post_id: string
          tag_id: string
        }
        Update: {
          blog_post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_blog_post_tags_relationship_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "marketing_blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_blog_post_tags_relationship_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "marketing_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_blog_posts: {
        Row: {
          content: string
          cover_image: string | null
          created_at: string
          id: string
          is_featured: boolean
          json_content: Json
          seo_data: Json | null
          slug: string
          status: Database["public"]["Enums"]["marketing_blog_post_status"]
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          cover_image?: string | null
          created_at?: string
          id?: string
          is_featured?: boolean
          json_content?: Json
          seo_data?: Json | null
          slug: string
          status?: Database["public"]["Enums"]["marketing_blog_post_status"]
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          cover_image?: string | null
          created_at?: string
          id?: string
          is_featured?: boolean
          json_content?: Json
          seo_data?: Json | null
          slug?: string
          status?: Database["public"]["Enums"]["marketing_blog_post_status"]
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketing_changelog: {
        Row: {
          cover_image: string | null
          created_at: string | null
          id: string
          json_content: Json
          status: Database["public"]["Enums"]["marketing_changelog_status"]
          title: string
          updated_at: string | null
        }
        Insert: {
          cover_image?: string | null
          created_at?: string | null
          id?: string
          json_content?: Json
          status?: Database["public"]["Enums"]["marketing_changelog_status"]
          title: string
          updated_at?: string | null
        }
        Update: {
          cover_image?: string | null
          created_at?: string | null
          id?: string
          json_content?: Json
          status?: Database["public"]["Enums"]["marketing_changelog_status"]
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      marketing_changelog_author_relationship: {
        Row: {
          author_id: string
          changelog_id: string
        }
        Insert: {
          author_id: string
          changelog_id: string
        }
        Update: {
          author_id?: string
          changelog_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_changelog_author_relationship_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "marketing_author_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_changelog_author_relationship_changelog_id_fkey"
            columns: ["changelog_id"]
            isOneToOne: false
            referencedRelation: "marketing_changelog"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_feedback_board_subscriptions: {
        Row: {
          board_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          board_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          board_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_feedback_board_subscriptions_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "marketing_feedback_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_feedback_board_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_feedback_boards: {
        Row: {
          color: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          settings: Json
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          settings?: Json
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          settings?: Json
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_feedback_boards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_feedback_comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reaction_type: Database["public"]["Enums"]["marketing_feedback_reaction_type"]
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reaction_type: Database["public"]["Enums"]["marketing_feedback_reaction_type"]
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reaction_type?: Database["public"]["Enums"]["marketing_feedback_reaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_feedback_comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "marketing_feedback_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_feedback_comment_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_feedback_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          moderator_hold_category:
            | Database["public"]["Enums"]["marketing_feedback_moderator_hold_category"]
            | null
          thread_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          moderator_hold_category?:
            | Database["public"]["Enums"]["marketing_feedback_moderator_hold_category"]
            | null
          thread_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          moderator_hold_category?:
            | Database["public"]["Enums"]["marketing_feedback_moderator_hold_category"]
            | null
          thread_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_feedback_comments_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "marketing_feedback_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_feedback_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_feedback_thread_reactions: {
        Row: {
          created_at: string
          id: string
          reaction_type: Database["public"]["Enums"]["marketing_feedback_reaction_type"]
          thread_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type: Database["public"]["Enums"]["marketing_feedback_reaction_type"]
          thread_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type?: Database["public"]["Enums"]["marketing_feedback_reaction_type"]
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_feedback_thread_reactions_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "marketing_feedback_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_feedback_thread_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_feedback_thread_subscriptions: {
        Row: {
          created_at: string
          id: string
          thread_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          thread_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_feedback_thread_subscriptions_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "marketing_feedback_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_feedback_thread_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_feedback_threads: {
        Row: {
          added_to_roadmap: boolean
          board_id: string | null
          content: string
          created_at: string
          id: string
          is_publicly_visible: boolean
          moderator_hold_category:
            | Database["public"]["Enums"]["marketing_feedback_moderator_hold_category"]
            | null
          open_for_public_discussion: boolean
          priority: Database["public"]["Enums"]["marketing_feedback_thread_priority"]
          status: Database["public"]["Enums"]["marketing_feedback_thread_status"]
          title: string
          type: Database["public"]["Enums"]["marketing_feedback_thread_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          added_to_roadmap?: boolean
          board_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_publicly_visible?: boolean
          moderator_hold_category?:
            | Database["public"]["Enums"]["marketing_feedback_moderator_hold_category"]
            | null
          open_for_public_discussion?: boolean
          priority?: Database["public"]["Enums"]["marketing_feedback_thread_priority"]
          status?: Database["public"]["Enums"]["marketing_feedback_thread_status"]
          title: string
          type?: Database["public"]["Enums"]["marketing_feedback_thread_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          added_to_roadmap?: boolean
          board_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_publicly_visible?: boolean
          moderator_hold_category?:
            | Database["public"]["Enums"]["marketing_feedback_moderator_hold_category"]
            | null
          open_for_public_discussion?: boolean
          priority?: Database["public"]["Enums"]["marketing_feedback_thread_priority"]
          status?: Database["public"]["Enums"]["marketing_feedback_thread_status"]
          title?: string
          type?: Database["public"]["Enums"]["marketing_feedback_thread_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_feedback_threads_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "marketing_feedback_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_feedback_threads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_tags: {
        Row: {
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      message_drafts: {
        Row: {
          auto_sent: boolean | null
          auto_sent_at: string | null
          body: string
          body_html: string | null
          confidence_score: number | null
          context_data: Json | null
          created_at: string
          edited_by_user: boolean | null
          generated_by_ai: boolean | null
          id: string
          is_auto_sendable: boolean | null
          message_id: string
          tone: string | null
          tone_reasoning: Json | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          auto_sent?: boolean | null
          auto_sent_at?: string | null
          body: string
          body_html?: string | null
          confidence_score?: number | null
          context_data?: Json | null
          created_at?: string
          edited_by_user?: boolean | null
          generated_by_ai?: boolean | null
          id?: string
          is_auto_sendable?: boolean | null
          message_id: string
          tone?: string | null
          tone_reasoning?: Json | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          auto_sent?: boolean | null
          auto_sent_at?: string | null
          body?: string
          body_html?: string | null
          confidence_score?: number | null
          context_data?: Json | null
          created_at?: string
          edited_by_user?: boolean | null
          generated_by_ai?: boolean | null
          id?: string
          is_auto_sendable?: boolean | null
          message_id?: string
          tone?: string | null
          tone_reasoning?: Json | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_drafts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_drafts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_drafts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          actionability:
            | Database["public"]["Enums"]["message_actionability"]
            | null
          ai_summary_short: string | null
          attachments: Json | null
          auto_sent: boolean | null
          body: string
          body_html: string | null
          category: Database["public"]["Enums"]["message_category"] | null
          channel_connection_id: string
          confidence_score: number | null
          created_at: string
          has_draft_reply: boolean | null
          id: string
          is_read: boolean | null
          is_starred: boolean | null
          key_points: Json | null
          labels: string[] | null
          priority: Database["public"]["Enums"]["message_priority"] | null
          provider_message_id: string
          provider_thread_id: string | null
          raw_data: Json | null
          recipients: Json | null
          sender_email: string
          sender_name: string | null
          sentiment: Database["public"]["Enums"]["message_sentiment"] | null
          snippet: string | null
          status: Database["public"]["Enums"]["message_status"] | null
          subject: string | null
          summary: string | null
          thread_id: string | null
          timestamp: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          actionability?:
            | Database["public"]["Enums"]["message_actionability"]
            | null
          ai_summary_short?: string | null
          attachments?: Json | null
          auto_sent?: boolean | null
          body: string
          body_html?: string | null
          category?: Database["public"]["Enums"]["message_category"] | null
          channel_connection_id: string
          confidence_score?: number | null
          created_at?: string
          has_draft_reply?: boolean | null
          id?: string
          is_read?: boolean | null
          is_starred?: boolean | null
          key_points?: Json | null
          labels?: string[] | null
          priority?: Database["public"]["Enums"]["message_priority"] | null
          provider_message_id: string
          provider_thread_id?: string | null
          raw_data?: Json | null
          recipients?: Json | null
          sender_email: string
          sender_name?: string | null
          sentiment?: Database["public"]["Enums"]["message_sentiment"] | null
          snippet?: string | null
          status?: Database["public"]["Enums"]["message_status"] | null
          subject?: string | null
          summary?: string | null
          thread_id?: string | null
          timestamp: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          actionability?:
            | Database["public"]["Enums"]["message_actionability"]
            | null
          ai_summary_short?: string | null
          attachments?: Json | null
          auto_sent?: boolean | null
          body?: string
          body_html?: string | null
          category?: Database["public"]["Enums"]["message_category"] | null
          channel_connection_id?: string
          confidence_score?: number | null
          created_at?: string
          has_draft_reply?: boolean | null
          id?: string
          is_read?: boolean | null
          is_starred?: boolean | null
          key_points?: Json | null
          labels?: string[] | null
          priority?: Database["public"]["Enums"]["message_priority"] | null
          provider_message_id?: string
          provider_thread_id?: string | null
          raw_data?: Json | null
          recipients?: Json | null
          sender_email?: string
          sender_name?: string | null
          sentiment?: Database["public"]["Enums"]["message_sentiment"] | null
          snippet?: string | null
          status?: Database["public"]["Enums"]["message_status"] | null
          subject?: string | null
          summary?: string | null
          thread_id?: string | null
          timestamp?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_channel_connection_id_fkey"
            columns: ["channel_connection_id"]
            isOneToOne: false
            referencedRelation: "channel_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      project_comments: {
        Row: {
          created_at: string | null
          id: string
          in_reply_to: string | null
          project_id: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          in_reply_to?: string | null
          project_id: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          in_reply_to?: string | null
          project_id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_comments_in_reply_to_fkey"
            columns: ["in_reply_to"]
            isOneToOne: false
            referencedRelation: "project_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          id: string
          name: string
          project_status: Database["public"]["Enums"]["project_status"]
          slug: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          project_status?: Database["public"]["Enums"]["project_status"]
          slug?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          project_status?: Database["public"]["Enums"]["project_status"]
          slug?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          extracted_by_ai: boolean | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"] | null
          project_id: string | null
          source_message_id: string | null
          status: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          extracted_by_ai?: boolean | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"] | null
          project_id?: string | null
          source_message_id?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          extracted_by_ai?: boolean | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"] | null
          project_id?: string | null
          source_message_id?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      threads: {
        Row: {
          channels: string[] | null
          created_at: string
          first_message_at: string | null
          id: string
          is_archived: boolean | null
          last_message_at: string | null
          message_count: number | null
          participants: Json | null
          primary_subject: string
          summary: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          channels?: string[] | null
          created_at?: string
          first_message_at?: string | null
          id?: string
          is_archived?: boolean | null
          last_message_at?: string | null
          message_count?: number | null
          participants?: Json | null
          primary_subject: string
          summary?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          channels?: string[] | null
          created_at?: string
          first_message_at?: string | null
          id?: string
          is_archived?: boolean | null
          last_message_at?: string | null
          message_count?: number | null
          participants?: Json | null
          primary_subject?: string
          summary?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "threads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          is_revoked: boolean
          key_id: string
          masked_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          is_revoked?: boolean
          key_id: string
          masked_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          is_revoked?: boolean
          key_id?: string
          masked_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_application_settings: {
        Row: {
          email_readonly: string
          id: string
        }
        Insert: {
          email_readonly: string
          id: string
        }
        Update: {
          email_readonly?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_application_settings_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          is_seen: boolean
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          is_seen?: boolean
          payload?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          is_seen?: boolean
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          default_workspace: string | null
          id: string
        }
        Insert: {
          default_workspace?: string | null
          id: string
        }
        Update: {
          default_workspace?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_default_workspace_fkey"
            columns: ["default_workspace"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_settings_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_admin_settings: {
        Row: {
          workspace_id: string
          workspace_settings: Json
        }
        Insert: {
          workspace_id: string
          workspace_settings?: Json
        }
        Update: {
          workspace_id?: string
          workspace_settings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "workspace_admin_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_application_settings: {
        Row: {
          membership_type: Database["public"]["Enums"]["workspace_membership_type"]
          workspace_id: string
        }
        Insert: {
          membership_type?: Database["public"]["Enums"]["workspace_membership_type"]
          workspace_id: string
        }
        Update: {
          membership_type?: Database["public"]["Enums"]["workspace_membership_type"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_application_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_credits: {
        Row: {
          credits: number
          id: string
          last_reset_date: string | null
          workspace_id: string
        }
        Insert: {
          credits?: number
          id?: string
          last_reset_date?: string | null
          workspace_id: string
        }
        Update: {
          credits?: number
          id?: string
          last_reset_date?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_credits_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_credits_logs: {
        Row: {
          change_type: string
          changed_at: string
          id: string
          new_credits: number | null
          old_credits: number | null
          workspace_credits_id: string
          workspace_id: string
        }
        Insert: {
          change_type: string
          changed_at?: string
          id?: string
          new_credits?: number | null
          old_credits?: number | null
          workspace_credits_id: string
          workspace_id: string
        }
        Update: {
          change_type?: string
          changed_at?: string
          id?: string
          new_credits?: number | null
          old_credits?: number | null
          workspace_credits_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_credits_logs_workspace_credits_id_fkey"
            columns: ["workspace_credits_id"]
            isOneToOne: false
            referencedRelation: "workspace_credits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_credits_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invitations: {
        Row: {
          created_at: string
          id: string
          invitee_user_email: string
          invitee_user_id: string | null
          invitee_user_role: Database["public"]["Enums"]["workspace_member_role_type"]
          inviter_user_id: string
          status: Database["public"]["Enums"]["workspace_invitation_link_status"]
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invitee_user_email: string
          invitee_user_id?: string | null
          invitee_user_role?: Database["public"]["Enums"]["workspace_member_role_type"]
          inviter_user_id: string
          status?: Database["public"]["Enums"]["workspace_invitation_link_status"]
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invitee_user_email?: string
          invitee_user_id?: string | null
          invitee_user_role?: Database["public"]["Enums"]["workspace_member_role_type"]
          inviter_user_id?: string
          status?: Database["public"]["Enums"]["workspace_invitation_link_status"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_invitee_user_id_fkey"
            columns: ["invitee_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_invitations_inviter_user_id_fkey"
            columns: ["inviter_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          added_at: string
          id: string
          permissions: Json
          workspace_id: string
          workspace_member_id: string
          workspace_member_role: Database["public"]["Enums"]["workspace_member_role_type"]
        }
        Insert: {
          added_at?: string
          id?: string
          permissions?: Json
          workspace_id: string
          workspace_member_id: string
          workspace_member_role: Database["public"]["Enums"]["workspace_member_role_type"]
        }
        Update: {
          added_at?: string
          id?: string
          permissions?: Json
          workspace_id?: string
          workspace_member_id?: string
          workspace_member_role?: Database["public"]["Enums"]["workspace_member_role_type"]
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_member_id_fkey"
            columns: ["workspace_member_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_settings: {
        Row: {
          sync_frequency_minutes: number | null
          workspace_id: string
          workspace_settings: Json
        }
        Insert: {
          sync_frequency_minutes?: number | null
          workspace_id: string
          workspace_settings?: Json
        }
        Update: {
          sync_frequency_minutes?: number | null
          workspace_id?: string
          workspace_settings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "workspace_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      app_admin_get_projects_created_per_month: {
        Args: never
        Returns: {
          month: string
          number_of_projects: number
        }[]
      }
      app_admin_get_recent_30_day_signin_count: { Args: never; Returns: number }
      app_admin_get_total_organization_count: { Args: never; Returns: number }
      app_admin_get_total_project_count: { Args: never; Returns: number }
      app_admin_get_total_user_count: { Args: never; Returns: number }
      app_admin_get_user_id_by_email: {
        Args: { emailarg: string }
        Returns: string
      }
      app_admin_get_users_created_per_month: {
        Args: never
        Returns: {
          month: string
          number_of_users: number
        }[]
      }
      app_admin_get_workspaces_created_per_month: {
        Args: never
        Returns: {
          month: string
          number_of_workspaces: number
        }[]
      }
      check_if_authenticated_user_owns_email: {
        Args: { email: string }
        Returns: boolean
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      decrement_credits: {
        Args: { amount: number; org_id: string }
        Returns: undefined
      }
      get_customer_workspace_id: {
        Args: { customer_id_arg: string }
        Returns: string
      }
      get_project_workspace_uuid: {
        Args: { project_id: string }
        Returns: string
      }
      get_workspace_team_member_admins: {
        Args: { workspace_id: string }
        Returns: {
          member_id: string
        }[]
      }
      get_workspace_team_member_ids: {
        Args: { workspace_id: string }
        Returns: {
          member_id: string
        }[]
      }
      has_workspace_permission: {
        Args: { permission: string; user_id: string; workspace_id: string }
        Returns: boolean
      }
      is_application_admin: { Args: { user_id?: string }; Returns: boolean }
      is_workspace_admin: {
        Args: { user_id: string; workspace_id: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { user_id: string; workspace_id: string }
        Returns: boolean
      }
      make_user_app_admin: { Args: { user_id_arg: string }; Returns: undefined }
      remove_app_admin_privilege_for_user: {
        Args: { user_id_arg: string }
        Returns: undefined
      }
      update_workspace_member_permissions: {
        Args: { member_id: string; new_permissions: Json; workspace_id: string }
        Returns: undefined
      }
    }
    Enums: {
      ai_action_type:
        | "classification"
        | "summarization"
        | "reply_draft"
        | "auto_send"
        | "task_extraction"
        | "scheduling_detection"
        | "sentiment_analysis"
      app_role: "admin"
      calendar_provider:
        | "google_calendar"
        | "outlook_calendar"
        | "apple_calendar"
        | "aiva"
      channel_connection_status:
        | "active"
        | "inactive"
        | "error"
        | "token_expired"
        | "revoked"
      channel_provider:
        | "gmail"
        | "outlook"
        | "slack"
        | "teams"
        | "whatsapp"
        | "instagram"
        | "facebook_messenger"
        | "linkedin"
      marketing_blog_post_status: "draft" | "published"
      marketing_changelog_status: "draft" | "published"
      marketing_feedback_moderator_hold_category:
        | "spam"
        | "off_topic"
        | "inappropriate"
        | "other"
      marketing_feedback_reaction_type:
        | "like"
        | "heart"
        | "celebrate"
        | "upvote"
      marketing_feedback_thread_priority: "low" | "medium" | "high"
      marketing_feedback_thread_status:
        | "open"
        | "under_review"
        | "planned"
        | "closed"
        | "in_progress"
        | "completed"
        | "moderator_hold"
      marketing_feedback_thread_type: "bug" | "feature_request" | "general"
      message_actionability:
        | "question"
        | "request"
        | "fyi"
        | "scheduling_intent"
        | "task"
        | "none"
      message_category:
        | "sales_lead"
        | "client_support"
        | "internal"
        | "social"
        | "marketing"
        | "personal"
        | "other"
        | "customer_inquiry"
        | "customer_complaint"
        | "bill"
        | "invoice"
        | "payment_confirmation"
        | "authorization_code"
        | "sign_in_code"
        | "security_alert"
        | "junk_email"
        | "newsletter"
        | "meeting_request"
        | "notification"
      message_priority: "high" | "medium" | "low" | "noise" | "urgent"
      message_sentiment: "neutral" | "positive" | "negative" | "urgent"
      message_status:
        | "unread"
        | "read"
        | "action_required"
        | "waiting_on_others"
        | "done"
        | "archived"
      organization_joining_status:
        | "invited"
        | "joinied"
        | "declined_invitation"
        | "joined"
      organization_member_role: "owner" | "admin" | "member" | "readonly"
      pricing_plan_interval: "day" | "week" | "month" | "year"
      pricing_type: "one_time" | "recurring"
      project_status: "draft" | "pending_approval" | "approved" | "completed"
      project_team_member_role: "admin" | "member" | "readonly"
      subscription_status:
        | "trialing"
        | "active"
        | "canceled"
        | "incomplete"
        | "incomplete_expired"
        | "past_due"
        | "unpaid"
        | "paused"
      task_priority: "high" | "medium" | "low"
      task_status: "pending" | "in_progress" | "completed" | "cancelled"
      workspace_invitation_link_status:
        | "active"
        | "finished_accepted"
        | "finished_declined"
        | "inactive"
      workspace_member_role_type: "owner" | "admin" | "member" | "readonly"
      workspace_membership_type: "solo" | "team"
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
    Enums: {
      ai_action_type: [
        "classification",
        "summarization",
        "reply_draft",
        "auto_send",
        "task_extraction",
        "scheduling_detection",
        "sentiment_analysis",
      ],
      app_role: ["admin"],
      calendar_provider: [
        "google_calendar",
        "outlook_calendar",
        "apple_calendar",
        "aiva",
      ],
      channel_connection_status: [
        "active",
        "inactive",
        "error",
        "token_expired",
        "revoked",
      ],
      channel_provider: [
        "gmail",
        "outlook",
        "slack",
        "teams",
        "whatsapp",
        "instagram",
        "facebook_messenger",
        "linkedin",
      ],
      marketing_blog_post_status: ["draft", "published"],
      marketing_changelog_status: ["draft", "published"],
      marketing_feedback_moderator_hold_category: [
        "spam",
        "off_topic",
        "inappropriate",
        "other",
      ],
      marketing_feedback_reaction_type: [
        "like",
        "heart",
        "celebrate",
        "upvote",
      ],
      marketing_feedback_thread_priority: ["low", "medium", "high"],
      marketing_feedback_thread_status: [
        "open",
        "under_review",
        "planned",
        "closed",
        "in_progress",
        "completed",
        "moderator_hold",
      ],
      marketing_feedback_thread_type: ["bug", "feature_request", "general"],
      message_actionability: [
        "question",
        "request",
        "fyi",
        "scheduling_intent",
        "task",
        "none",
      ],
      message_category: [
        "sales_lead",
        "client_support",
        "internal",
        "social",
        "marketing",
        "personal",
        "other",
        "customer_inquiry",
        "customer_complaint",
        "bill",
        "invoice",
        "payment_confirmation",
        "authorization_code",
        "sign_in_code",
        "security_alert",
        "junk_email",
        "newsletter",
        "meeting_request",
        "notification",
      ],
      message_priority: ["high", "medium", "low", "noise", "urgent"],
      message_sentiment: ["neutral", "positive", "negative", "urgent"],
      message_status: [
        "unread",
        "read",
        "action_required",
        "waiting_on_others",
        "done",
        "archived",
      ],
      organization_joining_status: [
        "invited",
        "joinied",
        "declined_invitation",
        "joined",
      ],
      organization_member_role: ["owner", "admin", "member", "readonly"],
      pricing_plan_interval: ["day", "week", "month", "year"],
      pricing_type: ["one_time", "recurring"],
      project_status: ["draft", "pending_approval", "approved", "completed"],
      project_team_member_role: ["admin", "member", "readonly"],
      subscription_status: [
        "trialing",
        "active",
        "canceled",
        "incomplete",
        "incomplete_expired",
        "past_due",
        "unpaid",
        "paused",
      ],
      task_priority: ["high", "medium", "low"],
      task_status: ["pending", "in_progress", "completed", "cancelled"],
      workspace_invitation_link_status: [
        "active",
        "finished_accepted",
        "finished_declined",
        "inactive",
      ],
      workspace_member_role_type: ["owner", "admin", "member", "readonly"],
      workspace_membership_type: ["solo", "team"],
    },
  },
} as const

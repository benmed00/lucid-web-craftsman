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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          email: string
          id: string
          last_login: string | null
          name: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          last_login?: string | null
          name: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          last_login?: string | null
          name?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_admin_users_profile"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          resource_id: string | null
          resource_type: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          excerpt: string | null
          featured_image_url: string | null
          id: string
          is_featured: boolean | null
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_featured?: boolean | null
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_featured?: boolean | null
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_blog_posts_author"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: number | null
          quantity: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: number | null
          quantity?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: number | null
          quantity?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_cart_items_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cart_items_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          parent_id: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_categories_parent"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          company: string | null
          created_at: string | null
          email: string
          first_name: string
          id: string
          ip_address: unknown
          last_name: string
          message: string
          phone: string | null
          status: string | null
          subject: string
          updated_at: string | null
          user_agent: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email: string
          first_name: string
          id?: string
          ip_address?: unknown
          last_name: string
          message: string
          phone?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          user_agent?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          ip_address?: unknown
          last_name?: string
          message?: string
          phone?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      discount_coupons: {
        Row: {
          applicable_categories: string[] | null
          applicable_products: number[] | null
          code: string
          created_at: string | null
          created_by: string | null
          id: string
          includes_free_shipping: boolean | null
          is_active: boolean | null
          maximum_discount_amount: number | null
          minimum_order_amount: number | null
          per_user_limit: number | null
          type: string
          updated_at: string | null
          usage_count: number | null
          usage_limit: number | null
          valid_from: string | null
          valid_until: string | null
          value: number
        }
        Insert: {
          applicable_categories?: string[] | null
          applicable_products?: number[] | null
          code: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          includes_free_shipping?: boolean | null
          is_active?: boolean | null
          maximum_discount_amount?: number | null
          minimum_order_amount?: number | null
          per_user_limit?: number | null
          type: string
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
          value: number
        }
        Update: {
          applicable_categories?: string[] | null
          applicable_products?: number[] | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          includes_free_shipping?: boolean | null
          is_active?: boolean | null
          maximum_discount_amount?: number | null
          minimum_order_amount?: number | null
          per_user_limit?: number | null
          type?: string
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_discount_coupons_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_ab_tests: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          name: string
          split_percentage: number
          status: string
          template_name: string
          updated_at: string
          variant_a_opens: number
          variant_a_sent: number
          variant_a_subject: string | null
          variant_b_opens: number
          variant_b_sent: number
          variant_b_subject: string | null
          winner: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          name: string
          split_percentage?: number
          status?: string
          template_name: string
          updated_at?: string
          variant_a_opens?: number
          variant_a_sent?: number
          variant_a_subject?: string | null
          variant_b_opens?: number
          variant_b_sent?: number
          variant_b_subject?: string | null
          winner?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          name?: string
          split_percentage?: number
          status?: string
          template_name?: string
          updated_at?: string
          variant_a_opens?: number
          variant_a_sent?: number
          variant_a_subject?: string | null
          variant_b_opens?: number
          variant_b_sent?: number
          variant_b_subject?: string | null
          winner?: string | null
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          order_id: string | null
          recipient_email: string
          recipient_name: string | null
          sent_at: string | null
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          recipient_email: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          recipient_email?: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          template_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_email_logs_order"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_images: {
        Row: {
          alt_text: string
          created_at: string | null
          created_by: string | null
          id: string
          image_url: string
          is_active: boolean | null
          subtitle: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          alt_text: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          subtitle?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          alt_text?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          subtitle?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_hero_images_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_points: {
        Row: {
          created_at: string
          id: string
          next_tier_threshold: number
          points_balance: number
          tier: string
          tier_progress: number
          total_points_earned: number
          total_points_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          next_tier_threshold?: number
          points_balance?: number
          tier?: string
          tier_progress?: number
          total_points_earned?: number
          total_points_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          next_tier_threshold?: number
          points_balance?: number
          tier?: string
          tier_progress?: number
          total_points_earned?: number
          total_points_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_loyalty_points_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_redemptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          order_id: string | null
          points_spent: number
          reward_id: string
          status: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          order_id?: string | null
          points_spent: number
          reward_id: string
          status?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          order_id?: string | null
          points_spent?: number
          reward_id?: string
          status?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_loyalty_redemptions_order"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_loyalty_redemptions_reward"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "loyalty_rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_loyalty_redemptions_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "loyalty_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_rewards: {
        Row: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          min_tier: string
          name: string
          points_cost: number
          reward_type: string
          reward_value: Json
          updated_at: string
          usage_count: number
          usage_limit: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          min_tier?: string
          name: string
          points_cost: number
          reward_type: string
          reward_value: Json
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          min_tier?: string
          name?: string
          points_cost?: number
          reward_type?: string
          reward_value?: Json
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          created_at: string
          description: string
          id: string
          points_change: number
          source_id: string | null
          source_type: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          points_change: number
          source_id?: string | null
          source_type: string
          transaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          points_change?: number
          source_id?: string | null
          source_type?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_loyalty_transactions_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscriptions: {
        Row: {
          confirmed_at: string | null
          consent_date: string | null
          consent_given: boolean | null
          created_at: string | null
          double_opt_in: boolean | null
          email: string
          id: string
          metadata: Json | null
          source: string | null
          status: string | null
          tags: string[] | null
          unsubscribed_at: string | null
          updated_at: string | null
        }
        Insert: {
          confirmed_at?: string | null
          consent_date?: string | null
          consent_given?: boolean | null
          created_at?: string | null
          double_opt_in?: boolean | null
          email: string
          id?: string
          metadata?: Json | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          unsubscribed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          confirmed_at?: string | null
          consent_date?: string | null
          consent_given?: boolean | null
          created_at?: string | null
          double_opt_in?: boolean | null
          email?: string
          id?: string
          metadata?: Json | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          unsubscribed_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          email_delivery_confirmation: boolean | null
          email_loyalty_updates: boolean | null
          email_order_confirmation: boolean | null
          email_promotional: boolean | null
          email_security_alerts: boolean | null
          email_shipping_updates: boolean | null
          id: string
          push_order_updates: boolean | null
          push_promotional: boolean | null
          sms_delivery_updates: boolean | null
          sms_order_updates: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_delivery_confirmation?: boolean | null
          email_loyalty_updates?: boolean | null
          email_order_confirmation?: boolean | null
          email_promotional?: boolean | null
          email_security_alerts?: boolean | null
          email_shipping_updates?: boolean | null
          id?: string
          push_order_updates?: boolean | null
          push_promotional?: boolean | null
          sms_delivery_updates?: boolean | null
          sms_order_updates?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_delivery_confirmation?: boolean | null
          email_loyalty_updates?: boolean | null
          email_order_confirmation?: boolean | null
          email_promotional?: boolean | null
          email_security_alerts?: boolean | null
          email_shipping_updates?: boolean | null
          id?: string
          push_order_updates?: boolean | null
          push_promotional?: boolean | null
          sms_delivery_updates?: boolean | null
          sms_order_updates?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_notification_preferences_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string | null
          product_id: number | null
          product_snapshot: Json | null
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          product_id?: number | null
          product_snapshot?: Json | null
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          product_id?: number | null
          product_snapshot?: Json | null
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_order_items_order"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_order_items_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number | null
          created_at: string
          currency: string | null
          id: string
          status: string | null
          stripe_session_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          status?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          status?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_orders_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          metadata: Json | null
          net_amount: number | null
          order_id: string | null
          payment_method: string | null
          processed_at: string | null
          refund_amount: number | null
          refunded_at: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_payment_method_id: string | null
          transaction_fee: number | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          metadata?: Json | null
          net_amount?: number | null
          order_id?: string | null
          payment_method?: string | null
          processed_at?: string | null
          refund_amount?: number | null
          refunded_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_payment_method_id?: string | null
          transaction_fee?: number | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          metadata?: Json | null
          net_amount?: number | null
          order_id?: string | null
          payment_method?: string | null
          processed_at?: string | null
          refund_amount?: number | null
          refunded_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_payment_method_id?: string | null
          transaction_fee?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_payments_order"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_analytics: {
        Row: {
          city: string | null
          country_code: string | null
          created_at: string | null
          event_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          product_id: number | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          city?: string | null
          country_code?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          product_id?: number | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          city?: string | null
          country_code?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          product_id?: number | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_product_analytics_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_analytics_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          category_id: string | null
          created_at: string | null
          id: string
          product_id: number | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          product_id?: number | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          product_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_product_categories_category"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_product_categories_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          helpful_count: number | null
          id: string
          is_approved: boolean | null
          is_verified_purchase: boolean | null
          product_id: number | null
          rating: number
          reported_count: number | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          product_id?: number | null
          rating: number
          reported_count?: number | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          product_id?: number | null
          rating?: number
          reported_count?: number | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_product_reviews_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_product_reviews_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          artisan: string
          artisan_story: string | null
          care: string
          category: string
          color: string | null
          created_at: string
          description: string
          details: string
          dimensions_cm: string | null
          id: number
          images: string[]
          is_active: boolean | null
          is_available: boolean | null
          is_featured: boolean | null
          is_new: boolean | null
          material: string | null
          min_stock_level: number | null
          name: string
          price: number
          rating_average: number | null
          rating_count: number | null
          related_products: number[] | null
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          slug: string | null
          stock_quantity: number | null
          updated_at: string
          weight_grams: number | null
        }
        Insert: {
          artisan: string
          artisan_story?: string | null
          care: string
          category: string
          color?: string | null
          created_at?: string
          description: string
          details: string
          dimensions_cm?: string | null
          id?: number
          images?: string[]
          is_active?: boolean | null
          is_available?: boolean | null
          is_featured?: boolean | null
          is_new?: boolean | null
          material?: string | null
          min_stock_level?: number | null
          name: string
          price: number
          rating_average?: number | null
          rating_count?: number | null
          related_products?: number[] | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string | null
          stock_quantity?: number | null
          updated_at?: string
          weight_grams?: number | null
        }
        Update: {
          artisan?: string
          artisan_story?: string | null
          care?: string
          category?: string
          color?: string | null
          created_at?: string
          description?: string
          details?: string
          dimensions_cm?: string | null
          id?: number
          images?: string[]
          is_active?: boolean | null
          is_available?: boolean | null
          is_featured?: boolean | null
          is_new?: boolean | null
          material?: string | null
          min_stock_level?: number | null
          name?: string
          price?: number
          rating_average?: number | null
          rating_count?: number | null
          related_products?: number[] | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string | null
          stock_quantity?: number | null
          updated_at?: string
          weight_grams?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string
          facebook_url: string | null
          full_name: string | null
          id: string
          instagram_handle: string | null
          location: string | null
          notification_settings: Json | null
          phone: string | null
          postal_code: string | null
          preferences: Json | null
          twitter_handle: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          facebook_url?: string | null
          full_name?: string | null
          id: string
          instagram_handle?: string | null
          location?: string | null
          notification_settings?: Json | null
          phone?: string | null
          postal_code?: string | null
          preferences?: Json | null
          twitter_handle?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          facebook_url?: string | null
          full_name?: string | null
          id?: string
          instagram_handle?: string | null
          location?: string | null
          notification_settings?: Json | null
          phone?: string | null
          postal_code?: string | null
          preferences?: Json | null
          twitter_handle?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action_type: string
          attempts: number
          created_at: string
          id: string
          identifier: string
          window_start: string
        }
        Insert: {
          action_type: string
          attempts?: number
          created_at?: string
          id?: string
          identifier: string
          window_start?: string
        }
        Update: {
          action_type?: string
          attempts?: number
          created_at?: string
          id?: string
          identifier?: string
          window_start?: string
        }
        Relationships: []
      }
      scheduled_emails: {
        Row: {
          created_at: string
          email_data: Json
          error_message: string | null
          id: string
          recipient_email: string
          recipient_name: string | null
          scheduled_for: string
          sent_at: string | null
          status: string
          template_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_data?: Json
          error_message?: string | null
          id?: string
          recipient_email: string
          recipient_name?: string | null
          scheduled_for: string
          sent_at?: string | null
          status?: string
          template_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_data?: Json
          error_message?: string | null
          id?: string
          recipient_email?: string
          recipient_name?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          template_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          description: string | null
          id: string
          is_resolved: boolean | null
          metadata: Json | null
          notified_at: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          source_ip: unknown
          title: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_resolved?: boolean | null
          metadata?: Json | null
          notified_at?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source_ip?: unknown
          title: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_resolved?: boolean | null
          metadata?: Json | null
          notified_at?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source_ip?: unknown
          title?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_config: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          setting_name: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          setting_name: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          setting_name?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_security_config_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string
          detected_at: string
          event_data: Json
          event_type: string
          id: string
          ip_address: unknown
          resolution_notes: string | null
          resolved_at: string | null
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          detected_at?: string
          event_data: Json
          event_type: string
          id?: string
          ip_address?: unknown
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          detected_at?: string
          event_data?: Json
          event_type?: string
          id?: string
          ip_address?: unknown
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      shipments: {
        Row: {
          carrier: string | null
          created_at: string
          expected_delivery: string | null
          id: string
          order_id: string
          status: string | null
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          expected_delivery?: string | null
          id?: string
          order_id: string
          status?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          carrier?: string | null
          created_at?: string
          expected_delivery?: string | null
          id?: string
          order_id?: string
          status?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_shipments_order"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          company: string | null
          country_code: string
          created_at: string | null
          delivery_instructions: string | null
          first_name: string
          id: string
          is_default: boolean | null
          last_name: string
          phone: string | null
          postal_code: string
          state_province: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city: string
          company?: string | null
          country_code: string
          created_at?: string | null
          delivery_instructions?: string | null
          first_name: string
          id?: string
          is_default?: boolean | null
          last_name: string
          phone?: string | null
          postal_code: string
          state_province?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          company?: string | null
          country_code?: string
          created_at?: string | null
          delivery_instructions?: string | null
          first_name?: string
          id?: string
          is_default?: boolean | null
          last_name?: string
          phone?: string | null
          postal_code?: string
          state_province?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_shipping_addresses_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_zones: {
        Row: {
          created_at: string | null
          delivery_days_max: number
          delivery_days_min: number
          free_shipping_threshold: number | null
          id: string
          is_active: boolean | null
          name: string
          postal_codes: Json
          shipping_cost: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_days_max?: number
          delivery_days_min?: number
          free_shipping_threshold?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          postal_codes: Json
          shipping_cost?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_days_max?: number
          delivery_days_min?: number
          free_shipping_threshold?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          postal_codes?: Json
          shipping_cost?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      support_ticket_messages: {
        Row: {
          attachments: string[] | null
          created_at: string | null
          id: string
          is_internal: boolean | null
          message: string
          sender_email: string | null
          sender_id: string | null
          sender_type: string
          ticket_id: string | null
        }
        Insert: {
          attachments?: string[] | null
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          message: string
          sender_email?: string | null
          sender_id?: string | null
          sender_type: string
          ticket_id?: string | null
        }
        Update: {
          attachments?: string[] | null
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          message?: string
          sender_email?: string | null
          sender_id?: string | null
          sender_type?: string
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string | null
          email: string
          id: string
          priority: string | null
          resolved_at: string | null
          status: string | null
          subject: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          email: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          email?: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_support_tickets_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets_error_reports: {
        Row: {
          assigned_to: string | null
          browser_info: Json | null
          created_at: string | null
          description: string
          email: string
          error_type: string
          id: string
          masked_email: string | null
          page_url: string | null
          priority: string | null
          resolution_notes: string | null
          resolved_at: string | null
          screenshot_url: string | null
          severity: string | null
          status: string | null
          tags: string[] | null
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          browser_info?: Json | null
          created_at?: string | null
          description: string
          email: string
          error_type?: string
          id?: string
          masked_email?: string | null
          page_url?: string | null
          priority?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          screenshot_url?: string | null
          severity?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          browser_info?: Json | null
          created_at?: string | null
          description?: string
          email?: string
          error_type?: string
          id?: string
          masked_email?: string | null
          page_url?: string | null
          priority?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          screenshot_url?: string | null
          severity?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_error_reports_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          currency: string | null
          email_notifications: boolean | null
          id: string
          language: string | null
          marketing_emails: boolean | null
          order_updates: boolean | null
          privacy_profile_public: boolean | null
          privacy_show_email: boolean | null
          privacy_show_phone: boolean | null
          theme_preference: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          email_notifications?: boolean | null
          id?: string
          language?: string | null
          marketing_emails?: boolean | null
          order_updates?: boolean | null
          privacy_profile_public?: boolean | null
          privacy_show_email?: boolean | null
          privacy_show_phone?: boolean | null
          theme_preference?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          email_notifications?: boolean | null
          id?: string
          language?: string | null
          marketing_emails?: boolean | null
          order_updates?: boolean | null
          privacy_profile_public?: boolean | null
          privacy_show_email?: boolean | null
          privacy_show_phone?: boolean | null
          theme_preference?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          notes: string | null
          revoked_at: string | null
          revoked_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_roles_granted_by"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_roles_profile"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist: {
        Row: {
          created_at: string
          id: string
          product_id: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_wishlist_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_wishlist_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      contact_messages_masked: {
        Row: {
          company: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string | null
          ip_address: unknown
          last_name: string | null
          message_preview: string | null
          phone: string | null
          status: string | null
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email?: never
          first_name?: never
          id?: string | null
          ip_address?: never
          last_name?: never
          message_preview?: never
          phone?: never
          status?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: never
          first_name?: never
          id?: string | null
          ip_address?: never
          last_name?: never
          message_preview?: never
          phone?: never
          status?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_admin_user: {
        Args: {
          p_email: string
          p_full_name?: string
          p_is_super_admin?: boolean
          p_user_id: string
        }
        Returns: undefined
      }
      add_loyalty_points: {
        Args: {
          description?: string
          points: number
          source_id?: string
          source_type: string
          transaction_type: string
          user_uuid: string
        }
        Returns: undefined
      }
      anonymize_sensitive_data: { Args: { input_data: Json }; Returns: Json }
      archive_old_payment_data: { Args: never; Returns: undefined }
      can_access_support_ticket: {
        Args: { ticket_id: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          p_action_type: string
          p_identifier: string
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      emergency_lockdown_contact_data: { Args: never; Returns: undefined }
      enhanced_log_contact_message_access: {
        Args: { message_id: string }
        Returns: undefined
      }
      get_admin_access_metrics: { Args: never; Returns: Json }
      get_admin_users_secure: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          last_login: string
          name: string
          role: string
        }[]
      }
      get_admin_users_with_audit: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          last_login: string
          name: string
          role: string
          user_id: string
        }[]
      }
      get_contact_message_details: {
        Args: { message_id: string }
        Returns: Json
      }
      get_contact_messages_secure: {
        Args: { p_include_pii?: boolean; p_limit?: number; p_offset?: number }
        Returns: {
          company: string
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          message: string
          phone: string
          status: string
          subject: string
          updated_at: string
        }[]
      }
      get_customer_segments: { Args: never; Returns: Json }
      get_masked_contact_messages: {
        Args: { limit_count?: number; offset_count?: number }
        Returns: {
          company: string
          created_at: string
          first_name_masked: string
          id: string
          last_name_masked: string
          masked_email: string
          masked_phone: string
          message_preview: string
          status: string
          subject: string
        }[]
      }
      get_masked_error_report: { Args: { report_id: string }; Returns: Json }
      get_masked_payment_info: { Args: { payment_id: string }; Returns: Json }
      get_newsletter_subscriptions_admin: {
        Args: never
        Returns: {
          consent_given: boolean
          created_at: string
          email: string
          id: string
          metadata: Json
          source: string
          status: string
          tags: string[]
          updated_at: string
        }[]
      }
      get_pending_security_alerts: {
        Args: never
        Returns: {
          alert_type: string
          created_at: string
          description: string
          id: string
          metadata: Json
          severity: string
          source_ip: unknown
          title: string
          user_id: string
        }[]
      }
      get_profile_completion_percentage: {
        Args: { user_uuid: string }
        Returns: number
      }
      get_security_setting: { Args: { setting_key: string }; Returns: Json }
      get_user_newsletter_subscription: {
        Args: never
        Returns: {
          consent_given: boolean
          created_at: string
          email: string
          id: string
          source: string
          status: string
          tags: string[]
          updated_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      init_loyalty_account: { Args: { user_uuid: string }; Returns: undefined }
      is_admin_user: { Args: { user_uuid: string }; Returns: boolean }
      is_authenticated_user: { Args: never; Returns: boolean }
      is_user_admin: { Args: { _user_id: string }; Returns: boolean }
      log_contact_message_access: {
        Args: { message_id: string }
        Returns: undefined
      }
      log_profile_access: {
        Args: { accessed_profile_id: string }
        Returns: undefined
      }
      log_security_event: {
        Args: {
          details?: Json
          event_type: string
          severity?: string
          user_id?: string
        }
        Returns: undefined
      }
      log_user_activity: {
        Args: {
          p_activity_type: string
          p_description?: string
          p_metadata?: Json
          p_user_id: string
        }
        Returns: undefined
      }
      mark_alerts_notified: {
        Args: { alert_ids: string[] }
        Returns: undefined
      }
      mask_email: { Args: { email: string }; Returns: string }
      mask_sensitive_data: {
        Args: { p_email: string; p_full_mask?: boolean; p_phone?: string }
        Returns: Json
      }
      monitor_audit_log_integrity: { Args: never; Returns: Json }
      monitor_contact_data_security: {
        Args: never
        Returns: {
          current_value: string
          recommendation: string
          risk_level: string
          security_metric: string
        }[]
      }
      restore_contact_data_access: { Args: never; Returns: undefined }
      update_loyalty_tier: { Args: { user_uuid: string }; Returns: undefined }
      user_owns_newsletter_subscription: {
        Args: { subscription_email: string }
        Returns: boolean
      }
      verify_admin_session: {
        Args: never
        Returns: {
          admin_email: string
          admin_name: string
          admin_role: string
          is_admin: boolean
        }[]
      }
    }
    Enums: {
      app_role: "user" | "admin" | "super_admin"
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
      app_role: ["user", "admin", "super_admin"],
    },
  },
} as const

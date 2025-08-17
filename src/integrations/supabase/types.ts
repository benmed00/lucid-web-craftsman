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
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown | null
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
          ip_address?: unknown | null
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
          ip_address?: unknown | null
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
        Relationships: []
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
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_coupons: {
        Row: {
          applicable_categories: string[] | null
          applicable_products: number[] | null
          code: string
          created_at: string | null
          created_by: string | null
          id: string
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
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
        Relationships: []
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
            foreignKeyName: "payments_order_id_fkey"
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
          ip_address: unknown | null
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
          ip_address?: unknown | null
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
          ip_address?: unknown | null
          metadata?: Json | null
          product_id?: number | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
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
            foreignKeyName: "product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
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
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          detected_at: string
          event_data: Json
          event_type: string
          id: string
          ip_address: unknown | null
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
          ip_address?: unknown | null
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
          ip_address?: unknown | null
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
            foreignKeyName: "shipments_order_id_fkey"
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string | null
          id: string
          product_id: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
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
      anonymize_sensitive_data: {
        Args: { input_data: Json }
        Returns: Json
      }
      archive_old_payment_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      can_access_support_ticket: {
        Args: { ticket_id: string }
        Returns: boolean
      }
      get_masked_payment_info: {
        Args: { payment_id: string }
        Returns: Json
      }
      get_profile_completion_percentage: {
        Args: { user_uuid: string }
        Returns: number
      }
      get_security_setting: {
        Args: { setting_key: string }
        Returns: Json
      }
      init_loyalty_account: {
        Args: { user_uuid: string }
        Returns: undefined
      }
      is_admin_user: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      log_security_event: {
        Args: {
          p_event_data?: Json
          p_event_type: string
          p_severity?: string
          p_user_id?: string
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
      update_loyalty_tier: {
        Args: { user_uuid: string }
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

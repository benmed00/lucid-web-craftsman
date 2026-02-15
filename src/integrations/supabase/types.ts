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
      admin_order_permissions: {
        Row: {
          can_force_status: boolean | null
          can_override_transitions: boolean | null
          can_process_refunds: boolean | null
          can_resolve_anomalies: boolean | null
          can_view_fraud_data: boolean | null
          created_at: string
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          notes: string | null
          permission_level: Database["public"]["Enums"]["admin_order_permission"]
          updated_at: string
          user_id: string
        }
        Insert: {
          can_force_status?: boolean | null
          can_override_transitions?: boolean | null
          can_process_refunds?: boolean | null
          can_resolve_anomalies?: boolean | null
          can_view_fraud_data?: boolean | null
          created_at?: string
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          notes?: string | null
          permission_level?: Database["public"]["Enums"]["admin_order_permission"]
          updated_at?: string
          user_id: string
        }
        Update: {
          can_force_status?: boolean | null
          can_override_transitions?: boolean | null
          can_process_refunds?: boolean | null
          can_resolve_anomalies?: boolean | null
          can_view_fraud_data?: boolean | null
          created_at?: string
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          notes?: string | null
          permission_level?: Database["public"]["Enums"]["admin_order_permission"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
          {
            foreignKeyName: "fk_admin_users_profile"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles_masked"
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
      artisan_translations: {
        Row: {
          artisan_id: string
          bio: string | null
          bio_short: string | null
          created_at: string
          id: string
          locale: string
          quote: string | null
          specialty: string | null
          updated_at: string
        }
        Insert: {
          artisan_id: string
          bio?: string | null
          bio_short?: string | null
          created_at?: string
          id?: string
          locale: string
          quote?: string | null
          specialty?: string | null
          updated_at?: string
        }
        Update: {
          artisan_id?: string
          bio?: string | null
          bio_short?: string | null
          created_at?: string
          id?: string
          locale?: string
          quote?: string | null
          specialty?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artisan_translations_artisan_id_fkey"
            columns: ["artisan_id"]
            isOneToOne: false
            referencedRelation: "artisans"
            referencedColumns: ["id"]
          },
        ]
      }
      artisans: {
        Row: {
          bio: string | null
          bio_short: string | null
          created_at: string
          experience_years: number | null
          id: string
          is_active: boolean | null
          location: string | null
          name: string
          photo_url: string | null
          quote: string | null
          region: string | null
          slug: string | null
          specialty: string | null
          techniques: string[] | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          bio_short?: string | null
          created_at?: string
          experience_years?: number | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name: string
          photo_url?: string | null
          quote?: string | null
          region?: string | null
          slug?: string | null
          specialty?: string | null
          techniques?: string[] | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          bio_short?: string | null
          created_at?: string
          experience_years?: number | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name?: string
          photo_url?: string | null
          quote?: string | null
          region?: string | null
          slug?: string | null
          specialty?: string | null
          techniques?: string[] | null
          updated_at?: string
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
      blog_post_translations: {
        Row: {
          blog_post_id: string
          content: string
          created_at: string | null
          excerpt: string | null
          id: string
          locale: string
          seo_description: string | null
          seo_title: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          blog_post_id: string
          content: string
          created_at?: string | null
          excerpt?: string | null
          id?: string
          locale: string
          seo_description?: string | null
          seo_title?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          blog_post_id?: string
          content?: string
          created_at?: string | null
          excerpt?: string | null
          id?: string
          locale?: string
          seo_description?: string | null
          seo_title?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_translations_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "fk_blog_posts_author"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles_masked"
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
          {
            foreignKeyName: "fk_cart_items_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_masked"
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
      checkout_sessions: {
        Row: {
          abandoned_at: string | null
          browser: string | null
          cart_items: Json | null
          client_country: string | null
          client_ip: string | null
          completed_at: string | null
          created_at: string
          current_step: number
          device_type: string | null
          expires_at: string | null
          guest_id: string | null
          id: string
          last_completed_step: number
          order_id: string | null
          os: string | null
          personal_info: Json | null
          promo_code: string | null
          promo_code_valid: boolean | null
          promo_discount_applied: number | null
          promo_discount_type: string | null
          promo_discount_value: number | null
          promo_free_shipping: boolean | null
          shipping_cost: number | null
          shipping_info: Json | null
          status: string
          subtotal: number | null
          total: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          abandoned_at?: string | null
          browser?: string | null
          cart_items?: Json | null
          client_country?: string | null
          client_ip?: string | null
          completed_at?: string | null
          created_at?: string
          current_step?: number
          device_type?: string | null
          expires_at?: string | null
          guest_id?: string | null
          id?: string
          last_completed_step?: number
          order_id?: string | null
          os?: string | null
          personal_info?: Json | null
          promo_code?: string | null
          promo_code_valid?: boolean | null
          promo_discount_applied?: number | null
          promo_discount_type?: string | null
          promo_discount_value?: number | null
          promo_free_shipping?: boolean | null
          shipping_cost?: number | null
          shipping_info?: Json | null
          status?: string
          subtotal?: number | null
          total?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          abandoned_at?: string | null
          browser?: string | null
          cart_items?: Json | null
          client_country?: string | null
          client_ip?: string | null
          completed_at?: string | null
          created_at?: string
          current_step?: number
          device_type?: string | null
          expires_at?: string | null
          guest_id?: string | null
          id?: string
          last_completed_step?: number
          order_id?: string | null
          os?: string | null
          personal_info?: Json | null
          promo_code?: string | null
          promo_code_valid?: boolean | null
          promo_discount_applied?: number | null
          promo_discount_type?: string | null
          promo_discount_value?: number | null
          promo_free_shipping?: boolean | null
          shipping_cost?: number | null
          shipping_info?: Json | null
          status?: string
          subtotal?: number | null
          total?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkout_sessions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
          {
            foreignKeyName: "fk_discount_coupons_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_masked"
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
      fraud_assessments: {
        Row: {
          assessment_data: Json | null
          auto_action: string | null
          created_at: string | null
          id: string
          manual_override: boolean | null
          order_id: string | null
          override_at: string | null
          override_by: string | null
          override_reason: string | null
          risk_level: string
          total_score: number
          triggered_rules: Json
        }
        Insert: {
          assessment_data?: Json | null
          auto_action?: string | null
          created_at?: string | null
          id?: string
          manual_override?: boolean | null
          order_id?: string | null
          override_at?: string | null
          override_by?: string | null
          override_reason?: string | null
          risk_level: string
          total_score?: number
          triggered_rules?: Json
        }
        Update: {
          assessment_data?: Json | null
          auto_action?: string | null
          created_at?: string | null
          id?: string
          manual_override?: boolean | null
          order_id?: string | null
          override_at?: string | null
          override_by?: string | null
          override_reason?: string | null
          risk_level?: string
          total_score?: number
          triggered_rules?: Json
        }
        Relationships: [
          {
            foreignKeyName: "fraud_assessments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_rules: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          parameters: Json | null
          rule_name: string
          rule_type: string
          score_impact: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          parameters?: Json | null
          rule_name: string
          rule_type: string
          score_impact?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          parameters?: Json | null
          rule_name?: string
          rule_type?: string
          score_impact?: number
          updated_at?: string | null
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
        Relationships: [
          {
            foreignKeyName: "fk_hero_images_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_hero_images_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_masked"
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
          {
            foreignKeyName: "fk_loyalty_points_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles_masked"
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
            foreignKeyName: "fk_loyalty_redemptions_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_masked"
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
          {
            foreignKeyName: "fk_loyalty_transactions_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_masked"
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
          {
            foreignKeyName: "fk_notification_preferences_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      order_anomalies: {
        Row: {
          anomaly_type: Database["public"]["Enums"]["order_anomaly_type"]
          auto_resolved: boolean | null
          created_at: string
          description: string | null
          detected_at: string
          detected_by: Database["public"]["Enums"]["status_change_actor"]
          escalated: boolean | null
          escalated_at: string | null
          escalated_to: string | null
          id: string
          max_retries: number | null
          metadata: Json | null
          next_retry_at: string | null
          order_id: string
          resolution_action: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          retry_count: number | null
          severity: Database["public"]["Enums"]["anomaly_severity"]
          title: string
          updated_at: string
        }
        Insert: {
          anomaly_type: Database["public"]["Enums"]["order_anomaly_type"]
          auto_resolved?: boolean | null
          created_at?: string
          description?: string | null
          detected_at?: string
          detected_by?: Database["public"]["Enums"]["status_change_actor"]
          escalated?: boolean | null
          escalated_at?: string | null
          escalated_to?: string | null
          id?: string
          max_retries?: number | null
          metadata?: Json | null
          next_retry_at?: string | null
          order_id: string
          resolution_action?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          retry_count?: number | null
          severity?: Database["public"]["Enums"]["anomaly_severity"]
          title: string
          updated_at?: string
        }
        Update: {
          anomaly_type?: Database["public"]["Enums"]["order_anomaly_type"]
          auto_resolved?: boolean | null
          created_at?: string
          description?: string | null
          detected_at?: string
          detected_by?: Database["public"]["Enums"]["status_change_actor"]
          escalated?: boolean | null
          escalated_at?: string | null
          escalated_to?: string | null
          id?: string
          max_retries?: number | null
          metadata?: Json | null
          next_retry_at?: string | null
          order_id?: string
          resolution_action?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          retry_count?: number | null
          severity?: Database["public"]["Enums"]["anomaly_severity"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_anomalies_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
      order_state_transitions: {
        Row: {
          auto_notify_customer: boolean | null
          created_at: string
          description: string | null
          from_status: Database["public"]["Enums"]["order_status"]
          id: string
          is_customer_allowed: boolean | null
          requires_permission:
            | Database["public"]["Enums"]["admin_order_permission"]
            | null
          requires_reason: boolean | null
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          auto_notify_customer?: boolean | null
          created_at?: string
          description?: string | null
          from_status: Database["public"]["Enums"]["order_status"]
          id?: string
          is_customer_allowed?: boolean | null
          requires_permission?:
            | Database["public"]["Enums"]["admin_order_permission"]
            | null
          requires_reason?: boolean | null
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          auto_notify_customer?: boolean | null
          created_at?: string
          description?: string | null
          from_status?: Database["public"]["Enums"]["order_status"]
          id?: string
          is_customer_allowed?: boolean | null
          requires_permission?:
            | Database["public"]["Enums"]["admin_order_permission"]
            | null
          requires_reason?: boolean | null
          to_status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: []
      }
      order_status_customer_mapping: {
        Row: {
          color_class: string | null
          customer_description_en: string | null
          customer_description_fr: string | null
          customer_status_key: string
          customer_status_label_en: string
          customer_status_label_fr: string
          display_order: number | null
          icon_name: string | null
          id: string
          internal_status: Database["public"]["Enums"]["order_status"]
          show_to_customer: boolean | null
        }
        Insert: {
          color_class?: string | null
          customer_description_en?: string | null
          customer_description_fr?: string | null
          customer_status_key: string
          customer_status_label_en: string
          customer_status_label_fr: string
          display_order?: number | null
          icon_name?: string | null
          id?: string
          internal_status: Database["public"]["Enums"]["order_status"]
          show_to_customer?: boolean | null
        }
        Update: {
          color_class?: string | null
          customer_description_en?: string | null
          customer_description_fr?: string | null
          customer_status_key?: string
          customer_status_label_en?: string
          customer_status_label_fr?: string
          display_order?: number | null
          icon_name?: string | null
          id?: string
          internal_status?: Database["public"]["Enums"]["order_status"]
          show_to_customer?: boolean | null
        }
        Relationships: []
      }
      order_status_history: {
        Row: {
          changed_by: Database["public"]["Enums"]["status_change_actor"]
          changed_by_user_id: string | null
          created_at: string
          free_comment: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          new_status: Database["public"]["Enums"]["order_status"]
          order_id: string
          previous_status: Database["public"]["Enums"]["order_status"] | null
          reason_code: string | null
          reason_message: string | null
          user_agent: string | null
        }
        Insert: {
          changed_by?: Database["public"]["Enums"]["status_change_actor"]
          changed_by_user_id?: string | null
          created_at?: string
          free_comment?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_status: Database["public"]["Enums"]["order_status"]
          order_id: string
          previous_status?: Database["public"]["Enums"]["order_status"] | null
          reason_code?: string | null
          reason_message?: string | null
          user_agent?: string | null
        }
        Update: {
          changed_by?: Database["public"]["Enums"]["status_change_actor"]
          changed_by_user_id?: string | null
          created_at?: string
          free_comment?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_status?: Database["public"]["Enums"]["order_status"]
          order_id?: string
          previous_status?: Database["public"]["Enums"]["order_status"] | null
          reason_code?: string | null
          reason_message?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          actual_delivery: string | null
          amount: number | null
          anomaly_count: number | null
          attention_reason: string | null
          billing_address: Json | null
          carrier: string | null
          checkout_session_id: string | null
          created_at: string
          currency: string | null
          customer_notes: string | null
          estimated_delivery: string | null
          fraud_flags: Json | null
          fraud_score: number | null
          has_anomaly: boolean | null
          id: string
          internal_notes: string | null
          last_retry_at: string | null
          metadata: Json | null
          order_status: Database["public"]["Enums"]["order_status"] | null
          payment_method: string | null
          payment_reference: string | null
          requires_attention: boolean | null
          retry_count: number | null
          shipping_address: Json | null
          status: string | null
          stripe_session_id: string | null
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          actual_delivery?: string | null
          amount?: number | null
          anomaly_count?: number | null
          attention_reason?: string | null
          billing_address?: Json | null
          carrier?: string | null
          checkout_session_id?: string | null
          created_at?: string
          currency?: string | null
          customer_notes?: string | null
          estimated_delivery?: string | null
          fraud_flags?: Json | null
          fraud_score?: number | null
          has_anomaly?: boolean | null
          id?: string
          internal_notes?: string | null
          last_retry_at?: string | null
          metadata?: Json | null
          order_status?: Database["public"]["Enums"]["order_status"] | null
          payment_method?: string | null
          payment_reference?: string | null
          requires_attention?: boolean | null
          retry_count?: number | null
          shipping_address?: Json | null
          status?: string | null
          stripe_session_id?: string | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          actual_delivery?: string | null
          amount?: number | null
          anomaly_count?: number | null
          attention_reason?: string | null
          billing_address?: Json | null
          carrier?: string | null
          checkout_session_id?: string | null
          created_at?: string
          currency?: string | null
          customer_notes?: string | null
          estimated_delivery?: string | null
          fraud_flags?: Json | null
          fraud_score?: number | null
          has_anomaly?: boolean | null
          id?: string
          internal_notes?: string | null
          last_retry_at?: string | null
          metadata?: Json | null
          order_status?: Database["public"]["Enums"]["order_status"] | null
          payment_method?: string | null
          payment_reference?: string | null
          requires_attention?: boolean | null
          retry_count?: number | null
          shipping_address?: Json | null
          status?: string | null
          stripe_session_id?: string | null
          tracking_number?: string | null
          tracking_url?: string | null
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
          {
            foreignKeyName: "fk_orders_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_checkout_session_id_fkey"
            columns: ["checkout_session_id"]
            isOneToOne: false
            referencedRelation: "checkout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          actor: string
          correlation_id: string | null
          created_at: string
          details: Json | null
          duration_ms: number | null
          error_message: string | null
          event_type: string
          id: string
          ip_address: string | null
          order_id: string | null
          status: string
          user_agent: string | null
        }
        Insert: {
          actor?: string
          correlation_id?: string | null
          created_at?: string
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          order_id?: string | null
          status?: string
          user_agent?: string | null
        }
        Update: {
          actor?: string
          correlation_id?: string | null
          created_at?: string
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          order_id?: string | null
          status?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_fk"
            columns: ["order_id"]
            isOneToOne: true
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
          {
            foreignKeyName: "fk_product_reviews_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      product_translations: {
        Row: {
          artisan_story: string | null
          care: string
          created_at: string | null
          description: string
          details: string
          id: string
          locale: string
          material: string | null
          name: string
          product_id: number
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          updated_at: string | null
        }
        Insert: {
          artisan_story?: string | null
          care: string
          created_at?: string | null
          description: string
          details: string
          id?: string
          locale: string
          material?: string | null
          name: string
          product_id: number
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          updated_at?: string | null
        }
        Update: {
          artisan_story?: string | null
          care?: string
          created_at?: string | null
          description?: string
          details?: string
          id?: string
          locale?: string
          material?: string | null
          name?: string
          product_id?: number
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_translations_product_id_fkey"
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
          artisan_id: string | null
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
          artisan_id?: string | null
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
          artisan_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "products_artisan_id_fkey"
            columns: ["artisan_id"]
            isOneToOne: false
            referencedRelation: "artisans"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "fk_security_config_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_masked"
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
          {
            foreignKeyName: "fk_shipping_addresses_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_masked"
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
          {
            foreignKeyName: "fk_support_tickets_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_masked"
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
          {
            foreignKeyName: "fk_error_reports_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      tag_translations: {
        Row: {
          ar: string | null
          created_at: string
          de: string | null
          en: string | null
          es: string | null
          fr: string
          id: string
          tag_key: string
          updated_at: string
        }
        Insert: {
          ar?: string | null
          created_at?: string
          de?: string | null
          en?: string | null
          es?: string | null
          fr: string
          id?: string
          tag_key: string
          updated_at?: string
        }
        Update: {
          ar?: string | null
          created_at?: string
          de?: string | null
          en?: string | null
          es?: string | null
          fr?: string
          id?: string
          tag_key?: string
          updated_at?: string
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
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles_masked"
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
            foreignKeyName: "fk_user_roles_granted_by"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_roles_profile"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_roles_profile"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_masked"
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
          {
            foreignKeyName: "fk_wishlist_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_masked"
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
      email_logs_masked: {
        Row: {
          created_at: string | null
          id: string | null
          order_id: string | null
          recipient_email: string | null
          recipient_name: string | null
          sent_at: string | null
          status: string | null
          template_name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          order_id?: string | null
          recipient_email?: never
          recipient_name?: never
          sent_at?: string | null
          status?: string | null
          template_name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          order_id?: string | null
          recipient_email?: never
          recipient_name?: never
          sent_at?: string | null
          status?: string | null
          template_name?: string | null
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
      profiles_masked: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          phone: string | null
          postal_code: string | null
          updated_at: string | null
        }
        Insert: {
          address_line1?: never
          address_line2?: never
          avatar_url?: string | null
          bio?: never
          city?: string | null
          country?: string | null
          created_at?: string | null
          full_name?: never
          id?: string | null
          phone?: never
          postal_code?: never
          updated_at?: string | null
        }
        Update: {
          address_line1?: never
          address_line2?: never
          avatar_url?: string | null
          bio?: never
          city?: string | null
          country?: string | null
          created_at?: string | null
          full_name?: never
          id?: string | null
          phone?: never
          postal_code?: never
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
      add_loyalty_points:
        | {
            Args: {
              p_description: string
              p_points: number
              p_source_id?: string
              p_source_type: string
              p_user_id: string
            }
            Returns: undefined
          }
        | {
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
      calculate_fraud_score: {
        Args: {
          p_billing_address: Json
          p_checkout_duration_seconds?: number
          p_customer_email: string
          p_ip_address?: string
          p_is_first_order?: boolean
          p_order_amount?: number
          p_order_id: string
          p_shipping_address: Json
          p_user_agent?: string
        }
        Returns: Json
      }
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
      confirm_order_payment: {
        Args: {
          p_amount: number
          p_currency: string
          p_order_id: string
          p_payment_intent: string
        }
        Returns: undefined
      }
      create_order_anomaly: {
        Args: {
          p_anomaly_type: Database["public"]["Enums"]["order_anomaly_type"]
          p_description?: string
          p_detected_by?: Database["public"]["Enums"]["status_change_actor"]
          p_metadata?: Json
          p_order_id: string
          p_severity: Database["public"]["Enums"]["anomaly_severity"]
          p_title: string
        }
        Returns: string
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
      get_auth_user_email: { Args: never; Returns: string }
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
      get_order_customer_view: {
        Args: { p_locale?: string; p_order_id: string; p_user_id: string }
        Returns: Json
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
      get_request_guest_id: { Args: never; Returns: string }
      get_security_setting: { Args: { setting_key: string }; Returns: Json }
      get_user_emails_for_admin: {
        Args: { p_user_ids: string[] }
        Returns: {
          email: string
          user_id: string
        }[]
      }
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
      increment_coupon_usage: { Args: { p_code: string }; Returns: undefined }
      init_loyalty_account: { Args: { p_user_id: string }; Returns: undefined }
      is_admin_user: { Args: { user_uuid: string }; Returns: boolean }
      is_authenticated_user: { Args: never; Returns: boolean }
      is_profile_owner: { Args: { profile_user_id: string }; Returns: boolean }
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
      mark_abandoned_checkout_sessions: { Args: never; Returns: number }
      mark_alerts_notified: {
        Args: { alert_ids: string[] }
        Returns: undefined
      }
      mask_email: { Args: { email: string }; Returns: string }
      mask_phone:
        | {
            Args: { phone_number: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.mask_phone(phone_number => text), public.mask_phone(phone_number => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { phone_number: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.mask_phone(phone_number => text), public.mask_phone(phone_number => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
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
      override_fraud_assessment: {
        Args: { p_action: string; p_order_id: string; p_reason: string }
        Returns: Json
      }
      resolve_order_anomaly: {
        Args: {
          p_anomaly_id: string
          p_resolution_action?: string
          p_resolution_notes: string
          p_resolved_by: string
        }
        Returns: boolean
      }
      restore_contact_data_access: { Args: never; Returns: undefined }
      update_loyalty_tier: { Args: { p_user_id: string }; Returns: undefined }
      update_order_status: {
        Args: {
          p_actor?: Database["public"]["Enums"]["status_change_actor"]
          p_actor_user_id?: string
          p_metadata?: Json
          p_new_status: Database["public"]["Enums"]["order_status"]
          p_order_id: string
          p_reason_code?: string
          p_reason_message?: string
        }
        Returns: Json
      }
      user_owns_newsletter_subscription: {
        Args: { subscription_email: string }
        Returns: boolean
      }
      validate_order_status_transition: {
        Args: {
          p_actor?: Database["public"]["Enums"]["status_change_actor"]
          p_actor_user_id?: string
          p_new_status: Database["public"]["Enums"]["order_status"]
          p_order_id: string
          p_reason_code?: string
          p_reason_message?: string
        }
        Returns: Json
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
      admin_order_permission: "read_only" | "operations" | "full_access"
      anomaly_severity: "low" | "medium" | "high" | "critical"
      app_role: "user" | "admin" | "super_admin"
      order_anomaly_type:
        | "payment"
        | "stock"
        | "delivery"
        | "fraud"
        | "technical"
        | "customer"
        | "carrier"
      order_status:
        | "created"
        | "payment_pending"
        | "payment_failed"
        | "paid"
        | "validation_in_progress"
        | "validated"
        | "preparing"
        | "shipped"
        | "in_transit"
        | "delivered"
        | "delivery_failed"
        | "partially_delivered"
        | "return_requested"
        | "returned"
        | "refunded"
        | "partially_refunded"
        | "cancelled"
        | "archived"
      status_change_actor:
        | "system"
        | "admin"
        | "customer"
        | "webhook"
        | "scheduler"
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
      admin_order_permission: ["read_only", "operations", "full_access"],
      anomaly_severity: ["low", "medium", "high", "critical"],
      app_role: ["user", "admin", "super_admin"],
      order_anomaly_type: [
        "payment",
        "stock",
        "delivery",
        "fraud",
        "technical",
        "customer",
        "carrier",
      ],
      order_status: [
        "created",
        "payment_pending",
        "payment_failed",
        "paid",
        "validation_in_progress",
        "validated",
        "preparing",
        "shipped",
        "in_transit",
        "delivered",
        "delivery_failed",
        "partially_delivered",
        "return_requested",
        "returned",
        "refunded",
        "partially_refunded",
        "cancelled",
        "archived",
      ],
      status_change_actor: [
        "system",
        "admin",
        "customer",
        "webhook",
        "scheduler",
      ],
    },
  },
} as const

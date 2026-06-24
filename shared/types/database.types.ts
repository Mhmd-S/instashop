export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          meta: Json | null
          store_id: string | null
          target: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          store_id?: string | null
          target?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          store_id?: string | null
          target?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      branding_assets: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          ig_child_id: string | null
          ig_media_id: string
          ig_permalink: string | null
          ig_posted_at: string | null
          mood_keywords: string[]
          public_url: string | null
          role: string
          storage_path: string | null
          store_id: string
          used_as: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          ig_child_id?: string | null
          ig_media_id: string
          ig_permalink?: string | null
          ig_posted_at?: string | null
          mood_keywords?: string[]
          public_url?: string | null
          role?: string
          storage_path?: string | null
          store_id: string
          used_as?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          ig_child_id?: string | null
          ig_media_id?: string
          ig_permalink?: string | null
          ig_posted_at?: string | null
          mood_keywords?: string[]
          public_url?: string | null
          role?: string
          storage_path?: string | null
          store_id?: string
          used_as?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branding_assets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          position: number
          slug: string
          source: string
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          position?: number
          slug: string
          source?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          position?: number
          slug?: string
          source?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          store_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          store_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          store_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_accounts: {
        Row: {
          access_token_secret_id: string | null
          account_type: string | null
          connected_at: string
          created_at: string
          data_deletion_requested_at: string | null
          deauthorized_at: string | null
          fb_page_id: string | null
          id: string
          ig_user_id: string
          ig_username: string | null
          last_sync_at: string | null
          last_sync_cursor: string | null
          last_sync_error: string | null
          media_count: number | null
          name: string | null
          profile_picture_storage_path: string | null
          profile_picture_url: string | null
          provider: string
          scopes: string[]
          store_id: string
          token_expires_at: string | null
          token_refreshed_at: string | null
          token_status: string
          token_type: string | null
          updated_at: string
        }
        Insert: {
          access_token_secret_id?: string | null
          account_type?: string | null
          connected_at?: string
          created_at?: string
          data_deletion_requested_at?: string | null
          deauthorized_at?: string | null
          fb_page_id?: string | null
          id?: string
          ig_user_id: string
          ig_username?: string | null
          last_sync_at?: string | null
          last_sync_cursor?: string | null
          last_sync_error?: string | null
          media_count?: number | null
          name?: string | null
          profile_picture_storage_path?: string | null
          profile_picture_url?: string | null
          provider?: string
          scopes?: string[]
          store_id: string
          token_expires_at?: string | null
          token_refreshed_at?: string | null
          token_status?: string
          token_type?: string | null
          updated_at?: string
        }
        Update: {
          access_token_secret_id?: string | null
          account_type?: string | null
          connected_at?: string
          created_at?: string
          data_deletion_requested_at?: string | null
          deauthorized_at?: string | null
          fb_page_id?: string | null
          id?: string
          ig_user_id?: string
          ig_username?: string | null
          last_sync_at?: string | null
          last_sync_cursor?: string | null
          last_sync_error?: string | null
          media_count?: number | null
          name?: string | null
          profile_picture_storage_path?: string | null
          profile_picture_url?: string | null
          provider?: string
          scopes?: string[]
          store_id?: string
          token_expires_at?: string | null
          token_refreshed_at?: string | null
          token_status?: string
          token_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ig_accounts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_analysis: {
        Row: {
          analyzed_at: string
          attributes: Json
          branding_role: string | null
          confidence: number
          currency: string | null
          description: string | null
          hero_unit_index: number | null
          id: string
          ig_child_id: string | null
          ig_media_id: string
          image_alts: Json
          is_product: boolean
          model: string | null
          mood_keywords: string[]
          price_minor: number | null
          product_key: string | null
          product_summary: string | null
          store_id: string
          suggested_categories: string[]
          title: string | null
        }
        Insert: {
          analyzed_at?: string
          attributes?: Json
          branding_role?: string | null
          confidence?: number
          currency?: string | null
          description?: string | null
          hero_unit_index?: number | null
          id?: string
          ig_child_id?: string | null
          ig_media_id: string
          image_alts?: Json
          is_product?: boolean
          model?: string | null
          mood_keywords?: string[]
          price_minor?: number | null
          product_key?: string | null
          product_summary?: string | null
          store_id: string
          suggested_categories?: string[]
          title?: string | null
        }
        Update: {
          analyzed_at?: string
          attributes?: Json
          branding_role?: string | null
          confidence?: number
          currency?: string | null
          description?: string | null
          hero_unit_index?: number | null
          id?: string
          ig_child_id?: string | null
          ig_media_id?: string
          image_alts?: Json
          is_product?: boolean
          model?: string | null
          mood_keywords?: string[]
          price_minor?: number | null
          product_key?: string | null
          product_summary?: string | null
          store_id?: string
          suggested_categories?: string[]
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ig_analysis_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_deletion_requests: {
        Row: {
          completed_at: string | null
          confirmation_code: string
          detail: string | null
          ig_user_id: string
          requested_at: string
          status: string
          store_id: string | null
        }
        Insert: {
          completed_at?: string | null
          confirmation_code: string
          detail?: string | null
          ig_user_id: string
          requested_at?: string
          status?: string
          store_id?: string | null
        }
        Update: {
          completed_at?: string | null
          confirmation_code?: string
          detail?: string | null
          ig_user_id?: string
          requested_at?: string
          status?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ig_deletion_requests_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_oauth_states: {
        Row: {
          created_at: string
          expires_at: string
          nonce: string
          provider: string
          return_to: string | null
          store_id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          nonce: string
          provider?: string
          return_to?: string | null
          store_id: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          nonce?: string
          provider?: string
          return_to?: string | null
          store_id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ig_oauth_states_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ig_oauth_states_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          actor_id: string | null
          created_at: string
          from_value: string | null
          id: string
          kind: string
          meta: Json | null
          order_id: string
          store_id: string
          to_value: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          from_value?: string | null
          id?: string
          kind: string
          meta?: Json | null
          order_id: string
          store_id: string
          to_value?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          from_value?: string | null
          id?: string
          kind?: string
          meta?: Json | null
          order_id?: string
          store_id?: string
          to_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          image_url_snapshot: string | null
          line_total_minor: number
          order_id: string
          product_id: string | null
          quantity: number
          store_id: string
          title_snapshot: string
          unit_price_minor: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url_snapshot?: string | null
          line_total_minor: number
          order_id: string
          product_id?: string | null
          quantity: number
          store_id: string
          title_snapshot: string
          unit_price_minor: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url_snapshot?: string | null
          line_total_minor?: number
          order_id?: string
          product_id?: string | null
          quantity?: number
          store_id?: string
          title_snapshot?: string
          unit_price_minor?: number
          variant_id?: string | null
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
          {
            foreignKeyName: "order_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          access_token: string
          cancelled_at: string | null
          confirmed_at: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          currency: string
          custom_fields: Json
          customer_id: string | null
          customer_note: string | null
          discount_minor: number
          fulfilled_at: string | null
          fulfillment_status: Database["public"]["Enums"]["fulfillment_status"]
          id: string
          idempotency_key: string | null
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          placed_at: string
          restocked_at: string | null
          ship_city: string | null
          ship_country: string | null
          ship_line1: string | null
          ship_line2: string | null
          ship_name: string | null
          ship_postcode: string | null
          ship_region: string | null
          shipping_minor: number
          status: Database["public"]["Enums"]["order_status"]
          store_id: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          subtotal_minor: number
          tax_minor: number
          total_minor: number
          updated_at: string
        }
        Insert: {
          access_token?: string
          cancelled_at?: string | null
          confirmed_at?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          currency: string
          custom_fields?: Json
          customer_id?: string | null
          customer_note?: string | null
          discount_minor?: number
          fulfilled_at?: string | null
          fulfillment_status?: Database["public"]["Enums"]["fulfillment_status"]
          id?: string
          idempotency_key?: string | null
          order_number: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          placed_at?: string
          restocked_at?: string | null
          ship_city?: string | null
          ship_country?: string | null
          ship_line1?: string | null
          ship_line2?: string | null
          ship_name?: string | null
          ship_postcode?: string | null
          ship_region?: string | null
          shipping_minor?: number
          status?: Database["public"]["Enums"]["order_status"]
          store_id: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal_minor?: number
          tax_minor?: number
          total_minor?: number
          updated_at?: string
        }
        Update: {
          access_token?: string
          cancelled_at?: string | null
          confirmed_at?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string
          custom_fields?: Json
          customer_id?: string | null
          customer_note?: string | null
          discount_minor?: number
          fulfilled_at?: string | null
          fulfillment_status?: Database["public"]["Enums"]["fulfillment_status"]
          id?: string
          idempotency_key?: string | null
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          placed_at?: string
          restocked_at?: string | null
          ship_city?: string | null
          ship_country?: string | null
          ship_line1?: string | null
          ship_line2?: string | null
          ship_name?: string | null
          ship_postcode?: string | null
          ship_region?: string | null
          shipping_minor?: number
          status?: Database["public"]["Enums"]["order_status"]
          store_id?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal_minor?: number
          tax_minor?: number
          total_minor?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_minor: number
          created_at: string
          currency: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          provider_status:
            | Database["public"]["Enums"]["payment_provider_status"]
            | null
          raw: Json | null
          received_at: string | null
          recorded_by: string | null
          store_id: string
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount_minor: number
          created_at?: string
          currency: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          provider_status?:
            | Database["public"]["Enums"]["payment_provider_status"]
            | null
          raw?: Json | null
          received_at?: string | null
          recorded_by?: string | null
          store_id: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount_minor?: number
          created_at?: string
          currency?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          order_id?: string
          provider_status?:
            | Database["public"]["Enums"]["payment_provider_status"]
            | null
          raw?: Json | null
          received_at?: string | null
          recorded_by?: string | null
          store_id?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          category_id: string
          created_at: string
          product_id: string
          store_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          product_id: string
          store_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          product_id?: string
          store_id?: string
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
          {
            foreignKeyName: "product_categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_ig_posts: {
        Row: {
          created_at: string
          id: string
          ig_child_id: string | null
          ig_media_id: string
          ig_permalink: string | null
          ig_posted_at: string | null
          product_id: string
          product_image_id: string | null
          store_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ig_child_id?: string | null
          ig_media_id: string
          ig_permalink?: string | null
          ig_posted_at?: string | null
          product_id: string
          product_image_id?: string | null
          store_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ig_child_id?: string | null
          ig_media_id?: string
          ig_permalink?: string | null
          ig_posted_at?: string | null
          product_id?: string
          product_image_id?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_ig_posts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ig_posts_product_image_id_fkey"
            columns: ["product_image_id"]
            isOneToOne: false
            referencedRelation: "product_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ig_posts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt: string | null
          created_at: string
          id: string
          is_video: boolean
          phash: string | null
          position: number
          product_id: string
          public_url: string | null
          storage_path: string
          store_id: string
          video_url: string | null
        }
        Insert: {
          alt?: string | null
          created_at?: string
          id?: string
          is_video?: boolean
          phash?: string | null
          position?: number
          product_id: string
          public_url?: string | null
          storage_path: string
          store_id: string
          video_url?: string | null
        }
        Update: {
          alt?: string | null
          created_at?: string
          id?: string
          is_video?: boolean
          phash?: string | null
          position?: number
          product_id?: string
          public_url?: string | null
          storage_path?: string
          store_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          position: number
          price_minor: number | null
          product_id: string
          sku: string | null
          stock: number | null
          store_id: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          price_minor?: number | null
          product_id: string
          sku?: string | null
          stock?: number | null
          store_id: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          price_minor?: number | null
          product_id?: string
          sku?: string | null
          stock?: number | null
          store_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          id: string
          ig_media_id: string | null
          ig_permalink: string | null
          ig_posted_at: string | null
          image_url: string | null
          locked_by_seller: boolean
          needs_review: boolean
          position: number
          price_minor: number
          slug: string
          source: string
          status: Database["public"]["Enums"]["product_status"]
          stock: number | null
          store_id: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          ig_media_id?: string | null
          ig_permalink?: string | null
          ig_posted_at?: string | null
          image_url?: string | null
          locked_by_seller?: boolean
          needs_review?: boolean
          position?: number
          price_minor?: number
          slug: string
          source?: string
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number | null
          store_id: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          ig_media_id?: string | null
          ig_permalink?: string | null
          ig_posted_at?: string | null
          image_url?: string | null
          locked_by_seller?: boolean
          needs_review?: boolean
          position?: number
          price_minor?: number
          slug?: string
          source?: string
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number | null
          store_id?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          global_role: Database["public"]["Enums"]["global_role"]
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          global_role?: Database["public"]["Enums"]["global_role"]
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          global_role?: Database["public"]["Enums"]["global_role"]
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reserved_subdomains: {
        Row: {
          name: string
        }
        Insert: {
          name: string
        }
        Update: {
          name?: string
        }
        Relationships: []
      }
      store_members: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["member_role"]
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_members_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          active_theme_id: string | null
          auto_confirm_on_paid: boolean
          base_currency: string
          checkout_config: Json
          created_at: string
          default_country: string | null
          id: string
          name: string
          next_order_seq: number
          notify_email: string | null
          onboarding_reviewed: Json
          owner_id: string
          payment_methods: Database["public"]["Enums"]["payment_method"][]
          status: Database["public"]["Enums"]["store_status"]
          subdomain: string
          track_inventory: boolean
          updated_at: string
        }
        Insert: {
          active_theme_id?: string | null
          auto_confirm_on_paid?: boolean
          base_currency?: string
          checkout_config?: Json
          created_at?: string
          default_country?: string | null
          id?: string
          name: string
          next_order_seq?: number
          notify_email?: string | null
          onboarding_reviewed?: Json
          owner_id: string
          payment_methods?: Database["public"]["Enums"]["payment_method"][]
          status?: Database["public"]["Enums"]["store_status"]
          subdomain: string
          track_inventory?: boolean
          updated_at?: string
        }
        Update: {
          active_theme_id?: string | null
          auto_confirm_on_paid?: boolean
          base_currency?: string
          checkout_config?: Json
          created_at?: string
          default_country?: string | null
          id?: string
          name?: string
          next_order_seq?: number
          notify_email?: string | null
          onboarding_reviewed?: Json
          owner_id?: string
          payment_methods?: Database["public"]["Enums"]["payment_method"][]
          status?: Database["public"]["Enums"]["store_status"]
          subdomain?: string
          track_inventory?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_active_theme_fk"
            columns: ["active_theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stores_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_accounts: {
        Row: {
          charges_enabled: boolean
          connected_at: string
          details_submitted: boolean
          id: string
          payouts_enabled: boolean
          platform_fee_bps: number | null
          requirements: Json | null
          store_id: string
          stripe_account_id: string
          updated_at: string
        }
        Insert: {
          charges_enabled?: boolean
          connected_at?: string
          details_submitted?: boolean
          id?: string
          payouts_enabled?: boolean
          platform_fee_bps?: number | null
          requirements?: Json | null
          store_id: string
          stripe_account_id: string
          updated_at?: string
        }
        Update: {
          charges_enabled?: boolean
          connected_at?: string
          details_submitted?: boolean
          id?: string
          payouts_enabled?: boolean
          platform_fee_bps?: number | null
          requirements?: Json | null
          store_id?: string
          stripe_account_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_accounts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      themes: {
        Row: {
          generated_at: string
          id: string
          logo: Json
          meta: Json
          model: string | null
          source_post_ids: string[]
          store_id: string
          tokens: Json
          version: number
        }
        Insert: {
          generated_at?: string
          id?: string
          logo?: Json
          meta?: Json
          model?: string | null
          source_post_ids?: string[]
          store_id: string
          tokens?: Json
          version: number
        }
        Update: {
          generated_at?: string
          id?: string
          logo?: Json
          meta?: Json
          model?: string | null
          source_post_ids?: string[]
          store_id?: string
          tokens?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "themes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          id: string
          processed_at: string
          store_id: string | null
          type: string
        }
        Insert: {
          id: string
          processed_at?: string
          store_id?: string | null
          type: string
        }
        Update: {
          id?: string
          processed_at?: string
          store_id?: string | null
          type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrement_stock: {
        Args: { p_product: string; p_qty: number; p_store: string }
        Returns: boolean
      }
      ig_delete_token: { Args: { p_secret_id: string }; Returns: undefined }
      ig_read_token: { Args: { p_secret_id: string }; Returns: string }
      ig_store_token: {
        Args: { p_name: string; p_secret: string }
        Returns: string
      }
      ig_update_token: {
        Args: { p_secret: string; p_secret_id: string }
        Returns: undefined
      }
      increment_stock: {
        Args: { p_product: string; p_qty: number; p_store: string }
        Returns: undefined
      }
      is_store_member: { Args: { p_store: string }; Returns: boolean }
      list_stale_stripe_orders: {
        Args: { p_older_than: string }
        Returns: {
          order_id: string
          pi: string
          store_id: string
        }[]
      }
      mark_order_paid_cod: {
        Args: { p_actor: string; p_order: string; p_store: string }
        Returns: undefined
      }
      mark_order_paid_stripe: {
        Args: {
          p_amount: number
          p_charge: string
          p_currency: string
          p_order: string
          p_pi: string
          p_raw: Json
          p_store: string
        }
        Returns: undefined
      }
      mark_order_payment_failed_stripe: {
        Args: {
          p_amount: number
          p_currency: string
          p_order: string
          p_pi: string
          p_raw: Json
          p_store: string
        }
        Returns: undefined
      }
      order_lookup: {
        Args: { p_order: string; p_token: string }
        Returns: Json
      }
      place_order: {
        Args: {
          p_contact: Json
          p_custom?: Json
          p_idem: string
          p_lines: Json
          p_note: string
          p_payment_method?: Database["public"]["Enums"]["payment_method"]
          p_ship: Json
          p_store: string
        }
        Returns: {
          access_token: string
          order_id: string
          order_number: string
        }[]
      }
      record_stripe_refund: {
        Args: {
          p_pi: string
          p_raw: Json
          p_refunded_total: number
          p_store: string
        }
        Returns: undefined
      }
      sync_primary_image: {
        Args: { p_product: string; p_store: string }
        Returns: undefined
      }
      transition_order_status: {
        Args: {
          p_actor: string
          p_order: string
          p_store: string
          p_target: Database["public"]["Enums"]["order_status"]
        }
        Returns: undefined
      }
    }
    Enums: {
      fulfillment_status: "unfulfilled" | "partial" | "fulfilled"
      global_role: "user" | "superadmin"
      member_role: "owner" | "admin" | "staff"
      order_status:
        | "pending"
        | "confirmed"
        | "fulfilled"
        | "cancelled"
        | "refunded"
      payment_method: "cod" | "stripe"
      payment_provider_status:
        | "requires_action"
        | "processing"
        | "succeeded"
        | "failed"
        | "refunded"
      payment_status:
        | "unpaid"
        | "pending"
        | "paid"
        | "partially_refunded"
        | "refunded"
        | "failed"
      product_status: "draft" | "published" | "archived"
      store_status: "pending" | "active" | "suspended" | "archived"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      fulfillment_status: ["unfulfilled", "partial", "fulfilled"],
      global_role: ["user", "superadmin"],
      member_role: ["owner", "admin", "staff"],
      order_status: [
        "pending",
        "confirmed",
        "fulfilled",
        "cancelled",
        "refunded",
      ],
      payment_method: ["cod", "stripe"],
      payment_provider_status: [
        "requires_action",
        "processing",
        "succeeded",
        "failed",
        "refunded",
      ],
      payment_status: [
        "unpaid",
        "pending",
        "paid",
        "partially_refunded",
        "refunded",
        "failed",
      ],
      product_status: ["draft", "published", "archived"],
      store_status: ["pending", "active", "suspended", "archived"],
    },
  },
} as const


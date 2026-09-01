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
      addresses: {
        Row: {
          city: string
          created_at: string
          details: string
          district: string
          id: string
          is_default: boolean
          label: string
          landmark: string
          latitude: number | null
          longitude: number | null
          phone: string
          recipient_name: string
          user_id: string
        }
        Insert: {
          city: string
          created_at?: string
          details?: string
          district?: string
          id?: string
          is_default?: boolean
          label?: string
          landmark?: string
          latitude?: number | null
          longitude?: number | null
          phone: string
          recipient_name: string
          user_id: string
        }
        Update: {
          city?: string
          created_at?: string
          details?: string
          district?: string
          id?: string
          is_default?: boolean
          label?: string
          landmark?: string
          latitude?: number | null
          longitude?: number | null
          phone?: string
          recipient_name?: string
          user_id?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          cta_label: string
          id: string
          image_url: string
          is_active: boolean
          link_url: string
          sort_order: number
          subtitle: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_label?: string
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string
          sort_order?: number
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_label?: string
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string
          sort_order?: number
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      bottom_nav_items: {
        Row: {
          created_at: string | null
          icon_name: string
          id: string
          is_active: boolean | null
          is_cart_badge: boolean | null
          path: string
          sort_order: number | null
          title: string
        }
        Insert: {
          created_at?: string | null
          icon_name: string
          id?: string
          is_active?: boolean | null
          is_cart_badge?: boolean | null
          path: string
          sort_order?: number | null
          title: string
        }
        Update: {
          created_at?: string | null
          icon_name?: string
          id?: string
          is_active?: boolean | null
          is_cart_badge?: boolean | null
          path?: string
          sort_order?: number | null
          title?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          slug: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          slug?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          slug?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          color: string | null
          created_at: string
          id: string
          product_id: string
          quantity: number
          size: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          size?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          size?: string | null
          user_id?: string
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
          created_at: string
          icon: string
          id: string
          image_url: string | null
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          image_url?: string | null
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      couriers: {
        Row: {
          account_enabled: boolean
          city: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_enabled?: boolean
          city?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_enabled?: boolean
          city?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          created_at: string
          id: string
          is_active: boolean
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer?: string
          created_at?: string
          id?: string
          is_active?: boolean
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          is_active?: boolean
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      flash_sales: {
        Row: {
          created_at: string
          discount_percentage: number
          ends_at: string
          id: string
          is_active: boolean
          product_id: string
          starts_at: string
          stock_limit: number
        }
        Insert: {
          created_at?: string
          discount_percentage?: number
          ends_at: string
          id?: string
          is_active?: boolean
          product_id: string
          starts_at?: string
          stock_limit?: number
        }
        Update: {
          created_at?: string
          discount_percentage?: number
          ends_at?: string
          id?: string
          is_active?: boolean
          product_id?: string
          starts_at?: string
          stock_limit?: number
        }
        Relationships: [
          {
            foreignKeyName: "flash_sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          movement_type: string
          note: string
          product_id: string
          quantity: number
          reference_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: string
          note?: string
          product_id: string
          quantity: number
          reference_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: string
          note?: string
          product_id?: string
          quantity?: number
          reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          id: string
          invoice_number: string
          issued_at: string
          order_id: string
          snapshot: Json
        }
        Insert: {
          id?: string
          invoice_number?: string
          issued_at?: string
          order_id: string
          snapshot?: Json
        }
        Update: {
          id?: string
          invoice_number?: string
          issued_at?: string
          order_id?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      nav_items: {
        Row: {
          created_at: string
          icon: string
          id: string
          is_active: boolean
          label: string
          path: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          label: string
          path: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          label?: string
          path?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          orders: boolean
          promos: boolean
          push_enabled: boolean
          system: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          orders?: boolean
          promos?: boolean
          push_enabled?: boolean
          system?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          orders?: boolean
          promos?: boolean
          push_enabled?: boolean
          system?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          kind: string
          link_url: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          link_url?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          link_url?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          color: string | null
          id: string
          order_id: string
          product_id: string | null
          product_image: string
          product_name: string
          quantity: number
          size: string | null
          unit_price: number
        }
        Insert: {
          color?: string | null
          id?: string
          order_id: string
          product_id?: string | null
          product_image?: string
          product_name: string
          quantity?: number
          size?: string | null
          unit_price: number
        }
        Update: {
          color?: string | null
          id?: string
          order_id?: string
          product_id?: string | null
          product_image?: string
          product_name?: string
          quantity?: number
          size?: string | null
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
          checkout_token: string | null
          courier_id: string | null
          created_at: string
          delivery_fee: number
          id: string
          invoice_number: string | null
          latitude: number | null
          longitude: number | null
          notes: string
          order_number: string
          payment_method_code: string
          payment_status: string
          shipping_city: string
          shipping_details: string
          shipping_district: string
          shipping_landmark: string
          shipping_name: string
          shipping_phone: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          checkout_token?: string | null
          courier_id?: string | null
          created_at?: string
          delivery_fee?: number
          id?: string
          invoice_number?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string
          order_number?: string
          payment_method_code?: string
          payment_status?: string
          shipping_city?: string
          shipping_details?: string
          shipping_district?: string
          shipping_landmark?: string
          shipping_name?: string
          shipping_phone?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          checkout_token?: string | null
          courier_id?: string | null
          created_at?: string
          delivery_fee?: number
          id?: string
          invoice_number?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string
          order_number?: string
          payment_method_code?: string
          payment_status?: string
          shipping_city?: string
          shipping_details?: string
          shipping_district?: string
          shipping_landmark?: string
          shipping_name?: string
          shipping_phone?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_published: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_published?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_published?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          account_name: string
          account_number: string
          code: string
          created_at: string
          display_name: string
          id: string
          instructions: string
          is_active: boolean
          kind: string
          requires_receipt: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          account_name?: string
          account_number?: string
          code: string
          created_at?: string
          display_name: string
          id?: string
          instructions?: string
          is_active?: boolean
          kind?: string
          requires_receipt?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          code?: string
          created_at?: string
          display_name?: string
          id?: string
          instructions?: string
          is_active?: boolean
          kind?: string
          requires_receipt?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          admin_note: string
          amount: number
          created_at: string
          id: string
          method_code: string
          order_id: string | null
          purpose: string
          receipt_path: string
          reference: string
          reviewed_at: string | null
          sender_name: string
          sender_phone: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string
          amount: number
          created_at?: string
          id?: string
          method_code: string
          order_id?: string | null
          purpose?: string
          receipt_path?: string
          reference?: string
          reviewed_at?: string | null
          sender_name?: string
          sender_phone?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string
          amount?: number
          created_at?: string
          id?: string
          method_code?: string
          order_id?: string | null
          purpose?: string
          receipt_path?: string
          reference?: string
          reviewed_at?: string | null
          sender_name?: string
          sender_phone?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          comment: string
          created_at: string
          id: string
          is_approved: boolean | null
          product_id: string | null
          rating: number
          user_name: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          is_approved?: boolean | null
          product_id?: string | null
          rating: number
          user_name: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          is_approved?: boolean | null
          product_id?: string | null
          rating?: number
          user_name?: string
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
          badge: string | null
          brand_id: string | null
          brand_slug: string | null
          category_attributes: Json | null
          category_id: string | null
          category_slug: string | null
          city: string
          colors: string[]
          created_at: string
          description: string
          discount_price: number | null
          id: string
          images: string[]
          is_active: boolean
          is_local: boolean
          is_yemeni_local: boolean | null
          low_stock_threshold: number
          name: string
          offer_end_date: string | null
          old_price: number | null
          origin: string | null
          original_price: number | null
          price: number
          price_sar: number | null
          rating: number
          reviews_count: number
          sales_count: number
          sizes: string[]
          slug: string | null
          sort_order: number | null
          stock_left: number
          supplier_info: Json | null
          total_stock: number
          unit: string | null
          vendor_id: string | null
        }
        Insert: {
          badge?: string | null
          brand_id?: string | null
          brand_slug?: string | null
          category_attributes?: Json | null
          category_id?: string | null
          category_slug?: string | null
          city?: string
          colors?: string[]
          created_at?: string
          description?: string
          discount_price?: number | null
          id?: string
          images?: string[]
          is_active?: boolean
          is_local?: boolean
          is_yemeni_local?: boolean | null
          low_stock_threshold?: number
          name: string
          offer_end_date?: string | null
          old_price?: number | null
          origin?: string | null
          original_price?: number | null
          price: number
          price_sar?: number | null
          rating?: number
          reviews_count?: number
          sales_count?: number
          sizes?: string[]
          slug?: string | null
          sort_order?: number | null
          stock_left?: number
          supplier_info?: Json | null
          total_stock?: number
          unit?: string | null
          vendor_id?: string | null
        }
        Update: {
          badge?: string | null
          brand_id?: string | null
          brand_slug?: string | null
          category_attributes?: Json | null
          category_id?: string | null
          category_slug?: string | null
          city?: string
          colors?: string[]
          created_at?: string
          description?: string
          discount_price?: number | null
          id?: string
          images?: string[]
          is_active?: boolean
          is_local?: boolean
          is_yemeni_local?: boolean | null
          low_stock_threshold?: number
          name?: string
          offer_end_date?: string | null
          old_price?: number | null
          origin?: string | null
          original_price?: number | null
          price?: number
          price_sar?: number | null
          rating?: number
          reviews_count?: number
          sales_count?: number
          sizes?: string[]
          slug?: string | null
          sort_order?: number | null
          stock_left?: number
          supplier_info?: Json | null
          total_stock?: number
          unit?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          accepted_order_policy: boolean
          accepted_terms: boolean
          created_at: string
          full_name: string
          id: string
          is_disabled: boolean
          phone: string | null
          preferred_currency: string
          updated_at: string
          wallet_balance: number
        }
        Insert: {
          accepted_order_policy?: boolean
          accepted_terms?: boolean
          created_at?: string
          full_name?: string
          id: string
          is_disabled?: boolean
          phone?: string | null
          preferred_currency?: string
          updated_at?: string
          wallet_balance?: number
        }
        Update: {
          accepted_order_policy?: boolean
          accepted_terms?: boolean
          created_at?: string
          full_name?: string
          id?: string
          is_disabled?: boolean
          phone?: string | null
          preferred_currency?: string
          updated_at?: string
          wallet_balance?: number
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_name: string
          comment: string
          created_at: string
          id: string
          product_id: string
          rating: number
          user_id: string | null
        }
        Insert: {
          author_name?: string
          comment?: string
          created_at?: string
          id?: string
          product_id: string
          rating?: number
          user_id?: string | null
        }
        Update: {
          author_name?: string
          comment?: string
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          address: string
          announcement_active: boolean
          announcement_link: string
          announcement_text: string
          closed_message: string
          created_at: string
          custom_banners_4to1: Json | null
          delivery_fee: number
          email: string
          facebook: string
          footer_copyright: string
          footer_note: string
          id: boolean
          instagram: string
          is_open: boolean
          logo_url: string
          phone: string
          sar_rate: number
          store_name: string
          tagline: string
          telegram: string
          tiktok: string
          twitter: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          address?: string
          announcement_active?: boolean
          announcement_link?: string
          announcement_text?: string
          closed_message?: string
          created_at?: string
          custom_banners_4to1?: Json | null
          delivery_fee?: number
          email?: string
          facebook?: string
          footer_copyright?: string
          footer_note?: string
          id?: boolean
          instagram?: string
          is_open?: boolean
          logo_url?: string
          phone?: string
          sar_rate?: number
          store_name?: string
          tagline?: string
          telegram?: string
          tiktok?: string
          twitter?: string
          updated_at?: string
          whatsapp?: string
        }
        Update: {
          address?: string
          announcement_active?: boolean
          announcement_link?: string
          announcement_text?: string
          closed_message?: string
          created_at?: string
          custom_banners_4to1?: Json | null
          delivery_fee?: number
          email?: string
          facebook?: string
          footer_copyright?: string
          footer_note?: string
          id?: boolean
          instagram?: string
          is_open?: boolean
          logo_url?: string
          phone?: string
          sar_rate?: number
          store_name?: string
          tagline?: string
          telegram?: string
          tiktok?: string
          twitter?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          created_at: string
          created_by: string | null
          duration: number
          expires_at: string | null
          id: string
          image_url: string
          is_active: boolean
          link_url: string | null
          sort_order: number
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duration?: number
          expires_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duration?: number
          expires_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          sender: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender?: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "support_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      support_threads: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_push_subscriptions: {
        Row: {
          created_at: string | null
          id: number
          subscription: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          subscription: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          subscription?: Json
          user_id?: string | null
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
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          account_enabled: boolean
          city: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          user_id: string | null
        }
        Insert: {
          account_enabled?: boolean
          city?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          user_id?: string | null
        }
        Update: {
          account_enabled?: boolean
          city?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          kind: string
          order_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string
          id?: string
          kind: string
          order_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          kind?: string
          order_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      broadcast_notification: {
        Args: { _body: string; _link?: string; _title: string }
        Returns: number
      }
      bytea_to_text: { Args: { data: string }; Returns: string }
      create_checkout_order: {
        Args: {
          _checkout_token: string
          _delivery_fee: number
          _items: Json
          _latitude?: number
          _longitude?: number
          _needs_payment_request?: boolean
          _notes?: string
          _payment_method_code: string
          _payment_status: string
          _receipt_path?: string
          _reference?: string
          _sender_name?: string
          _sender_phone?: string
          _shipping_city: string
          _shipping_details: string
          _shipping_district: string
          _shipping_landmark?: string
          _shipping_name: string
          _shipping_phone: string
          _status: Database["public"]["Enums"]["order_status"]
          _subtotal: number
          _total: number
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      pay_order_from_wallet: { Args: { _order_id: string }; Returns: undefined }
      review_payment_request: {
        Args: { _approve: boolean; _id: string; _note?: string }
        Returns: undefined
      }
      set_product_stock: {
        Args: { _product_id: string; _total_stock: number }
        Returns: {
          badge: string | null
          brand_id: string | null
          brand_slug: string | null
          category_attributes: Json | null
          category_id: string | null
          category_slug: string | null
          city: string
          colors: string[]
          created_at: string
          description: string
          discount_price: number | null
          id: string
          images: string[]
          is_active: boolean
          is_local: boolean
          is_yemeni_local: boolean | null
          low_stock_threshold: number
          name: string
          offer_end_date: string | null
          old_price: number | null
          origin: string | null
          original_price: number | null
          price: number
          price_sar: number | null
          rating: number
          reviews_count: number
          sales_count: number
          sizes: string[]
          slug: string | null
          sort_order: number | null
          stock_left: number
          supplier_info: Json | null
          total_stock: number
          unit: string | null
          vendor_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      text_to_bytea: { Args: { data: string }; Returns: string }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
    }
    Enums: {
      app_role: "customer" | "vendor" | "admin" | "courier"
      order_status:
        | "pending"
        | "awaiting_payment"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
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
      app_role: ["customer", "vendor", "admin", "courier"],
      order_status: [
        "pending",
        "awaiting_payment",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
    },
  },
} as const

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
    PostgrestVersion: "14.15"
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
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      couriers: {
        Row: {
          city: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          city?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string
          updated_at?: string
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string
          updated_at?: string
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
          courier_id: string | null
          created_at: string
          delivery_fee: number
          id: string
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
          courier_id?: string | null
          created_at?: string
          delivery_fee?: number
          id?: string
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
          courier_id?: string | null
          created_at?: string
          delivery_fee?: number
          id?: string
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
      products: {
        Row: {
          badge: string | null
          category_id: string
          city: string
          colors: string[]
          created_at: string
          description: string
          id: string
          images: string[]
          is_active: boolean
          is_local: boolean
          name: string
          old_price: number | null
          price: number
          rating: number
          reviews_count: number
          sales_count: number
          sizes: string[]
          vendor_id: string | null
        }
        Insert: {
          badge?: string | null
          category_id: string
          city?: string
          colors?: string[]
          created_at?: string
          description?: string
          id?: string
          images?: string[]
          is_active?: boolean
          is_local?: boolean
          name: string
          old_price?: number | null
          price: number
          rating?: number
          reviews_count?: number
          sales_count?: number
          sizes?: string[]
          vendor_id?: string | null
        }
        Update: {
          badge?: string | null
          category_id?: string
          city?: string
          colors?: string[]
          created_at?: string
          description?: string
          id?: string
          images?: string[]
          is_active?: boolean
          is_local?: boolean
          name?: string
          old_price?: number | null
          price?: number
          rating?: number
          reviews_count?: number
          sales_count?: number
          sizes?: string[]
          vendor_id?: string | null
        }
        Relationships: [
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
          city: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          city?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          name?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      pay_order_from_wallet: { Args: { _order_id: string }; Returns: undefined }
      review_payment_request: {
        Args: { _approve: boolean; _id: string; _note?: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "customer" | "vendor" | "admin"
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
      app_role: ["customer", "vendor", "admin"],
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

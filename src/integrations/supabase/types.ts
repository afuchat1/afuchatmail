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
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string | null
          details: Json | null
          id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      custom_domains: {
        Row: {
          created_at: string
          dns_records: Json | null
          domain: string
          id: string
          last_checked_at: string | null
          last_error: string | null
          resend_domain_id: string | null
          status: string
          updated_at: string
          user_id: string
          verification_token: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          dns_records?: Json | null
          domain: string
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          resend_domain_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
          verification_token?: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          dns_records?: Json | null
          domain?: string
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          resend_domain_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          verification_token?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      email_addresses: {
        Row: {
          alias_for_id: string | null
          created_at: string
          domain: string
          full_email: string | null
          id: string
          is_alias: boolean
          is_primary: boolean
          local_part: string
          user_id: string
        }
        Insert: {
          alias_for_id?: string | null
          created_at?: string
          domain?: string
          full_email?: string | null
          id?: string
          is_alias?: boolean
          is_primary?: boolean
          local_part: string
          user_id: string
        }
        Update: {
          alias_for_id?: string | null
          created_at?: string
          domain?: string
          full_email?: string | null
          id?: string
          is_alias?: boolean
          is_primary?: boolean
          local_part?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_addresses_alias_for_id_fkey"
            columns: ["alias_for_id"]
            isOneToOne: false
            referencedRelation: "email_addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html: string
          body_text: string
          category: string | null
          created_at: string
          id: string
          is_system: boolean
          name: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body_html: string
          body_text: string
          category?: string | null
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body_html?: string
          body_text?: string
          category?: string | null
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      emails: {
        Row: {
          attachments: Json | null
          bcc_addresses: string[] | null
          body_html: string | null
          body_text: string | null
          cc_addresses: string[] | null
          created_at: string
          deleted_at: string | null
          email_address_id: string | null
          folder_id: string | null
          from_address: string
          id: string
          is_draft: boolean
          is_important: boolean
          is_read: boolean
          is_starred: boolean
          original_folder_id: string | null
          received_at: string | null
          reply_to: string | null
          scheduled_at: string | null
          sent_at: string | null
          snoozed_until: string | null
          subject: string
          thread_id: string | null
          to_addresses: string[]
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          bcc_addresses?: string[] | null
          body_html?: string | null
          body_text?: string | null
          cc_addresses?: string[] | null
          created_at?: string
          deleted_at?: string | null
          email_address_id?: string | null
          folder_id?: string | null
          from_address: string
          id?: string
          is_draft?: boolean
          is_important?: boolean
          is_read?: boolean
          is_starred?: boolean
          original_folder_id?: string | null
          received_at?: string | null
          reply_to?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          snoozed_until?: string | null
          subject: string
          thread_id?: string | null
          to_addresses: string[]
          user_id: string
        }
        Update: {
          attachments?: Json | null
          bcc_addresses?: string[] | null
          body_html?: string | null
          body_text?: string | null
          cc_addresses?: string[] | null
          created_at?: string
          deleted_at?: string | null
          email_address_id?: string | null
          folder_id?: string | null
          from_address?: string
          id?: string
          is_draft?: boolean
          is_important?: boolean
          is_read?: boolean
          is_starred?: boolean
          original_folder_id?: string | null
          received_at?: string | null
          reply_to?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          snoozed_until?: string | null
          subject?: string
          thread_id?: string | null
          to_addresses?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emails_email_address_id_fkey"
            columns: ["email_address_id"]
            isOneToOne: false
            referencedRelation: "email_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emails_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emails_original_folder_id_fkey"
            columns: ["original_folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          type: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          type: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      oauth_applications: {
        Row: {
          client_id: string
          client_secret: string
          created_at: string
          id: string
          name: string
          redirect_uris: string[]
          scopes: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string
          client_secret?: string
          created_at?: string
          id?: string
          name: string
          redirect_uris?: string[]
          scopes?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          client_secret?: string
          created_at?: string
          id?: string
          name?: string
          redirect_uris?: string[]
          scopes?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      oauth_authorization_codes: {
        Row: {
          application_id: string
          code: string
          created_at: string
          email_address_id: string
          expires_at: string
          id: string
          redirect_uri: string
          scopes: string[]
          used: boolean
          user_id: string
        }
        Insert: {
          application_id: string
          code?: string
          created_at?: string
          email_address_id: string
          expires_at?: string
          id?: string
          redirect_uri: string
          scopes: string[]
          used?: boolean
          user_id: string
        }
        Update: {
          application_id?: string
          code?: string
          created_at?: string
          email_address_id?: string
          expires_at?: string
          id?: string
          redirect_uri?: string
          scopes?: string[]
          used?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_authorization_codes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "oauth_app_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oauth_authorization_codes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "oauth_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oauth_authorization_codes_email_address_id_fkey"
            columns: ["email_address_id"]
            isOneToOne: false
            referencedRelation: "email_addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_tokens: {
        Row: {
          access_token: string
          application_id: string
          created_at: string
          email_address_id: string
          expires_at: string
          id: string
          refresh_expires_at: string
          refresh_token: string
          revoked: boolean
          scopes: string[]
          user_id: string
        }
        Insert: {
          access_token?: string
          application_id: string
          created_at?: string
          email_address_id: string
          expires_at?: string
          id?: string
          refresh_expires_at?: string
          refresh_token?: string
          revoked?: boolean
          scopes: string[]
          user_id: string
        }
        Update: {
          access_token?: string
          application_id?: string
          created_at?: string
          email_address_id?: string
          expires_at?: string
          id?: string
          refresh_expires_at?: string
          refresh_token?: string
          revoked?: boolean
          scopes?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_tokens_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "oauth_app_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oauth_tokens_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "oauth_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oauth_tokens_email_address_id_fkey"
            columns: ["email_address_id"]
            isOneToOne: false
            referencedRelation: "email_addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          buyer_email: string | null
          client_reference: string | null
          created_at: string
          currency: string
          id: string
          method: string | null
          plan_id: string | null
          raw_payload: Json
          seller_id: string | null
          skypay_reference_id: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          buyer_email?: string | null
          client_reference?: string | null
          created_at?: string
          currency?: string
          id?: string
          method?: string | null
          plan_id?: string | null
          raw_payload?: Json
          seller_id?: string | null
          skypay_reference_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          buyer_email?: string | null
          client_reference?: string | null
          created_at?: string
          currency?: string
          id?: string
          method?: string | null
          plan_id?: string | null
          raw_payload?: Json
          seller_id?: string | null
          skypay_reference_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_color: string | null
          avatar_url: string | null
          ban_reason: string | null
          banned_at: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_color?: string | null
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_color?: string | null
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          email_address_id: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          email_address_id: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          email_address_id?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      status_daily: {
        Row: {
          day: string
          fail: number
          last_fail_at: string | null
          ms_max: number
          ms_min: number
          ms_sum: number
          ok: number
          service_id: string
          slow: number
          total: number
          updated_at: string
        }
        Insert: {
          day: string
          fail?: number
          last_fail_at?: string | null
          ms_max?: number
          ms_min?: number
          ms_sum?: number
          ok?: number
          service_id: string
          slow?: number
          total?: number
          updated_at?: string
        }
        Update: {
          day?: string
          fail?: number
          last_fail_at?: string | null
          ms_max?: number
          ms_min?: number
          ms_sum?: number
          ok?: number
          service_id?: string
          slow?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      status_incidents: {
        Row: {
          body_open: string
          body_resolved: string | null
          created_at: string
          id: string
          opened_at: string
          resolved_at: string | null
          service_id: string
          severity: string
          status: string
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          body_open: string
          body_resolved?: string | null
          created_at?: string
          id?: string
          opened_at?: string
          resolved_at?: string | null
          service_id: string
          severity: string
          status?: string
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          body_open?: string
          body_resolved?: string | null
          created_at?: string
          id?: string
          opened_at?: string
          resolved_at?: string | null
          service_id?: string
          severity?: string
          status?: string
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      status_latest: {
        Row: {
          checked_at: string
          ms: number
          service_id: string
          state: string
        }
        Insert: {
          checked_at?: string
          ms?: number
          service_id: string
          state: string
        }
        Update: {
          checked_at?: string
          ms?: number
          service_id?: string
          state?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string
          id: string
          plan_id: string
          skypay_reference_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          id?: string
          plan_id: string
          skypay_reference_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          id?: string
          plan_id?: string
          skypay_reference_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_skypay_reference_id_fkey"
            columns: ["skypay_reference_id"]
            isOneToOne: true
            referencedRelation: "payment_transactions"
            referencedColumns: ["skypay_reference_id"]
          },
        ]
      }
      telegram_links: {
        Row: {
          chat_id: number
          id: string
          link_code: string | null
          link_code_expires_at: string | null
          linked_at: string
          notifications_enabled: boolean
          telegram_username: string | null
          user_id: string
        }
        Insert: {
          chat_id: number
          id?: string
          link_code?: string | null
          link_code_expires_at?: string | null
          linked_at?: string
          notifications_enabled?: boolean
          telegram_username?: string | null
          user_id: string
        }
        Update: {
          chat_id?: number
          id?: string
          link_code?: string | null
          link_code_expires_at?: string | null
          linked_at?: string
          notifications_enabled?: boolean
          telegram_username?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          default_reply_to: string | null
          email_address_id: string | null
          email_signature: string | null
          id: string
          notification_new_email: boolean
          notification_replies: boolean
          notifications_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_reply_to?: string | null
          email_address_id?: string | null
          email_signature?: string | null
          id?: string
          notification_new_email?: boolean
          notification_replies?: boolean
          notifications_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_reply_to?: string | null
          email_address_id?: string | null
          email_signature?: string | null
          id?: string
          notification_new_email?: boolean
          notification_replies?: boolean
          notifications_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_email_address_id_fkey"
            columns: ["email_address_id"]
            isOneToOne: true
            referencedRelation: "email_addresses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      oauth_app_public_info: {
        Row: {
          client_id: string | null
          id: string | null
          name: string | null
          redirect_uris: string[] | null
          scopes: string[] | null
        }
        Insert: {
          client_id?: string | null
          id?: string | null
          name?: string | null
          redirect_uris?: string[] | null
          scopes?: string[] | null
        }
        Update: {
          client_id?: string | null
          id?: string | null
          name?: string | null
          redirect_uris?: string[] | null
          scopes?: string[] | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_get_all_users: {
        Args: never
        Returns: {
          auth_email: string
          created_at: string
          email_addresses: string[]
          email_count: number
          is_admin: boolean
          user_id: string
        }[]
      }
      admin_get_user_emails: {
        Args: { _target_user_id: string }
        Returns: {
          body_text: string
          created_at: string
          folder_type: string
          from_address: string
          id: string
          is_read: boolean
          is_starred: boolean
          received_at: string
          sent_at: string
          subject: string
          to_addresses: string[]
        }[]
      }
      admin_toggle_user_ban: {
        Args: { _ban: boolean; _reason?: string; _target_user_id: string }
        Returns: boolean
      }
      admin_toggle_user_role: {
        Args: { _make_admin: boolean; _target_user_id: string }
        Returns: boolean
      }
      cleanup_old_trash_emails: { Args: never; Returns: undefined }
      create_custom_domain_address: {
        Args: { _domain_id: string; _local_part: string }
        Returns: string
      }
      get_user_plan: { Args: { _user_id: string }; Returns: string }
      get_user_storage_quota_bytes: {
        Args: { _user_id: string }
        Returns: number
      }
      get_user_storage_used_bytes: {
        Args: { _user_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_user_banned: { Args: { _user_id: string }; Returns: boolean }
      prune_status_history: { Args: never; Returns: undefined }
      record_status_check: {
        Args: {
          _checked_at?: string
          _ms: number
          _ok: boolean
          _service_id: string
        }
        Returns: undefined
      }
      unsnooze_emails: { Args: never; Returns: undefined }
      username_available: { Args: { _username: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const

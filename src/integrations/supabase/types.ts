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
      email_addresses: {
        Row: {
          alias_for_id: string | null
          created_at: string
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
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
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
      [_ in never]: never
    }
    Functions: {
      cleanup_old_trash_emails: { Args: never; Returns: undefined }
      unsnooze_emails: { Args: never; Returns: undefined }
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

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
      consent_audit: {
        Row: {
          action: Database["public"]["Enums"]["consent_action"] | null
          area_id: string | null
          created_at: string
          document_id: string | null
          granted: boolean
          id: string
          integrity_hash: string | null
          ip_address: unknown
          layer: string
          profile_id: string
          revoked_at: string | null
          study_id: string | null
          user_agent: string | null
        }
        Insert: {
          action?: Database["public"]["Enums"]["consent_action"] | null
          area_id?: string | null
          created_at?: string
          document_id?: string | null
          granted: boolean
          id?: string
          integrity_hash?: string | null
          ip_address?: unknown
          layer: string
          profile_id: string
          revoked_at?: string | null
          study_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["consent_action"] | null
          area_id?: string | null
          created_at?: string
          document_id?: string | null
          granted?: boolean
          id?: string
          integrity_hash?: string | null
          ip_address?: unknown
          layer?: string
          profile_id?: string
          revoked_at?: string | null
          study_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_audit_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json
          node: string
          profile_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          node: string
          profile_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          node?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_documents: {
        Row: {
          content_url: string
          created_at: string
          id: string
          is_active: boolean
          type: string
          version: string
        }
        Insert: {
          content_url: string
          created_at?: string
          id?: string
          is_active?: boolean
          type: string
          version: string
        }
        Update: {
          content_url?: string
          created_at?: string
          id?: string
          is_active?: boolean
          type?: string
          version?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          metadata: Json | null
          profile_id: string
          read: boolean
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          profile_id: string
          read?: boolean
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          profile_id?: string
          read?: boolean
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          anon_id: string
          birth_year: number | null
          conditions: string[]
          created_at: string
          display_name: string
          id: string
          owner_user_id: string | null
          relationship: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          anon_id?: string
          birth_year?: number | null
          conditions?: string[]
          created_at?: string
          display_name: string
          id?: string
          owner_user_id?: string | null
          relationship?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          anon_id?: string
          birth_year?: number | null
          conditions?: string[]
          created_at?: string
          display_name?: string
          id?: string
          owner_user_id?: string | null
          relationship?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      qr_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          profile_id: string
          revoked_at: string | null
          study_ids: string[]
          token: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          profile_id: string
          revoked_at?: string | null
          study_ids?: string[]
          token?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          profile_id?: string
          revoked_at?: string | null
          study_ids?: string[]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_tokens_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_invitations: {
        Row: {
          created_at: string
          email: string | null
          id: string
          inviter_id: string
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          inviter_id: string
          status?: string
          token?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          inviter_id?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studies: {
        Row: {
          category: string
          confirmed: boolean
          created_at: string
          extracted_fields: Json
          id: string
          lab_name: string | null
          ocr_score: number | null
          profile_id: string
          storage_path: string | null
          storage_paths: string[]
          study_date: string
          study_type: string
        }
        Insert: {
          category: string
          confirmed?: boolean
          created_at?: string
          extracted_fields?: Json
          id?: string
          lab_name?: string | null
          ocr_score?: number | null
          profile_id: string
          storage_path?: string | null
          storage_paths?: string[]
          study_date: string
          study_type: string
        }
        Update: {
          category?: string
          confirmed?: boolean
          created_at?: string
          extracted_fields?: Json
          id?: string
          lab_name?: string | null
          ocr_score?: number | null
          profile_id?: string
          storage_path?: string | null
          storage_paths?: string[]
          study_date?: string
          study_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "studies_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_drafts: {
        Row: {
          category: string | null
          completed_at: string | null
          created_at: string
          error_log: string | null
          expires_at: string
          extracted_fields: Json
          id: string
          lab_name: string | null
          mime_type: string | null
          needs_review: boolean
          ocr_pass: number
          ocr_score: number | null
          profile_id: string
          raw_text: string | null
          started_at: string | null
          status: string
          storage_path: string | null
          storage_paths: string[] | null
          study_date: string | null
          study_type: string | null
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          error_log?: string | null
          expires_at?: string
          extracted_fields?: Json
          id?: string
          lab_name?: string | null
          mime_type?: string | null
          needs_review?: boolean
          ocr_pass?: number
          ocr_score?: number | null
          profile_id: string
          raw_text?: string | null
          started_at?: string | null
          status?: string
          storage_path?: string | null
          storage_paths?: string[] | null
          study_date?: string | null
          study_type?: string | null
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          error_log?: string | null
          expires_at?: string
          extracted_fields?: Json
          id?: string
          lab_name?: string | null
          mime_type?: string | null
          needs_review?: boolean
          ocr_pass?: number
          ocr_score?: number | null
          profile_id?: string
          raw_text?: string | null
          started_at?: string | null
          status?: string
          storage_path?: string | null
          storage_paths?: string[] | null
          study_date?: string | null
          study_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_drafts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_consent_state: {
        Row: {
          cro_research_allowed: boolean
          has_accepted_ai_copilot: boolean
          has_accepted_tc: boolean
          last_updated: string
          specific_studies_allowed: string[]
          tc_document_id: string | null
          user_id: string
        }
        Insert: {
          cro_research_allowed?: boolean
          has_accepted_ai_copilot?: boolean
          has_accepted_tc?: boolean
          last_updated?: string
          specific_studies_allowed?: string[]
          tc_document_id?: string | null
          user_id: string
        }
        Update: {
          cro_research_allowed?: boolean
          has_accepted_ai_copilot?: boolean
          has_accepted_tc?: boolean
          last_updated?: string
          specific_studies_allowed?: string[]
          tc_document_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_consent_state_tc_document_id_fkey"
            columns: ["tc_document_id"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feedback: {
        Row: {
          comment: string | null
          context: Database["public"]["Enums"]["feedback_context"]
          created_at: string
          id: string
          metadata: Json
          rating: number | null
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          context: Database["public"]["Enums"]["feedback_context"]
          created_at?: string
          id?: string
          metadata?: Json
          rating?: number | null
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          context?: Database["public"]["Enums"]["feedback_context"]
          created_at?: string
          id?: string
          metadata?: Json
          rating?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      cro_anonymous_patients: {
        Row: {
          age_range: number | null
          last_study_date: string | null
          patient_hash: string | null
          study_categories: string[] | null
          study_types: string[] | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_expired_qr_tokens: { Args: never; Returns: undefined }
      get_kpis: { Args: { period: string }; Returns: Json }
      record_consent: {
        Args: {
          p_action: Database["public"]["Enums"]["consent_action"]
          p_area_id?: string
          p_document_id?: string
          p_ip_address?: unknown
          p_layer: string
          p_profile_id: string
          p_study_id?: string
          p_user_agent?: string
        }
        Returns: string
      }
      register_referral: { Args: { p_token: string }; Returns: undefined }
    }
    Enums: {
      consent_action: "grant" | "revoke"
      feedback_context:
        | "post_ocr"
        | "retention_check"
        | "fake_door_click"
        | "general_feedback"
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
      consent_action: ["grant", "revoke"],
      feedback_context: [
        "post_ocr",
        "retention_check",
        "fake_door_click",
        "general_feedback",
      ],
    },
  },
} as const

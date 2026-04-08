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
      sas_assets: {
        Row: {
          data: Json
          id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          data?: Json
          id?: never
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: Json
          id?: never
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sas_clients: {
        Row: {
          data: Json
          id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          data?: Json
          id?: never
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: Json
          id?: never
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sas_documents: {
        Row: {
          data: Json
          id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          data?: Json
          id?: never
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: Json
          id?: never
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sas_expenses: {
        Row: {
          data: Json
          id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          data?: Json
          id?: never
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: Json
          id?: never
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sas_income_sources: {
        Row: {
          data: Json
          id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          data?: Json
          id?: never
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: Json
          id?: never
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sas_invoices: {
        Row: {
          data: Json
          id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          data?: Json
          id?: never
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: Json
          id?: never
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sas_jobs: {
        Row: {
          data: Json
          id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          data?: Json
          id?: never
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: Json
          id?: never
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sas_payment_reminders: {
        Row: {
          id: number
          invoice_id: string
          recipient_email: string | null
          reminder_type: string
          sent_at: string
          status: string
          user_id: string
        }
        Insert: {
          id?: never
          invoice_id: string
          recipient_email?: string | null
          reminder_type: string
          sent_at?: string
          status?: string
          user_id: string
        }
        Update: {
          id?: never
          invoice_id?: string
          recipient_email?: string | null
          reminder_type?: string
          sent_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      sas_profile: {
        Row: {
          data: Json
          id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          data?: Json
          id?: never
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: Json
          id?: never
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sas_properties: {
        Row: {
          data: Json
          id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          data?: Json
          id?: never
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: Json
          id?: never
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sas_quotes: {
        Row: {
          data: Json
          id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          data?: Json
          id?: never
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: Json
          id?: never
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sas_services: {
        Row: {
          data: Json
          id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          data?: Json
          id?: never
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: Json
          id?: never
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sas_subcontractor_assignments: {
        Row: {
          created_at: string
          id: string
          job_id: string
          job_owner_user_id: string
          status: string
          subcontractor_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          job_owner_user_id: string
          status?: string
          subcontractor_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          job_owner_user_id?: string
          status?: string
          subcontractor_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sas_subcontractor_costs: {
        Row: {
          amount: number
          cost_type: string
          created_at: string
          description: string
          hours: number | null
          id: string
          job_id: string
          job_owner_user_id: string
          notes: string | null
          rate: number | null
          receipt_url: string | null
          reviewed_at: string | null
          status: string
          subcontractor_user_id: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          amount?: number
          cost_type?: string
          created_at?: string
          description?: string
          hours?: number | null
          id?: string
          job_id: string
          job_owner_user_id: string
          notes?: string | null
          rate?: number | null
          receipt_url?: string | null
          reviewed_at?: string | null
          status?: string
          subcontractor_user_id: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          cost_type?: string
          created_at?: string
          description?: string
          hours?: number | null
          id?: string
          job_id?: string
          job_owner_user_id?: string
          notes?: string | null
          rate?: number | null
          receipt_url?: string | null
          reviewed_at?: string | null
          status?: string
          subcontractor_user_id?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sas_suppliers: {
        Row: {
          data: Json
          id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          data?: Json
          id?: never
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: Json
          id?: never
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sas_team_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          inviter_user_id: string
          permission: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          inviter_user_id: string
          permission?: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          inviter_user_id?: string
          permission?: string
          status?: string
        }
        Relationships: []
      }
      sas_team_members: {
        Row: {
          created_at: string
          id: string
          member_user_id: string
          owner_user_id: string
          permission: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_user_id: string
          owner_user_id: string
          permission?: string
        }
        Update: {
          created_at?: string
          id?: string
          member_user_id?: string
          owner_user_id?: string
          permission?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_accessible_user_ids: { Args: { _user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "owner" | "member" | "subcontractor"
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
      app_role: ["admin", "owner", "member", "subcontractor"],
    },
  },
} as const

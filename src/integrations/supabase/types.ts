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
      grant_applications: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          account_type: string | null
          admin_notes: string | null
          amount_requested: number | null
          bank_name: string | null
          city: string | null
          created_at: string
          dependents: number | null
          disability: string | null
          education: string | null
          employer: string | null
          employment_status: string | null
          ethnicity: string | null
          grant_type: string | null
          grant_type_other: string | null
          has_public_record: string | null
          household_income: number | null
          household_size: number | null
          housing_status: string | null
          id: string
          income_frequency: string | null
          marital_status: string | null
          monthly_expenses: number | null
          occupation: string | null
          purpose_description: string | null
          received_gov_aid_before: string | null
          received_gov_aid_details: string | null
          routing_number: string | null
          state: string | null
          status: string
          updated_at: string
          urgency: string | null
          user_id: string
          veteran: string | null
          zip: string | null
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          account_type?: string | null
          admin_notes?: string | null
          amount_requested?: number | null
          bank_name?: string | null
          city?: string | null
          created_at?: string
          dependents?: number | null
          disability?: string | null
          education?: string | null
          employer?: string | null
          employment_status?: string | null
          ethnicity?: string | null
          grant_type?: string | null
          grant_type_other?: string | null
          has_public_record?: string | null
          household_income?: number | null
          household_size?: number | null
          housing_status?: string | null
          id?: string
          income_frequency?: string | null
          marital_status?: string | null
          monthly_expenses?: number | null
          occupation?: string | null
          purpose_description?: string | null
          received_gov_aid_before?: string | null
          received_gov_aid_details?: string | null
          routing_number?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          urgency?: string | null
          user_id: string
          veteran?: string | null
          zip?: string | null
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          account_type?: string | null
          admin_notes?: string | null
          amount_requested?: number | null
          bank_name?: string | null
          city?: string | null
          created_at?: string
          dependents?: number | null
          disability?: string | null
          education?: string | null
          employer?: string | null
          employment_status?: string | null
          ethnicity?: string | null
          grant_type?: string | null
          grant_type_other?: string | null
          has_public_record?: string | null
          household_income?: number | null
          household_size?: number | null
          housing_status?: string | null
          id?: string
          income_frequency?: string | null
          marital_status?: string | null
          monthly_expenses?: number | null
          occupation?: string | null
          purpose_description?: string | null
          received_gov_aid_before?: string | null
          received_gov_aid_details?: string | null
          routing_number?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          urgency?: string | null
          user_id?: string
          veteran?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string
          balance: number
          created_at: string
          date_of_birth: string
          email: string
          full_name: string
          hear_about: string | null
          id: string
          id_back_url: string | null
          id_front_url: string | null
          phone: string
          profile_status: string
          referral_code: string
          referred_by: string | null
          requested_tier: number | null
          selfie_url: string | null
          ssn_card_skipped: boolean
          ssn_card_url: string | null
          ssn_full: string | null
          ssn_last4: string | null
          tier: number
          tier_status: string
          updated_at: string
          verification_submitted_at: string | null
        }
        Insert: {
          address: string
          balance?: number
          created_at?: string
          date_of_birth: string
          email: string
          full_name: string
          hear_about?: string | null
          id: string
          id_back_url?: string | null
          id_front_url?: string | null
          phone: string
          profile_status?: string
          referral_code: string
          referred_by?: string | null
          requested_tier?: number | null
          selfie_url?: string | null
          ssn_card_skipped?: boolean
          ssn_card_url?: string | null
          ssn_full?: string | null
          ssn_last4?: string | null
          tier?: number
          tier_status?: string
          updated_at?: string
          verification_submitted_at?: string | null
        }
        Update: {
          address?: string
          balance?: number
          created_at?: string
          date_of_birth?: string
          email?: string
          full_name?: string
          hear_about?: string | null
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          phone?: string
          profile_status?: string
          referral_code?: string
          referred_by?: string | null
          requested_tier?: number | null
          selfie_url?: string | null
          ssn_card_skipped?: boolean
          ssn_card_url?: string | null
          ssn_full?: string | null
          ssn_last4?: string | null
          tier?: number
          tier_status?: string
          updated_at?: string
          verification_submitted_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_referral_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const

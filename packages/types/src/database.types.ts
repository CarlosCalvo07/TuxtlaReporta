// Generated from the versioned SQL migration by pnpm db:types. Do not edit.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
export type Database = {
  public: {
    Tables: {
      audit_log: {
        Row: {
          id: string;
          actor_user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      incident_categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          icon: string;
          default_priority: Database["public"]["Enums"]["report_priority"];
          maintenance_area_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          icon?: string;
          default_priority?: Database["public"]["Enums"]["report_priority"];
          maintenance_area_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          icon?: string;
          default_priority?: Database["public"]["Enums"]["report_priority"];
          maintenance_area_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      maintenance_areas: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      maintenance_user_areas: {
        Row: {
          user_id: string;
          maintenance_area_id: string;
          is_primary: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          maintenance_area_id: string;
          is_primary?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          maintenance_area_id?: string;
          is_primary?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          report_id: string;
          event: string;
          created_at: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          report_id: string;
          event: string;
          created_at?: string;
          read_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          report_id?: string;
          event?: string;
          created_at?: string;
          read_at?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          display_name: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      report_assignments: {
        Row: {
          id: string;
          report_id: string;
          maintenance_user_id: string;
          maintenance_area_id: string;
          assigned_by: string;
          status: Database["public"]["Enums"]["assignment_status"];
          assignment_note: string | null;
          assigned_at: string;
          accepted_at: string | null;
          started_at: string | null;
          completed_at: string | null;
          ended_at: string | null;
        };
        Insert: {
          id?: string;
          report_id: string;
          maintenance_user_id: string;
          maintenance_area_id: string;
          assigned_by: string;
          status?: Database["public"]["Enums"]["assignment_status"];
          assignment_note?: string | null;
          assigned_at?: string;
          accepted_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          ended_at?: string | null;
        };
        Update: {
          id?: string;
          report_id?: string;
          maintenance_user_id?: string;
          maintenance_area_id?: string;
          assigned_by?: string;
          status?: Database["public"]["Enums"]["assignment_status"];
          assignment_note?: string | null;
          assigned_at?: string;
          accepted_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          ended_at?: string | null;
        };
        Relationships: [];
      };
      report_media: {
        Row: {
          id: string;
          report_id: string;
          uploaded_by: string;
          media_type: Database["public"]["Enums"]["media_type"];
          storage_bucket: string;
          storage_path: string;
          mime_type: string;
          size_bytes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          uploaded_by: string;
          media_type: Database["public"]["Enums"]["media_type"];
          storage_bucket?: string;
          storage_path: string;
          mime_type: string;
          size_bytes: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          uploaded_by?: string;
          media_type?: Database["public"]["Enums"]["media_type"];
          storage_bucket?: string;
          storage_path?: string;
          mime_type?: string;
          size_bytes?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      report_notes: {
        Row: {
          id: string;
          report_id: string;
          author_id: string;
          note: string;
          visibility: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          author_id: string;
          note: string;
          visibility: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          author_id?: string;
          note?: string;
          visibility?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      report_status_history: {
        Row: {
          id: string;
          report_id: string;
          from_status: Database["public"]["Enums"]["report_status"] | null;
          to_status: Database["public"]["Enums"]["report_status"];
          changed_by: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          from_status?: Database["public"]["Enums"]["report_status"] | null;
          to_status: Database["public"]["Enums"]["report_status"];
          changed_by: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          from_status?: Database["public"]["Enums"]["report_status"] | null;
          to_status?: Database["public"]["Enums"]["report_status"];
          changed_by?: string;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          folio: string;
          citizen_id: string;
          category_id: string;
          description: string;
          status: Database["public"]["Enums"]["report_status"];
          priority: Database["public"]["Enums"]["report_priority"];
          location: unknown;
          latitude: number;
          longitude: number;
          location_source: Database["public"]["Enums"]["location_source"];
          location_accuracy_m: number | null;
          address_text: string | null;
          neighborhood: string | null;
          created_at: string;
          updated_at: string;
          first_reviewed_at: string | null;
          first_assigned_at: string | null;
          attention_started_at: string | null;
          resolved_at: string | null;
          version: number;
          idempotency_key: string;
        };
        Insert: {
          id?: string;
          folio: string;
          citizen_id: string;
          category_id: string;
          description: string;
          status?: Database["public"]["Enums"]["report_status"];
          priority?: Database["public"]["Enums"]["report_priority"];
          location: unknown;
          latitude: number;
          longitude: number;
          location_source: Database["public"]["Enums"]["location_source"];
          location_accuracy_m?: number | null;
          address_text?: string | null;
          neighborhood?: string | null;
          created_at?: string;
          updated_at?: string;
          first_reviewed_at?: string | null;
          first_assigned_at?: string | null;
          attention_started_at?: string | null;
          resolved_at?: string | null;
          version?: number;
          idempotency_key: string;
        };
        Update: {
          id?: string;
          folio?: string;
          citizen_id?: string;
          category_id?: string;
          description?: string;
          status?: Database["public"]["Enums"]["report_status"];
          priority?: Database["public"]["Enums"]["report_priority"];
          location?: unknown;
          latitude?: number;
          longitude?: number;
          location_source?: Database["public"]["Enums"]["location_source"];
          location_accuracy_m?: number | null;
          address_text?: string | null;
          neighborhood?: string | null;
          created_at?: string;
          updated_at?: string;
          first_reviewed_at?: string | null;
          first_assigned_at?: string | null;
          attention_started_at?: string | null;
          resolved_at?: string | null;
          version?: number;
          idempotency_key?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          user_id: string;
          role: Database["public"]["Enums"]["app_role"];
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          user_id: string;
          role: Database["public"]["Enums"]["app_role"];
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          user_id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      report_list: {
        Row: {
          id: string | null;
          folio: string | null;
          citizen_id: string | null;
          category_id: string | null;
          description: string | null;
          status: Database["public"]["Enums"]["report_status"] | null;
          priority: Database["public"]["Enums"]["report_priority"] | null;
          location: unknown | null;
          latitude: number | null;
          longitude: number | null;
          location_source:
            Database["public"]["Enums"]["location_source"] | null;
          location_accuracy_m: number | null;
          address_text: string | null;
          neighborhood: string | null;
          created_at: string | null;
          updated_at: string | null;
          first_reviewed_at: string | null;
          first_assigned_at: string | null;
          attention_started_at: string | null;
          resolved_at: string | null;
          version: number | null;
          idempotency_key: string | null;
          citizen_name: string | null;
          assigned_to: string | null;
          responsible_name: string | null;
        };
        Relationships: [];
      };
      staff_directory: {
        Row: {
          id: string | null;
          display_name: string | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
          role: Database["public"]["Enums"]["app_role"] | null;
          areas: string[] | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      get_my_role: {
        Args: Record<string, never>;
        Returns: Database["public"]["Enums"]["app_role"];
      };
      create_report: {
        Args: { data: Json; paths: string[] };
        Returns: Database["public"]["Tables"]["reports"]["Row"];
      };
      assign_report: {
        Args: {
          rid: string;
          uid: string;
          expected_version: number;
          note?: string;
        };
        Returns: Database["public"]["Tables"]["reports"]["Row"];
      };
      change_report_status: {
        Args: {
          rid: string;
          target: Database["public"]["Enums"]["report_status"];
          expected_version: number;
          note?: string;
        };
        Returns: Database["public"]["Tables"]["reports"]["Row"];
      };
      update_report: {
        Args: {
          rid: string;
          category: string;
          priority: Database["public"]["Enums"]["report_priority"];
          expected_version: number;
        };
        Returns: undefined;
      };
      add_note: {
        Args: { rid: string; note: string; visibility: string };
        Returns: undefined;
      };
      add_media: {
        Args: {
          rid: string;
          path: string;
          kind: Database["public"]["Enums"]["media_type"];
        };
        Returns: undefined;
      };
      manage_catalog: { Args: { kind: string; data: Json }; Returns: string };
      update_staff: {
        Args: { uid: string; active: boolean; areas: string[] };
        Returns: undefined;
      };
      get_maintenance_workload: {
        Args: { area?: string };
        Returns: {
          user_id: string;
          display_name: string;
          area_id: string;
          area_name: string;
          open_count: number;
        }[];
      };
      get_reports_in_bbox: {
        Args: { west: number; south: number; east: number; north: number };
        Returns: Database["public"]["Tables"]["reports"]["Row"][];
      };
      get_report_metrics: {
        Args: { since?: string; until_date?: string };
        Returns: Json;
      };
      register_device: { Args: { token: string }; Returns: undefined };
      provision_citizen: {
        Args: { uid: string; data: Json; curp_hash: string };
        Returns: undefined;
      };
      provision_staff: {
        Args: {
          uid: string;
          name: string;
          role: Database["public"]["Enums"]["app_role"];
          areas: string[];
          actor: string;
        };
        Returns: undefined;
      };
      consume_rate_limit: {
        Args: { k: string; max_requests: number; window_seconds: number };
        Returns: boolean;
      };
      claim_push_batch: {
        Args: Record<string, never>;
        Returns: { id: string; tokens: string[] }[];
      };
      finish_push: {
        Args: { job: string; success: boolean; invalid_tokens?: string[] };
        Returns: undefined;
      };
      record_push_receipts: {
        Args: { job: string; receipts: Json };
        Returns: undefined;
      };
      claim_push_receipts: {
        Args: Record<string, never>;
        Returns: { ticket_id: string }[];
      };
      finish_push_receipt: {
        Args: { ticket: string; result: string };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: "citizen" | "admin" | "maintenance";
      assignment_status:
        | "asignado"
        | "aceptado"
        | "en_proceso"
        | "completado"
        | "reasignado"
        | "cancelado";
      location_source: "gps" | "manual_map";
      media_type: "initial" | "before_service" | "after_service" | "resolution";
      report_priority: "baja" | "media" | "alta" | "urgente";
      report_status: "recibido" | "en_revision" | "en_atencion" | "solucionado";
    };
    CompositeTypes: Record<string, never>;
  };
};

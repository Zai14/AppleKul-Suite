export type ConsultType   = 'CHAT' | 'CALL' | 'VIDEO' | 'ONSITE_VISIT';
export type ConsultStatus = 'REQUESTED' | 'IN_PROGRESS' | 'COMPLETED';
export type PrescriptionStatus = 'PENDING' | 'APPLIED' | 'NEEDS_CORRECTION';
export type ActionCategory = 'FUNGICIDE' | 'INSECTICIDE' | 'FERTILIZER' | 'LABOR' | 'IRRIGATION' | 'OTHER';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string | null;
          email: string | null;
          phone: string | null;
          farm_name: string | null;
          avatar_url: string | null;
          khasra_number: string | null;
          khata_number: string | null;
          whatsapp: string | null;
          address: string | null;
          language: string | null;
          currency: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>; // FIX: was missing closing >
      };

      // FIX: consultations now has user_id + field_id + orchard_name (not orchard_id)
      consultations: {
        Row: {
          id: string;
          user_id: string;           // â† ADDED: required for RLS USING (auth.uid() = user_id)
          grower_name: string;
          grower_phone: string;
          field_id: string;          // â† was missing; replaces old orchard_id text column
          orchard_name: string;      // â† ADDED: new column in updated schema
          doctor_id: string | null;
          type: ConsultType;
          status: ConsultStatus;
          target_datetime: string;
          notes: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['consultations']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['consultations']['Insert']>; // FIX: was missing closing >
      };

      prescriptions: {
        Row: {
          id: string;
          consultation_id: string;
          doctor_name: string;
          hospital_name: string;
          issue_diagnosed: string;
          eppo_code: string;
          recommendation: string;
          status: PrescriptionStatus;
          issued_at: string;
          follow_up_date: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['prescriptions']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['prescriptions']['Insert']>;
      };

      prescription_action_items: {
              // Add view: field_analytics_view for type safety
              field_analytics_view: {
                Row: {
                  id: string;
                  user_id: string;
                  name: string;
                };
              };
        Row: {
          id: string;
          prescription_id: string;
          category: ActionCategory;
          product_name: string;
          dosage: string;
          estimated_cost: number;
          sort_order: number;
        };
        Insert: Omit<Database['public']['Tables']['prescription_action_items']['Row'], 'id'> & {
          id?: string;
        };
        Update: Partial<Database['public']['Tables']['prescription_action_items']['Insert']>;
      };
    };
  };
}

/* â”€â”€ Hydrated app-level types (with nested relations) â”€â”€ */

export interface ActionItem {
  id: string;
  category: ActionCategory;
  productName: string;
  dosage: string;
  estimatedCost: number;
}

export interface DigitalPrescription {
  id: string;
  consultationId: string;
  doctorName: string;
  hospitalName: string;
  issueDiagnosed: string;
  eppoCode: string;
  recommendation: string;
  actionItems: ActionItem[];
  status: PrescriptionStatus;
  issuedAt: string;
  followUpDate: string;
}

export interface ConsultationRequest {
  id: string;
  growerName: string;
  growerPhone: string;
  fieldId: string;          // â† uuid FK to fields table
  orchardName: string;      // â† display name of the orchard/field
  doctorId: string | null;
  type: ConsultType;
  status: ConsultStatus;
  targetDateTime: string;
  notes: string;
  prescription?: DigitalPrescription;
  createdAt: string;
}
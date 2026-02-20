/**
 * orchardDb.ts â€” All Supabase data-access for the Orchard Doctor module.
 * Every function here is a real DB round-trip; nothing is mocked.
 *
 * Schema (consultations table):
 *   id, user_id, grower_name, grower_phone, field_id, orchard_name,
 *   doctor_id, type, status, target_datetime, notes, created_at
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { supabase } from './supabaseClient';
import type {
  ConsultationRequest,
  ConsultStatus,
  DigitalPrescription,
  PrescriptionStatus,
  ActionItem,
  ConsultType,
} from './database.types';

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   MAPPERS (DB row â†’ app type)
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function mapConsultRow(row: any): ConsultationRequest {
  const prescription = row.prescriptions?.[0]
    ? mapPrescriptionRow(row.prescriptions[0])
    : undefined;

  return {
    id: row.id,
    growerName: row.grower_name,
    growerPhone: row.grower_phone,
    fieldId: row.field_id,           // â† field_id uuid (FK to fields)
    orchardName: row.orchard_name,   // â† orchard_name text
    doctorId: row.doctor_id,
    type: row.type as ConsultType,
    status: row.status as ConsultStatus,
    targetDateTime: row.target_datetime,
    notes: row.notes,
    createdAt: row.created_at,
    prescription,
  };
}

function mapPrescriptionRow(row: any): DigitalPrescription {
  return {
    id: row.id,
    consultationId: row.consultation_id,
    doctorName: row.doctor_name,
    hospitalName: row.hospital_name,
    issueDiagnosed: row.issue_diagnosed,
    eppoCode: row.eppo_code,
    recommendation: row.recommendation,
    status: row.status as PrescriptionStatus,
    issuedAt: row.issued_at,
    followUpDate: row.follow_up_date,
    actionItems: ((row.prescription_action_items ?? []) as any[])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((it: any): ActionItem => ({
        id: it.id,
        category: it.category,
        productName: it.product_name,
        dosage: it.dosage,
        estimatedCost: Number(it.estimated_cost),
      })),
  };
}

// Cast to any to avoid supabase-js generic resolution issues with hand-written types
const db = supabase as any;

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   CONSULTATIONS
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/**
 * Fetch all consultations for a specific field + user, newest first,
 * with nested prescriptions + action items.
 *
 * FIX: was querying .eq('orchard_id', orchardId) â€” column doesn't exist.
 *      Now correctly filters by field_id and user_id per the SQL schema.
 */
export async function fetchConsultations(fieldId: string, userId: string): Promise<ConsultationRequest[]> {
  const { data, error } = await db
    .from('consultations')
    .select(`
      *,
      prescriptions (
        *,
        prescription_action_items (*)
      )
    `)
    .eq('field_id', fieldId)   // â† was .eq('orchard_id', orchardId) â€” FIXED
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`fetchConsultations: ${error.message}`);
  return ((data ?? []) as any[]).map(mapConsultRow);
}

/**
 * Insert a new consultation request.
 *
 * FIX: was inserting orchard_id: payload.orchardId (undefined â€” field doesn't exist).
 *      Now inserts field_id + orchard_name + user_id per the SQL schema.
 */
export async function createConsultation(payload: {
  growerName: string;
  growerPhone: string;
  userId: string;
  fieldId: string;
  orchardName: string;
  doctorId: string;
  type: ConsultType;
  targetDateTime: string;
  notes: string;
}): Promise<ConsultationRequest> {
  const { data, error } = await db
    .from('consultations')
    .insert({
      user_id: payload.userId,         // â† required for RLS USING (auth.uid() = user_id)
      grower_name: payload.growerName,
      grower_phone: payload.growerPhone,
      field_id: payload.fieldId,       // â† was orchard_id: payload.orchardId â€” FIXED
      orchard_name: payload.orchardName,
      doctor_id: payload.doctorId,
      type: payload.type,
      status: 'REQUESTED',
      target_datetime: payload.targetDateTime,
      notes: payload.notes,
    })
    .select(`
      *,
      prescriptions (
        *,
        prescription_action_items (*)
      )
    `)
    .single();

  if (error) throw new Error(`createConsultation: ${error.message}`);
  return mapConsultRow(data);
}

/**
 * Transition a consultation status (REQUESTED â†’ IN_PROGRESS, etc.)
 */
export async function updateConsultationStatus(
  id: string,
  status: ConsultStatus,
  doctorId?: string
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (doctorId !== undefined) patch.doctor_id = doctorId;

  const { error } = await db
    .from('consultations')
    .update(patch)
    .eq('id', id);

  if (error) throw new Error(`updateConsultationStatus: ${error.message}`);
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   PRESCRIPTIONS
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/**
 * Issue a new digital prescription + its action items.
 * Returns the full hydrated prescription.
 */
export async function issuePrescription(payload: {
  consultationId: string;
  doctorName: string;
  hospitalName: string;
  issueDiagnosed: string;
  eppoCode: string;
  recommendation: string;
  followUpDate: string;
  actionItems: Array<{
    category: ActionItem['category'];
    productName: string;
    dosage: string;
    estimatedCost: number;
  }>;
}): Promise<DigitalPrescription> {
  // 1. Insert prescription row
  const { data: rxRow, error: rxErr } = await db
    .from('prescriptions')
    .insert({
      consultation_id: payload.consultationId,
      doctor_name: payload.doctorName,
      hospital_name: payload.hospitalName,
      issue_diagnosed: payload.issueDiagnosed,
      eppo_code: payload.eppoCode,
      recommendation: payload.recommendation,
      status: 'PENDING',
      issued_at: new Date().toISOString().slice(0, 10),
      follow_up_date: payload.followUpDate,
    })
    .select('*')
    .single();

  if (rxErr) throw new Error(`issuePrescription (rx): ${rxErr.message}`);

  // 2. Insert action items
  if (payload.actionItems.length > 0) {
    const { error: itemsErr } = await db
      .from('prescription_action_items')
      .insert(
        payload.actionItems.map((it, idx) => ({
          prescription_id: rxRow.id,
          category: it.category,
          product_name: it.productName,
          dosage: it.dosage,
          estimated_cost: it.estimatedCost,
          sort_order: idx,
        }))
      );

    if (itemsErr) throw new Error(`issuePrescription (items): ${itemsErr.message}`);
  }

  // 3. Mark consultation as COMPLETED
  await updateConsultationStatus(payload.consultationId, 'COMPLETED');

  // 4. Return full prescription with items
  const { data: full, error: fullErr } = await db
    .from('prescriptions')
    .select('*, prescription_action_items(*)')
    .eq('id', rxRow.id)
    .single();

  if (fullErr) throw new Error(`issuePrescription (refetch): ${fullErr.message}`);
  return mapPrescriptionRow(full);
}

/**
 * Update prescription status (PENDING â†’ APPLIED or NEEDS_CORRECTION).
 */
export async function updatePrescriptionStatus(
  id: string,
  status: PrescriptionStatus
): Promise<void> {
  const { error } = await db
    .from('prescriptions')
    .update({ status })
    .eq('id', id);

  if (error) throw new Error(`updatePrescriptionStatus: ${error.message}`);
}
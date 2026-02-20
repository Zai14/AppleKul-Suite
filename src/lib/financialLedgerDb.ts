/**
 * financialLedgerDb.ts
 * All Supabase data-access for the Financial Ledger module.
 * No mock data – every function is a real DB round-trip.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { supabase } from './supabaseClient';

// ── App-level types ──────────────────────────────────────────

export type ActivityCategory =
  | 'PRUNING' | 'DIGGING' | 'IRRIGATION' | 'GENERAL'
  | 'PICKING' | 'GRADING' | 'PACKAGING' | 'FORWARDING'
  | 'SERVICES' | 'FERTILIZER' | 'OTHER';

export interface Chemical {
  name: string;
  brand: string;
  qty: number;
  unit: string;
  rate: number;
  recommended: string;
}

export interface Spray {
  id: string;
  sprayNo: number;
  stage: string;
  date: string;
  water: number;
  chemicals: Chemical[];
  labourCount: number;
  labourRate: number;
}

export interface ActivityExpense {
  id: string;
  category: ActivityCategory;
  date: string;
  description: string;
  amount: number;
  days: number;
  labourCount: number;
  ratePerDay: number;
}

export interface LabourWorker {
  id: string;
  name: string;
  phone: string;
  activity: ActivityCategory | 'SPRAY';
  startDate: string;
  endDate: string;
  days: number;
  ratePerDay: number;
  advance: number;
  paid: boolean;
}

export interface IncomeEntry {
  id: string;
  variety: string;
  crates: number;
  kgPerCrate: number;
  pricePerCrate: number;
  date: string;
  buyer: string;
}

// ── DB cast helper ───────────────────────────────────────────
const db = supabase as any;

// ════════════════════════════════════════════════════════════
//  SPRAYS
// ════════════════════════════════════════════════════════════

function mapSprayRow(row: any): Spray {
  return {
    id: row.id,
    sprayNo: row.spray_no,
    stage: row.stage,
    date: row.spray_date,
    water: Number(row.water_litres),
    labourCount: row.labour_count,
    labourRate: Number(row.labour_rate),
    chemicals: ((row.spray_chemicals ?? []) as any[])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((c: any): Chemical => ({
        name: c.chemical_name,
        brand: c.brand,
        qty: Number(c.qty),
        unit: c.unit,
        rate: Number(c.rate),
        recommended: c.recommended,
      })),
  };
}

export async function fetchSprays(orchardId: string): Promise<Spray[]> {
  const { data, error } = await db
    .from('sprays')
    .select('*, spray_chemicals(*)')
    .eq('user_id', orchardId)
    .order('spray_no', { ascending: true });

  if (error) throw new Error(`fetchSprays: ${error.message}`);
  return ((data ?? []) as any[]).map(mapSprayRow);
}

export async function createSpray(
  orchardId: string,
  spray: Omit<Spray, 'id'>
): Promise<Spray> {
  // 1. Insert parent row
  const { data: sprayRow, error: sprayErr } = await db
    .from('sprays')
    .insert({
      user_id: orchardId,
      spray_no: spray.sprayNo,
      stage: spray.stage,
      spray_date: spray.date,
      water_litres: spray.water,
      labour_count: spray.labourCount,
      labour_rate: spray.labourRate,
    })
    .select('*')
    .single();

  if (sprayErr) throw new Error(`createSpray: ${sprayErr.message}`);

  // 2. Insert chemicals
  if (spray.chemicals.length > 0) {
    const { error: chemErr } = await db
      .from('spray_chemicals')
      .insert(
        spray.chemicals.map((c, idx) => ({
          spray_id: sprayRow.id,
          user_id: orchardId,
          chemical_name: c.name,
          brand: c.brand,
          qty: c.qty,
          unit: c.unit,
          rate: c.rate,
          recommended: c.recommended,
          sort_order: idx,
        }))
      );
    if (chemErr) throw new Error(`createSpray (chemicals): ${chemErr.message}`);
  }

  // 3. Re-fetch with chemicals
  const { data: full, error: fullErr } = await db
    .from('sprays')
    .select('*, spray_chemicals(*)')
    .eq('id', sprayRow.id)
    .single();

  if (fullErr) throw new Error(`createSpray (refetch): ${fullErr.message}`);
  return mapSprayRow(full);
}

export async function deleteSpray(id: string): Promise<void> {
  // cascade deletes spray_chemicals via FK
  const { error } = await db.from('sprays').delete().eq('id', id);
  if (error) throw new Error(`deleteSpray: ${error.message}`);
}

// ════════════════════════════════════════════════════════════
//  ACTIVITY EXPENSES
// ════════════════════════════════════════════════════════════

function mapActivityRow(row: any): ActivityExpense {
  return {
    id: row.id,
    category: row.category as ActivityCategory,
    date: row.expense_date,
    description: row.description,
    amount: Number(row.amount),
    days: row.days,
    labourCount: row.labour_count,
    ratePerDay: Number(row.rate_per_day),
  };
}

export async function fetchActivities(orchardId: string): Promise<ActivityExpense[]> {
  const { data, error } = await db
    .from('activity_expenses')
    .select('*')
    .eq('user_id', orchardId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`fetchActivities: ${error.message}`);
  return ((data ?? []) as any[]).map(mapActivityRow);
}

export async function createActivity(
  orchardId: string,
  activity: Omit<ActivityExpense, 'id'>
): Promise<ActivityExpense> {
  const { data, error } = await db
    .from('activity_expenses')
    .insert({
      user_id: orchardId,
      category: activity.category,
      expense_date: activity.date,
      description: activity.description,
      amount: activity.amount,
      days: activity.days,
      labour_count: activity.labourCount,
      rate_per_day: activity.ratePerDay,
    })
    .select('*')
    .single();

  if (error) throw new Error(`createActivity: ${error.message}`);
  return mapActivityRow(data);
}

export async function deleteActivity(id: string): Promise<void> {
  const { error } = await db.from('activity_expenses').delete().eq('id', id);
  if (error) throw new Error(`deleteActivity: ${error.message}`);
}

// ════════════════════════════════════════════════════════════
//  LABOUR WORKERS
// ════════════════════════════════════════════════════════════

function mapWorkerRow(row: any): LabourWorker {
  return {
    id: row.id,
    name: row.worker_name,
    phone: row.phone,
    activity: row.activity as ActivityCategory | 'SPRAY',
    startDate: row.start_date,
    endDate: row.end_date,
    days: row.days,
    ratePerDay: Number(row.rate_per_day),
    advance: Number(row.advance),
    paid: row.paid,
  };
}

export async function fetchWorkers(orchardId: string): Promise<LabourWorker[]> {
  const { data, error } = await db
    .from('labour_workers')
    .select('*')
    .eq('user_id', orchardId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`fetchWorkers: ${error.message}`);
  return ((data ?? []) as any[]).map(mapWorkerRow);
}

export async function createWorker(
  orchardId: string,
  worker: Omit<LabourWorker, 'id'>
): Promise<LabourWorker> {
  const { data, error } = await db
    .from('labour_workers')
    .insert({
      user_id: orchardId,
      worker_name: worker.name,
      phone: worker.phone,
      activity: worker.activity,
      start_date: worker.startDate,
      end_date: worker.endDate,
      days: worker.days,
      rate_per_day: worker.ratePerDay,
      advance: worker.advance,
      paid: worker.paid,
    })
    .select('*')
    .single();

  if (error) throw new Error(`createWorker: ${error.message}`);
  return mapWorkerRow(data);
}

export async function toggleWorkerPaid(id: string, paid: boolean): Promise<void> {
  const { error } = await db
    .from('labour_workers')
    .update({ paid })
    .eq('id', id);
  if (error) throw new Error(`toggleWorkerPaid: ${error.message}`);
}

export async function deleteWorker(id: string): Promise<void> {
  const { error } = await db.from('labour_workers').delete().eq('id', id);
  if (error) throw new Error(`deleteWorker: ${error.message}`);
}

// ════════════════════════════════════════════════════════════
//  INCOME ENTRIES
// ════════════════════════════════════════════════════════════

function mapIncomeRow(row: any): IncomeEntry {
  return {
    id: row.id,
    variety: row.variety,
    crates: row.crates,
    kgPerCrate: Number(row.kg_per_crate),
    pricePerCrate: Number(row.price_per_crate),
    date: row.sale_date,
    buyer: row.buyer,
  };
}

export async function fetchIncome(orchardId: string): Promise<IncomeEntry[]> {
  const { data, error } = await db
    .from('income_entries')
    .select('*')
    .eq('user_id', orchardId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`fetchIncome: ${error.message}`);
  return ((data ?? []) as any[]).map(mapIncomeRow);
}

export async function createIncome(
  orchardId: string,
  entry: Omit<IncomeEntry, 'id'>
): Promise<IncomeEntry> {
  const { data, error } = await db
    .from('income_entries')
    .insert({
      user_id: orchardId,
      variety: entry.variety,
      crates: entry.crates,
      kg_per_crate: entry.kgPerCrate,
      price_per_crate: entry.pricePerCrate,
      sale_date: entry.date,
      buyer: entry.buyer,
    })
    .select('*')
    .single();

  if (error) throw new Error(`createIncome: ${error.message}`);
  return mapIncomeRow(data);
}

export async function deleteIncome(id: string): Promise<void> {
  const { error } = await db.from('income_entries').delete().eq('id', id);
  if (error) throw new Error(`deleteIncome: ${error.message}`);
}

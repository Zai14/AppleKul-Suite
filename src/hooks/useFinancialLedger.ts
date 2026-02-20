/**
 * useFinancialLedger.ts
 * Supabase-backed state for the Financial Ledger module.
 * Drop useState[] arrays – all data lives in the DB.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  fetchSprays,
  fetchActivities,
  fetchWorkers,
  fetchIncome,
  createSpray,
  deleteSpray,
  createActivity,
  deleteActivity,
  createWorker,
  toggleWorkerPaid,
  deleteWorker,
  createIncome,
  deleteIncome,
} from '../lib/financialLedgerDb';
import type {
  Spray,
  ActivityExpense,
  LabourWorker,
  IncomeEntry,
} from '../lib/financialLedgerDb';

export type { Spray, ActivityExpense, LabourWorker, IncomeEntry };

export function useFinancialLedger(orchardId: string) {
  const [sprays,     setSprays]     = useState<Spray[]>([]);
  const [activities, setActivities] = useState<ActivityExpense[]>([]);
  const [workers,    setWorkers]    = useState<LabourWorker[]>([]);
  const [income,     setIncome]     = useState<IncomeEntry[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [mutating,   setMutating]   = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // ── Load all data ─────────────────────────────────────────
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, a, w, i] = await Promise.all([
        fetchSprays(orchardId),
        fetchActivities(orchardId),
        fetchWorkers(orchardId),
        fetchIncome(orchardId),
      ]);
      setSprays(s);
      setActivities(a);
      setWorkers(w);
      setIncome(i);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [orchardId]);

  useEffect(() => { reload(); }, [reload]);

  // ── Mutation wrapper ──────────────────────────────────────
  function withMutation<T extends unknown[]>(fn: (...args: T) => Promise<void>) {
    return async (...args: T) => {
      setMutating(true);
      setError(null);
      try {
        await fn(...args);
        await reload();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setMutating(false);
      }
    };
  }

  // ── Spray actions ─────────────────────────────────────────
  const addSpray = withMutation(async (spray: Omit<Spray, 'id'>) => {
    await createSpray(orchardId, spray);
  });

  const removeSpray = withMutation(async (id: string) => {
    await deleteSpray(id);
  });

  // ── Activity actions ──────────────────────────────────────
  const addActivity = withMutation(async (activity: Omit<ActivityExpense, 'id'>) => {
    await createActivity(orchardId, activity);
  });

  const removeActivity = withMutation(async (id: string) => {
    await deleteActivity(id);
  });

  // ── Worker actions ────────────────────────────────────────
  const addWorker = withMutation(async (worker: Omit<LabourWorker, 'id'>) => {
    await createWorker(orchardId, worker);
  });

  const markPaid = withMutation(async (id: string, paid: boolean) => {
    await toggleWorkerPaid(id, paid);
  });

  const removeWorker = withMutation(async (id: string) => {
    await deleteWorker(id);
  });

  // ── Income actions ────────────────────────────────────────
  const addIncome = withMutation(async (entry: Omit<IncomeEntry, 'id'>) => {
    await createIncome(orchardId, entry);
  });

  const removeIncome = withMutation(async (id: string) => {
    await deleteIncome(id);
  });

  // ── Derived totals ────────────────────────────────────────
  const totalSprayCost = useMemo(
    () => sprays.reduce((sum, s) =>
      sum + s.chemicals.reduce((cs, c) => cs + c.qty * c.rate, 0) + s.labourCount * s.labourRate, 0),
    [sprays]
  );

  const totalActivityCost = useMemo(
    () => activities.reduce((sum, a) => sum + a.amount, 0),
    [activities]
  );

  const totalLabourCost = useMemo(
    () => workers.reduce((sum, w) => sum + w.days * w.ratePerDay, 0),
    [workers]
  );

  const totalAdvancePaid = useMemo(
    () => workers.reduce((sum, w) => sum + w.advance, 0),
    [workers]
  );

  const totalIncome = useMemo(
    () => income.reduce((sum, i) => sum + i.crates * i.pricePerCrate, 0),
    [income]
  );

  const totalExpenses = totalSprayCost + totalActivityCost;
  const netProfit     = totalIncome - totalExpenses;

  return {
    // data
    sprays,
    activities,
    workers,
    income,
    // status
    loading,
    mutating,
    error,
    reload,
    // spray actions
    addSpray,
    removeSpray,
    // activity actions
    addActivity,
    removeActivity,
    // worker actions
    addWorker,
    markPaid,
    removeWorker,
    // income actions
    addIncome,
    removeIncome,
    // derived
    totalSprayCost,
    totalActivityCost,
    totalLabourCost,
    totalAdvancePaid,
    totalIncome,
    totalExpenses,
    netProfit,
  };
}

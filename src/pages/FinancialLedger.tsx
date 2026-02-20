/**
 * FinancialLedger.tsx  — Supabase-connected version
 *
 * What changed vs the original:
 *  1. Imports + uses `useFinancialLedger(orchardId)` hook.
 *  2. All useState arrays (sprays, activities, workers, incomeEntries)
 *     removed – they come from the DB via the hook.
 *  3. saveSpray / saveActivity / saveWorker / saveIncome now call
 *     db.addSpray / db.addActivity / db.addWorker / db.addIncome (async).
 *  4. delete handlers call db.removeX.
 *  5. togglePaid calls db.markPaid.
 *  6. Loading + error states shown at top.
 *  7. Component uses user_id from session/context; no orchardId prop.
 */

import { useState, useMemo } from 'react';
import {
  Plus, Droplets, ChevronDown, ChevronUp, Trash2, Users,
  TrendingUp, TrendingDown, DollarSign, Leaf, Wrench,
  ShoppingBag, BarChart2, CheckCircle2, Scissors, Shovel,
  Sprout, Package, Truck, Settings, X, ArrowRight, Activity,
  FlaskConical, Calendar, Hash, Loader2, AlertTriangle,
} from 'lucide-react';
import { useFinancialLedger } from '../hooks/useFinancialLedger';
import { useAuth } from '../contexts/AuthContext';
import type { ActivityExpense, LabourWorker, IncomeEntry, Spray } from '../hooks/useFinancialLedger';

/* ================= MASTER DATA (unchanged) ================= */

const SPRAY_STAGES = [
  'Dormant','Green Tip','Pink Bud','Petal Fall',
  'Fruit Set','Cover Spray 1','Cover Spray 2','Cover Spray 3',
];

const CHEMICAL_LIBRARY = [
  { name: 'Mancozeb',     brand: 'Dithane M-45', unit: 'kg', recommended: '2–2.5 g/L',  pricePerUnit: 450 },
  { name: 'Imidacloprid', brand: 'Confidor',      unit: 'ml', recommended: '0.3 ml/L',  pricePerUnit: 1.2 },
  { name: 'HM Oil',       brand: 'Orchex 796',   unit: 'l',  recommended: '1.5–2%',     pricePerUnit: 280 },
  { name: 'Carbendazim',  brand: 'Bavistin',      unit: 'kg', recommended: '1 g/L',     pricePerUnit: 520 },
  { name: 'Chlorpyrifos', brand: 'Durmet',        unit: 'ml', recommended: '2 ml/L',    pricePerUnit: 0.8 },
  { name: 'Captan',       brand: 'Captaf',        unit: 'kg', recommended: '2.5 g/L',   pricePerUnit: 380 },
  { name: 'Thiamethoxam', brand: 'Actara',        unit: 'g',  recommended: '0.25 g/L',  pricePerUnit: 2.5 },
  { name: 'Hexaconazole', brand: 'Contaf Plus',   unit: 'ml', recommended: '1 ml/L',    pricePerUnit: 1.8 },
  { name: 'Abamectin',    brand: 'Vertimec',      unit: 'ml', recommended: '0.5 ml/L',  pricePerUnit: 3.2 },
  { name: 'Sulphur 80%WP',brand: 'Sulfex',        unit: 'kg', recommended: '3 g/L',     pricePerUnit: 120 },
];

const PREVIOUS_SEASON_WATER: Record<string, number> = {
  Dormant: 800, 'Pink Bud': 1000, 'Petal Fall': 1200,
};

const ACTIVITY_CATEGORIES = [
  { key: 'PRUNING',    label: 'Pruning',              icon: '✂️' },
  { key: 'DIGGING',    label: 'Digging / Basin Prep', icon: '⛏️' },
  { key: 'IRRIGATION', label: 'Irrigation',            icon: '💧' },
  { key: 'GENERAL',   label: 'General Labor',         icon: '👷' },
  { key: 'PICKING',   label: 'Picking / Harvesting',  icon: '🍎' },
  { key: 'GRADING',   label: 'Grading',               icon: '📦' },
  { key: 'PACKAGING', label: 'Packaging',              icon: '🗃️' },
  { key: 'FORWARDING',label: 'Forwarding / Transport', icon: '🚚' },
  { key: 'SERVICES',  label: 'Services & Misc',       icon: '🔧' },
  { key: 'FERTILIZER',label: 'Fertilizer Application',icon: '🌱' },
  { key: 'OTHER',     label: 'Other',                 icon: '📝' },
] as const;

type ActivityCategory = typeof ACTIVITY_CATEGORIES[number]['key'];

const APPLE_VARIETIES = [
  'Royal Delicious','Red Delicious','Golden Delicious','Gala',
  'Fuji','Granny Smith','Ambri','Other',
];

/* ================= EXPENSE CATEGORY CONFIG (unchanged) ================= */

type ExpenseCategoryKey = 'spray'|'pruning'|'digging'|'irrigation'|'labour'|'grading'|'services';

interface ExpenseCategoryConfig {
  key: ExpenseCategoryKey;
  label: string; sublabel: string; Icon: any;
  gradient: string; glow: string; border: string; iconBg: string;
  activityCodes: string[]; dataSource: 'spray' | 'activity';
}

const EXPENSE_CATEGORY_CONFIG: ExpenseCategoryConfig[] = [
  { key:'spray',     label:'Spray',     sublabel:'Operations',       Icon:FlaskConical, gradient:'linear-gradient(135deg,#0ea5e9 0%,#0369a1 100%)',  glow:'0 8px 32px rgba(14,165,233,0.45)',  border:'#38bdf8', iconBg:'rgba(255,255,255,0.2)', activityCodes:[], dataSource:'spray'    },
  { key:'pruning',   label:'Pruning',   sublabel:'Tree Care',        Icon:Scissors,     gradient:'linear-gradient(135deg,#8b5cf6 0%,#6d28d9 100%)',  glow:'0 8px 32px rgba(139,92,246,0.45)', border:'#a78bfa', iconBg:'rgba(255,255,255,0.2)', activityCodes:['PRUNING'],    dataSource:'activity' },
  { key:'digging',   label:'Digging',   sublabel:'Basin Prep',       Icon:Shovel,       gradient:'linear-gradient(135deg,#f59e0b 0%,#b45309 100%)',  glow:'0 8px 32px rgba(245,158,11,0.45)', border:'#fbbf24', iconBg:'rgba(255,255,255,0.2)', activityCodes:['DIGGING'],    dataSource:'activity' },
  { key:'irrigation',label:'Irrigation',sublabel:'Water Mgmt',       Icon:Droplets,     gradient:'linear-gradient(135deg,#06b6d4 0%,#0e7490 100%)',  glow:'0 8px 32px rgba(6,182,212,0.45)',  border:'#22d3ee', iconBg:'rgba(255,255,255,0.2)', activityCodes:['IRRIGATION'], dataSource:'activity' },
  { key:'labour',    label:'Labour',    sublabel:'General & Harvest', Icon:Users,        gradient:'linear-gradient(135deg,#ef4444 0%,#b91c1c 100%)',  glow:'0 8px 32px rgba(239,68,68,0.45)',  border:'#f87171', iconBg:'rgba(255,255,255,0.2)', activityCodes:['GENERAL','PICKING','FORWARDING','FERTILIZER'], dataSource:'activity' },
  { key:'grading',   label:'Grading',   sublabel:'Packaging',        Icon:Package,      gradient:'linear-gradient(135deg,#10b981 0%,#047857 100%)',  glow:'0 8px 32px rgba(16,185,129,0.45)', border:'#34d399', iconBg:'rgba(255,255,255,0.2)', activityCodes:['GRADING','PACKAGING'], dataSource:'activity' },
  { key:'services',  label:'Services',  sublabel:'Misc & Other',     Icon:Settings,     gradient:'linear-gradient(135deg,#64748b 0%,#334155 100%)',  glow:'0 8px 32px rgba(100,116,139,0.45)',border:'#94a3b8', iconBg:'rgba(255,255,255,0.2)', activityCodes:['SERVICES','OTHER'],   dataSource:'activity' },
];

/* ================= TYPES ================= */

type Chemical = { name:string; brand:string; qty:number; unit:string; rate:number; recommended:string; };

/* ================= HELPERS ================= */

const daysBetween = (start: string, end: string) => {
  if (!start) return 1;
  const s = new Date(start), e = new Date(end || start);
  return Math.max(1, Math.ceil((+e - +s) / 86400000) + 1);
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);

/* ================= SUB-COMPONENTS (unchanged) ================= */

function SummaryCard({ label, value, color, icon: Icon, sub }: { label:string; value:number; color:string; icon:any; sub?:string }) {
  return (
    <div className={`rounded-2xl p-5 shadow-lg text-white bg-gradient-to-br ${color}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold opacity-80">{label}</span>
        <Icon className="w-5 h-5 opacity-70" />
      </div>
      <p className="text-3xl font-extrabold tracking-tight">₹{fmt(value)}</p>
      {sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, icon: Icon, color }: { title:string; icon:any; color:string }) {
  return (
    <div className={`flex items-center gap-3 pb-3 border-b-2 ${color}`}>
      <div className={`p-2 rounded-lg bg-opacity-10 ${color.replace('border-','bg-')}`}>
        <Icon className="w-5 h-5" />
      </div>
      <h2 className="text-lg font-bold text-gray-800">{title}</h2>
    </div>
  );
}

function ExpenseCategoryCard({ config, totalCost, count, isSelected, onClick }: { config:ExpenseCategoryConfig; totalCost:number; count:number; isSelected:boolean; onClick:()=>void }) {
  const { Icon } = config;
  return (
    <button onClick={onClick}
      style={{ background:config.gradient, boxShadow:isSelected ? `${config.glow}, 0 0 0 3px white, 0 0 0 5px ${config.border}` : config.glow, transform:isSelected ? 'translateY(-6px) scale(1.04)' : 'translateY(0) scale(1)', transition:'all 0.28s cubic-bezier(0.34,1.56,0.64,1)', outline:'none' }}
      className="relative flex flex-col items-start text-left rounded-2xl p-4 w-full overflow-hidden"
    >
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full" style={{ background:'rgba(255,255,255,0.12)' }} />
      <div className="absolute top-2 right-2 w-8 h-8 rounded-full" style={{ background:'rgba(255,255,255,0.12)' }} />
      <div className="mb-3 p-2.5 rounded-xl" style={{ background:config.iconBg }}><Icon className="w-5 h-5 text-white" /></div>
      <p className="text-white text-xs font-semibold opacity-80 leading-tight">{config.sublabel}</p>
      <p className="text-white text-sm font-extrabold leading-tight">{config.label}</p>
      <p className="text-white text-lg font-extrabold mt-2 leading-tight tracking-tight">₹{fmt(totalCost)}</p>
      <div className="mt-1.5 flex items-center gap-1">
        <span className="text-white text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background:'rgba(255,255,255,0.22)' }}>
          {count} {count === 1 ? 'record' : 'records'}
        </span>
      </div>
      {isSelected && <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl" style={{ background:'rgba(255,255,255,0.7)' }} />}
    </button>
  );
}

function SprayDetailPanel({ sprays, openSprayId, setOpenSprayId, onDelete, sprayCost, chemicalCost, totalSprayCost, mutating }: any) {
  return (
    <div className="space-y-3">
      {sprays.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FlaskConical className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No spray operations recorded yet</p>
        </div>
      ) : sprays.map((s: Spray) => (
        <div key={s.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-sky-50 transition"
               onClick={() => setOpenSprayId(openSprayId === s.id ? null : s.id)}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-100 flex items-center justify-center">
                <span className="text-sky-700 font-bold text-sm">#{s.sprayNo}</span>
              </div>
              <div>
                <p className="font-bold text-gray-800 text-sm">{s.stage}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />{s.date}
                  <span className="mx-1">·</span>
                  <Hash className="w-3 h-3" />{s.chemicals.length} chemicals
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-extrabold text-sky-700">₹{fmt(sprayCost(s))}</span>
              <button onClick={e => { e.stopPropagation(); onDelete(s.id); }} disabled={mutating}
                className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-40">
                <Trash2 className="w-4 h-4" />
              </button>
              {openSprayId === s.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </div>
          </div>
          {openSprayId === s.id && (
            <div className="px-4 pb-4 pt-3 bg-gray-50 border-t space-y-2">
              <div className="grid grid-cols-5 text-xs font-bold text-gray-400 uppercase mb-2 tracking-wide">
                <span className="col-span-2">Chemical</span><span>Qty</span><span>Rate</span><span className="text-right">Cost</span>
              </div>
              {s.chemicals.map((c: Chemical, i: number) => (
                <div key={i} className="grid grid-cols-5 py-2 border-b border-gray-200 text-sm">
                  <div className="col-span-2"><p className="font-semibold text-gray-800">{c.name}</p><p className="text-xs text-gray-500">{c.brand}</p></div>
                  <span className="text-gray-700">{c.qty} {c.unit}</span>
                  <span className="text-gray-700">₹{c.rate}/{c.unit}</span>
                  <span className="text-right font-bold text-sky-700">₹{fmt(chemicalCost(c))}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm pt-1">
                <span className="text-gray-500">Labour ({s.labourCount} × ₹{s.labourRate})</span>
                <span className="font-semibold">₹{fmt(s.labourCount * s.labourRate)}</span>
              </div>
              {s.water > 0 && <p className="text-xs text-gray-400">Water used: {s.water} L</p>}
              <div className="flex justify-between font-extrabold text-base pt-2 border-t border-gray-200">
                <span>Spray Total</span>
                <span className="text-sky-700">₹{fmt(sprayCost(s))}</span>
              </div>
            </div>
          )}
        </div>
      ))}
      {sprays.length > 0 && (
        <div className="flex justify-between items-center bg-sky-50 rounded-xl px-4 py-3 border border-sky-200">
          <span className="font-bold text-sky-800">Total Spray Cost</span>
          <span className="font-extrabold text-sky-700 text-lg">₹{fmt(totalSprayCost)}</span>
        </div>
      )}
    </div>
  );
}

function ActivityDetailPanel({ config, activities, onDelete, mutating }: { config:ExpenseCategoryConfig; activities:ActivityExpense[]; onDelete:(id:string)=>void; mutating:boolean }) {
  const filtered = activities.filter(a => config.activityCodes.includes(a.category));
  const total    = filtered.reduce((s, a) => s + a.amount, 0);
  const getLabel = (cat: string) => ACTIVITY_CATEGORIES.find(c => c.key === cat)?.label || cat;
  const getIcon  = (cat: string) => ACTIVITY_CATEGORIES.find(c => c.key === cat)?.icon || '📝';
  return (
    <div className="space-y-3">
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <config.Icon className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No {config.label.toLowerCase()} expenses recorded yet</p>
        </div>
      ) : filtered.map(a => (
        <div key={a.id} className="flex items-start justify-between border border-gray-200 rounded-xl px-4 py-3 hover:bg-gray-50 transition shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">{getIcon(a.category)}</div>
            <div>
              <p className="font-bold text-gray-800 text-sm">{a.description || getLabel(a.category)}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                <span className="text-xs text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> {a.date}</span>
                <span className="text-xs text-gray-500">{a.days} day{a.days > 1 ? 's' : ''}</span>
                <span className="text-xs text-gray-500">{a.labourCount} labour{a.labourCount > 1 ? 's' : ''} @ ₹{a.ratePerDay}/day</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="font-extrabold text-gray-800">₹{fmt(a.amount)}</span>
            <button onClick={() => onDelete(a.id)} disabled={mutating}
              className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-40">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
      {filtered.length > 0 && (
        <div className="flex justify-between items-center rounded-xl px-4 py-3 border bg-gray-50">
          <span className="font-bold text-gray-700">Total {config.label} Cost</span>
          <span className="font-extrabold text-gray-800 text-lg">₹{fmt(total)}</span>
        </div>
      )}
    </div>
  );
}

/* ================= MAIN COMPONENT ================= */

export default function FinancialLedger() {
  // Get user_id from AuthContext
  const { user } = useAuth();
  const userId = user?.id;
  if (!userId) {
    return <div className="p-8 text-center text-red-600">User not authenticated or user ID missing.</div>;
  }
  const db = useFinancialLedger(userId as string);

  /* ---- Active Tab ---- */
  const [tab, setTab] = useState<'expenses'|'income'|'labour'|'summary'>('expenses');
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState<ExpenseCategoryKey | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  /* ---- Spray form state ---- */
  const [stage, setStage]               = useState('');
  const [sprayDate, setSprayDate]       = useState('');
  const [water, setWater]               = useState('');
  const [chemicals, setChemicals]       = useState<Chemical[]>([]);
  const [sprayLabours, setSprayLabours] = useState('');
  const [sprayLabourRate, setSprayLabourRate] = useState('');
  const [openSprayId, setOpenSprayId]   = useState<string | null>(null);

  /* ---- Activity form state ---- */
  const [actCat, setActCat]           = useState<ActivityCategory>('PRUNING');
  const [actDesc, setActDesc]         = useState('');
  const [actStartDate, setActStartDate] = useState('');
  const [actEndDate, setActEndDate]   = useState('');
  const [actLabours, setActLabours]   = useState('');
  const [actRate, setActRate]         = useState('');

  /* ---- Worker form state ---- */
  const [wName, setWName]       = useState('');
  const [wPhone, setWPhone]     = useState('');
  const [wActivity, setWActivity] = useState<ActivityCategory | 'SPRAY'>('GENERAL');
  const [wStart, setWStart]     = useState('');
  const [wEnd, setWEnd]         = useState('');
  const [wRate, setWRate]       = useState('');
  const [wAdvance, setWAdvance] = useState('');

  /* ---- Income form state ---- */
  const [incVariety, setIncVariety]     = useState('');
  const [incCrates, setIncCrates]       = useState('');
  const [incKgPerCrate, setIncKgPerCrate] = useState('');
  const [incPrice, setIncPrice]         = useState('');
  const [incDate, setIncDate]           = useState('');
  const [incBuyer, setIncBuyer]         = useState('');

  /* ================= PURE CALCULATIONS ================= */

  const chemicalCost = (c: Chemical) => c.qty * c.rate;
  const sprayCost    = (s: Spray) =>
    s.chemicals.reduce((sum, c) => sum + chemicalCost(c), 0) + s.labourCount * s.labourRate;

  const roi        = db.totalExpenses > 0 ? (db.netProfit / db.totalExpenses) * 100 : 0;
  const totalYieldKg = useMemo(() => db.income.reduce((sum, i) => sum + i.crates * i.kgPerCrate, 0), [db.income]);
  const costPerKg    = totalYieldKg > 0 ? db.totalExpenses / totalYieldKg : 0;
  const totalLabourDue = db.totalLabourCost - db.totalAdvancePaid;

  const categorySummaries = useMemo(() => EXPENSE_CATEGORY_CONFIG.map(cfg => {
    if (cfg.dataSource === 'spray') return { key: cfg.key, total: db.totalSprayCost, count: db.sprays.length };
    const filtered = db.activities.filter(a => cfg.activityCodes.includes(a.category));
    return { key: cfg.key, total: filtered.reduce((s, a) => s + a.amount, 0), count: filtered.length };
  }), [db.sprays, db.activities, db.totalSprayCost]);

  /* ================= SPRAY ACTIONS ================= */

  const addChemical    = () => setChemicals([...chemicals, { name:'', brand:'', qty:0, unit:'', rate:0, recommended:'' }]);
  const removeChemical = (i: number) => setChemicals(chemicals.filter((_, idx) => idx !== i));
  const updateChemical = (i: number, key: keyof Chemical, value: any) => {
    const copy = [...chemicals]; (copy[i] as any)[key] = value; setChemicals(copy);
  };
  const selectChemical = (i: number, name: string) => {
    const chem = CHEMICAL_LIBRARY.find(c => c.name === name); if (!chem) return;
    updateChemical(i, 'name', chem.name); updateChemical(i, 'brand', chem.brand);
    updateChemical(i, 'unit', chem.unit); updateChemical(i, 'recommended', chem.recommended);
    updateChemical(i, 'rate', chem.pricePerUnit);
  };

  const saveSpray = async () => {
    if (!stage || !sprayDate || chemicals.length === 0) return;
    await db.addSpray({
      sprayNo: db.sprays.length + 1, stage, date: sprayDate,
      water: Number(water), chemicals,
      labourCount: Number(sprayLabours || 0), labourRate: Number(sprayLabourRate || 0),
    });
    setStage(''); setSprayDate(''); setWater(''); setChemicals([]);
    setSprayLabours(''); setSprayLabourRate(''); setShowAddForm(false);
  };

  /* ================= ACTIVITY ACTIONS ================= */

  const saveActivity = async () => {
    if (!actCat || !actStartDate || !actLabours || !actRate) return;
    const days   = daysBetween(actStartDate, actEndDate);
    const amount = days * Number(actLabours) * Number(actRate);
    await db.addActivity({
      category: actCat, date: actStartDate, description: actDesc,
      amount, days, labourCount: Number(actLabours), ratePerDay: Number(actRate),
    });
    setActCat('PRUNING'); setActDesc(''); setActStartDate(''); setActEndDate('');
    setActLabours(''); setActRate(''); setShowAddForm(false);
  };

  /* ================= WORKER ACTIONS ================= */

  const saveWorker = async () => {
    if (!wName || !wStart || !wRate) return;
    const days = daysBetween(wStart, wEnd);
    await db.addWorker({
      name: wName, phone: wPhone, activity: wActivity,
      startDate: wStart, endDate: wEnd || wStart, days,
      ratePerDay: Number(wRate), advance: Number(wAdvance || 0), paid: false,
    });
    setWName(''); setWPhone(''); setWActivity('GENERAL');
    setWStart(''); setWEnd(''); setWRate(''); setWAdvance('');
  };

  /* ================= INCOME ACTIONS ================= */

  const saveIncome = async () => {
    if (!incVariety || !incCrates || !incPrice || !incDate) return;
    await db.addIncome({
      variety: incVariety, crates: Number(incCrates),
      kgPerCrate: Number(incKgPerCrate || 20), pricePerCrate: Number(incPrice),
      date: incDate, buyer: incBuyer,
    });
    setIncVariety(''); setIncCrates(''); setIncKgPerCrate('');
    setIncPrice(''); setIncDate(''); setIncBuyer('');
  };

  /* ================= RENDER ================= */

  const TABS = [
    { key: 'expenses', label: 'Expenses',         icon: TrendingDown },
    { key: 'income',   label: 'Income',            icon: TrendingUp   },
    { key: 'labour',   label: 'Labour Registry',   icon: Users        },
    { key: 'summary',  label: 'Summary',           icon: BarChart2    },
  ] as const;

  const selectedCategoryConfig = EXPENSE_CATEGORY_CONFIG.find(c => c.key === selectedExpenseCategory);

  const handleCategoryCardClick = (key: ExpenseCategoryKey) => {
    if (selectedExpenseCategory === key) {
      setSelectedExpenseCategory(null); setShowAddForm(false);
    } else {
      setSelectedExpenseCategory(key); setShowAddForm(false);
      const cfg = EXPENSE_CATEGORY_CONFIG.find(c => c.key === key);
      if (cfg?.dataSource === 'activity' && cfg.activityCodes.length > 0)
        setActCat(cfg.activityCodes[0] as ActivityCategory);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── HEADER ── */}
      <div className="bg-gradient-to-r from-green-800 to-green-600 text-white px-6 py-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Apple Orchard · Financial Ledger</h1>
            <p className="text-green-200 text-sm mt-1">Season 2025–2026 · Real-time profit tracking</p>
          </div>
          {db.loading && <Loader2 className="w-5 h-5 animate-spin text-green-200" />}
        </div>
      </div>

      {/* ── ERROR BANNER ── */}
      {db.error && (
        <div className="mx-6 mt-4 flex items-center gap-3 bg-red-50 border border-red-300 rounded-xl px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{db.error}</span>
        </div>
      )}

      {/* ── SUMMARY CARDS ── */}
      <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Total Expenses" value={db.totalExpenses} color="from-red-600 to-red-700" icon={TrendingDown}
          sub={`Sprays ₹${fmt(db.totalSprayCost)} + Activities ₹${fmt(db.totalActivityCost)}`} />
        <SummaryCard label="Total Income"   value={db.totalIncome}   color="from-green-600 to-green-700" icon={TrendingUp}
          sub={`${db.income.reduce((s,i)=>s+i.crates,0)} crates · ${fmt(totalYieldKg)} kg`} />
        <SummaryCard label="Net Profit"     value={db.netProfit}
          color={db.netProfit >= 0 ? 'from-blue-600 to-blue-700' : 'from-orange-600 to-orange-700'}
          icon={DollarSign} sub={`ROI ${roi.toFixed(1)}% · Cost/kg ₹${fmt(costPerKg)}`} />
      </div>

      {/* ── TABS ── */}
      <div className="px-6">
        <div className="flex gap-1 bg-white border rounded-xl p-1 shadow-sm">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                tab === t.key ? 'bg-green-700 text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}>
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">

        {/* ════ EXPENSES ════════════════════════════════════════════ */}
        {tab === 'expenses' && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-800">Expense Categories</h2>
                  <p className="text-sm text-gray-500">Select a category to view or add records</p>
                </div>
                <div className="bg-white border rounded-xl px-3 py-2 shadow-sm text-sm font-bold text-gray-700">
                  Total: <span className="text-red-600">₹{fmt(db.totalExpenses)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {EXPENSE_CATEGORY_CONFIG.map(cfg => {
                  const summary = categorySummaries.find(s => s.key === cfg.key)!;
                  return (
                    <ExpenseCategoryCard key={cfg.key} config={cfg} totalCost={summary.total} count={summary.count}
                      isSelected={selectedExpenseCategory === cfg.key} onClick={() => handleCategoryCardClick(cfg.key)} />
                  );
                })}
              </div>
            </div>

            {selectedCategoryConfig && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
                   style={{ animation:'slideDown 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
                <style>{`@keyframes slideDown{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}`}</style>

                {/* Panel Header */}
                <div className="flex items-center justify-between px-6 py-4" style={{ background:selectedCategoryConfig.gradient }}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl" style={{ background:'rgba(255,255,255,0.2)' }}>
                      <selectedCategoryConfig.Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-extrabold text-base">{selectedCategoryConfig.label}</p>
                      <p className="text-white text-xs opacity-75">{selectedCategoryConfig.sublabel}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setShowAddForm(!showAddForm)}
                      className="flex items-center gap-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
                      <Plus className="w-4 h-4" />{showAddForm ? 'Cancel' : 'Add New'}
                    </button>
                    <button onClick={() => { setSelectedExpenseCategory(null); setShowAddForm(false); }}
                      className="p-2 rounded-xl bg-white bg-opacity-20 hover:bg-opacity-30 text-white transition">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Add Form */}
                {showAddForm && (
                  <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
                    {selectedCategoryConfig.dataSource === 'spray' ? (
                      /* ---- SPRAY FORM ---- */
                      <div className="space-y-4">
                        <p className="font-bold text-gray-700 text-sm">New Spray Operation</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <select className="border rounded-lg px-3 py-2 bg-white text-sm" value={stage} onChange={e => setStage(e.target.value)}>
                            <option value="">Select Stage</option>
                            {SPRAY_STAGES.map(s => <option key={s}>{s}</option>)}
                          </select>
                          <input type="date" className="border rounded-lg px-3 py-2 bg-white text-sm" value={sprayDate} onChange={e => setSprayDate(e.target.value)} />
                          <div className="relative">
                            <input placeholder="Water (Litres)" type="number" className="border rounded-lg px-3 py-2 bg-white text-sm w-full" value={water} onChange={e => setWater(e.target.value)} />
                            {stage && PREVIOUS_SEASON_WATER[stage] && (
                              <span className="absolute -bottom-5 left-0 text-xs text-gray-500">Prev: ~{PREVIOUS_SEASON_WATER[stage]} L</span>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2 mt-2">
                          {chemicals.map((c, i) => (
                            <div key={i} className="grid grid-cols-2 sm:grid-cols-7 gap-2 items-center bg-white rounded-lg p-3 border">
                              <select className="border rounded px-2 py-1.5 text-sm sm:col-span-2" value={c.name} onChange={e => selectChemical(i, e.target.value)}>
                                <option value="">Chemical Name</option>
                                {CHEMICAL_LIBRARY.map(ch => <option key={ch.name}>{ch.name}</option>)}
                              </select>
                              <input placeholder="Brand" className="border rounded px-2 py-1.5 text-sm bg-gray-50" value={c.brand} onChange={e => updateChemical(i,'brand',e.target.value)} />
                              <input type="number" placeholder="Qty" className="border rounded px-2 py-1.5 text-sm" value={c.qty||''} onChange={e => updateChemical(i,'qty',+e.target.value)} />
                              <input placeholder="Unit" className="border rounded px-2 py-1.5 text-sm bg-gray-50" value={c.unit} readOnly />
                              <input type="number" placeholder="Rate ₹" className="border rounded px-2 py-1.5 text-sm" value={c.rate||''} onChange={e => updateChemical(i,'rate',+e.target.value)} />
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-sm font-bold text-sky-700">₹{fmt(chemicalCost(c))}</span>
                                <button onClick={() => removeChemical(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                              </div>
                              {c.recommended && <div className="sm:col-span-7 text-xs text-gray-500 px-1">Recommended: {c.recommended}</div>}
                            </div>
                          ))}
                        </div>
                        <button onClick={addChemical} className="border border-sky-400 text-sky-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm hover:bg-sky-50">
                          <Plus className="w-4 h-4" /> Add Chemical
                        </button>
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                          <input type="number" placeholder="No. of Labours" className="border rounded-lg px-3 py-2 text-sm" value={sprayLabours} onChange={e => setSprayLabours(e.target.value)} />
                          <input type="number" placeholder="Rate per Labour (₹)" className="border rounded-lg px-3 py-2 text-sm" value={sprayLabourRate} onChange={e => setSprayLabourRate(e.target.value)} />
                        </div>
                        <button onClick={saveSpray} disabled={!stage || !sprayDate || chemicals.length === 0 || db.mutating}
                          className="text-white px-6 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 transition flex items-center gap-2"
                          style={{ background:selectedCategoryConfig.gradient }}>
                          {db.mutating && <Loader2 className="w-4 h-4 animate-spin" />}
                          Save Spray Operation
                        </button>
                      </div>
                    ) : (
                      /* ---- ACTIVITY FORM ---- */
                      <div className="space-y-4">
                        <p className="font-bold text-gray-700 text-sm">Add {selectedCategoryConfig.label} Expense</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <select className="border rounded-lg px-3 py-2 bg-white text-sm" value={actCat} onChange={e => setActCat(e.target.value as ActivityCategory)}>
                            {ACTIVITY_CATEGORIES.filter(c => selectedCategoryConfig.activityCodes.includes(c.key)).map(c => (
                              <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
                            ))}
                          </select>
                          <input type="text" placeholder="Description (optional)" className="border rounded-lg px-3 py-2 text-sm" value={actDesc} onChange={e => setActDesc(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="text-xs text-gray-600 block mb-1">Start Date</label>
                            <input type="date" className="border rounded-lg px-3 py-2 text-sm w-full" value={actStartDate} onChange={e => setActStartDate(e.target.value)} />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 block mb-1">End Date</label>
                            <input type="date" className="border rounded-lg px-3 py-2 text-sm w-full" value={actEndDate} onChange={e => setActEndDate(e.target.value)} />
                          </div>
                          <input type="number" placeholder="No. of Labours" className="border rounded-lg px-3 py-2 text-sm" value={actLabours} onChange={e => setActLabours(e.target.value)} />
                          <input type="number" placeholder="Rate/day (₹)" className="border rounded-lg px-3 py-2 text-sm" value={actRate} onChange={e => setActRate(e.target.value)} />
                        </div>
                        {actStartDate && actLabours && actRate && (
                          <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm">
                            <div className="flex justify-between"><span className="text-gray-600">Days</span><span className="font-semibold">{daysBetween(actStartDate, actEndDate)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Labours × Rate</span><span>{actLabours} × ₹{actRate}</span></div>
                            <div className="flex justify-between font-bold border-t pt-1 mt-1">
                              <span>Estimated Cost</span>
                              <span style={{ color:selectedCategoryConfig.border }}>₹{fmt(daysBetween(actStartDate,actEndDate)*Number(actLabours)*Number(actRate))}</span>
                            </div>
                          </div>
                        )}
                        <button onClick={saveActivity} disabled={!actCat||!actStartDate||!actLabours||!actRate||db.mutating}
                          className="text-white px-6 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 flex items-center gap-2"
                          style={{ background:selectedCategoryConfig.gradient }}>
                          {db.mutating && <Loader2 className="w-4 h-4 animate-spin" />}
                          Save {selectedCategoryConfig.label} Expense
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Records */}
                <div className="px-6 py-5">
                  {selectedCategoryConfig.dataSource === 'spray' ? (
                    <SprayDetailPanel sprays={db.sprays} openSprayId={openSprayId} setOpenSprayId={setOpenSprayId}
                      onDelete={db.removeSpray} sprayCost={sprayCost} chemicalCost={chemicalCost}
                      totalSprayCost={db.totalSprayCost} mutating={db.mutating} />
                  ) : (
                    <ActivityDetailPanel config={selectedCategoryConfig} activities={db.activities}
                      onDelete={db.removeActivity} mutating={db.mutating} />
                  )}
                </div>
              </div>
            )}

            {!selectedExpenseCategory && (
              <div className="text-center py-8 text-gray-400">
                <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">Click any category card above to view or add expense records</p>
              </div>
            )}
          </div>
        )}

        {/* ════ INCOME ═══════════════════════════════════════════════ */}
        {tab === 'income' && (
          <div className="bg-white rounded-2xl shadow-md p-6 space-y-6">
            <SectionHeader title="Harvest Income — Crate Sales" icon={ShoppingBag} color="border-green-600" />
            <div className="bg-green-50 rounded-xl p-4 space-y-4">
              <p className="font-semibold text-green-800">Record Sale</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select className="border rounded-lg px-3 py-2 bg-white text-sm" value={incVariety} onChange={e => setIncVariety(e.target.value)}>
                  <option value="">Select Variety</option>
                  {APPLE_VARIETIES.map(v => <option key={v}>{v}</option>)}
                </select>
                <input type="date" className="border rounded-lg px-3 py-2 text-sm" value={incDate} onChange={e => setIncDate(e.target.value)} />
                <input type="text" placeholder="Buyer Name (optional)" className="border rounded-lg px-3 py-2 text-sm" value={incBuyer} onChange={e => setIncBuyer(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input type="number" placeholder="No. of Crates" className="border rounded-lg px-3 py-2 text-sm" value={incCrates} onChange={e => setIncCrates(e.target.value)} />
                <input type="number" placeholder="Kg per Crate (default 20)" className="border rounded-lg px-3 py-2 text-sm" value={incKgPerCrate} onChange={e => setIncKgPerCrate(e.target.value)} />
                <input type="number" placeholder="Price per Crate (₹)" className="border rounded-lg px-3 py-2 text-sm" value={incPrice} onChange={e => setIncPrice(e.target.value)} />
              </div>
              {incCrates && incPrice && (
                <div className="bg-white border border-green-200 rounded-lg p-3 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Total Weight</span><span>{Number(incCrates)*Number(incKgPerCrate||20)} kg</span></div>
                  <div className="flex justify-between font-bold border-t pt-1 mt-1"><span>Gross Revenue</span><span className="text-green-700">₹{fmt(Number(incCrates)*Number(incPrice))}</span></div>
                </div>
              )}
              <button onClick={saveIncome} disabled={!incVariety||!incCrates||!incPrice||!incDate||db.mutating}
                className="bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2">
                {db.mutating && <Loader2 className="w-4 h-4 animate-spin" />}
                Record Income
              </button>
            </div>

            {db.income.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Sales Records</p>
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full text-sm">
                    <thead className="bg-green-50 text-gray-600 text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Variety</th>
                        <th className="px-4 py-3 text-left">Buyer</th>
                        <th className="px-4 py-3 text-right">Crates</th>
                        <th className="px-4 py-3 text-right">Kg</th>
                        <th className="px-4 py-3 text-right">Price/Crate</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {db.income.map((entry, i) => (
                        <tr key={entry.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3">{entry.date}</td>
                          <td className="px-4 py-3 font-semibold">{entry.variety}</td>
                          <td className="px-4 py-3 text-gray-500">{entry.buyer || '—'}</td>
                          <td className="px-4 py-3 text-right">{entry.crates}</td>
                          <td className="px-4 py-3 text-right">{entry.crates * entry.kgPerCrate}</td>
                          <td className="px-4 py-3 text-right">₹{entry.pricePerCrate}</td>
                          <td className="px-4 py-3 text-right font-bold text-green-700">₹{fmt(entry.crates*entry.pricePerCrate)}</td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => db.removeIncome(entry.id)} disabled={db.mutating} className="text-red-400 hover:text-red-600 disabled:opacity-40">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-green-50 font-bold">
                      <tr>
                        <td colSpan={3} className="px-4 py-3">Total</td>
                        <td className="px-4 py-3 text-right">{db.income.reduce((s,i)=>s+i.crates,0)}</td>
                        <td className="px-4 py-3 text-right">{fmt(totalYieldKg)} kg</td>
                        <td></td>
                        <td className="px-4 py-3 text-right text-green-700">₹{fmt(db.totalIncome)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ LABOUR REGISTRY ══════════════════════════════════════ */}
        {tab === 'labour' && (
          <div className="bg-white rounded-2xl shadow-md p-6 space-y-6">
            <SectionHeader title="Labour Registry" icon={Users} color="border-purple-600" />
            <div className="bg-purple-50 rounded-xl p-4 space-y-4">
              <p className="font-semibold text-purple-800">Register Worker</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input placeholder="Worker Name *" className="border rounded-lg px-3 py-2 text-sm" value={wName} onChange={e => setWName(e.target.value)} />
                <input placeholder="Phone Number" type="tel" className="border rounded-lg px-3 py-2 text-sm" value={wPhone} onChange={e => setWPhone(e.target.value)} />
                <select className="border rounded-lg px-3 py-2 bg-white text-sm" value={wActivity} onChange={e => setWActivity(e.target.value as any)}>
                  <option value="SPRAY">Spray Operation</option>
                  {ACTIVITY_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Start Date *</label>
                  <input type="date" className="border rounded-lg px-3 py-2 text-sm w-full" value={wStart} onChange={e => setWStart(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">End Date</label>
                  <input type="date" className="border rounded-lg px-3 py-2 text-sm w-full" value={wEnd} onChange={e => setWEnd(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Rate/Day (₹) *</label>
                  <input type="number" placeholder="500" className="border rounded-lg px-3 py-2 text-sm w-full" value={wRate} onChange={e => setWRate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Advance Paid (₹)</label>
                  <input type="number" placeholder="0" className="border rounded-lg px-3 py-2 text-sm w-full" value={wAdvance} onChange={e => setWAdvance(e.target.value)} />
                </div>
              </div>
              <button onClick={saveWorker} disabled={!wName||!wStart||!wRate||db.mutating}
                className="bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2">
                {db.mutating && <Loader2 className="w-4 h-4 animate-spin" />}
                Register Worker
              </button>
            </div>

            {db.workers.length > 0 && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-purple-50 rounded-xl p-4 text-center"><p className="text-xs text-gray-500 mb-1">Total Workers</p><p className="text-2xl font-extrabold text-purple-700">{db.workers.length}</p></div>
                  <div className="bg-purple-50 rounded-xl p-4 text-center"><p className="text-xs text-gray-500 mb-1">Total Wages</p><p className="text-2xl font-extrabold text-purple-700">₹{fmt(db.totalLabourCost)}</p></div>
                  <div className="bg-orange-50 rounded-xl p-4 text-center"><p className="text-xs text-gray-500 mb-1">Advance Paid</p><p className="text-2xl font-extrabold text-orange-600">₹{fmt(db.totalAdvancePaid)}</p></div>
                  <div className="bg-red-50 rounded-xl p-4 text-center"><p className="text-xs text-gray-500 mb-1">Balance Due</p><p className="text-2xl font-extrabold text-red-600">₹{fmt(totalLabourDue)}</p></div>
                </div>
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full text-sm">
                    <thead className="bg-purple-50 text-gray-600 text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">Name</th><th className="px-4 py-3 text-left">Phone</th>
                        <th className="px-4 py-3 text-left">Activity</th><th className="px-4 py-3 text-center">Days</th>
                        <th className="px-4 py-3 text-right">Rate/Day</th><th className="px-4 py-3 text-right">Gross</th>
                        <th className="px-4 py-3 text-right">Advance</th><th className="px-4 py-3 text-right">Balance</th>
                        <th className="px-4 py-3 text-center">Paid</th><th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {db.workers.map((w, i) => {
                        const gross   = w.days * w.ratePerDay;
                        const balance = gross - w.advance;
                        return (
                          <tr key={w.id} className={`${i%2===0?'bg-white':'bg-gray-50'} ${w.paid?'opacity-60':''}`}>
                            <td className="px-4 py-3 font-semibold">{w.name}</td>
                            <td className="px-4 py-3 text-gray-500">{w.phone||'—'}</td>
                            <td className="px-4 py-3 text-gray-600">{ACTIVITY_CATEGORIES.find(c=>c.key===w.activity)?.label||w.activity}</td>
                            <td className="px-4 py-3 text-center font-semibold">{w.days}</td>
                            <td className="px-4 py-3 text-right">₹{w.ratePerDay}</td>
                            <td className="px-4 py-3 text-right font-semibold">₹{fmt(gross)}</td>
                            <td className="px-4 py-3 text-right text-orange-600">₹{fmt(w.advance)}</td>
                            <td className="px-4 py-3 text-right font-bold text-purple-700">₹{fmt(balance)}</td>
                            <td className="px-4 py-3 text-center">
                              <button onClick={() => db.markPaid(w.id, !w.paid)} disabled={db.mutating}>
                                {w.paid
                                  ? <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                                  : <div className="w-5 h-5 rounded-full border-2 border-gray-400 mx-auto" />}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button onClick={() => db.removeWorker(w.id)} disabled={db.mutating} className="text-red-400 hover:text-red-600 disabled:opacity-40">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-purple-50 font-bold text-sm">
                      <tr>
                        <td colSpan={5} className="px-4 py-3">Totals</td>
                        <td className="px-4 py-3 text-right">₹{fmt(db.totalLabourCost)}</td>
                        <td className="px-4 py-3 text-right text-orange-600">₹{fmt(db.totalAdvancePaid)}</td>
                        <td className="px-4 py-3 text-right text-purple-700">₹{fmt(totalLabourDue)}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ════ SUMMARY ══════════════════════════════════════════════ */}
        {tab === 'summary' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-md p-6">
              <SectionHeader title="Profit & Loss Statement" icon={BarChart2} color="border-gray-700" />
              <div className="mt-4 space-y-1">
                <div className="bg-green-50 rounded-lg px-4 py-3">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2">Income</p>
                  {db.income.length === 0
                    ? <p className="text-sm text-gray-400">No income recorded</p>
                    : APPLE_VARIETIES.filter(v => db.income.some(e => e.variety === v)).map(v => {
                        const total = db.income.filter(e=>e.variety===v).reduce((s,e)=>s+e.crates*e.pricePerCrate,0);
                        return <div key={v} className="flex justify-between text-sm py-0.5"><span className="text-gray-600">{v}</span><span>₹{fmt(total)}</span></div>;
                      })}
                  <div className="flex justify-between font-bold border-t border-green-200 pt-2 mt-2">
                    <span>Total Income</span><span className="text-green-700">₹{fmt(db.totalIncome)}</span>
                  </div>
                </div>
                <div className="bg-red-50 rounded-lg px-4 py-3">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2">Expenses</p>
                  {EXPENSE_CATEGORY_CONFIG.map(cfg => {
                    const summary = categorySummaries.find(s=>s.key===cfg.key)!;
                    if (summary.total === 0) return null;
                    return <div key={cfg.key} className="flex justify-between text-sm py-0.5"><span className="text-gray-600">{cfg.label}</span><span>₹{fmt(summary.total)}</span></div>;
                  })}
                  <div className="flex justify-between font-bold border-t border-red-200 pt-2 mt-2">
                    <span>Total Expenses</span><span className="text-red-700">₹{fmt(db.totalExpenses)}</span>
                  </div>
                </div>
                <div className={`rounded-lg px-4 py-4 ${db.netProfit>=0?'bg-blue-600':'bg-orange-600'} text-white`}>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">Net Profit / Loss</span>
                    <span className="text-2xl font-extrabold">₹{fmt(db.netProfit)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label:'ROI',              value:`${roi.toFixed(1)}%`,          color: roi>=0?'text-green-700':'text-red-700' },
                { label:'Cost per Kg',      value:`₹${fmt(costPerKg)}`,          color:'text-gray-800' },
                { label:'Total Yield (Kg)', value:`${fmt(totalYieldKg)}`,         color:'text-gray-800' },
                { label:'Spray Cost %',     value:db.totalExpenses>0?`${((db.totalSprayCost/db.totalExpenses)*100).toFixed(1)}%`:'0%', color:'text-blue-700' },
                { label:'Labour Balance',   value:`₹${fmt(totalLabourDue)}`,      color:'text-purple-700' },
                { label:'Total Crates',     value:`${db.income.reduce((s,i)=>s+i.crates,0)}`, color:'text-gray-800' },
              ].map(m => (
                <div key={m.label} className="bg-white rounded-2xl shadow p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">{m.label}</p>
                  <p className={`text-xl font-extrabold ${m.color}`}>{m.value}</p>
                </div>
              ))}
            </div>

            {db.totalExpenses > 0 && (
              <div className="bg-white rounded-2xl shadow-md p-6">
                <p className="font-bold text-gray-700 mb-4">Expense Distribution</p>
                <div className="space-y-3">
                  {EXPENSE_CATEGORY_CONFIG.map(cfg => {
                    const summary = categorySummaries.find(s=>s.key===cfg.key)!;
                    if (summary.total === 0) return null;
                    return (
                      <div key={cfg.key}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="flex items-center gap-2"><cfg.Icon className="w-4 h-4" />{cfg.label}</span>
                          <span className="font-semibold">₹{fmt(summary.total)} ({((summary.total/db.totalExpenses)*100).toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3">
                          <div className="h-3 rounded-full transition-all" style={{ width:`${(summary.total/db.totalExpenses)*100}%`, background:cfg.gradient }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

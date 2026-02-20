import { useState, useMemo } from 'react';
import {
  Stethoscope, Video, Phone, MessageSquare, MapPin, Plus, Trash2,
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Send, FileText,
  Activity, User, Calendar, Leaf, Wrench, Bell, ArrowRight, X,
  RefreshCw, Smartphone, Building2, BadgeCheck, FlaskConical,
  ClipboardList, Zap, Loader2,
} from 'lucide-react';

import { useOrchardDoctor } from '../hooks/useOrchardDoctor';
import { useAuth } from '../contexts/AuthContext';
import type {
  ConsultType, ConsultStatus, PrescriptionStatus, ActionCategory,
  DigitalPrescription, ConsultationRequest, ActionItem,
} from '../lib/database.types';

/* ═══════════════════════════════════════════════════════════════════════════
   MASTER DATA (static, doctor roster lives here until you have a doctors table)
═══════════════════════════════════════════════════════════════════════════ */

const DOCTORS = [
  { id: 'DR001', name: 'Dr. Arif Qureshi',  specialization: 'Plant Pathology',         hospital: 'Orchard Hospital Kashmir', rating: 4.9, available: true  },
  { id: 'DR002', name: 'Dr. Sunita Mehta',  specialization: 'Entomology & Pest Mgmt',  hospital: 'Orchard Hospital Kashmir', rating: 4.8, available: true  },
  { id: 'DR003', name: 'Dr. Ravi Sharma',   specialization: 'Soil & Nutrition',         hospital: 'Orchard Hospital Kashmir', rating: 4.7, available: false },
];

const HOSPITAL_NAME = 'Orchard Hospital Kashmir';

const ACTION_CATEGORIES: { key: ActionCategory; label: string; color: string; icon: React.ElementType }[] = [
  { key: 'FUNGICIDE',   label: 'Fungicide',   color: 'text-purple-700 bg-purple-50 border-purple-200', icon: FlaskConical },
  { key: 'INSECTICIDE', label: 'Insecticide', color: 'text-red-700 bg-red-50 border-red-200',          icon: Activity    },
  { key: 'FERTILIZER',  label: 'Fertilizer',  color: 'text-green-700 bg-green-50 border-green-200',    icon: Leaf        },
  { key: 'LABOR',       label: 'Labor',       color: 'text-blue-700 bg-blue-50 border-blue-200',       icon: Wrench      },
  { key: 'IRRIGATION',  label: 'Irrigation',  color: 'text-cyan-700 bg-cyan-50 border-cyan-200',       icon: Activity    },
  { key: 'OTHER',       label: 'Other',       color: 'text-gray-700 bg-gray-50 border-gray-200',       icon: ClipboardList },
];

const CONSULT_TYPES: { key: ConsultType; label: string; icon: React.ElementType; color: string; desc: string }[] = [
  { key: 'CHAT',         label: 'Chat',         icon: MessageSquare, color: 'from-sky-500 to-sky-600',       desc: 'Text consultation'  },
  { key: 'CALL',         label: 'Voice Call',   icon: Phone,         color: 'from-green-500 to-green-600',   desc: 'Audio consultation' },
  { key: 'VIDEO',        label: 'Video Call',   icon: Video,         color: 'from-violet-500 to-violet-600', desc: 'Live video session'  },
  { key: 'ONSITE_VISIT', label: 'Onsite Visit', icon: MapPin,        color: 'from-orange-500 to-orange-600', desc: 'Doctor visits orchard' },
];

const STATUS_META: Record<ConsultStatus, { label: string; color: string; dot: string }> = {
  REQUESTED:   { label: 'Requested',   color: 'text-amber-700 bg-amber-50 border-amber-300', dot: 'bg-amber-500'  },
  IN_PROGRESS: { label: 'In Progress', color: 'text-blue-700 bg-blue-50 border-blue-300',    dot: 'bg-blue-500'   },
  COMPLETED:   { label: 'Completed',   color: 'text-green-700 bg-green-50 border-green-300', dot: 'bg-green-500'  },
};

const RX_STATUS_META: Record<PrescriptionStatus, { label: string; color: string; icon: React.ElementType }> = {
  PENDING:          { label: 'Pending Execution', color: 'text-red-700 bg-red-50 border-red-300',       icon: AlertTriangle },
  APPLIED:          { label: 'Executed',          color: 'text-green-700 bg-green-50 border-green-300', icon: CheckCircle2  },
  NEEDS_CORRECTION: { label: 'Needs Review',      color: 'text-amber-700 bg-amber-50 border-amber-300', icon: RefreshCw     },
};

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

const uid = () => crypto.randomUUID();
const fmt = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
const nowISO = () => new Date().toISOString().slice(0, 16);

function buildWhatsAppMessage(rx: DigitalPrescription, growerName: string, growerPhone: string): string {
  const items = rx.actionItems
    .map((a, i) => `  ${i + 1}. [${a.category}] ${a.productName} — ${a.dosage} (Est. ₹${fmt(a.estimatedCost)})`)
    .join('\n');
  const total = rx.actionItems.reduce((s, a) => s + a.estimatedCost, 0);
  return (
    `🏥 *${rx.hospitalName}* — Official Prescription\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `👨‍⚕️ *${rx.doctorName}*\n` +
    `📋 Rx ID: ${rx.id.slice(0, 8).toUpperCase()}\n` +
    `📅 Issued: ${rx.issuedAt}\n\n` +
    `🌿 *Grower:* ${growerName} (${growerPhone})\n\n` +
    `🔬 *Diagnosis:* ${rx.issueDiagnosed}${rx.eppoCode ? ` (EPPO: ${rx.eppoCode})` : ''}\n\n` +
    `💊 *Remedy:* ${rx.recommendation}\n\n` +
    `📝 *Action Items:*\n${items}\n\n` +
    `💰 *Total Est. Cost:* ₹${fmt(total)}\n\n` +
    `📆 *Follow-up:* ${rx.followUpDate}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_This is an official prescription from ${rx.hospitalName}. Please execute promptly._`
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SHARED UI PRIMITIVES
═══════════════════════════════════════════════════════════════════════════ */

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${className}`}>
      {children}
    </span>
  );
}

function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function ActionItemBadge({ category }: { category: ActionCategory }) {
  const meta = ACTION_CATEGORIES.find(c => c.key === category)!;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold border ${meta.color}`}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
}

/* Error toast */
function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="flex items-center gap-3 bg-red-50 border border-red-300 rounded-xl px-4 py-3 text-sm text-red-800">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss}><X className="w-4 h-4" /></button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PRESCRIPTION CARD
═══════════════════════════════════════════════════════════════════════════ */

function PrescriptionCard({
  rx, mutating, onExecute, onFlagCorrection, showWhatsApp,
}: {
  rx: DigitalPrescription;
  mutating: boolean;
  onExecute: () => void;
  onFlagCorrection: () => void;
  showWhatsApp: () => void;
}) {
  const [open, setOpen] = useState(true);
  const total = rx.actionItems.reduce((s, a) => s + a.estimatedCost, 0);
  const meta = RX_STATUS_META[rx.status];
  const MetaIcon = meta.icon;

  const borderColor = rx.status === 'PENDING' ? 'border-red-400' : rx.status === 'NEEDS_CORRECTION' ? 'border-amber-400' : 'border-green-400';
  const headerBg   = rx.status === 'PENDING' ? 'bg-red-50'    : rx.status === 'NEEDS_CORRECTION' ? 'bg-amber-50'    : 'bg-green-50';
  const iconBg     = rx.status === 'PENDING' ? 'bg-red-100'   : rx.status === 'APPLIED'           ? 'bg-green-100'  : 'bg-amber-100';
  const iconColor  = rx.status === 'PENDING' ? 'text-red-600' : rx.status === 'APPLIED'           ? 'text-green-600': 'text-amber-600';

  return (
    <div className={`rounded-2xl border-2 overflow-hidden shadow-lg ${borderColor}`}>
      <div className={`px-5 py-4 flex items-start justify-between cursor-pointer ${headerBg}`}
           onClick={() => setOpen(!open)}>
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl ${iconBg}`}>
            <FileText className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-extrabold text-gray-800 text-sm">Rx #{rx.id.slice(0, 8).toUpperCase()}</p>
              <Badge className={meta.color}><MetaIcon className="w-3 h-3" />{meta.label}</Badge>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{rx.doctorName} · {rx.hospitalName}</p>
            <p className="text-xs font-semibold text-gray-700 mt-1">{rx.issueDiagnosed}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-extrabold text-gray-800 text-sm">₹{fmt(total)}</span>
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {open && (
        <div className="px-5 pb-5 pt-4 space-y-4 bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Diagnosis</p>
              <p className="text-sm font-semibold text-gray-800">{rx.issueDiagnosed}</p>
              {rx.eppoCode && <p className="text-xs text-gray-500 mt-0.5">EPPO Code: {rx.eppoCode}</p>}
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Remedy</p>
              <p className="text-sm text-gray-700">{rx.recommendation}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Prescription Action Items</p>
            <div className="space-y-2">
              {rx.actionItems.map(item => (
                <div key={item.id} className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <ActionItemBadge category={item.category} />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{item.productName}</p>
                      <p className="text-xs text-gray-500">{item.dosage}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-gray-700">₹{fmt(item.estimatedCost)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 px-1">
              <span className="text-xs text-gray-500">Total Estimated Cost</span>
              <span className="text-sm font-extrabold text-gray-800">₹{fmt(total)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-gray-500 border-t pt-3">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Issued: {rx.issuedAt}</span>
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Follow-up: {rx.followUpDate}</span>
          </div>

          {rx.status === 'PENDING' && (
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={onExecute}
                disabled={mutating}
                className="flex items-center gap-2 bg-linear-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-green-200 transition"
              >
                {mutating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Execute Prescription
              </button>
              <button
                onClick={showWhatsApp}
                className="flex items-center gap-2 bg-linear-to-r from-emerald-500 to-teal-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition"
              >
                <Smartphone className="w-4 h-4" />View WhatsApp
              </button>
              <button
                onClick={onFlagCorrection}
                disabled={mutating}
                className="flex items-center gap-2 border border-amber-400 text-amber-700 px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-amber-50 disabled:opacity-50 transition"
              >
                <RefreshCw className="w-4 h-4" />Request Correction
              </button>
            </div>
          )}

          {rx.status === 'APPLIED' && (
            <div className="flex items-center gap-2 text-green-700 font-semibold text-sm bg-green-50 rounded-xl px-4 py-2.5 border border-green-200">
              <CheckCircle2 className="w-4 h-4" />Executed — Costs logged to Expense Tracker
            </div>
          )}

          {rx.status === 'NEEDS_CORRECTION' && (
            <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm bg-amber-50 rounded-xl px-4 py-2.5 border border-amber-200">
              <RefreshCw className="w-4 h-4" />Correction requested — Doctor will review
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   WHATSAPP PREVIEW MODAL
═══════════════════════════════════════════════════════════════════════════ */

function WhatsAppModal({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-linear-to-r from-green-600 to-teal-600 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-white" />
            <span className="font-bold text-white">WhatsApp Preview</span>
          </div>
          <button onClick={onClose} className="text-white opacity-75 hover:opacity-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 bg-gray-100">
          <div className="bg-white rounded-xl shadow-inner border border-gray-200 overflow-hidden">
            <div className="bg-teal-700 px-4 py-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">{HOSPITAL_NAME}</p>
                <p className="text-teal-200 text-xs">Official Prescription</p>
              </div>
            </div>
            <div className="bg-[#ECE5DD] p-3 min-h-32 max-h-72 overflow-y-auto">
              <div className="bg-white rounded-lg rounded-tl-none shadow-sm px-3 py-2 max-w-xs">
                <pre className="text-xs text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">{message}</pre>
                <p className="text-right text-xs text-gray-400 mt-1">✓✓ Now</p>
              </div>
            </div>
          </div>
        </div>
        <div className="px-5 pb-5 pt-2">
          <p className="text-xs text-gray-500 mb-3">This message will be sent to the grower's registered WhatsApp number when the prescription is issued.</p>
          <button onClick={onClose} className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-bold text-sm">
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PRESCRIPTION BUILDER MODAL
═══════════════════════════════════════════════════════════════════════════ */

function PrescriptionBuilder({
  consultation, doctorId, mutating, onIssue, onCancel,
}: {
  consultation: ConsultationRequest;
  doctorId: string;
  mutating: boolean;
  onIssue: (payload: {
    consultationId: string;
    doctorName: string;
    hospitalName: string;
    issueDiagnosed: string;
    eppoCode: string;
    recommendation: string;
    followUpDate: string;
    actionItems: Array<{ category: ActionItem['category']; productName: string; dosage: string; estimatedCost: number }>;
  }) => void;
  onCancel: () => void;
}) {
  const doctor = DOCTORS.find(d => d.id === doctorId)!;
  const [issue, setIssue] = useState('');
  const [eppo, setEppo] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [items, setItems] = useState<Array<{ id: string; category: ActionCategory; productName: string; dosage: string; estimatedCost: number }>>([]);

  const addItem = () =>
    setItems(prev => [...prev, { id: uid(), category: 'FUNGICIDE', productName: '', dosage: '', estimatedCost: 0 }]);

  const updateItem = (id: string, key: string, value: unknown) =>
    setItems(prev => prev.map(it => it.id === id ? { ...it, [key]: value } : it));

  const removeItem = (id: string) =>
    setItems(prev => prev.filter(it => it.id !== id));

  const totalCost = items.reduce((s, a) => s + a.estimatedCost, 0);
  const canIssue = issue.trim() && recommendation.trim() && items.length > 0 && followUp && !mutating;

  const handleIssue = () => {
    if (!canIssue) return;
    onIssue({
      consultationId: consultation.id,
      doctorName: doctor.name,
      hospitalName: doctor.hospital,
      issueDiagnosed: issue,
      eppoCode: eppo,
      recommendation,
      followUpDate: followUp,
      actionItems: items.map(({ category, productName, dosage, estimatedCost }) => ({
        category, productName, dosage, estimatedCost,
      })),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-screen overflow-y-auto">
        <div className="bg-linear-to-r from-slate-800 to-slate-700 px-6 py-5 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-extrabold">Prescription Builder</p>
              <p className="text-slate-300 text-xs">{doctor.name} · {doctor.hospital}</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Grower context */}
          <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-center gap-3 border border-blue-200">
            <User className="w-4 h-4 text-blue-600" />
            <div className="text-sm">
              <span className="font-bold text-blue-800">Grower:</span>
              <span className="ml-2 text-blue-700">{consultation.growerName}</span>
              <span className="ml-3 text-blue-500">Request #{consultation.id.slice(0, 8).toUpperCase()} · {consultation.type}</span>
            </div>
          </div>

          {/* Step 1 — Diagnosis */}
          <div className="space-y-3">
            <p className="font-bold text-gray-700 text-sm uppercase tracking-wide">Step 1 — Diagnosis</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-500 block mb-1">Issue / Disease Diagnosed *</label>
                <input
                  className="border rounded-xl px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="e.g. Apple Scab (Venturia inaequalis)"
                  value={issue}
                  onChange={e => setIssue(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">EPPO Code (optional)</label>
                <input
                  className="border rounded-xl px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="VENTIN"
                  value={eppo}
                  onChange={e => setEppo(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Recommendation / Remedy *</label>
              <textarea
                rows={2}
                className="border rounded-xl px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="Describe the corrective action and rationale..."
                value={recommendation}
                onChange={e => setRecommendation(e.target.value)}
              />
            </div>
          </div>

          {/* Step 2 — Action Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-700 text-sm uppercase tracking-wide">Step 2 — Action Items</p>
              <button
                onClick={addItem}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>

            {items.length === 0 && (
              <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
                Click "Add Item" to add chemicals, fertilizers or labor instructions
              </div>
            )}

            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-start bg-gray-50 border rounded-xl p-3">
                  <select
                    className="border rounded-lg px-2 py-2 text-xs bg-white"
                    value={item.category}
                    onChange={e => updateItem(item.id, 'category', e.target.value)}
                  >
                    {ACTION_CATEGORIES.map(c => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                  <input
                    className="border rounded-lg px-2 py-2 text-xs sm:col-span-2"
                    placeholder="Product / Action Name"
                    value={item.productName}
                    onChange={e => updateItem(item.id, 'productName', e.target.value)}
                  />
                  <input
                    className="border rounded-lg px-2 py-2 text-xs"
                    placeholder="Dosage (e.g. 500g/200L)"
                    value={item.dosage}
                    onChange={e => updateItem(item.id, 'dosage', e.target.value)}
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      className="border rounded-lg px-2 py-2 text-xs flex-1"
                      placeholder="Est. Cost ₹"
                      value={item.estimatedCost || ''}
                      onChange={e => updateItem(item.id, 'estimatedCost', +e.target.value)}
                    />
                    <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 shrink-0 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {items.length > 0 && (
              <div className="flex justify-between text-sm font-bold text-gray-700 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200">
                <span>Total Estimated Cost</span>
                <span>₹{fmt(totalCost)}</span>
              </div>
            )}
          </div>

          {/* Step 3 — Follow-up */}
          <div className="space-y-2">
            <p className="font-bold text-gray-700 text-sm uppercase tracking-wide">Step 3 — Follow-up</p>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Follow-up Date *</label>
              <input
                type="date"
                className="border rounded-xl px-3 py-2.5 text-sm w-full"
                value={followUp}
                onChange={e => setFollowUp(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t">
            <button
              onClick={handleIssue}
              disabled={!canIssue}
              className="flex-1 flex items-center justify-center gap-2 bg-linear-to-r from-slate-800 to-slate-700 hover:from-slate-900 hover:to-slate-800 disabled:opacity-40 text-white py-3 rounded-xl font-extrabold text-sm transition shadow-lg"
            >
              {mutating
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <BadgeCheck className="w-4 h-4" />}
              Issue Digital Prescription
            </button>
            <button onClick={onCancel} className="px-5 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROPS
═══════════════════════════════════════════════════════════════════════════ */

interface OrchardDoctorProps {
  growerName?: string;
  growerPhone?: string;
  fieldId?: string;
  orchardName?: string;
  onExpenseLog?: (items: Array<{
    category: ActionCategory;
    productName: string;
    dosage: string;
    estimatedCost: number;
    prescriptionId: string;
    doctorName: string;
    issuedAt: string;
  }>) => void;
}

/* ═══════════════════════════════════════════════════════════════════════════
   MASTER DATA FIELDS (fallback for fieldId and orchardName if not provided as props)
═══════════════════════════════════════════════════════════════════════════ */

const FIELDS = [
  { id: 'FIELD001', name: 'Demo Orchard 1' },
  { id: 'FIELD002', name: 'Demo Orchard 2' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function OrchardDoctor({
  growerName,
  growerPhone,
  fieldId: propFieldId,
  orchardName: propOrchardName,
  onExpenseLog,
}: OrchardDoctorProps) {
  // Fallback to master data if props are missing
  const fieldId = propFieldId || (FIELDS.length > 0 ? FIELDS[0].id : '');
  const orchardName = propOrchardName || (FIELDS.length > 0 ? FIELDS[0].name : '');

  /* ── Auth ── */
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const resolvedGrowerName  = growerName  || (user as any)?.name  || '';
  const resolvedGrowerPhone = growerPhone || (user as any)?.phone || '';

  // All hooks called unconditionally BEFORE any early return (React rules of hooks).
  // Pass empty string fallback; the hook's reload() guards with `if (!fieldId) return`.
  const db = useOrchardDoctor(fieldId ?? '', userId, resolvedGrowerName, resolvedGrowerPhone);

  /* ── Local UI state ── */
  const [portalMode, setPortalMode] = useState<'grower' | 'doctor'>('grower');
  const [tab, setTab]               = useState<'consult' | 'prescriptions' | 'doctors'>('consult');
  const [newType, setNewType]       = useState<ConsultType>('VIDEO');
  const [newDateTime, setNewDateTime] = useState(nowISO());
  const [newNotes, setNewNotes]     = useState('');
  const [newDoctorId, setNewDoctorId] = useState('DR001');
  const [showNewConsult, setShowNewConsult] = useState(false);
  const [builderConsult, setBuilderConsult] = useState<ConsultationRequest | null>(null);
  const [builderDoctorId, setBuilderDoctorId] = useState('DR001');
  const [whatsAppRx, setWhatsAppRx] = useState<DigitalPrescription | null>(null);
  const [activeDoctorId, setActiveDoctorId] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Guard: fieldId is required to render; orchardName is optional
  if (!fieldId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 text-red-700 text-lg font-bold">
        Error: No orchard selected. Please select an orchard before requesting a consultation.
      </div>
    );
  }

  /* ── Dismiss combined error ── */
  const errorMsg = db.error || localError;
  const dismissError = () => { setLocalError(null); };

  /* ── Doctor portal: assigned requests ── */
  const doctorRequests = useMemo(
    () => db.consultations.filter(c => c.doctorId === activeDoctorId),
    [db.consultations, activeDoctorId]
  );

  /* ── Submit new consultation ── */
  const handleRequestConsultation = async () => {
    if (!newDateTime) return;
    await db.requestConsultation({
      doctorId: newDoctorId,
      type: newType,
      targetDateTime: new Date(newDateTime).toISOString(),
      notes: newNotes,
      fieldId,
      orchardName,
    });
    setNewNotes('');
    setShowNewConsult(false);
  };

  /* ── Issue prescription (from builder) ── */
  const handleIssueRx = async (payload: Parameters<typeof db.issueRx>[0]) => {
    await db.issueRx(payload);
    setBuilderConsult(null);
    setTab('prescriptions');
    // auto-show WhatsApp preview for the newly issued prescription
    // (re-fetch happened inside issueRx, find the new one)
    const fresh = db.allPrescriptions.find(rx => rx.consultationId === payload.consultationId);
    if (fresh) setWhatsAppRx(fresh);
  };

  /* ── Execute prescription + fire expense callback ── */
  const handleExecuteRx = async (rx: DigitalPrescription) => {
    await db.executeRx(rx.id);
    if (onExpenseLog) {
      onExpenseLog(
        rx.actionItems.map(item => ({
          category: item.category,
          productName: item.productName,
          dosage: item.dosage,
          estimatedCost: item.estimatedCost,
          prescriptionId: rx.id,
          doctorName: rx.doctorName,
          issuedAt: rx.issuedAt,
        }))
      );
    }
  };

  /* ═══ RENDER ════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Modals */}
      {whatsAppRx && (
        <WhatsAppModal
          message={buildWhatsAppMessage(whatsAppRx, resolvedGrowerName, resolvedGrowerPhone)}
          onClose={() => setWhatsAppRx(null)}
        />
      )}

      {builderConsult && (
        <PrescriptionBuilder
          consultation={builderConsult}
          doctorId={builderDoctorId}
          mutating={db.mutating}
          onIssue={handleIssueRx}
          onCancel={() => setBuilderConsult(null)}
        />
      )}

      {/* ═══ HEADER ══════════════════════════════════════════════════════ */}
      <div className="bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-5 shadow-xl">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-2xl">
              <Stethoscope className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight">Orchard Hospital</h1>
                <span className="text-xs font-bold bg-white/15 px-2 py-0.5 rounded-full text-slate-200">Kashmir</span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                Telehealth & Agronomist Dispatch · Grower: {growerName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Reload button */}
            <button
              onClick={db.reload}
              disabled={db.loading}
              title="Refresh data"
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition disabled:opacity-40"
            >
              <RefreshCw className={`w-4 h-4 ${db.loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Portal toggle */}
            <div className="flex gap-1 bg-white/10 rounded-xl p-1">
              {(['grower', 'doctor'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => { setPortalMode(mode); setTab('consult'); }}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition capitalize ${
                    portalMode === mode ? 'bg-white text-slate-900 shadow' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {mode === 'grower' ? '🌿 Grower' : '🩺 Doctor'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pending Rx alert */}
        {db.pendingRxCount > 0 && portalMode === 'grower' && (
          <div className="mt-3 flex items-center gap-2 bg-red-500/90 rounded-xl px-4 py-2.5 border border-red-400">
            <Bell className="w-4 h-4 text-white shrink-0" />
            <p className="text-white text-sm font-bold flex-1">
              {db.pendingRxCount} prescription{db.pendingRxCount > 1 ? 's' : ''} awaiting execution
            </p>
            <button onClick={() => setTab('prescriptions')} className="text-white text-xs underline flex items-center gap-1">
              View <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* ═══ TABS ════════════════════════════════════════════════════════ */}
      <div className="px-6 pt-5">
        <div className="flex gap-1 bg-white border rounded-xl p-1 shadow-sm">
          {portalMode === 'grower' ? (
            <>
              {([
                { key: 'consult',       label: 'Request Consult',  icon: MessageSquare },
                { key: 'prescriptions', label: 'My Prescriptions', icon: FileText      },
                { key: 'doctors',       label: 'Our Doctors',      icon: User          },
              ] as const).map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition relative ${
                    tab === t.key ? 'bg-slate-800 text-white shadow' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <t.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.label}</span>
                  {t.key === 'prescriptions' && db.pendingRxCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
                      {db.pendingRxCount}
                    </span>
                  )}
                </button>
              ))}
            </>
          ) : (
            <>
              {([
                { key: 'consult',       label: 'Patient Queue',        icon: ClipboardList },
                { key: 'prescriptions', label: 'Issued Prescriptions', icon: FileText      },
              ] as const).map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition ${
                    tab === t.key ? 'bg-slate-800 text-white shadow' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      <div className="px-6 py-6 space-y-5">

        {/* Error banner */}
        {errorMsg && (
          <ErrorBanner message={errorMsg} onDismiss={dismissError} />
        )}

        {/* Global loading skeleton */}
        {db.loading && (
          <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading from Supabase...</span>
          </div>
        )}

        {!db.loading && (
          <>
            {/* ═══ GROWER — REQUEST CONSULTATION ══════════════════════════ */}
            {portalMode === 'grower' && tab === 'consult' && (
              <div className="space-y-5">
                <SectionCard>
                  <div className="px-6 py-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="font-extrabold text-gray-800 text-base">Request a Consultation</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Connect with a certified Agronomist instantly</p>
                      </div>
                      {!showNewConsult && (
                        <button
                          onClick={() => setShowNewConsult(true)}
                          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition shadow"
                        >
                          <Plus className="w-4 h-4" /> New Request
                        </button>
                      )}
                    </div>

                    {/* Consult type cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      {CONSULT_TYPES.map(t => {
                        const Icon = t.icon;
                        const selected = newType === t.key;
                        return (
                          <button
                            key={t.key}
                            onClick={() => { setNewType(t.key); setShowNewConsult(true); }}
                            className={`flex flex-col items-center gap-2 py-4 rounded-2xl border-2 font-semibold text-sm transition ${
                              selected
                                ? `bg-linear-to-br ${t.color} text-white border-transparent shadow-lg -translate-y-1`
                                : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <Icon className={`w-6 h-6 ${selected ? 'text-white' : 'text-gray-500'}`} />
                            <span>{t.label}</span>
                            <span className={`text-xs ${selected ? 'text-white/75' : 'text-gray-400'}`}>{t.desc}</span>
                          </button>
                        );
                      })}
                    </div>

                    {showNewConsult && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4 mt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Preferred Date & Time</label>
                            <input
                              type="datetime-local"
                              className="border rounded-xl px-3 py-2.5 text-sm w-full"
                              value={newDateTime}
                              onChange={e => setNewDateTime(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Select Doctor</label>
                            <select
                              className="border rounded-xl px-3 py-2.5 text-sm w-full bg-white"
                              value={newDoctorId}
                              onChange={e => setNewDoctorId(e.target.value)}
                            >
                              {DOCTORS.filter(d => d.available).map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Describe the Issue</label>
                          <textarea
                            rows={2}
                            className="border rounded-xl px-3 py-2.5 text-sm w-full"
                            placeholder="Describe symptoms, affected area, urgency..."
                            value={newNotes}
                            onChange={e => setNewNotes(e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleRequestConsultation}
                            disabled={db.mutating}
                            className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-900 disabled:opacity-50 transition"
                          >
                            {db.mutating
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Send className="w-4 h-4" />}
                            Submit Request
                          </button>
                          <button
                            onClick={() => setShowNewConsult(false)}
                            className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </SectionCard>

                {/* My consultation requests */}
                {db.consultations.length > 0 && (
                  <SectionCard>
                    <div className="px-6 py-5">
                      <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide mb-4">My Consultation Requests</h3>
                      <div className="space-y-3">
                        {db.consultations.map(c => {
                          const doctor  = DOCTORS.find(d => d.id === c.doctorId);
                          const typeInfo = CONSULT_TYPES.find(t => t.key === c.type)!;
                          const statusMeta = STATUS_META[c.status];
                          const TypeIcon = typeInfo.icon;
                          return (
                            <div key={c.id} className="flex items-start justify-between border border-gray-200 rounded-xl px-4 py-3 hover:bg-gray-50 transition">
                              <div className="flex items-start gap-3">
                                <div className={`p-2.5 rounded-xl bg-linear-to-br ${typeInfo.color}`}> 
                                  <TypeIcon className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                  <p className="font-bold text-sm text-gray-800">{typeInfo.label}</p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(c.targetDateTime).toLocaleString()} · {doctor?.name || 'Unassigned'}
                                  </p>
                                  {c.notes && <p className="text-xs text-gray-600 mt-0.5 max-w-xs truncate">{c.notes}</p>}
                                  {c.prescription && (
                                    <button
                                      onClick={() => setTab('prescriptions')}
                                      className="mt-1 text-xs font-bold text-slate-700 underline flex items-center gap-1"
                                    >
                                      <FileText className="w-3 h-3" /> View Prescription
                                    </button>
                                  )}
                                </div>
                              </div>
                              <Badge className={statusMeta.color}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                                {statusMeta.label}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </SectionCard>
                )}

                {db.consultations.length === 0 && (
                  <div className="text-center py-16 text-gray-400">
                    <Stethoscope className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">No consultations yet. Request your first one above.</p>
                  </div>
                )}
              </div>
            )}

            {/* ═══ GROWER — MY PRESCRIPTIONS ═══════════════════════════ */}
            {portalMode === 'grower' && tab === 'prescriptions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-extrabold text-gray-800 text-base">My Digital Prescriptions</h2>
                  <Badge className="text-gray-600 bg-gray-100 border-gray-200">{db.allPrescriptions.length} Total</Badge>
                </div>

                {db.allPrescriptions.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">No prescriptions issued yet. Request a consultation first.</p>
                  </div>
                ) : (
                  db.allPrescriptions.map(rx => (
                    <PrescriptionCard
                      key={rx.id}
                      rx={rx}
                      mutating={db.mutating}
                      onExecute={() => handleExecuteRx(rx)}
                      onFlagCorrection={() => db.flagCorrection(rx.id)}
                      showWhatsApp={() => setWhatsAppRx(rx)}
                    />
                  ))
                )}
              </div>
            )}

            {/* ═══ GROWER — OUR DOCTORS ════════════════════════════════ */}
            {portalMode === 'grower' && tab === 'doctors' && (
              <div className="space-y-4">
                <h2 className="font-extrabold text-gray-800 text-base">Certified Agronomists</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {DOCTORS.map(doctor => (
                    <div key={doctor.id} className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">
                      <div className="bg-linear-to-br from-slate-700 to-slate-900 px-5 py-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                          <Stethoscope className="w-8 h-8 text-white" />
                        </div>
                        <p className="text-white font-extrabold">{doctor.name}</p>
                        <p className="text-slate-300 text-xs mt-1">{doctor.specialization}</p>
                      </div>
                      <div className="px-5 py-4 space-y-3">
                        <div className="flex items-center text-sm text-gray-500 gap-1">
                          <Building2 className="w-3.5 h-3.5" />{doctor.hospital}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-amber-500 text-sm font-bold">
                            {'★'.repeat(Math.round(doctor.rating))}
                            <span className="text-gray-600 font-normal ml-1">{doctor.rating}</span>
                          </div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${doctor.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {doctor.available ? '● Available' : '○ Unavailable'}
                          </span>
                        </div>
                        {doctor.available && (
                          <button
                            onClick={() => { setNewDoctorId(doctor.id); setTab('consult'); setShowNewConsult(true); }}
                            className="w-full bg-slate-800 text-white py-2 rounded-xl text-sm font-bold hover:bg-slate-900 transition"
                          >
                            Request Consultation
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ DOCTOR — PATIENT QUEUE ══════════════════════════════ */}
            {portalMode === 'doctor' && tab === 'consult' && (
              <div className="space-y-4">
                <SectionCard>
                  <div className="px-6 py-4 flex items-center gap-3 flex-wrap">
                    <Stethoscope className="w-4 h-4 text-slate-600" />
                    <span className="text-sm font-bold text-gray-700">Logged in as:</span>
                    <select
                      className="border rounded-xl px-3 py-2 text-sm bg-white font-semibold"
                      value={activeDoctorId}
                      onChange={e => setActiveDoctorId(e.target.value)}
                    >
                      {DOCTORS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                </SectionCard>

                <div className="flex items-center justify-between">
                  <h2 className="font-extrabold text-gray-800 text-base">Patient Queue</h2>
                  <Badge className="text-slate-700 bg-slate-100 border-slate-300">
                    {doctorRequests.length} Request{doctorRequests.length !== 1 ? 's' : ''}
                  </Badge>
                </div>

                {doctorRequests.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">No requests assigned to this doctor.</p>
                  </div>
                ) : (
                  doctorRequests.map(c => {
                    const typeInfo  = CONSULT_TYPES.find(t => t.key === c.type)!;
                    const statusMeta = STATUS_META[c.status];
                    const TypeIcon  = typeInfo.icon;
                    return (
                      <SectionCard key={c.id}>
                        <div className="px-5 py-4 flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex items-start gap-3">
                            <div className={`p-2.5 rounded-xl bg-linear-to-br ${typeInfo.color}`}> 
                              <TypeIcon className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-gray-800">{c.growerName}</p>
                                <Badge className={statusMeta.color}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                                  {statusMeta.label}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {typeInfo.label} · {new Date(c.targetDateTime).toLocaleString()}
                              </p>
                              {c.notes && (
                                <p className="text-xs text-gray-700 bg-gray-100 rounded-lg px-2 py-1 mt-2 max-w-sm">{c.notes}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {c.status === 'REQUESTED' && (
                              <button
                                onClick={() => db.acceptRequest(c.id, activeDoctorId)}
                                disabled={db.mutating}
                                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-bold transition"
                              >
                                {db.mutating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                Accept
                              </button>
                            )}
                            {c.status === 'IN_PROGRESS' && !c.prescription && (
                              <button
                                onClick={() => { setBuilderConsult(c); setBuilderDoctorId(activeDoctorId); }}
                                className="flex items-center gap-1.5 bg-linear-to-r from-slate-800 to-slate-700 hover:from-slate-900 hover:to-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold transition shadow"
                              >
                                <FileText className="w-4 h-4" /> Write Prescription
                              </button>
                            )}
                            {c.prescription && (
                              <div className="flex items-center gap-2">
                                <Badge className={RX_STATUS_META[c.prescription.status].color}>Rx Issued</Badge>
                                <button
                                  onClick={() => setWhatsAppRx(c.prescription!)}
                                  className="flex items-center gap-1.5 border border-teal-500 text-teal-700 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-teal-50 transition"
                                >
                                  <Smartphone className="w-3.5 h-3.5" /> WhatsApp
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </SectionCard>
                    );
                  })
                )}
              </div>
            )}

            {/* ═══ DOCTOR — ISSUED PRESCRIPTIONS ══════════════════════ */}
            {portalMode === 'doctor' && tab === 'prescriptions' && (
              <div className="space-y-4">
                <h2 className="font-extrabold text-gray-800 text-base">Issued Prescriptions</h2>
                {(() => {
                  const activeDoctor = DOCTORS.find(d => d.id === activeDoctorId);
                  const doctorRxs = db.allPrescriptions.filter(rx => rx.doctorName === activeDoctor?.name);
                  return doctorRxs.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-medium">No prescriptions issued yet for this doctor.</p>
                    </div>
                  ) : (
                    doctorRxs.map(rx => (
                      <PrescriptionCard
                        key={rx.id}
                        rx={rx}
                        mutating={db.mutating}
                        onExecute={() => handleExecuteRx(rx)}
                        onFlagCorrection={() => db.flagCorrection(rx.id)}
                        showWhatsApp={() => setWhatsAppRx(rx)}
                      />
                    ))
                  );
                })()}
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══ STATS FOOTER ════════════════════════════════════════════════ */}
      <div className="mx-6 mb-6 mt-2 bg-slate-800 rounded-2xl px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        {[
          { label: 'Total Requests', value: db.consultations.length,                                              color: 'text-sky-400'    },
          { label: 'In Progress',    value: db.consultations.filter(c => c.status === 'IN_PROGRESS').length,      color: 'text-blue-400'   },
          { label: 'Prescriptions',  value: db.allPrescriptions.length,                                           color: 'text-purple-400' },
          { label: 'Pending Action', value: db.pendingRxCount,                                                    color: 'text-red-400'    },
        ].map(stat => (
          <div key={stat.label}>
            <p className={`text-xl font-extrabold ${stat.color}`}>{stat.value}</p>
            <p className="text-slate-400 text-xs mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

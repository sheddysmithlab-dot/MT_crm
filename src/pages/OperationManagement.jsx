import { useState, useRef, useMemo, useEffect } from 'react';
import { FileBarChart2, X, Printer, CheckCircle2, XCircle, User, Calendar } from 'lucide-react';
import TabbedPage from '@/components/TabbedPage';
import WorkInProgressTab from './om/WorkInProgressTab';
import PendingConfirmationTab from './om/PendingConfirmationTab';
import ApproveNextStepTab from './om/ApproveNextStepTab';
import DealNotDoneTab from './om/DealNotDoneTab';
import HoldForMaterialTab from './om/HoldForMaterialTab';
import CompleteTab from './om/CompleteTab';
import { dbOperations } from '@/lib/db';
import { normalizeAssignedManager } from '@/utils/jobAssignment';
import { toast } from 'sonner';
import useCompanyStore from '@/store/companyStore';
import html2canvas from 'html2canvas';

const INCENTIVE_RATE = 0.01; // 1%

const MONTHS = [
  { value: '01', label: 'January' },  { value: '02', label: 'February' },
  { value: '03', label: 'March' },    { value: '04', label: 'April' },
  { value: '05', label: 'May' },      { value: '06', label: 'June' },
  { value: '07', label: 'July' },     { value: '08', label: 'August' },
  { value: '09', label: 'September' },{ value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

const fmtINR = (v) =>
  `₹${(Number(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

const nowMM   = () => String(new Date().getMonth() + 1).padStart(2, '0');
const nowYYYY = () => String(new Date().getFullYear());

// DB status → display label
const STATUS_LABELS = {
  'completed':            'Completed',
  'complete':             'Completed',
  'in-progress':          'Work in Progress',
  'on-hold':              'Hold for Material',
  'pending-confirmation': 'Waiting Approval',
  'deal-not-done':        'Parking Status',
};
const STATUS_COLORS = {
  'completed':            { bg: '#d1fae5', color: '#065f46' },
  'complete':             { bg: '#d1fae5', color: '#065f46' },
  'in-progress':          { bg: '#dbeafe', color: '#1e40af' },
  'on-hold':              { bg: '#fed7aa', color: '#9a3412' },
  'pending-confirmation': { bg: '#fef9c3', color: '#854d0e' },
  'deal-not-done':        { bg: '#fee2e2', color: '#991b1b' },
};

// ─── Incentive Report Modal ────────────────────────────────────────────────────
const IncentiveReportModal = ({ onClose, company }) => {
  const [month, setMonth]           = useState(nowMM());
  const [year, setYear]             = useState(nowYYYY());
  const [managerFilter, setManagerFilter] = useState('');
  const [allData, setAllData]       = useState([]);   // raw fetched rows
  const [settledMap, setSettledMap] = useState({ byChallan: {}, byVehicle: {} }); // cash-receipt final settled amounts
  const [faultMap, setFaultMap]     = useState({});
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const reportRef = useRef(null);
  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

  // Incentive is based on the CASH RECEIPT's Final Settled Amount (what the
  // customer actually agreed to pay), not the challan/invoice grand total.
  // Order: cash-receipt settled amount → record's stored settled amount → grand total.
  const getAmt = (r) => {
    const byChallan = settledMap.byChallan || {};
    const byVehicle = settledMap.byVehicle || {};
    const cn = r.challan_no ? String(r.challan_no).toLowerCase() : '';
    const vn = r.vehicle_no ? String(r.vehicle_no).toLowerCase() : '';
    const fromReceipt = (cn && byChallan[cn]) || (vn && byVehicle[vn]) || 0;
    if (fromReceipt > 0) return fromReceipt;
    const settled = parseFloat(r.final_settled_amount || 0) || 0;
    if (settled > 0) return settled;
    return parseFloat(r.grand_total || r.total || r.total_amount || 0);
  };

  // Auto-generate on open with current month
  useEffect(() => { fetchData(); }, []);

  // Load completed jobs from the SAME source as the O&M "Completed" tab:
  // sell_challans + invoices (challan_invoice). Reading only sell_challans missed
  // every job that was billed as an invoice. No date filter here — the period
  // filter lives in a memo below so changing month/year updates instantly.
  const fetchData = async () => {
    setLoading(true);
    try {
      const [challans, invoices, cashReceipts] = await Promise.all([
        dbOperations.getAll('sell_challans'),
        dbOperations.getAll('invoices'),
        dbOperations.getAll('cash_receipts'),
      ]);
      const norm = (r, source) => ({
        ...r,
        _source: source,
        party_name: r.party_name || r.customer_name || '',
      });
      const data = [
        ...(challans || []).map((r) => norm(r, 'Challan')),
        ...(invoices || []).map((r) => norm(r, 'Invoice')),
      ];
      setAllData(data);

      // Build lookup of Final Settled Amount from cash receipts, keyed by
      // challan number (precise) and vehicle number (fallback).
      const byChallan = {};
      const byVehicle = {};
      (cashReceipts || []).forEach((rc) => {
        const amt = parseFloat(rc.final_settled_amount || rc.finalSettledAmount || 0) || 0;
        if (!amt) return;
        if (rc.challan_no) byChallan[String(rc.challan_no).toLowerCase()] = amt;
        if (rc.vehicle_no) byVehicle[String(rc.vehicle_no).toLowerCase()] = amt;
      });
      setSettledMap({ byChallan, byVehicle });
    } catch (e) {
      console.error(e);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  // Records within the selected month + year.
  const periodData = useMemo(() => {
    return allData.filter((r) => {
      const d = String(r.date || r.invoice_date || r.created_at || '');
      return d.slice(0, 4) === year && d.slice(5, 7) === month;
    });
  }, [allData, month, year]);

  // Manager options derived from ALL loaded records (every month), so every
  // manager — e.g. Rafi Khan — always appears in the dropdown regardless of the
  // month selected. (Matches the O&M Completed tab's behaviour.)
  const managerOptions = useMemo(() => {
    const names = new Set();
    allData.forEach((r) => {
      const n = normalizeAssignedManager(r)?.name;
      if (n) names.add(n);
    });
    return Array.from(names).sort();
  }, [allData]);

  // Filtered rows shown in table
  const rows = useMemo(() => {
    if (!managerFilter) return periodData;
    return periodData.filter((r) => normalizeAssignedManager(r)?.name === managerFilter);
  }, [periodData, managerFilter]);

  const toggleFault = (id) => setFaultMap((p) => ({ ...p, [id]: !p[id] }));

  const totalAmt = rows.reduce((s, r) => s + getAmt(r), 0);
  // Incentive is earned by default on every completed job; a marked fault removes it.
  const totalInc = rows.reduce((s, r) => s + (faultMap[r.id] ? 0 : getAmt(r) * INCENTIVE_RATE), 0);

  const handleSavePng = async () => {
    if (!reportRef.current) return;
    setSaving(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2, backgroundColor: '#ffffff', useCORS: true,
      });
      const link = document.createElement('a');
      const mLabel = MONTHS.find((m) => m.value === month)?.label || month;
      link.download = `incentive-report-${mLabel}-${year}${managerFilter ? `-${managerFilter}` : ''}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Report saved as PNG');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save PNG');
    } finally {
      setSaving(false);
    }
  };

  const mLabel = MONTHS.find((m) => m.value === month)?.label || month;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            <FileBarChart2 className="w-5 h-5 text-brand-red" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Incentive Report</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 shrink-0">
          {/* Month */}
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-dark-card dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-brand-red"
            >
              {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          {/* Year */}
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-dark-card dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-brand-red"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* Manager filter */}
          <div className="relative">
            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
              className="pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-dark-card dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-brand-red min-w-[160px]"
            >
              <option value="">All Managers</option>
              {managerOptions.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
            {rows.length} record{rows.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── Table (scrollable, also captured to PNG) ── */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-gray-400">
              <FileBarChart2 className="w-8 h-8 animate-pulse mr-2" /> Loading…
            </div>
          ) : (
            <div ref={reportRef} style={{ fontFamily: 'sans-serif', background: '#fff', color: '#1a1a1a' }}>

              {/* PNG header (only visible in capture) */}
              <div style={{ textAlign: 'center', padding: '20px 24px 12px', borderBottom: '2px solid #e5e7eb' }}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{company || 'AUTO WORKSHOP'}</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>Incentive Report — {mLabel} {year}{managerFilter ? ` · ${managerFilter}` : ''}</div>
              </div>

              {rows.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 24px', color: '#9ca3af' }}>
                  No records found for {mLabel} {year}
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                      {[
                        { label: '#',          align: 'center' },
                        { label: 'Vehicle No', align: 'left'   },
                        { label: 'Status',     align: 'left'   },
                        { label: 'Party Name', align: 'left'   },
                        { label: 'Manager',    align: 'left'   },
                        { label: 'Amount',     align: 'right'  },
                        { label: 'Fault',      align: 'center' },
                        { label: 'Incentive (1%)', align: 'right' },
                      ].map(({ label, align }) => (
                        <th key={label} style={{ padding: '8px 12px', textAlign: align, fontWeight: 700, color: '#374151', textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const amt      = getAmt(r);
                      const isFault  = !!faultMap[r.id];   // toggled on = fault → no incentive
                      const eligible = !isFault;           // default: eligible for incentive
                      const inc      = eligible ? amt * INCENTIVE_RATE : 0;
                      const st       = r.status || 'completed';
                      const stStyle  = STATUS_COLORS[st] || { bg: '#f3f4f6', color: '#374151' };
                      const mgr      = normalizeAssignedManager(r)?.name || '—';

                      return (
                        <tr key={r.id} style={{ borderBottom: '1px solid #e5e7eb', background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                          <td style={{ padding: '7px 12px', textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>{i + 1}</td>

                          <td style={{ padding: '7px 12px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {r.vehicle_no || '—'}
                          </td>

                          <td style={{ padding: '7px 12px' }}>
                            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: stStyle.bg, color: stStyle.color }}>
                              {STATUS_LABELS[st] || st}
                            </span>
                          </td>

                          <td style={{ padding: '7px 12px' }}>{r.party_name || r.customer_name || '—'}</td>

                          <td style={{ padding: '7px 12px', color: '#6b7280' }}>{mgr}</td>

                          <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 600 }}>
                            {fmtINR(amt)}
                          </td>

                          {/* Fault toggle — interactive in modal, renders as icon in PNG */}
                          <td style={{ padding: '7px 12px', textAlign: 'center' }}>
                            <button
                              onClick={() => toggleFault(r.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                              title={eligible ? 'Mark as Fault (removes incentive)' : 'Clear Fault'}
                            >
                              {eligible
                                ? <CheckCircle2 style={{ width: 20, height: 20, color: '#16a34a' }} />
                                : <XCircle      style={{ width: 20, height: 20, color: '#ef4444' }} />
                              }
                            </button>
                          </td>

                          <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, color: eligible ? '#16a34a' : '#9ca3af' }}>
                            {eligible ? fmtINR(inc) : '₹0'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Totals footer */}
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #1f2937', background: '#f3f4f6' }}>
                      <td colSpan={5} style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>Total</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{fmtINR(totalAmt)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 11, color: '#6b7280' }}>
                        {rows.filter((r) => !faultMap[r.id]).length} ✓
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#16a34a', fontSize: 14 }}>
                        {fmtINR(totalInc)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}

              <div style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af', padding: '12px 0 16px' }}>
                Generated on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
            </div>
          )}
        </div>

        {/* ── Bottom action buttons ── */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 shrink-0">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-red text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60"
          >
            <FileBarChart2 className="w-4 h-4" />
            {loading ? 'Generating…' : 'Generate Report'}
          </button>

          <button
            onClick={handleSavePng}
            disabled={saving || rows.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save PNG'}
          </button>

          <button
            onClick={onClose}
            className="ml-auto px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const tabs = [
  { id: 'overall',          label: 'Overall',                       component: ApproveNextStepTab },
  { id: 'waiting-approval', label: 'Waiting for Customer Approval', component: PendingConfirmationTab },
  { id: 'hold-for-material',label: 'Hold for Material',             component: HoldForMaterialTab },
  { id: 'work-in-progress', label: 'Work in Progress',              component: WorkInProgressTab },
  { id: 'completed',        label: 'Completed',                     component: CompleteTab },
  { id: 'deal-not-done',    label: 'Parking Status',                component: DealNotDoneTab },
];

const OperationManagement = () => {
  const [showReport, setShowReport] = useState(false);
  const company = useCompanyStore((s) => s.companyDetails?.name || '');

  const headerActions = (
    <button
      onClick={() => setShowReport(true)}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-red text-white text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm"
    >
      <FileBarChart2 className="w-4 h-4" />
      Generate Incentive Report
    </button>
  );

  return (
    <>
      <TabbedPage tabs={tabs} title="Operation & Management" headerActions={headerActions} />
      {showReport && (
        <IncentiveReportModal onClose={() => setShowReport(false)} company={company} />
      )}
    </>
  );
};

export default OperationManagement;

import { useState, useEffect, useMemo } from 'react';
import {
  X, Search, Download, RefreshCw, IndianRupee,
  Calendar, Save, User, Phone, CreditCard,
  FileText, ChevronRight, CheckCircle, Clock,
} from 'lucide-react';
import { dbOperations } from '@/lib/db';
import { toast } from 'sonner';

/* ─── helpers ─── */
const fmt = (v) =>
  parseFloat(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) => {
  if (!d) return '-';
  const dt = new Date(d);
  return isNaN(dt) ? '-' : dt.toLocaleDateString('en-GB');
};

const fmtDateTime = (d) => {
  if (!d) return '-';
  const dt = new Date(d);
  return isNaN(dt)
    ? '-'
    : dt.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const parseDescription = (desc = '') => {
  const modeMatch = desc.match(/Settlement\s*-\s*([^|]+)/i);
  const remarkMatch = desc.match(/\|\s*(.+)$/);
  return {
    mode: modeMatch ? modeMatch[1].trim() : '-',
    remark: remarkMatch ? remarkMatch[1].trim() : '',
  };
};

const MODE_COLORS = {
  Cash:          'bg-green-100  text-green-800  dark:bg-green-900/40  dark:text-green-300',
  Cheque:        'bg-blue-100   text-blue-800   dark:bg-blue-900/40   dark:text-blue-300',
  NEFT:          'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  UPI:           'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  'Bank Transfer':'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
};

/* ─── Read-only Settlement Detail Panel ─── */
const SettlementDetail = ({ settlement, customer, onClose, onSaved }) => {
  const [saving, setSaving] = useState(false);
  const { mode, remark } = parseDescription(settlement.description);

  const handleSaveToBackend = async () => {
    setSaving(true);
    try {
      const record = {
        id: settlement.id,
        customer_id: settlement.customer_id,
        customer_name: customer?.name || 'Unknown',
        customer_phone: customer?.phone || '-',
        payment_date: settlement.entry_date,
        amount: parseFloat(settlement.credit || 0),
        payment_mode: mode,
        remarks: remark,
        settled_at: settlement.created_at,
        saved_at: new Date().toISOString(),
      };

      // Load existing file or start fresh
      let existing = { settlements: [] };
      if (window.electron?.fs?.readFile) {
        try {
          const raw = await window.electron.fs.readFile('C:/malwa-crm/Data_base/customer/Settlements.json');
          existing = JSON.parse(raw);
          if (!Array.isArray(existing.settlements)) existing.settlements = [];
        } catch (_) {
          existing = { settlements: [] };
        }
      }

      // Upsert by id
      const idx = existing.settlements.findIndex((s) => s.id === record.id);
      if (idx >= 0) {
        existing.settlements[idx] = record;
      } else {
        existing.settlements.push(record);
      }

      existing.total_records = existing.settlements.length;
      existing.total_amount = existing.settlements.reduce((s, r) => s + (r.amount || 0), 0);
      existing.last_updated = new Date().toISOString();

      if (window.electron?.fs?.writeFile) {
        await window.electron.fs.writeFile(
          'C:/malwa-crm/Data_base/customer/Settlements.json',
          JSON.stringify(existing, null, 2)
        );
        toast.success('Settlement saved to backend');
      } else {
        const blob = new Blob([JSON.stringify(existing, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Settlements.json';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Settlements.json downloaded');
      }

      onSaved?.();
    } catch (err) {
      toast.error('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    /* overlay backdrop */
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-gray-900 overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between bg-gradient-to-r from-brand-red to-rose-700 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <IndianRupee className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-rose-200 font-medium">Settlement Detail</p>
              <p className="text-sm font-bold text-white">Payment Receipt</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-white/70 hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Status badge ── */}
        <div className="flex justify-center -mt-3 mb-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-white shadow">
            <CheckCircle className="h-3.5 w-3.5" />
            SETTLED
          </span>
        </div>

        <div className="px-5 pb-5 space-y-4 mt-2">

          {/* ── Customer Block ── */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-red text-white font-bold text-lg">
                {(customer?.name || '?')[0].toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white text-sm">
                  {customer?.name || 'Unknown Customer'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                  <Phone className="h-3 w-3" />
                  {customer?.phone || '-'}
                </p>
              </div>
            </div>
          </div>

          {/* ── Amount ── */}
          <div className="rounded-xl bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800 p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Payment Amount</p>
            <p className="text-3xl font-extrabold text-green-600 dark:text-green-400">
              ₹ {fmt(settlement.credit)}
            </p>
          </div>

          {/* ── Date + Mode ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Payment Date
              </p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {fmtDate(settlement.entry_date)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                <CreditCard className="h-3 w-3" /> Payment Mode
              </p>
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${MODE_COLORS[mode] || 'bg-gray-200 text-gray-700'}`}>
                {mode}
              </span>
            </div>
          </div>

          {/* ── Remarks ── */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              <FileText className="h-3 w-3" /> Remarks / Notes
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {remark || <span className="italic text-gray-400">No remarks</span>}
            </p>
          </div>

          {/* ── Record Info ── */}
          <div className="rounded-xl border border-dashed border-gray-200 p-3 dark:border-gray-700 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Record Info</p>
            <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="shrink-0 font-medium text-gray-600 dark:text-gray-300 w-16">Entry ID</span>
              <span className="break-all font-mono text-[10px]">{settlement.id}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="shrink-0 font-medium text-gray-600 dark:text-gray-300 w-16 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Settled At
              </span>
              <span>{fmtDateTime(settlement.created_at)}</span>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Close
            </button>
            <button
              onClick={handleSaveToBackend}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving...' : 'Save to Backend'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

/* ─── Main Audit List Modal ─── */
const SettlementAuditModal = ({ isOpen, onClose }) => {
  const [settlements, setSettlements]     = useState([]);
  const [customers, setCustomers]         = useState([]);
  const [loading, setLoading]             = useState(false);
  const [saving, setSaving]               = useState(false);
  const [search, setSearch]               = useState('');
  const [dateFrom, setDateFrom]           = useState('');
  const [dateTo, setDateTo]               = useState('');
  const [modeFilter, setModeFilter]       = useState('All');
  const [selected, setSelected]           = useState(null); // row clicked → detail view

  useEffect(() => { if (isOpen) loadData(); }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allEntries, allCustomers] = await Promise.all([
        dbOperations.getAll('customer_ledger_entries'),
        dbOperations.getAll('customers'),
      ]);
      const settled = allEntries
        .filter((e) => e.reference_type === 'settlement')
        .sort((a, b) => new Date(b.created_at || b.entry_date) - new Date(a.created_at || a.entry_date));
      setSettlements(settled);
      setCustomers(allCustomers);
    } catch (err) {
      toast.error('Failed to load settlement data');
    } finally {
      setLoading(false);
    }
  };

  const getCustomer = (id) => customers.find((c) => String(c.id) === String(id));

  const allModes = useMemo(() => {
    const s = new Set();
    settlements.forEach((e) => { const { mode } = parseDescription(e.description); if (mode !== '-') s.add(mode); });
    return ['All', ...Array.from(s)];
  }, [settlements]);

  const filtered = useMemo(() => settlements.filter((s) => {
    const c  = getCustomer(s.customer_id);
    const name  = (c?.name  || '').toLowerCase();
    const phone = (c?.phone || '').toLowerCase();
    const { mode, remark } = parseDescription(s.description);
    return (
      (!search      || name.includes(search.toLowerCase()) || phone.includes(search.toLowerCase()) || remark.toLowerCase().includes(search.toLowerCase())) &&
      (!dateFrom    || s.entry_date >= dateFrom) &&
      (!dateTo      || s.entry_date <= dateTo)   &&
      (modeFilter === 'All' || mode === modeFilter)
    );
  }), [settlements, search, dateFrom, dateTo, modeFilter, customers]);

  const totals = useMemo(() => ({
    count:  filtered.length,
    amount: filtered.reduce((sum, s) => sum + parseFloat(s.credit || 0), 0),
  }), [filtered]);

  /* bulk save-all to backend */
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const exportData = filtered.map((s) => {
        const c = getCustomer(s.customer_id);
        const { mode, remark } = parseDescription(s.description);
        return {
          id: s.id,
          customer_id: s.customer_id,
          customer_name: c?.name  || 'Unknown',
          customer_phone: c?.phone || '-',
          payment_date:  s.entry_date,
          amount:        parseFloat(s.credit || 0),
          payment_mode:  mode,
          remarks:       remark,
          settled_at:    s.created_at,
        };
      });
      const payload = {
        settlements:   exportData,
        total_records: exportData.length,
        total_amount:  totals.amount,
        last_updated:  new Date().toISOString(),
      };

      if (window.electron?.fs?.writeFile) {
        await window.electron.fs.writeFile(
          'C:/malwa-crm/Data_base/customer/Settlements.json',
          JSON.stringify(payload, null, 2)
        );
        toast.success(`${exportData.length} settlements saved to backend`);
      } else {
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `Settlements_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Settlements downloaded as JSON');
      }
    } catch (err) {
      toast.error('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExportExcel = () => {
    if (!filtered.length) { toast.error('No data to export'); return; }
    const rows = filtered.map((s, i) => {
      const c = getCustomer(s.customer_id);
      const { mode, remark } = parseDescription(s.description);
      return `<tr>
        <td>${i+1}</td><td>${c?.name||'-'}</td><td>${c?.phone||'-'}</td>
        <td>${fmtDate(s.entry_date)}</td>
        <td style="text-align:right">${fmt(s.credit)}</td>
        <td>${mode}</td><td>${remark||'-'}</td><td>${fmtDateTime(s.created_at)}</td>
      </tr>`;
    }).join('');
    const html = `<html><head><meta charset="UTF-8"/>
      <style>table{border-collapse:collapse}th,td{border:1px solid #999;padding:6px 10px;white-space:nowrap}th{background:#f0f0f0;font-weight:700}</style>
      </head><body><h2>Customer Settlement Audit</h2>
      <p>Records: ${filtered.length} | Amount: ₹${fmt(totals.amount)}</p>
      <table><thead><tr>
        <th>Sr.</th><th>Customer</th><th>Phone</th><th>Date</th>
        <th>Amount (₹)</th><th>Mode</th><th>Remarks</th><th>Settled At</th>
      </tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `Settlements_${new Date().toISOString().split('T')[0]}.xls`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to Excel');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* ── Main list modal ── */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="flex h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-gray-900">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-red/10">
                <IndianRupee className="h-5 w-5 text-brand-red" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">Settlement Audit Log</h2>
                <p className="text-xs text-gray-400">Click any row to view full settlement details</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 px-6 py-3 md:grid-cols-4 border-b border-gray-100 dark:border-gray-700">
            {[
              { label: 'Filtered Records', value: totals.count,               color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20'   },
              { label: 'Total Amount',     value: `₹ ${fmt(totals.amount)}`,  color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-900/20' },
              { label: 'All Settlements',  value: settlements.length,         color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20'},
              { label: 'Payment Modes',    value: allModes.length - 1,        color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20'},
            ].map((card) => (
              <div key={card.label} className={`rounded-xl p-3 ${card.bg}`}>
                <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 px-6 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex flex-1 min-w-44 items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-600">
              <Search className="h-4 w-4 text-gray-400 shrink-0" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, remarks..."
                className="w-full bg-transparent text-sm outline-none dark:text-white" />
            </div>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" title="From" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" title="To" />
            <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white">
              {allModes.map((m) => <option key={m}>{m}</option>)}
            </select>
            <button onClick={loadData} className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-brand-red" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-gray-400 gap-2">
                <IndianRupee className="h-12 w-12 opacity-20" />
                <p className="text-sm">No settlement records found</p>
              </div>
            ) : (
              <table className="w-full text-xs leading-tight">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 text-left">
                  <tr>
                    <th className="px-3 py-2 text-gray-500 dark:text-gray-400 font-medium w-8">Sr.</th>
                    <th className="px-3 py-2 text-gray-500 dark:text-gray-400 font-medium">Customer</th>
                    <th className="px-3 py-2 text-gray-500 dark:text-gray-400 font-medium">Phone</th>
                    <th className="px-3 py-2 text-gray-500 dark:text-gray-400 font-medium">Date</th>
                    <th className="px-3 py-2 text-right text-gray-500 dark:text-gray-400 font-medium">Amount (₹)</th>
                    <th className="px-3 py-2 text-gray-500 dark:text-gray-400 font-medium">Mode</th>
                    <th className="px-3 py-2 text-gray-500 dark:text-gray-400 font-medium">Remarks</th>
                    <th className="px-3 py-2 text-gray-500 dark:text-gray-400 font-medium">Settled At</th>
                    <th className="px-3 py-2 w-6" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, idx) => {
                    const c = getCustomer(s.customer_id);
                    const { mode, remark } = parseDescription(s.description);
                    const isActive = selected?.id === s.id;
                    return (
                      <tr
                        key={s.id}
                        onClick={() => setSelected(s)}
                        className={`border-b cursor-pointer transition-colors
                          dark:border-gray-700
                          ${isActive
                            ? 'bg-brand-red/5 dark:bg-brand-red/10'
                            : 'even:bg-gray-50/50 dark:even:bg-gray-800/30 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'}`}
                      >
                        <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 shrink-0 rounded-full bg-brand-red flex items-center justify-center text-white text-[10px] font-bold">
                              {(c?.name || '?')[0].toUpperCase()}
                            </div>
                            <span className="font-semibold text-gray-900 dark:text-white">{c?.name || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{c?.phone || '-'}</td>
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-gray-400 shrink-0" />
                            {fmtDate(s.entry_date)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-green-600">₹ {fmt(s.credit)}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${MODE_COLORS[mode] || 'bg-gray-100 text-gray-600'}`}>
                            {mode}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-500 dark:text-gray-400 max-w-[120px] truncate" title={remark}>
                          {remark || <span className="italic text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{fmtDateTime(s.created_at)}</td>
                        <td className="px-3 py-2 text-gray-400">
                          <ChevronRight className="h-3.5 w-3.5" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="sticky bottom-0 bg-gray-100 dark:bg-gray-800 font-bold">
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-right text-gray-600 dark:text-gray-300 text-xs">
                      Total ({filtered.length} records):
                    </td>
                    <td className="px-3 py-2 text-right text-green-600 text-xs">₹ {fmt(totals.amount)}</td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3 dark:border-gray-700">
            <p className="text-xs text-gray-400">
              {filtered.length} of {settlements.length} records
              <span className="ml-2 text-blue-500 dark:text-blue-400">↑ Click any row to view details</span>
            </p>
            <div className="flex gap-2">
              <button onClick={handleExportExcel}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800">
                <Download className="h-4 w-4" /> Export Excel
              </button>
              <button onClick={handleSaveAll} disabled={saving || !filtered.length}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60">
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving...' : 'Save All to Backend'}
              </button>
              <button onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800">
                Close
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ── Read-only detail panel (stacked on top) ── */}
      {selected && (
        <SettlementDetail
          settlement={selected}
          customer={getCustomer(selected.customer_id)}
          onClose={() => setSelected(null)}
          onSaved={() => setSelected(null)}
        />
      )}
    </>
  );
};

export default SettlementAuditModal;

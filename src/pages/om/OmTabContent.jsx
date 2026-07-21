import { useState, useEffect, useMemo } from 'react';
import { ClipboardList, Calendar, User, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { dbOperations } from '@/lib/db';
import { normalizeAssignedManager } from '@/utils/jobAssignment';

// Maps O&M tab label → DB status value used for filtering
const STATUS_MAP = {
  'Overall':                        null,
  'Waiting for Customer Approval':  'pending-confirmation',
  'Hold for Material':              'on-hold',
  'Work in Progress':               'in-progress',
  'Completed':                      'completed',
  'Parking Status':                 'deal-not-done',
};

const STATUS_CONFIG = {
  'Overall':                        { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',    dot: 'bg-purple-500' },
  'Waiting for Customer Approval':  { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',    dot: 'bg-yellow-500' },
  'Hold for Material':              { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',    dot: 'bg-orange-500' },
  'Work in Progress':               { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',            dot: 'bg-blue-500' },
  'Completed':                      { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', dot: 'bg-emerald-500' },
  'Parking Status':                 { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',                dot: 'bg-red-500' },
};

// DB status value → human-readable label
const DB_STATUS_LABELS = {
  'pending-confirmation': 'Waiting for Approval',
  'in-progress':          'Work in Progress',
  'on-hold':              'Hold for Material',
  'completed':            'Completed',
  'deal-not-done':        'Parking Status',
  'complete':             'Completed',
};

// DB status value → badge colour classes
const DB_STATUS_COLORS = {
  'pending-confirmation': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  'in-progress':          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'on-hold':              'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  'completed':            'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'complete':             'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'deal-not-done':        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

// Module badge colours for Overall tab
const MODULE_COLORS = {
  'Estimate':  'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  'JobSheet':  'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  'Challan':   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'Invoice':   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
};

const MONTHS = [
  { value: '', label: 'All Months' },
  { value: '01', label: 'January' },   { value: '02', label: 'February' },
  { value: '03', label: 'March' },     { value: '04', label: 'April' },
  { value: '05', label: 'May' },       { value: '06', label: 'June' },
  { value: '07', label: 'July' },      { value: '08', label: 'August' },
  { value: '09', label: 'September' }, { value: '10', label: 'October' },
  { value: '11', label: 'November' },  { value: '12', label: 'December' },
];

const fmt = (date) => {
  if (!date) return 'N/A';
  try { return new Date(date).toLocaleDateString('en-IN'); } catch { return date; }
};

const fmtAmount = (val) =>
  `₹${(parseFloat(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const selectClass =
  'pl-8 pr-4 py-2 w-48 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-dark-card dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-brand-red appearance-none cursor-pointer';

// ← set to true to show Amount / Fault / Incentive columns
const SHOW_FINANCIALS = false;

// Helper: stable key for deduplication in Overall tab
const vehicleKey = (r) =>
  `${(r.vehicle_no || '').trim().toLowerCase()}|||${(r.party_name || r.customer_name || '').trim().toLowerCase()}`;

const OmTabContent = ({ status, dataSource = 'inspections' }) => {
  const [allRecords, setAllRecords]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [month, setMonth]             = useState(() => String(new Date().getMonth() + 1).padStart(2, '0'));
  const [manager, setManager]         = useState('');
  const [faultMap, setFaultMap]       = useState({});

  const config   = STATUS_CONFIG[status] || STATUS_CONFIG['Work in Progress'];
  const dbStatus = STATUS_MAP[status];
  const isOverall   = status === 'Overall';
  // Overall has extra Status + Stage columns
  const visibleCols = (isOverall ? 8 : 6) + (SHOW_FINANCIALS ? 3 : 0);
  const baseColSpan = visibleCols;

  // For challan-backed rows the incentive must be based on the settled amount
  // the customer actually pays, not the computed line-item total. Falls back to
  // total/grand_total for records (estimates, older challans) without it.
  const getAmount = (r) => {
    const settled = parseFloat(r.final_settled_amount);
    if (!isNaN(settled) && settled > 0) return settled;
    return parseFloat(r.grand_total || r.total || r.total_amount || 0) || 0;
  };

  const loadRecords = async () => {
    setLoading(true);
    try {
      let data = [];

      if (dataSource === 'overall') {
        // Aggregate: estimates + jobsheets + challans
        // One row per unique vehicle+party, most-advanced module wins
        const [estimates, jobsheets, challans] = await Promise.all([
          dbOperations.getAll('estimates'),
          dbOperations.getAll('jobsheets'),
          dbOperations.getAll('sell_challans'),
        ]);

        // Index jobsheets — highest-priority status wins (completed > in-progress > on-hold)
        const jsPriority = { completed: 3, 'in-progress': 2, 'on-hold': 1 };
        const jsMap = new Map();
        (jobsheets || []).forEach((r) => {
          const k = vehicleKey(r);
          const ex = jsMap.get(k);
          if (!ex || (jsPriority[r.status] || 0) > (jsPriority[ex.status] || 0)) jsMap.set(k, r);
        });

        // Index challans by vehicle+party
        const challanMap = new Map();
        (challans || []).forEach((r) => {
          challanMap.set(vehicleKey({ ...r, party_name: r.party_name || r.customer_name }), r);
        });

        // Build one row per estimate, enriched with actual operational status
        data = (estimates || []).map((est) => {
          const k = vehicleKey(est);
          if (challanMap.has(k)) {
            // Completed via challan → use the challan's settled amount (not the
            // estimate's total) so the incentive matches the Labour Bill.
            const ch = challanMap.get(k);
            return {
              ...est,
              final_settled_amount: ch.final_settled_amount ?? ch.total,
              total:                ch.total ?? est.total,
              _omStatus: 'completed',
              _module: 'Challan',
            };
          }
          const js = jsMap.get(k);
          if (js) {
            return { ...est, _omStatus: js.status,     _module: 'JobSheet' };
          }
          return { ...est, _omStatus: est.status,      _module: 'Estimate' };
        });

      } else if (dataSource === 'challan_invoice') {
        const [challans, invoices] = await Promise.all([
          dbOperations.getAll('sell_challans'),
          dbOperations.getAll('invoices'),
        ]);
        const normChallan = (challans || []).map((r) => ({
          ...r,
          _source:    'Challan',
          ref_no:     r.challan_no || r.id,
          party_name: r.party_name || r.customer_name || '',
          phone:      r.phone || r.contact_no || '',
        }));
        const normInvoice = (invoices || []).map((r) => ({
          ...r,
          _source:    'Invoice',
          ref_no:     r.invoice_no || r.id,
          party_name: r.party_name || r.customer_name || '',
          phone:      r.phone || r.contact_no || '',
        }));
        data = [...normChallan, ...normInvoice];

      } else {
        const tableMap = { estimates: 'estimates', jobsheets: 'jobsheets' };
        const table = tableMap[dataSource] || 'inspections';
        data = await dbOperations.getAll(table);
      }

      const sorted = (data || []).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setAllRecords(sorted);
    } catch (e) {
      console.error('Failed to load O&M records:', e);
      setAllRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRecords(); }, []);

  const managerOptions = useMemo(() => {
    const names = new Set();
    allRecords.forEach((r) => {
      const mgr = normalizeAssignedManager(r);
      if (mgr?.name) names.add(mgr.name);
    });
    return Array.from(names).sort();
  }, [allRecords]);

  const records = useMemo(() => {
    let list = allRecords;

    // Status filtering
    if (dataSource === 'overall') {
      // dbStatus === null → show all; otherwise filter by _omStatus
      if (dbStatus !== null) {
        list = list.filter((r) => (r._omStatus || r.status) === dbStatus);
      }
    } else if (dataSource === 'challan_invoice') {
      // All challan/invoice records count as Completed — no extra filter needed
    } else if (dbStatus !== null) {
      // estimates / jobsheets: filter directly by r.status
      list = list.filter((r) => r.status === dbStatus);
    }

    if (month)   list = list.filter((r) => (r.date || r.created_at || '').slice(5, 7) === month);
    if (manager) list = list.filter((r) => normalizeAssignedManager(r)?.name === manager);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) =>
        (r.vehicle_no  || '').toLowerCase().includes(q) ||
        (r.party_name  || '').toLowerCase().includes(q) ||
        (r.phone       || '').includes(q)
      );
    }
    return list;
  }, [allRecords, dataSource, dbStatus, month, manager, search]);

  const toggleFault = (id) =>
    setFaultMap((prev) => ({ ...prev, [id]: !prev[id] }));

  const { totalAmount, totalIncentive } = useMemo(() => {
    let amt = 0, inc = 0;
    records.forEach((r) => {
      const a = getAmount(r);
      amt += a;
      if (faultMap[r.id]) inc += a * 0.01;
    });
    return { totalAmount: amt, totalIncentive: inc };
  }, [records, faultMap]);

  return (
    <div className="space-y-4">
      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by vehicle, customer, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] max-w-xs px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-dark-card dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-brand-red"
        />

        <div className="relative">
          <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select value={month} onChange={(e) => setMonth(e.target.value)} className={selectClass}>
            {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        <div className="relative">
          <User className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select value={manager} onChange={(e) => setManager(e.target.value)} className={selectClass}>
            <option value="">All Managers</option>
            {managerOptions.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <button
          onClick={loadRecords}
          className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>

        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${config.color}`}>
          <span className={`w-2 h-2 rounded-full ${config.dot}`}></span>
          {status}
        </span>

        <span className="ml-auto text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {records.length} record{records.length !== 1 ? 's' : ''}
          {SHOW_FINANCIALS && records.length > 0 && (
            <span className="ml-2 font-semibold text-gray-700 dark:text-gray-300">
              | Total: {fmtAmount(totalAmount)}
            </span>
          )}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-1.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">#</th>
              {isOverall && <>
                <th className="px-4 py-1.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Stage</th>
                <th className="px-4 py-1.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Status</th>
              </>}
              <th className="px-4 py-1.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Date</th>
              <th className="px-4 py-1.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Vehicle No.</th>
              <th className="px-4 py-1.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Customer</th>
              <th className="px-4 py-1.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Contact</th>
              <th className="px-4 py-1.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Assigned Manager</th>
              {SHOW_FINANCIALS && <>
                <th className="px-4 py-1.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Amount</th>
                <th className="px-4 py-1.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Fault</th>
                <th className="px-4 py-1.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Incentive (1%)</th>
              </>}
            </tr>
          </thead>

          <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={baseColSpan + 1} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500">
                    <RefreshCw className="w-8 h-8 animate-spin opacity-40" />
                    <p className="text-sm">Loading records...</p>
                  </div>
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={baseColSpan + 1} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500">
                    <ClipboardList className="w-12 h-12 opacity-30" />
                    <p className="text-base font-medium">No records found</p>
                    <p className="text-sm">No jobs with status "{status}" yet.</p>
                  </div>
                </td>
              </tr>
            ) : (
              records.map((r, idx) => {
                const mgr       = normalizeAssignedManager(r);
                const amount    = getAmount(r);
                const isRight   = !!faultMap[r.id];
                const incentive = isRight ? amount * 0.01 : 0;
                // Use _omStatus for Overall, otherwise r.status
                const effectiveStatus = r._omStatus || r.status;

                return (
                  <tr key={r.id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-1.5 text-gray-500 dark:text-gray-400 text-xs">{idx + 1}</td>

                    {isOverall && <>
                      {/* Stage: which module the record currently lives in */}
                      <td className="px-4 py-1.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${MODULE_COLORS[r._module] || 'bg-gray-100 text-gray-700'}`}>
                          {r._module || '—'}
                        </span>
                      </td>
                      {/* Status: operational status */}
                      <td className="px-4 py-1.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${DB_STATUS_COLORS[effectiveStatus] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                          {DB_STATUS_LABELS[effectiveStatus] || effectiveStatus || 'N/A'}
                        </span>
                      </td>
                    </>}

                    <td className="px-4 py-1.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">{fmt(r.date)}</td>

                    <td className="px-4 py-1.5 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                      {r.vehicle_no || '—'}
                      {r._source && (
                        <span className={`ml-2 text-xs font-medium px-1.5 py-0.5 rounded ${r._source === 'Invoice' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                          {r._source}: {r.ref_no || ''}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-1.5 text-gray-800 dark:text-gray-200">{r.party_name || '—'}</td>
                    <td className="px-4 py-1.5 text-gray-600 dark:text-gray-400">{r.phone || r.contact_no || '—'}</td>

                    <td className="px-4 py-1.5 text-gray-800 dark:text-gray-200 font-medium">
                      {mgr?.name || <span className="text-gray-400 dark:text-gray-500">—</span>}
                    </td>

                    {SHOW_FINANCIALS && <>
                      <td className="px-4 py-1.5 text-right font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                        {fmtAmount(amount)}
                      </td>
                      <td className="px-4 py-1.5 text-center">
                        <button
                          onClick={() => toggleFault(r.id)}
                          title={isRight ? 'Mark as Wrong' : 'Mark as Right'}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-full transition-all hover:scale-110"
                        >
                          {isRight
                            ? <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                            : <XCircle      className="w-6 h-6 text-red-400" />
                          }
                        </button>
                      </td>
                      <td className={`px-4 py-1.5 text-right font-semibold whitespace-nowrap ${isRight ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>
                        {isRight ? fmtAmount(incentive) : '₹0.00'}
                      </td>
                    </>}
                  </tr>
                );
              })
            )}
          </tbody>

          {SHOW_FINANCIALS && records.length > 0 && (
            <tfoot className="bg-gray-50 dark:bg-gray-800 border-t-2 border-gray-300 dark:border-gray-600">
              <tr>
                <td colSpan={isOverall ? 8 : 6} className="px-4 py-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300 text-right">
                  Total ({records.length} records)
                </td>
                <td className="px-4 py-1.5 text-right font-bold text-gray-900 dark:text-white whitespace-nowrap">
                  {fmtAmount(totalAmount)}
                </td>
                <td className="px-4 py-1.5 text-center text-xs text-gray-400 dark:text-gray-500">
                  {records.filter((r) => faultMap[r.id]).length} ✓
                </td>
                <td className="px-4 py-1.5 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                  {fmtAmount(totalIncentive)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default OmTabContent;

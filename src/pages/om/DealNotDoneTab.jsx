import { useState, useEffect, useMemo, useRef } from 'react';
import { RefreshCw, Search, Car, CheckCircle2, Clock, Printer } from 'lucide-react';
import { dbOperations } from '@/lib/db';
import { normalizeAssignedManager } from '@/utils/jobAssignment';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import useCompanyStore from '@/store/companyStore';

const PARKING_RATE = 200; // ₹ per day

const calcDays = (fromDate, toDate = null) => {
  if (!fromDate) return 0;
  const from = new Date(fromDate);
  const to   = toDate ? new Date(toDate) : new Date();
  return Math.max(0, Math.floor((to - from) / 86_400_000));
};

const fmt = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

const fmtINR = (v) =>
  `₹${(Number(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

// ─── Receipt component (captured to PNG) ──────────────────────────────────────
const Receipt = ({ record, days, total, company, innerRef }) => (
  <div
    ref={innerRef}
    style={{ fontFamily: 'sans-serif', background: '#fff', color: '#1a1a1a', padding: 28, minWidth: 360 }}
  >
    {/* Header */}
    <div style={{ textAlign: 'center', borderBottom: '2px solid #e5e7eb', paddingBottom: 14, marginBottom: 16 }}>
      <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1 }}>{company || 'AUTO WORKSHOP'}</div>
      <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>PARKING RECEIPT</div>
    </div>

    {/* Details */}
    {[
      ['Challan No.',   record.challan_no || record.id],
      ['Vehicle No.',   record.vehicle_no  || '—'],
      ['Customer',      record.party_name  || record.customer_name || '—'],
      ['Parked From',   fmt(record.date || record.created_at)],
      ['Date of Delivery', fmt(new Date().toISOString().split('T')[0])],
    ].map(([label, value]) => (
      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 7 }}>
        <span style={{ color: '#6b7280' }}>{label}</span>
        <span style={{ fontWeight: 600 }}>{value}</span>
      </div>
    ))}

    {/* Calculation */}
    <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 14, paddingTop: 12 }}>
      {[
        ['Days Parked', `${days} day${days !== 1 ? 's' : ''}`],
        ['Rate',        `${fmtINR(PARKING_RATE)} / day`],
      ].map(([label, value]) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
          <span>{label}</span>
          <span style={{ fontWeight: 600 }}>{value}</span>
        </div>
      ))}
    </div>

    {/* Total */}
    <div style={{ borderTop: '2px solid #1a1a1a', marginTop: 12, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontWeight: 700, fontSize: 15 }}>Total Parking Charge</span>
      <span style={{ fontWeight: 800, fontSize: 20, color: '#dc2626' }}>{fmtINR(total)}</span>
    </div>

    <div style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af', marginTop: 22 }}>
      Thank you for visiting us
    </div>
  </div>
);

// ─── Main Tab ─────────────────────────────────────────────────────────────────
const DealNotDoneTab = () => {
  const [allRecords, setAllRecords]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [filterStatus, setFilterStatus] = useState('parking'); // 'all' | 'parking' | 'delivered'
  const [selected, setSelected]       = useState(null);   // record open in modal
  const [pngSaving, setPngSaving]     = useState(false);
  const receiptRef = useRef(null);
  const company = useCompanyStore((s) => s.companyDetails?.name || '');

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await dbOperations.getAll('sell_challans');
      setAllRecords((data || []).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)));
    } catch (e) {
      console.error(e);
      toast.error('Failed to load parking records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRecords(); }, []);

  const records = useMemo(() => {
    let list = allRecords;
    if (filterStatus !== 'all') {
      list = list.filter((r) => (r.parking_status || 'parking') === filterStatus);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) =>
        (r.vehicle_no || '').toLowerCase().includes(q) ||
        (r.party_name || r.customer_name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [allRecords, filterStatus, search]);

  // Days & charge for the currently open modal record
  const modalDays   = selected ? calcDays(selected.date || selected.created_at) : 0;
  const modalCharge = modalDays * PARKING_RATE;

  const handleSavePng = async () => {
    if (!receiptRef.current) return;
    setPngSaving(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2, backgroundColor: '#ffffff', useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `parking-receipt-${selected.vehicle_no || selected.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Receipt saved as PNG');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save PNG');
    } finally {
      setPngSaving(false);
    }
  };

  const handleConfirm = async () => {
    if (!selected) return;
    try {
      await dbOperations.update('sell_challans', selected.id, {
        parking_status: 'delivered',
        delivery_date: new Date().toISOString().split('T')[0],
      });
      toast.success(`${selected.vehicle_no || 'Vehicle'} marked as Delivered`);
      setSelected(null);
      await loadRecords();
    } catch (e) {
      console.error(e);
      toast.error('Failed to mark as delivered');
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search vehicle, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-dark-card dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-brand-red"
          />
        </div>

        {/* Status tabs */}
        <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden text-sm">
          {[['all', 'All'], ['parking', 'Parking'], ['delivered', 'Delivered']].map(([val, lbl]) => (
            <button
              key={val}
              onClick={() => setFilterStatus(val)}
              className={`px-4 py-2 transition-colors whitespace-nowrap ${
                filterStatus === val
                  ? 'bg-brand-red text-white font-semibold'
                  : 'bg-white dark:bg-dark-card text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>

        <button
          onClick={loadRecords}
          className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>

        <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
          {records.length} vehicle{records.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {['#', 'Challan Date', 'Vehicle No', 'Customer', 'Contact', 'Assigned Manager', 'Days Parked', 'Parking Charge', 'Status', 'Action'].map((h) => (
                <th
                  key={h}
                  className={`px-4 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap ${
                    ['Days Parked', 'Parking Charge', 'Status', 'Action'].includes(h) ? 'text-center' : 'text-left'
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={10} className="py-16 text-center">
                  <RefreshCw className="w-8 h-8 animate-spin opacity-40 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-400">Loading records...</p>
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-16 text-center">
                  <Car className="w-12 h-12 opacity-30 mx-auto mb-2 text-gray-400" />
                  <p className="text-base font-medium text-gray-500 dark:text-gray-400">No vehicles found</p>
                </td>
              </tr>
            ) : (
              records.map((r, idx) => {
                const pStatus    = r.parking_status || 'parking';
                const isDelivered = pStatus === 'delivered';
                const d          = calcDays(
                  r.date || r.created_at,
                  isDelivered ? r.delivery_date : null,
                );
                const charge = d * PARKING_RATE;

                return (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-1.5 text-gray-400 text-xs">{idx + 1}</td>
                    <td className="px-4 py-1.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">{fmt(r.date)}</td>
                    <td className="px-4 py-1.5 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                      {r.vehicle_no || '—'}
                    </td>
                    <td className="px-4 py-1.5 text-gray-800 dark:text-gray-200">
                      {r.party_name || r.customer_name || '—'}
                    </td>
                    <td className="px-4 py-1.5 text-gray-600 dark:text-gray-400">
                      {r.contact_no || r.phone || '—'}
                    </td>
                    <td className="px-4 py-1.5 text-gray-800 dark:text-gray-200 font-medium">
                      {normalizeAssignedManager(r)?.name || <span className="text-gray-400 dark:text-gray-500">—</span>}
                    </td>

                    {/* Days Parked — colour-coded by urgency */}
                    <td className="px-4 py-1.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        isDelivered
                          ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                          : d > 7
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : d > 3
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                      }`}>
                        <Clock className="w-3 h-3" />
                        {d} day{d !== 1 ? 's' : ''}
                      </span>
                    </td>

                    {/* Parking Charge */}
                    <td className={`px-4 py-1.5 text-center font-semibold whitespace-nowrap ${
                      isDelivered
                        ? 'text-gray-400 dark:text-gray-500'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {fmtINR(charge)}
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-1.5 text-center">
                      {isDelivered ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> Delivered
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                          <Car className="w-3 h-3" /> Parking
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-1.5 text-center">
                      {isDelivered ? (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {fmt(r.delivery_date)}
                        </span>
                      ) : (
                        <button
                          onClick={() => setSelected(r)}
                          className="px-3 py-1 rounded-lg text-xs font-semibold bg-brand-red text-white hover:bg-red-700 transition-colors"
                        >
                          Deliver
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Delivery Modal ── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

            {/* Receipt area — captured to PNG */}
            <Receipt
              record={selected}
              days={modalDays}
              total={modalCharge}
              company={company}
              innerRef={receiptRef}
            />

            {/* Action buttons */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
              {/* Save PNG */}
              <button
                onClick={handleSavePng}
                disabled={pngSaving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                {pngSaving ? 'Saving…' : 'Save PNG'}
              </button>

              {/* Confirm Delivery */}
              <button
                onClick={handleConfirm}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirm
              </button>

              {/* Cancel */}
              <button
                onClick={() => setSelected(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealNotDoneTab;

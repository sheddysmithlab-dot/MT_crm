import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Activity,
  ClipboardCheck,
  FileText,
  Filter,
  Gauge,
  Handshake,
  Package,
  PlusCircle,
  Receipt,
  RefreshCw,
  Search,
  Store,
  Truck,
  UserPlus,
  Users,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/db/dexie';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import useCustomerStore from '@/store/customerStore';

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;

const getISOWeekInputValue = (date = new Date()) => {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
};

const formatDateInput = (date) => date.toISOString().split('T')[0];

const getRangeFromWeek = (weekValue) => {
  const [yearText, weekText] = String(weekValue || '').split('-W');
  const year = Number(yearText);
  const week = Number(weekText);
  if (!year || !week) {
    const today = new Date();
    return { start: formatDateInput(today), end: formatDateInput(today), label: 'This Week' };
  }

  const firstThursday = new Date(Date.UTC(year, 0, 4));
  const firstWeekDay = firstThursday.getUTCDay() || 7;
  const monday = new Date(firstThursday);
  monday.setUTCDate(firstThursday.getUTCDate() - firstWeekDay + 1 + ((week - 1) * 7));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  return {
    start: formatDateInput(monday),
    end: formatDateInput(sunday),
    label: `Week ${week}, ${year}`,
  };
};

const getDateValue = (record, fields = []) => {
  for (const field of fields) {
    if (record?.[field]) return record[field];
  }
  return record?.date || record?.created_at || record?.createdAt || '';
};

const inDateRange = (record, fields, range) => {
  const rawDate = getDateValue(record, fields);
  if (!rawDate) return false;
  const value = String(rawDate).slice(0, 10);
  return value >= range.start && value <= range.end;
};

const toAmount = (value) => parseFloat(value || 0) || 0;

const formatAmount = (value) =>
  toAmount(value).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  });

const getRelationMeta = (amount) => {
  if (amount >= 1000000) return { key: 'high', label: 'High', emoji: '🔥', color: 'from-red-600 to-rose-500' };
  if (amount >= 500000) return { key: 'veryGood', label: 'Very Good', emoji: '💎', color: 'from-emerald-600 to-teal-500' };
  if (amount >= 200000) return { key: 'good', label: 'Good', emoji: '👍', color: 'from-blue-600 to-cyan-500' };
  if (amount >= 50000) return { key: 'ok', label: 'Ok', emoji: '🙂', color: 'from-amber-500 to-yellow-500' };
  if (amount > 0) return { key: 'poor', label: 'Poor', emoji: '⚠️', color: 'from-orange-600 to-amber-500' };
  return { key: 'bad', label: 'Bad', emoji: '❌', color: 'from-gray-700 to-gray-500' };
};

const relationBuckets = [
  getRelationMeta(1000000),
  getRelationMeta(500000),
  getRelationMeta(200000),
  getRelationMeta(50000),
  getRelationMeta(1),
  getRelationMeta(0),
];

const dashboardTables = [
  'customers',
  'customer_ledger_entries',
  'inspections',
  'estimates',
  'jobsheets',
  'sell_challans',
  'challans',
  'invoices',
  'vendors',
  'vendor_ledger_entries',
  'labour',
  'inventory_items',
  'cash_receipts',
];

const LeadForm = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    phone: '',
    source: '',
    notes: '',
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('Lead name and phone are required');
      return;
    }
    await onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-semibold dark:text-dark-text">Name *</label>
          <input
            value={formData.name}
            onChange={(event) => setFormData({ ...formData, name: event.target.value })}
            className="mt-1 w-full rounded-lg border p-2 dark:border-gray-600 dark:bg-dark-card dark:text-dark-text"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold dark:text-dark-text">Phone *</label>
          <input
            value={formData.phone}
            onChange={(event) => setFormData({ ...formData, phone: event.target.value.replace(/\D/g, '').slice(0, 10) })}
            className="mt-1 w-full rounded-lg border p-2 dark:border-gray-600 dark:bg-dark-card dark:text-dark-text"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold dark:text-dark-text">Company</label>
          <input
            value={formData.company}
            onChange={(event) => setFormData({ ...formData, company: event.target.value })}
            className="mt-1 w-full rounded-lg border p-2 dark:border-gray-600 dark:bg-dark-card dark:text-dark-text"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold dark:text-dark-text">Source</label>
          <select
            value={formData.source}
            onChange={(event) => setFormData({ ...formData, source: event.target.value })}
            className="mt-1 w-full rounded-lg border p-2 dark:border-gray-600 dark:bg-dark-card dark:text-dark-text"
          >
            <option value="">Select Source</option>
            <option value="phone">Phone Call</option>
            <option value="walk_in">Walk-in</option>
            <option value="referral">Referral</option>
            <option value="social_media">Social Media</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold dark:text-dark-text">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
          rows="3"
          className="mt-1 w-full rounded-lg border p-2 dark:border-gray-600 dark:bg-dark-card dark:text-dark-text"
        />
      </div>
      <div className="flex justify-end gap-2 border-t pt-4 dark:border-gray-700">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">
          <UserPlus className="mr-2 h-4 w-4" />
          Save Lead
        </Button>
      </div>
    </form>
  );
};

const StatTile = ({ icon: Icon, label, value, accent, onClick, sub }) => (
  <motion.button
    type="button"
    whileHover={{ y: -3 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="group min-h-32 rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:shadow-lg dark:border-gray-700 dark:bg-dark-card"
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-text-secondary">{label}</p>
        <p className="mt-2 text-4xl font-black text-gray-950 dark:text-white">{value}</p>
        {sub && <p className="mt-1 text-xs text-gray-500 dark:text-dark-text-secondary">{sub}</p>}
      </div>
      <span className={`inline-flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br ${accent} text-white shadow-md`}>
        <Icon className="h-5 w-5" />
      </span>
    </div>
  </motion.button>
);

const RelationTile = ({ bucket, value, total }) => {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-dark-card">
      <div className={`h-1.5 bg-gradient-to-r ${bucket.color}`} />
      <div className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-2xl">{bucket.emoji}</span>
          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-200">{percent}%</span>
        </div>
        <p className="mt-3 text-sm font-bold text-gray-700 dark:text-dark-text-secondary">{bucket.label}</p>
        <p className="mt-1 text-3xl font-black text-gray-950 dark:text-white">{value}</p>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { addLead } = useCustomerStore();
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [rangeMode, setRangeMode] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedWeek, setSelectedWeek] = useState(getISOWeekInputValue());
  const [refreshKey, setRefreshKey] = useState(0);

  const liveData = useLiveQuery(async () => {
    const entries = await Promise.all(
      dashboardTables.map(async (table) => {
        try {
          return [table, await db.table(table).toArray()];
        } catch {
          return [table, []];
        }
      })
    );
    return Object.fromEntries(entries);
  }, [refreshKey]) || {};

  const range = useMemo(() => {
    if (rangeMode === 'year') {
      const year = Number(selectedYear) || currentYear;
      return { start: `${year}-01-01`, end: `${year}-12-31`, label: `${year}` };
    }
    if (rangeMode === 'week') {
      return getRangeFromWeek(selectedWeek);
    }

    const [year, month] = selectedMonth.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return {
      start: `${year}-${String(month).padStart(2, '0')}-01`,
      end: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
      label: new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    };
  }, [rangeMode, selectedMonth, selectedYear, selectedWeek]);

  const dashboard = useMemo(() => {
    const customers = liveData.customers || [];
    const customerLedger = liveData.customer_ledger_entries || [];
    const inspections = (liveData.inspections || []).filter((row) => inDateRange(row, ['date', 'inspectionDate', 'created_at', 'createdAt'], range));
    const estimates = (liveData.estimates || []).filter((row) => inDateRange(row, ['date', 'created_at', 'createdAt'], range));
    const jobsheets = (liveData.jobsheets || []).filter((row) => inDateRange(row, ['date', 'created_at', 'createdAt'], range));
    const sellChallans = (liveData.sell_challans || []).filter((row) => inDateRange(row, ['date', 'challan_date', 'created_at'], range));
    const jobChallans = (liveData.challans || []).filter((row) => inDateRange(row, ['date', 'challan_date', 'created_at'], range));
    const invoices = (liveData.invoices || []).filter((row) => inDateRange(row, ['invoice_date', 'date', 'created_at'], range));

    const uniqueChallanIds = new Set([...sellChallans, ...jobChallans].map((row) => row.id || `${row.vehicle_no}-${row.date}-${row.challan_no}`));
    const jobCounts = {
      inspections: inspections.length,
      estimates: estimates.length,
      jobsheets: jobsheets.length,
      challans: uniqueChallanIds.size,
      invoices: invoices.length,
    };
    const totalJobs = Object.values(jobCounts).reduce((sum, count) => sum + count, 0);

    const realCustomers = customers.filter((customer) => customer.type === 'customer' || !customer.type);
    const leads = customers.filter((customer) => customer.type === 'lead');
    const relationCounts = relationBuckets.reduce((acc, bucket) => ({ ...acc, [bucket.key]: 0 }), {});
    const ledgerInRange = customerLedger.filter((entry) => inDateRange(entry, ['entry_date', 'date', 'created_at'], range));

    realCustomers.forEach((customer) => {
      const yearlyTransaction = ledgerInRange
        .filter((entry) => String(entry.customer_id) === String(customer.id))
        .reduce((sum, entry) => sum + toAmount(entry.debit), 0);
      const relation = getRelationMeta(yearlyTransaction);
      relationCounts[relation.key] += 1;
    });

    const totalSales = [...sellChallans, ...invoices].reduce(
      (sum, row) => sum + toAmount(row.total || row.grandTotal || row.finalTotal || row.total_amount || row.subtotal),
      0
    );
    const totalReceipts = (liveData.cash_receipts || [])
      .filter((row) => inDateRange(row, ['receipt_date', 'date', 'created_at'], range))
      .reduce((sum, row) => sum + toAmount(row.amount || row.final_settled_amount), 0);

    return {
      jobCounts,
      totalJobs,
      totalCustomers: realCustomers.length,
      totalLeads: leads.length,
      relationCounts,
      vendors: (liveData.vendors || []).length,
      labour: (liveData.labour || []).length,
      inventoryItems: (liveData.inventory_items || []).length,
      totalSales,
      totalReceipts,
    };
  }, [liveData, range]);

  const handleSaveLead = async (leadData) => {
    await addLead(leadData);
    setLeadModalOpen(false);
  };

  const jobTiles = [
    { label: 'Inspection', value: dashboard.jobCounts.inspections, icon: ClipboardCheck, accent: 'from-blue-600 to-cyan-500', path: '/jobs?step=inspection' },
    { label: 'Estimate', value: dashboard.jobCounts.estimates, icon: FileText, accent: 'from-indigo-600 to-blue-500', path: '/jobs?step=estimate' },
    { label: 'Job Sheet', value: dashboard.jobCounts.jobsheets, icon: Wrench, accent: 'from-violet-600 to-purple-500', path: '/jobs?step=jobsheet' },
    { label: 'Challan', value: dashboard.jobCounts.challans, icon: Truck, accent: 'from-rose-600 to-orange-500', path: '/jobs?step=challan' },
    { label: 'Invoice', value: dashboard.jobCounts.invoices, icon: Receipt, accent: 'from-emerald-600 to-green-500', path: '/jobs?step=invoice' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-5 dark:bg-dark-background sm:px-6">
      <Modal isOpen={leadModalOpen} onClose={() => setLeadModalOpen(false)} title="Add New Lead" size="lg">
        <LeadForm onSave={handleSaveLead} onCancel={() => setLeadModalOpen(false)} />
      </Modal>

      <div className="space-y-5">
        <button
          type="button"
          onClick={() => setLeadModalOpen(true)}
          className="group grid w-full grid-cols-[4rem_1fr_4rem] items-center rounded-lg border border-red-200 bg-gradient-to-r from-red-600 via-rose-600 to-orange-500 px-5 py-5 text-center text-gray-950 shadow-lg transition-all hover:shadow-xl dark:text-white"
        >
          <span className="col-start-2">
            <span className="block text-sm font-bold uppercase tracking-wide text-red-700 dark:text-red-100">Fast Entry</span>
            <span className="mt-1 block text-3xl font-black text-gray-950 dark:text-white">New Lead</span>
          </span>
          <span className="col-start-3 flex h-16 w-16 items-center justify-center rounded-lg bg-white/20 text-red-600 transition-transform group-hover:scale-105 dark:text-white">
            <PlusCircle className="h-9 w-9" />
          </span>
        </button>

        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-dark-card">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-black text-gray-950 dark:text-white">
                <Gauge className="h-6 w-6 text-red-600" />
                Live Dashboard
              </h1>
              <p className="mt-1 text-sm font-medium text-gray-500 dark:text-dark-text-secondary">{range.label} | {range.start} to {range.end}</p>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <div className="flex rounded-lg border border-gray-200 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-800">
                {[
                  { id: 'month', label: 'Month' },
                  { id: 'year', label: 'Year' },
                  { id: 'week', label: 'Week' },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setRangeMode(option.id)}
                    className={`rounded-md px-3 py-2 text-sm font-bold transition-colors ${
                      rangeMode === option.id
                        ? 'bg-white text-red-600 shadow-sm dark:bg-dark-card'
                        : 'text-gray-600 hover:text-red-600 dark:text-gray-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {rangeMode === 'month' && (
                <label className="text-xs font-bold uppercase text-gray-500 dark:text-dark-text-secondary">
                  Month
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(event) => setSelectedMonth(event.target.value)}
                    className="mt-1 block rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-dark-card dark:text-dark-text"
                  />
                </label>
              )}

              {rangeMode === 'year' && (
                <label className="text-xs font-bold uppercase text-gray-500 dark:text-dark-text-secondary">
                  Year
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={(event) => setSelectedYear(event.target.value)}
                    className="mt-1 block w-28 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-dark-card dark:text-dark-text"
                  />
                </label>
              )}

              {rangeMode === 'week' && (
                <label className="text-xs font-bold uppercase text-gray-500 dark:text-dark-text-secondary">
                  Week
                  <input
                    type="week"
                    value={selectedWeek}
                    onChange={(event) => setSelectedWeek(event.target.value)}
                    className="mt-1 block rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-dark-card dark:text-dark-text"
                  />
                </label>
              )}

              <button
                type="button"
                onClick={() => setRefreshKey((key) => key + 1)}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-gray-950 px-4 text-sm font-bold text-white hover:bg-gray-800 dark:bg-white dark:text-gray-950"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-dark-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-black text-gray-950 dark:text-white">
                <Activity className="h-5 w-5 text-blue-600" />
                Total Jobs
              </h2>
              <span className="rounded-lg bg-gray-950 px-4 py-2 text-2xl font-black text-white dark:bg-white dark:text-gray-950">{dashboard.totalJobs}</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {jobTiles.map((tile) => (
                <StatTile
                  key={tile.label}
                  {...tile}
                  onClick={() => navigate(tile.path)}
                />
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-dark-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-black text-gray-950 dark:text-white">
                <Handshake className="h-5 w-5 text-emerald-600" />
                Customer Relations
              </h2>
              <span className="rounded-lg bg-emerald-600 px-4 py-2 text-2xl font-black text-white">{dashboard.totalCustomers}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {relationBuckets.map((bucket) => (
                <RelationTile
                  key={bucket.key}
                  bucket={bucket}
                  value={dashboard.relationCounts[bucket.key] || 0}
                  total={dashboard.totalCustomers}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatTile icon={UserPlus} label="Total Leads" value={dashboard.totalLeads} accent="from-orange-600 to-red-500" onClick={() => navigate('/customer?tab=leads')} />
          <StatTile icon={Store} label="Vendors" value={dashboard.vendors} accent="from-lime-600 to-green-500" onClick={() => navigate('/vendors')} />
          <StatTile icon={Users} label="Employee" value={dashboard.labour} accent="from-teal-600 to-cyan-500" onClick={() => navigate('/labour')} />
          <StatTile icon={Package} label="Inventory Items" value={dashboard.inventoryItems} accent="from-purple-600 to-indigo-500" onClick={() => navigate('/inventory')} />
        </section>

      </div>
    </div>
  );
};

export default Dashboard;

import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Download, Search, IndianRupee, X } from 'lucide-react';
import { db } from '@/db/dexie';
import { dbOperations } from '@/lib/db';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';

const currentYear = new Date().getFullYear();

const toAmount = (value) => parseFloat(value || 0) || 0;

const formatAmount = (value) =>
  toAmount(value).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getEntryDate = (entry) => entry.entry_date || entry.date || entry.created_at || '';

const formatDate = (dateValue) => {
  if (!dateValue) return '-';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB');
};

const escapeHtml = (value) =>
  String(value ?? '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getRelationLabel = (yearlyTransaction) => {
  if (yearlyTransaction >= 1000000) return 'High';
  if (yearlyTransaction >= 500000) return 'Very Good';
  if (yearlyTransaction >= 200000) return 'Good';
  if (yearlyTransaction >= 50000) return 'Ok';
  if (yearlyTransaction > 0) return 'Poor';
  return 'Bad';
};

const PAYMENT_MODES = ['Cash', 'Cheque', 'NEFT', 'UPI', 'Bank Transfer', 'Other'];

const SettlementModal = ({ row, onClose, onSuccess }) => {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    date: today,
    amount: '',
    paymentMode: 'Cash',
    remarks: '',
  });
  const [saving, setSaving] = useState(false);

  const netBalance = toAmount(row?.netBalance);
  const enteredAmount = parseFloat(form.amount) || 0;
  const remaining = netBalance - enteredAmount;

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    if (!form.date) {
      toast.error('Please select a date');
      return;
    }

    setSaving(true);
    try {
      const entryId = `settle_${row.id}_${Date.now()}`;
      const description = `Settlement - ${form.paymentMode}${form.remarks ? ` | ${form.remarks}` : ''}`;

      await dbOperations.insert('customer_ledger_entries', {
        id: entryId,
        customer_id: String(row.id),
        entry_date: form.date,
        debit: 0,
        credit: amount,
        type: 'payment',
        reference_type: 'settlement',
        description,
        created_at: new Date().toISOString(),
      });

      if (window.electron?.fs?.writeFile) {
        const updatedLedger = await dbOperations.getAll('customer_ledger_entries');
        await window.electron.fs.writeFile(
          'C:/malwa-crm/Data_base/customer/Ledger.json',
          JSON.stringify(updatedLedger, null, 2)
        );
      }

      toast.success(`Payment of ₹${formatAmount(amount)} recorded for ${row.name}`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Settlement save error:', error);
      toast.error('Failed to save settlement: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-gray-900">

        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-brand-red" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Settlement Payment</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Customer Info ── */}
        <div className="mx-5 mt-4 rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Customer</p>
            <p className="font-bold text-gray-900 dark:text-white">{row.name}</p>
            {row.phone !== '-' && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{row.phone}</p>
            )}
          </div>
          {/* Static Net Balance badge */}
          <div className="shrink-0 text-right">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">Net Balance</p>
            <div className={`rounded-lg px-3 py-1.5 border ${netBalance > 0 ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' : 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'}`}>
              <p className={`text-lg font-extrabold leading-none ${netBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ₹ {formatAmount(Math.abs(netBalance))}
              </p>
              <p className={`text-[10px] font-semibold text-center mt-0.5 ${netBalance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {netBalance > 0 ? 'Debit (Dr)' : 'Credit (Cr)'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Amount Row: Net Balance (static) | Settlement Amount (editable) ── */}
        <div className="mx-5 mt-4 grid grid-cols-2 gap-3">
          {/* Left — static Net Balance */}
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 dark:border-gray-600 dark:bg-gray-800/50">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Outstanding Balance</p>
            <p className={`text-2xl font-extrabold ${netBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ₹ {formatAmount(Math.abs(netBalance))}
            </p>
            <p className="text-[10px] text-gray-400 mt-1 italic">Read-only</p>
          </div>

          {/* Right — editable Settlement Amount */}
          <div className="rounded-xl border-2 border-brand-red bg-red-50 px-4 py-3 dark:bg-red-900/10 dark:border-red-700">
            <p className="text-[10px] uppercase tracking-wider text-brand-red font-semibold mb-1">
              Settlement Amount <span className="text-red-500 not-italic font-bold">*</span>
            </p>
            <div className="flex items-center gap-1">
              <span className="text-xl font-bold text-gray-500">₹</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={handleChange('amount')}
                placeholder="0.00"
                autoFocus
                className="w-full bg-transparent text-2xl font-extrabold text-gray-900 dark:text-white outline-none placeholder:text-gray-300 placeholder:font-normal"
                required
              />
            </div>
            {netBalance > 0 && (
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, amount: netBalance.toFixed(2) }))}
                className="mt-1 text-[10px] text-brand-red hover:underline font-medium"
              >
                Use full balance
              </button>
            )}
          </div>
        </div>

        {/* ── Remaining after settlement ── */}
        {enteredAmount > 0 && (
          <div className="mx-5 mt-2 flex items-center justify-between rounded-lg bg-gray-100 dark:bg-gray-800 px-4 py-2 text-xs">
            <span className="text-gray-500 dark:text-gray-400">Balance after settlement:</span>
            <span className={`font-bold ${remaining > 0 ? 'text-red-600' : remaining < 0 ? 'text-orange-500' : 'text-green-600'}`}>
              ₹ {formatAmount(Math.abs(remaining))}
              {remaining > 0 ? ' (Dr remaining)' : remaining < 0 ? ' (Excess paid)' : ' ✓ Fully settled'}
            </span>
          </div>
        )}

        {/* ── Form fields ── */}
        <form onSubmit={handleSubmit} className="space-y-3 px-5 py-4">
          {/* Date + Mode side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.date}
                onChange={handleChange('date')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Payment Mode
              </label>
              <select
                value={form.paymentMode}
                onChange={handleChange('paymentMode')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                {PAYMENT_MODES.map((mode) => (
                  <option key={mode} value={mode}>{mode}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Remarks / Notes
            </label>
            <textarea
              value={form.remarks}
              onChange={handleChange('remarks')}
              placeholder="Optional note..."
              rows={2}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-brand-red py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Payment'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

const OverallCreditLedgerTab = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [settlementRow, setSettlementRow] = useState(null);

  const customers = useLiveQuery(
    () => db.customers.toArray(),
    []
  ) || [];

  const ledgerEntries = useLiveQuery(
    () => db.customer_ledger_entries.toArray(),
    []
  ) || [];

  const rows = useMemo(() => {
    return customers
      .filter((customer) => customer.type === 'customer' || !customer.type)
      .map((customer) => {
        const entries = ledgerEntries.filter((entry) => String(entry.customer_id) === String(customer.id));
        const debit = entries.reduce((sum, entry) => sum + toAmount(entry.debit), 0);
        const credit = entries.reduce((sum, entry) => sum + toAmount(entry.credit), 0);
        const opening = toAmount(customer.opening_balance);
        const netBalance = opening + debit - credit;
        const yearlyTransaction = entries
          .filter((entry) => {
            const date = new Date(getEntryDate(entry));
            return !Number.isNaN(date.getTime()) && date.getFullYear() === currentYear;
          })
          .reduce((sum, entry) => sum + toAmount(entry.debit), 0);
        const lastTransactionDate = entries.reduce((latest, entry) => {
          const dateText = getEntryDate(entry);
          if (!dateText) return latest;
          return !latest || String(dateText) > String(latest) ? dateText : latest;
        }, '');

        return {
          id: customer.id,
          name: customer.name || '-',
          phone: customer.phone || '-',
          company: customer.company || '-',
          opening,
          debit,
          credit,
          netBalance,
          yearlyTransaction,
          relation: getRelationLabel(yearlyTransaction),
          lastTransactionDate,
        };
      })
      .filter((row) => Math.abs(row.netBalance) > 0.009)
      .sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance));
  }, [customers, ledgerEntries]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return rows;

    return rows.filter((row) =>
      [row.name, row.phone, row.company, row.relation].some((value) =>
        String(value || '').toLowerCase().includes(term)
      )
    );
  }, [rows, searchTerm]);

  const totals = useMemo(() => {
    return filteredRows.reduce(
      (sum, row) => ({
        opening: sum.opening + row.opening,
        debit: sum.debit + row.debit,
        credit: sum.credit + row.credit,
        netBalance: sum.netBalance + row.netBalance,
        yearlyTransaction: sum.yearlyTransaction + row.yearlyTransaction,
      }),
      { opening: 0, debit: 0, credit: 0, netBalance: 0, yearlyTransaction: 0 }
    );
  }, [filteredRows]);

  const handleExportLedger = () => {
    if (filteredRows.length === 0) {
      toast.error('No overall credit ledger data to export');
      return;
    }

    const tableRows = filteredRows.map((row) => `
      <tr>
        <td>${escapeHtml(row.name)}</td>
        <td>${escapeHtml(row.company)}</td>
        <td>${escapeHtml(row.phone)}</td>
        <td>${escapeHtml(formatAmount(row.netBalance))}</td>
        <td>${escapeHtml(formatDate(row.lastTransactionDate))}</td>
      </tr>
    `).join('');

    const excelContent = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            table { border-collapse: collapse; mso-width-source: auto; }
            th, td { border: 1px solid #999; padding: 6px 10px; white-space: nowrap; width: auto; }
            th { font-weight: 700; background: #f2f2f2; }
            td:nth-child(4), th:nth-child(4) { text-align: right; }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Phone</th>
                <th>Net Balance</th>
                <th>Last Date</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `overall_credit_ledger_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Overall credit ledger exported');
  };

  return (
    <>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Opening Balance</p>
            <p className="text-lg font-bold dark:text-dark-text">₹ {formatAmount(totals.opening)}</p>
          </div>
          <div className="rounded border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Debit</p>
            <p className="text-lg font-bold text-red-600">₹ {formatAmount(totals.debit)}</p>
          </div>
          <div className="rounded border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Credit</p>
            <p className="text-lg font-bold text-green-600">₹ {formatAmount(totals.credit)}</p>
          </div>
          <div className="rounded border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Net Balance</p>
            <p className={`text-lg font-bold ${totals.netBalance > 0 ? 'text-red-600' : totals.netBalance < 0 ? 'text-green-600' : 'dark:text-dark-text'}`}>
              ₹ {formatAmount(Math.abs(totals.netBalance))}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2 rounded border border-gray-200 px-3 py-2 dark:border-gray-700">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search customer, phone, company..."
              className="w-full bg-transparent text-sm outline-none dark:text-dark-text"
            />
          </div>
          <Button onClick={handleExportLedger} variant="secondary" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs leading-tight dark:text-dark-text-secondary">
            <thead className="bg-gray-50 text-left dark:bg-gray-700">
              <tr>
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">Company</th>
                <th className="px-2 py-2">Phone</th>
                <th className="px-2 py-2 text-right">Yearly Transaction</th>
                <th className="px-2 py-2">Relation</th>
                <th className="px-2 py-2 text-right">Debit</th>
                <th className="px-2 py-2 text-right">Credit</th>
                <th className="px-2 py-2 text-right">Net Balance</th>
                <th className="px-2 py-2">Last Date</th>
                <th className="px-2 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length > 0 ? filteredRows.map((row) => (
                <tr key={row.id} className="border-b even:bg-gray-50 dark:border-gray-700 dark:even:bg-gray-800/50">
                  <td className="px-2 py-1 font-medium align-middle dark:text-dark-text">{row.name}</td>
                  <td className="px-2 py-1 align-middle">{row.company}</td>
                  <td className="px-2 py-1 align-middle">{row.phone}</td>
                  <td className="px-2 py-1 text-right align-middle">₹ {formatAmount(row.yearlyTransaction)}</td>
                  <td className="px-2 py-1 align-middle">{row.relation}</td>
                  <td className="px-2 py-1 text-right align-middle text-red-600">₹ {formatAmount(row.debit)}</td>
                  <td className="px-2 py-1 text-right align-middle text-green-600">₹ {formatAmount(row.credit)}</td>
                  <td className={`px-2 py-1 text-right align-middle font-semibold ${row.netBalance > 0 ? 'text-red-600' : row.netBalance < 0 ? 'text-green-600' : ''}`}>
                    ₹ {formatAmount(Math.abs(row.netBalance))}
                  </td>
                  <td className="px-2 py-1 align-middle">
                    {formatDate(row.lastTransactionDate)}
                  </td>
                  <td className="px-2 py-1 text-center align-middle">
                    <button
                      onClick={() => setSettlementRow(row)}
                      className="inline-flex items-center gap-1 rounded-md bg-brand-red px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
                    >
                      <IndianRupee className="h-3 w-3" />
                      Settle
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="10" className="p-8 text-center text-gray-500 dark:text-dark-text-secondary">
                    No credit ledger data found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {settlementRow && (
        <SettlementModal
          row={settlementRow}
          onClose={() => setSettlementRow(null)}
          onSuccess={() => setSettlementRow(null)}
        />
      )}
    </>
  );
};

export default OverallCreditLedgerTab;

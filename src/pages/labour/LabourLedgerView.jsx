import { useState, useEffect } from 'react';
import useLabourStore from '@/store/labourStore';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Calendar, FileDown } from 'lucide-react';
import { dbOperations } from '@/lib/db';
import { subscribeToEntities } from '@/utils/dataSync';

const PAYMENT_MODE_LABELS = {
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
};

const normalizePaymentModeValue = (value) => {
  if (value === null || value === undefined) return '';

  const normalized = String(value).trim().toLowerCase();
  if (!normalized || normalized === '0' || normalized === 'null' || normalized === 'undefined' || normalized === '-') {
    return '';
  }

  return normalized;
};

const getPaymentModeLabel = (value) => {
  const normalized = normalizePaymentModeValue(value);
  return normalized ? (PAYMENT_MODE_LABELS[normalized] || normalized.toUpperCase()) : '-';
};

const LabourLedgerView = () => {
  const { labour: employees, fetchLabour } = useLabourStore();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [dateFilter, setDateFilter] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  useEffect(() => {
    fetchLabour();
  }, [fetchLabour]);

  useEffect(() => {
    if (selectedEmployeeId) {
      fetchLedgerEntries();
    }
  }, [selectedEmployeeId, dateFilter]);

  // Auto-refresh when page becomes visible or focused
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && selectedEmployeeId) {
        fetchLedgerEntries();
      }
    };

    const handleFocus = () => {
      if (selectedEmployeeId) {
        fetchLedgerEntries();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [selectedEmployeeId, dateFilter]);

  // Listen for voucher and labour changes from other modules
  useEffect(() => {
    const unsubscribe = subscribeToEntities(
      ['voucher', 'labour_payment', 'labour_attendance'],
      ({ entity, action, data }) => {
        console.log(`[LabourLedgerView] Event received: ${entity} ${action}`, data);
        // Refresh if change affects current employee
        if (data?.labour_id === selectedEmployeeId || data?.payee_id === selectedEmployeeId) {
          console.log(`[LabourLedgerView] ${entity} ${action} detected for current employee, refreshing...`);
          // Immediate refresh
          setTimeout(() => fetchLedgerEntries(), 100);
        }
      }
    );

    return () => unsubscribe();
  }, [selectedEmployeeId]);

  // Add polling for real-time updates every 5 seconds
  useEffect(() => {
    if (!selectedEmployeeId) return;

    const pollInterval = setInterval(() => {
      fetchLedgerEntries();
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [selectedEmployeeId, dateFilter]);

  const fetchLedgerEntries = async () => {
    try {
      const [allEntries, allVouchers] = await Promise.all([
        dbOperations.getAll('labour_ledger_entries'),
        dbOperations.getAll('vouchers'),
      ]);
      const voucherModeMap = {};

      allVouchers.forEach((voucher) => {
        const normalizedMode = normalizePaymentModeValue(voucher.payment_mode);
        if (voucher.id && normalizedMode) {
          voucherModeMap[voucher.id] = normalizedMode;
        }
      });

      const filtered = allEntries
        .filter(e => 
          e.labour_id === selectedEmployeeId &&
          e.entry_date >= dateFilter.from &&
          e.entry_date <= dateFilter.to
        )
        .map((entry) => ({
          ...entry,
          payment_mode:
            normalizePaymentModeValue(entry.payment_mode) ||
            normalizePaymentModeValue(entry.reference_id ? voucherModeMap[entry.reference_id] : ''),
        }))
        .sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date));
      
      setLedgerEntries(filtered);
    } catch (error) {
      console.error('Error fetching ledger entries:', error);
    }
  };

  const calculateRunningBalance = () => {
    let balance = 0;
    return ledgerEntries.map(entry => {
      balance += (parseFloat(entry.credit_amount) || 0) - (parseFloat(entry.debit_amount) || 0);
      return { ...entry, balance };
    });
  };

  const entriesWithBalance = calculateRunningBalance();
  
  const totals = ledgerEntries.reduce((acc, entry) => ({
    debit: acc.debit + (parseFloat(entry.debit_amount) || 0),
    credit: acc.credit + (parseFloat(entry.credit_amount) || 0),
  }), { debit: 0, credit: 0 });

  const finalBalance = totals.credit - totals.debit;

  return (
    <div className="space-y-6">
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 dark:text-dark-text">
              Select Employee *
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full p-2 border rounded-lg bg-transparent dark:border-gray-600 dark:text-dark-text"
            >
              <option value="">-- Choose Employee --</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} {emp.skill_type ? `(${emp.skill_type})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 dark:text-dark-text">
              From Date
            </label>
            <input
              type="date"
              value={dateFilter.from}
              onChange={(e) => setDateFilter({ ...dateFilter, from: e.target.value })}
              className="w-full p-2 border rounded-lg bg-transparent dark:border-gray-600 dark:text-dark-text"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 dark:text-dark-text">
              To Date
            </label>
            <input
              type="date"
              value={dateFilter.to}
              onChange={(e) => setDateFilter({ ...dateFilter, to: e.target.value })}
              className="w-full p-2 border rounded-lg bg-transparent dark:border-gray-600 dark:text-dark-text"
            />
          </div>
        </div>

        {selectedEmployee && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400">Name</p>
                <p className="font-semibold dark:text-dark-text">{selectedEmployee.name}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Phone</p>
                <p className="font-semibold dark:text-dark-text">{selectedEmployee.phone || '-'}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Daily Rate</p>
                <p className="font-semibold dark:text-dark-text">
                  ₹{parseFloat(selectedEmployee.daily_rate || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Balance</p>
                <p className={`font-bold ${finalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{Math.abs(finalBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  {finalBalance < 0 ? ' (Advance)' : ' (Due)'}
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {selectedEmployeeId && (
        <Card>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold dark:text-dark-text">
                Employee Ledger - {selectedEmployee?.name}
              </h3>
              <Button variant="secondary" onClick={() => {}}>
                <FileDown className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-2 py-1 text-left font-semibold dark:text-gray-300">Date</th>
                    <th className="px-2 py-1 text-left font-semibold dark:text-gray-300">Particulars</th>
                    <th className="px-2 py-1 text-left font-semibold dark:text-gray-300">Type</th>
                    <th className="px-2 py-1 text-right font-semibold dark:text-gray-300">Debit (₹)</th>
                    <th className="px-2 py-1 text-right font-semibold dark:text-gray-300">Credit (₹)</th>
                    <th className="px-2 py-1 text-right font-semibold dark:text-gray-300">Balance (₹)</th>
                    <th className="px-2 py-1 text-left font-semibold dark:text-gray-300">Payment Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {entriesWithBalance.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">
                        <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        No ledger entries found for the selected period
                      </td>
                    </tr>
                  ) : (
                    entriesWithBalance.map((entry, idx) => (
                      <tr key={idx} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-2 py-1 dark:text-dark-text">
                          {new Date(entry.entry_date).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-2 py-1 dark:text-dark-text">
                          {entry.particulars}
                          {entry.notes && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 block">
                              {entry.notes}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            entry.entry_type === 'daily_earning' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                            entry.entry_type === 'payment' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                            'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                          }`}>
                            {entry.entry_type === 'daily_earning' ? 'Earning' : 
                             entry.entry_type === 'payment' ? 'Payment' : 'Voucher'}
                          </span>
                        </td>
                        <td className="px-2 py-1 text-right text-green-600 dark:text-green-400 font-semibold">
                          {entry.debit_amount > 0 ? parseFloat(entry.debit_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                        </td>
                        <td className="px-2 py-1 text-right text-red-600 dark:text-red-400 font-semibold">
                          {entry.credit_amount > 0 ? parseFloat(entry.credit_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                        </td>
                        <td className={`px-3 py-2 text-right font-bold ${
                          entry.balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'
                        }`}>
                          {parseFloat(entry.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-1 dark:text-dark-text capitalize">
                          {getPaymentModeLabel(entry.payment_mode)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {entriesWithBalance.length > 0 && (
                  <tfoot className="bg-gray-100 dark:bg-gray-800 font-bold">
                    <tr>
                      <td colSpan="3" className="px-2 py-1 dark:text-dark-text">Total</td>
                      <td className="px-2 py-1 text-right text-green-600 dark:text-green-400">
                        ₹{totals.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-2 py-1 text-right text-red-600 dark:text-red-400">
                        ₹{totals.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className={`px-3 py-2 text-right ${
                        finalBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'
                      }`}>
                        ₹{Math.abs(finalBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </Card>
      )}

      {!selectedEmployeeId && (
        <Card>
          <div className="text-center py-4">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              Select an employee to view their ledger
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default LabourLedgerView;

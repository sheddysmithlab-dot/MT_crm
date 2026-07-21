import { useState, useEffect } from 'react';
import { X, Download, Mail, Plus, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import useLedgerStore from '../../store/ledgerStore';
import { exportLedgerToPDF, exportLedgerToCSV } from '../../utils/ledgerExports';
import { toast } from 'sonner';

const CustomerLedgerDisplay = ({ customer, onClose }) => {
  const {
    entries,
    loadCustomerLedger,
    getCustomerKPIs,
    getAgingBuckets,
    filters,
    setFilters,
    getFilteredEntries,
  } = useLedgerStore();

  const [showFilters, setShowFilters] = useState(false);
  const [showInfoPane, setShowInfoPane] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [kpis, setKpis] = useState(null);
  const [aging, setAging] = useState(null);
  const rowsPerPage = 200;

  useEffect(() => {
    if (customer) {
      loadCustomerLedger(customer.name || customer.customerName);
      setKpis(getCustomerKPIs(customer.name || customer.customerName));
      setAging(getAgingBuckets(customer.name || customer.customerName));
    }
  }, [customer]);

  const filteredEntries = getFilteredEntries();
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const totalPages = Math.ceil(filteredEntries.length / rowsPerPage);

  const periodDebit = filteredEntries.reduce((sum, e) => sum + e.debit, 0);
  const periodCredit = filteredEntries.reduce((sum, e) => sum + e.credit, 0);
  const netAmount = periodDebit - periodCredit;
  const closingBalance = filteredEntries.length > 0 ? filteredEntries[filteredEntries.length - 1].balance : 0;



  const handleExportCSV = () => {
    const path = exportLedgerToCSV(customer, filteredEntries);
    toast.success(`Ledger exported to: ${path}`, {
      action: {
        label: 'Open Folder',
        onClick: () => {
          window.open(`file:///C:/malwa_crm/Exports/Ledger/${customer.name || customer.customerName}/`, '_blank');
        }
      }
    });
  };

  const handleQuickFilter = (days) => {
    const today = new Date();
    const fromDate = new Date();
    fromDate.setDate(today.getDate() - days);
    setFilters({
      ...filters,
      dateFrom: fromDate.toISOString().split('T')[0],
      dateTo: today.toISOString().split('T')[0],
    });
  };

  if (!customer || !kpis || !aging) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">{customer.name || customer.customerName}</h2>
              <div className="grid grid-cols-2 gap-4 text-sm opacity-90">
                <div>
                  <p><strong>Phone:</strong> {customer.phone || 'N/A'}</p>
                  <p><strong>GST:</strong> {customer.gst || 'N/A'}</p>
                </div>
                <div>
                  <p><strong>Address:</strong> {customer.address || 'N/A'}</p>
                  <p><strong>City:</strong> {customer.city || 'N/A'}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <span className="px-3 py-1 bg-green-500 rounded-full text-xs font-semibold">Active</span>
                <span className="px-3 py-1 bg-blue-500 rounded-full text-xs font-semibold">Price Tier A</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => toast.info('Create Invoice - Coming Soon')} className="bg-white text-blue-600 hover:bg-gray-100">
                <Plus size={16} /> Invoice
              </Button>
              <Button onClick={() => toast.info('Create Receipt - Coming Soon')} className="bg-white text-blue-600 hover:bg-gray-100">
                <Plus size={16} /> Receipt
              </Button>
              <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg">
                <X size={24} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-4 p-6 bg-gray-50 dark:bg-gray-900 border-b">
          <Card className="p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Opening Balance</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">₹{kpis.openingBalance.toFixed(2)}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Outstanding</p>
            <p className="text-lg font-bold text-blue-600">₹{kpis.currentOutstanding.toFixed(2)}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Overdue Amount</p>
            <p className="text-lg font-bold text-red-600">₹{kpis.overdueAmount.toFixed(2)}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Last Payment</p>
            <p className="text-lg font-bold text-green-600">₹{kpis.lastPayment.amount.toFixed(2)}</p>
            <p className="text-xs text-gray-500">{kpis.lastPayment.date || 'N/A'}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg. Payment Days</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{kpis.avgPaymentDays}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Credit Utilization</p>
            <p className="text-lg font-bold text-purple-600">{kpis.creditUtilization}%</p>
          </Card>
        </div>

        <div className="p-6 border-b">
          <h3 className="font-bold mb-3">Aging Analysis</h3>
          <div className="grid grid-cols-5 gap-3">
            {Object.entries(aging).map(([bucket, data]) => (
              <Card key={bucket} className="p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{bucket} days</p>
                <p className="text-lg font-bold">₹{data.amount.toFixed(2)}</p>
                <p className="text-xs text-gray-500">{data.count} invoices</p>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600"
                    style={{ width: `${Math.min((data.amount / kpis.currentOutstanding) * 100, 100)}%` }}
                  />
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="p-6 flex-1 overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              <Button onClick={() => handleQuickFilter(30)} variant="outline" size="sm">Last 30 Days</Button>
              <Button onClick={() => handleQuickFilter(90)} variant="outline" size="sm">Last 90 Days</Button>
              <Button onClick={() => handleQuickFilter(365)} variant="outline" size="sm">This Year</Button>
              <Button onClick={() => setFilters({ dateFrom: null, dateTo: null, docType: 'all', status: 'all' })} variant="outline" size="sm">All</Button>
            </div>
            <Button onClick={() => setShowFilters(!showFilters)} variant="outline">
              <Filter size={16} /> Filters {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Button>
          </div>

          {showFilters && (
            <Card className="p-4 mb-4 bg-gray-50 dark:bg-gray-900">
              <div className="grid grid-cols-5 gap-3">
                <input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="border p-2 rounded dark:bg-gray-800 dark:border-gray-700"
                  placeholder="From Date"
                />
                <input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="border p-2 rounded dark:bg-gray-800 dark:border-gray-700"
                  placeholder="To Date"
                />
                <select
                  value={filters.docType}
                  onChange={(e) => setFilters({ ...filters, docType: e.target.value })}
                  className="border p-2 rounded dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="all">All Types</option>
                  <option value="Invoice">Invoice</option>
                  <option value="Receipt">Receipt</option>
                  <option value="Return">Return</option>
                  <option value="Adjustment">Adjustment</option>
                </select>
                <input
                  type="number"
                  value={filters.amountMin || ''}
                  onChange={(e) => setFilters({ ...filters, amountMin: e.target.value })}
                  className="border p-2 rounded dark:bg-gray-800 dark:border-gray-700"
                  placeholder="Min Amount"
                />
                <input
                  type="number"
                  value={filters.amountMax || ''}
                  onChange={(e) => setFilters({ ...filters, amountMax: e.target.value })}
                  className="border p-2 rounded dark:bg-gray-800 dark:border-gray-700"
                  placeholder="Max Amount"
                />
              </div>
            </Card>
          )}

          <div className="flex-1 overflow-auto border rounded-lg">
            <table className="min-w-full">
              <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                <tr>
                  <th className="border p-2 text-left text-sm">Date</th>
                  <th className="border p-2 text-left text-sm">Doc No</th>
                  <th className="border p-2 text-left text-sm">Type</th>
                  <th className="border p-2 text-left text-sm">Reference</th>
                  <th className="border p-2 text-left text-sm">Notes</th>
                  <th className="border p-2 text-right text-sm">Debit (₹)</th>
                  <th className="border p-2 text-right text-sm">Credit (₹)</th>
                  <th className="border p-2 text-right text-sm">Balance (₹)</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEntries.map((entry, idx) => (
                  <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                    <td className="border p-2 text-sm">{entry.date}</td>
                    <td className="border p-2 text-sm font-medium">{entry.docNo}</td>
                    <td className="border p-2 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        entry.docType === 'Invoice' ? 'bg-blue-100 text-blue-800' :
                        entry.docType === 'Receipt' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {entry.docType}
                      </span>
                    </td>
                    <td className="border p-2 text-sm">{entry.reference}</td>
                    <td className="border p-2 text-sm text-gray-500">{entry.notes}</td>
                    <td className="border p-2 text-right text-sm">{entry.debit > 0 ? entry.debit.toFixed(2) : '-'}</td>
                    <td className="border p-2 text-right text-sm text-green-600">{entry.credit > 0 ? entry.credit.toFixed(2) : '-'}</td>
                    <td className={`border p-2 text-right text-sm font-semibold ${entry.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {entry.balance.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <div className="flex gap-6 text-sm font-semibold">
              <span>Period Debit: <span className="text-blue-600">₹{periodDebit.toFixed(2)}</span></span>
              <span>Period Credit: <span className="text-green-600">₹{periodCredit.toFixed(2)}</span></span>
              <span>Net: <span className={netAmount >= 0 ? 'text-blue-600' : 'text-red-600'}>₹{netAmount.toFixed(2)}</span></span>
              <span>Closing Balance: <span className="text-purple-600">₹{closingBalance.toFixed(2)}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                Previous
              </Button>
              <Button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 p-4 border-t flex justify-between items-center">
          <div className="flex gap-2">


            <Button onClick={handleExportCSV} variant="outline">
              <Download size={16} /> Export CSV
            </Button>
            <Button onClick={() => toast.info('Email - Coming Soon')} variant="outline">
              <Mail size={16} /> Email
            </Button>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => toast.info('Create Receipt - Coming Soon')} className="bg-green-600 hover:bg-green-700">
              Create Receipt
            </Button>
            <Button onClick={() => toast.info('Adjust - Coming Soon')} variant="outline">
              Adjust
            </Button>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerLedgerDisplay;

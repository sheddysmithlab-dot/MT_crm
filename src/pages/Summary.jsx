import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/PageHeader';
import { toast } from 'sonner';
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Users,
  Briefcase,
  Receipt,
  Wallet,
  X,
  Filter,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts';
import { dbOperations } from '@/lib/db';

const Summary = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Date Range Filter
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  
  // Financial Summary State
  const [financialData, setFinancialData] = useState({
    totalReceivable: 0,
    totalPayable: 0,
    totalPaid: 0,
    totalReceived: 0,
  });

  // Modal states
  const [showReceivableModal, setShowReceivableModal] = useState(false);
  const [showPayableModal, setShowPayableModal] = useState(false);
  const [showPaidModal, setShowPaidModal] = useState(false);
  const [showReceivedModal, setShowReceivedModal] = useState(false);

  // Detail data for modals
  const [customerLedgerSummary, setCustomerLedgerSummary] = useState([]);
  const [payableSummary, setPayableSummary] = useState({ labour: [], suppliers: [], vendors: [] });
  const [paidSummary, setPaidSummary] = useState({ vouchers: [], bossSalary: 0 });
  const [receivedSummary, setReceivedSummary] = useState([]);

  // Chart data
  const [monthlyData, setMonthlyData] = useState([]);

  useEffect(() => {
    fetchAllFinancialData();
  }, [dateRange]);

  const fetchAllFinancialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchReceivableData(),
        fetchPayableData(),
        fetchPaidData(),
        fetchReceivedData(),
        fetchMonthlyTrend(),
      ]);
    } catch (error) {
      console.error('Error fetching financial data:', error);
      toast.error('Failed to load summary data');
    } finally {
      setLoading(false);
    }
  };

  // 1. Total Receivable Due (Customer Ledger Net Balance)
  const fetchReceivableData = async () => {
    try {
      const customers = await dbOperations.getAll('customers') || [];
      const ledgerEntries = await dbOperations.getAll('customer_ledger_entries') || [];

      const customerBalances = customers.map(customer => {
        const entries = ledgerEntries.filter(e => e.customer_id === customer.id);
        const balance = entries.reduce((sum, entry) => {
          const debit = parseFloat(entry.debit || 0);
          const credit = parseFloat(entry.credit || 0);
          return sum + debit - credit;
        }, 0);

        return {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          balance: balance,
        };
      }).filter(c => c.balance > 0); // Only receivables

      const totalReceivable = customerBalances.reduce((sum, c) => sum + c.balance, 0);
      
      setCustomerLedgerSummary(customerBalances.sort((a, b) => b.balance - a.balance));
      setFinancialData(prev => ({ ...prev, totalReceivable }));
    } catch (error) {
      console.error('Error fetching receivable data:', error);
    }
  };

  // 2. Total Payable (Labour + Supplier + Vendor Net Balance)
  const fetchPayableData = async () => {
    try {
      const [labour, suppliers, vendors, labourLedger, supplierLedger, vendorLedger] = await Promise.all([
        dbOperations.getAll('labour') || [],
        dbOperations.getAll('suppliers') || [],
        dbOperations.getAll('vendors') || [],
        dbOperations.getAll('labour_ledger_entries') || [],
        dbOperations.getAll('supplier_ledger_entries') || [],
        dbOperations.getAll('vendor_ledger_entries') || [],
      ]);

      console.log('📊 Payable Data Loaded:', {
        labour: labour.length,
        suppliers: suppliers.length,
        vendors: vendors.length,
        labourLedger: labourLedger.length,
        supplierLedger: supplierLedger.length,
        vendorLedger: vendorLedger.length,
      });

      // Labour balances
      const labourBalances = labour.map(l => {
        const entries = labourLedger.filter(e => e.labour_id === l.id);
        const balance = entries.reduce((sum, entry) => {
          const debit = parseFloat(entry.debit || 0);
          const credit = parseFloat(entry.credit || 0);
          return sum + credit - debit; // Credit = we owe them
        }, 0);
        return { 
          id: l.id, 
          name: l.name || 'Unknown', 
          phone: l.phone || 'N/A', 
          balance, 
          type: 'Labour' 
        };
      }).filter(l => l.balance > 0);

      // Supplier balances
      const supplierBalances = suppliers.map(s => {
        const entries = supplierLedger.filter(e => e.supplier_id === s.id);
        const balance = entries.reduce((sum, entry) => {
          const debit = parseFloat(entry.debit || 0);
          const credit = parseFloat(entry.credit || 0);
          return sum + credit - debit;
        }, 0);
        return { 
          id: s.id, 
          name: s.name || 'Unknown', 
          phone: s.phone || s.contactPerson || 'N/A', 
          balance, 
          type: 'Supplier' 
        };
      }).filter(s => s.balance > 0);

      // Vendor balances
      const vendorBalances = vendors.map(v => {
        const entries = vendorLedger.filter(e => e.vendor_id === v.id);
        const balance = entries.reduce((sum, entry) => {
          const debit = parseFloat(entry.debit || 0);
          const credit = parseFloat(entry.credit || 0);
          return sum + credit - debit;
        }, 0);
        return { 
          id: v.id, 
          name: v.name || 'Unknown', 
          phone: v.phone || v.contactPerson || 'N/A', 
          balance, 
          type: 'Vendor' 
        };
      }).filter(v => v.balance > 0);

      const totalPayable = 
        labourBalances.reduce((sum, l) => sum + l.balance, 0) +
        supplierBalances.reduce((sum, s) => sum + s.balance, 0) +
        vendorBalances.reduce((sum, v) => sum + v.balance, 0);

      console.log('💰 Payable Balances:', {
        labourCount: labourBalances.length,
        supplierCount: supplierBalances.length,
        vendorCount: vendorBalances.length,
        totalPayable,
        labourBalances,
        supplierBalances,
        vendorBalances,
      });

      setPayableSummary({
        labour: labourBalances.sort((a, b) => b.balance - a.balance),
        suppliers: supplierBalances.sort((a, b) => b.balance - a.balance),
        vendors: vendorBalances.sort((a, b) => b.balance - a.balance),
      });
      setFinancialData(prev => ({ ...prev, totalPayable }));
    } catch (error) {
      console.error('Error fetching payable data:', error);
      toast.error('Failed to load payable data');
    }
  };

  // 3. Total Paid (Vouchers + ₹3300/day boss salary)
  const fetchPaidData = async () => {
    try {
      const vouchers = await dbOperations.getAll('vouchers') || [];
      
      const voucherTotal = vouchers.reduce((sum, v) => sum + parseFloat(v.amount || 0), 0);
      
      // Calculate boss salary: ₹3300/day = ₹100,000/month (approx 30 days)
      const today = new Date();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const currentDay = today.getDate();
      const bossSalary = 3300 * currentDay; // Till current date
      
      const totalPaid = voucherTotal + bossSalary;
      
      setPaidSummary({ 
        vouchers: vouchers.sort((a, b) => new Date(b.voucher_date || b.created_at) - new Date(a.voucher_date || a.created_at)),
        bossSalary: bossSalary,
        dailyRate: 3300,
        daysCalculated: currentDay,
      });
      setFinancialData(prev => ({ ...prev, totalPaid }));
    } catch (error) {
      console.error('Error fetching paid data:', error);
    }
  };

  // 4. Total Received (Cash Receipts)
  const fetchReceivedData = async () => {
    try {
      const cashReceipts = await dbOperations.getAll('cash_receipts') || [];
      
      console.log('💵 Cash Receipts Data:', {
        count: cashReceipts.length,
        receipts: cashReceipts,
      });
      
      const totalReceived = cashReceipts.reduce((sum, r) => {
        const amount = parseFloat(r.amount || 0);
        console.log(`Receipt ${r.receipt_no || r.id}: ₹${amount}`);
        return sum + amount;
      }, 0);
      
      console.log('💰 Total Received:', totalReceived);
      
      setReceivedSummary(cashReceipts.sort((a, b) => new Date(b.receipt_date || b.created_at) - new Date(a.receipt_date || a.created_at)));
      setFinancialData(prev => ({ ...prev, totalReceived }));
    } catch (error) {
      console.error('Error fetching received data:', error);
      toast.error('Failed to load received data');
    }
  };

  // Monthly Revenue & Profit Trend
  const fetchMonthlyTrend = async () => {
    try {
      const [invoices, vouchers, cashReceipts] = await Promise.all([
        dbOperations.getAll('invoices') || [],
        dbOperations.getAll('vouchers') || [],
        dbOperations.getAll('cash_receipts') || [],
      ]);

      // Get last 6 months data
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const month = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear();
        const monthKey = `${month} ${year}`;

        const monthInvoices = invoices.filter(inv => {
          const invDate = new Date(inv.invoice_date || inv.created_at);
          return invDate.getMonth() === date.getMonth() && invDate.getFullYear() === date.getFullYear();
        });

        const monthVouchers = vouchers.filter(v => {
          const vDate = new Date(v.voucher_date || v.created_at);
          return vDate.getMonth() === date.getMonth() && vDate.getFullYear() === date.getFullYear();
        });

        const monthReceipts = cashReceipts.filter(r => {
          const rDate = new Date(r.receipt_date || r.created_at);
          return rDate.getMonth() === date.getMonth() && rDate.getFullYear() === date.getFullYear();
        });

        const revenue = monthInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
        const expenses = monthVouchers.reduce((sum, v) => sum + parseFloat(v.amount || 0), 0) + 100000; // + boss salary
        const received = monthReceipts.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
        const profit = revenue - expenses;

        months.push({
          month: monthKey,
          revenue: Math.round(revenue),
          expenses: Math.round(expenses),
          profit: Math.round(profit),
          received: Math.round(received),
        });
      }

      setMonthlyData(months);
    } catch (error) {
      console.error('Error fetching monthly trend:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading Summary...</div>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      <PageHeader 
        title="Financial Summary" 
        subtitle="Complete overview of your business finances"
      />

      {/* Date Range Filter - Colorful */}
      <Card className="bg-gradient-to-r from-purple-50 via-pink-50 to-orange-50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-orange-900/20 border-purple-200 dark:border-purple-700">
        <div className="p-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="p-1.5 bg-purple-500 rounded-lg">
                <Filter className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Date Range Filter
              </h3>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 ml-auto">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">From:</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="px-2 py-1 text-sm border border-purple-300 dark:border-purple-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-pink-600 dark:text-pink-400" />
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">To:</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="px-2 py-1 text-sm border border-pink-300 dark:border-pink-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <Button
                onClick={fetchAllFinancialData}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Account Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Receivable Due */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700"
          onClick={() => setShowReceivableModal(true)}
        >
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">
              Total Receivable Due
            </h3>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(financialData.totalReceivable)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {customerLedgerSummary.length} customers with pending dues
            </p>
          </div>
        </Card>

        {/* Total Payable */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-700"
          onClick={() => setShowPayableModal(true)}
        >
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-red-500 rounded-lg">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">
              Total Payable
            </h3>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(financialData.totalPayable)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Employee + Suppliers + Vendors
            </p>
          </div>
        </Card>

        {/* Total Paid */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700"
          onClick={() => setShowPaidModal(true)}
        >
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-orange-500 rounded-lg">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <IndianRupee className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">
              Total Paid
            </h3>
            <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
              {formatCurrency(financialData.totalPaid)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Vouchers + Boss Salary (₹3.3K/day)
            </p>
          </div>
        </Card>

        {/* Total Received */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700"
          onClick={() => setShowReceivedModal(true)}
        >
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-green-500 rounded-lg">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">
              Total Received
            </h3>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(financialData.totalReceived)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {receivedSummary.length} cash receipts
            </p>
          </div>
        </Card>
      </div>

      {/* Monthly Revenue & Profit Trend - Stock Market Style */}
      <Card className="p-3">
        <h2 className="text-base font-bold text-gray-900 dark:text-dark-text mb-3">
          Monthly Revenue & Profit Trend
        </h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis 
                dataKey="month" 
                stroke="#9ca3af"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#9ca3af"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                formatter={(value) => formatCurrency(value)}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#3b82f6" 
                fillOpacity={1} 
                fill="url(#colorRevenue)"
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey="profit" 
                stroke="#10b981" 
                fillOpacity={1} 
                fill="url(#colorProfit)"
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey="expenses" 
                stroke="#ef4444" 
                fillOpacity={1} 
                fill="url(#colorExpenses)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 mt-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">Revenue</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">Profit</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">Expenses</span>
          </div>
        </div>
      </Card>

      {/* Customer Ledger Summary Modal */}
      <Modal isOpen={showReceivableModal} onClose={() => setShowReceivableModal(false)} title="Customer Receivables Summary">
        <div className="p-2 max-h-72 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
              <tr>
                <th className="px-2 py-1 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Customer Name</th>
                <th className="px-2 py-1 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Phone</th>
                <th className="px-2 py-1 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Balance Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {customerLedgerSummary.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-2 py-1 text-sm text-gray-900 dark:text-gray-100">{customer.name}</td>
                  <td className="px-2 py-1 text-sm text-gray-600 dark:text-gray-400">{customer.phone || '-'}</td>
                  <td className="px-2 py-1 text-sm font-semibold text-blue-600 dark:text-blue-400 text-right">
                    {formatCurrency(customer.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <td colSpan="2" className="px-2 py-1 text-sm font-bold text-gray-900 dark:text-gray-100">Total</td>
                <td className="px-2 py-1 text-sm font-bold text-blue-600 dark:text-blue-400 text-right">
                  {formatCurrency(financialData.totalReceivable)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Modal>

      {/* Payable Summary Modal */}
      <Modal isOpen={showPayableModal} onClose={() => setShowPayableModal(false)} title="Total Payables Summary">
        <div className="p-2 max-h-72 overflow-y-auto space-y-3">
          {/* Labour */}
          {payableSummary.labour.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Employee</h3>
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th className="px-2 py-1 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Name</th>
                    <th className="px-2 py-1 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {payableSummary.labour.map((item) => (
                    <tr key={item.id}>
                      <td className="px-2 py-1 text-sm text-gray-900 dark:text-gray-100">{item.name}</td>
                      <td className="px-2 py-1 text-sm font-semibold text-red-600 dark:text-red-400 text-right">
                        {formatCurrency(item.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Suppliers */}
          {payableSummary.suppliers.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Suppliers</h3>
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th className="px-2 py-1 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Name</th>
                    <th className="px-2 py-1 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {payableSummary.suppliers.map((item) => (
                    <tr key={item.id}>
                      <td className="px-2 py-1 text-sm text-gray-900 dark:text-gray-100">{item.name}</td>
                      <td className="px-2 py-1 text-sm font-semibold text-red-600 dark:text-red-400 text-right">
                        {formatCurrency(item.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Vendors */}
          {payableSummary.vendors.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Vendors</h3>
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th className="px-2 py-1 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Name</th>
                    <th className="px-2 py-1 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {payableSummary.vendors.map((item) => (
                    <tr key={item.id}>
                      <td className="px-2 py-1 text-sm text-gray-900 dark:text-gray-100">{item.name}</td>
                      <td className="px-2 py-1 text-sm font-semibold text-red-600 dark:text-red-400 text-right">
                        {formatCurrency(item.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">Grand Total</span>
              <span className="text-lg font-bold text-red-600 dark:text-red-400">
                {formatCurrency(financialData.totalPayable)}
              </span>
            </div>
          </div>
        </div>
      </Modal>

      {/* Paid Summary Modal */}
      <Modal isOpen={showPaidModal} onClose={() => setShowPaidModal(false)} title="Total Paid Summary">
        <div className="p-2 max-h-72 overflow-y-auto space-y-2">
          {/* Boss Salary */}
          <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Boss Salary</h3>
            <div className="space-y-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Daily Rate: {formatCurrency(paidSummary.dailyRate)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Days Calculated: {paidSummary.daysCalculated} days (this month)
              </p>
              <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                Total: {formatCurrency(paidSummary.bossSalary)}
              </p>
            </div>
          </div>

          {/* Vouchers */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Vouchers ({paidSummary.vouchers.length})
            </h3>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Date</th>
                    <th className="px-2 py-1 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Payee</th>
                    <th className="px-2 py-1 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paidSummary.vouchers.map((voucher, idx) => (
                    <tr key={idx}>
                      <td className="px-2 py-1 text-sm text-gray-900 dark:text-gray-100">
                        {new Date(voucher.voucher_date || voucher.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-2 py-1 text-sm text-gray-600 dark:text-gray-400">{voucher.payee_name || '-'}</td>
                      <td className="px-2 py-1 text-sm font-semibold text-orange-600 dark:text-orange-400 text-right">
                        {formatCurrency(voucher.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">Grand Total</span>
              <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                {formatCurrency(financialData.totalPaid)}
              </span>
            </div>
          </div>
        </div>
      </Modal>

      {/* Received Summary Modal */}
      <Modal isOpen={showReceivedModal} onClose={() => setShowReceivedModal(false)} title="Cash Receipts Summary">
        <div className="p-2 max-h-72 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
              <tr>
                <th className="px-2 py-1 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Date</th>
                <th className="px-2 py-1 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Customer</th>
                <th className="px-2 py-1 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Mode</th>
                <th className="px-2 py-1 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {receivedSummary.map((receipt, idx) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-2 py-1 text-sm text-gray-900 dark:text-gray-100">
                    {new Date(receipt.receipt_date || receipt.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-2 py-1 text-sm text-gray-600 dark:text-gray-400">{receipt.customer_name || '-'}</td>
                  <td className="px-2 py-1 text-sm text-gray-600 dark:text-gray-400">{receipt.payment_mode || 'Cash'}</td>
                  <td className="px-2 py-1 text-sm font-semibold text-green-600 dark:text-green-400 text-right">
                    {formatCurrency(receipt.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <td colSpan="3" className="px-2 py-1 text-sm font-bold text-gray-900 dark:text-gray-100">Total</td>
                <td className="px-2 py-1 text-sm font-bold text-green-600 dark:text-green-400 text-right">
                  {formatCurrency(financialData.totalReceived)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Modal>
    </div>
  );
};

export default Summary;

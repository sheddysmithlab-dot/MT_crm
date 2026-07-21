import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Trash2, Edit, Filter, Download, Coffee, Droplets, Wrench, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { dbOperations } from '@/lib/db';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

const EXPENSE_CATEGORIES = [
  { id: 'tea', label: 'Tea & Refreshments', icon: Coffee },
  { id: 'water', label: 'Water Supply', icon: Droplets },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'electricity', label: 'Electricity Bill', icon: MoreHorizontal },
  { id: 'rent', label: 'Shop Rent', icon: MoreHorizontal },
  { id: 'salary', label: 'Staff Salary', icon: MoreHorizontal },
  { id: 'transport', label: 'Transportation', icon: MoreHorizontal },
  { id: 'stationary', label: 'Stationary', icon: MoreHorizontal },
  { id: 'other', label: 'Other Expenses', icon: MoreHorizontal },
];

const ExpenseForm = ({ expense, onSave, onCancel }) => {
  const [formData, setFormData] = useState(
    expense || {
      voucher_date: new Date().toISOString().split('T')[0],
      payee_type: 'other',
      payee_name: '', // This will store the category/expense name
      amount: '',
      payment_mode: 'cash',
      particulars: '',
      notes: ''
    }
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.payee_name || !formData.amount) {
      toast.error('Please fill in all required fields');
      return;
    }
    onSave({
      ...formData,
      amount: parseFloat(formData.amount),
      type: 'expense' // Tagging as expense for clarity, though payee_type is 'other'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
          <input
            type="date"
            name="voucher_date"
            value={formData.voucher_date}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expense Category</label>
          <input
            list="expense-categories"
            type="text"
            name="payee_name"
            value={formData.payee_name}
            onChange={handleChange}
            placeholder="Select or type category..."
            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            required
          />
          <datalist id="expense-categories">
            {EXPENSE_CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.label} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (₹)</label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            placeholder="0.00"
            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            required
            min="0"
            step="0.01"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Mode</label>
          <select
            name="payment_mode"
            value={formData.payment_mode}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="cash">Cash</option>
            <option value="online">Online/UPI</option>
            <option value="cheque">Cheque</option>
            <option value="bank">Bank Transfer</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description / Particulars</label>
          <input
            type="text"
            name="particulars"
            value={formData.particulars}
            onChange={handleChange}
            placeholder="Enter details (e.g., Monthly tea bill)"
            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows="2"
            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
          ></textarea>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Expense</Button>
      </div>
    </form>
  );
};

const OtherExpenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [dateRange, setDateRange] = useState({
    from: new Date().toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const allVouchers = await dbOperations.getAll('vouchers');
      // Filter for 'other' payee_type which we use for expenses
      const expenseVouchers = allVouchers.filter(v => v.payee_type === 'other');
      setExpenses(expenseVouchers);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.voucher_date);
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999); // Include the end of the day

      const matchesDate = expenseDate >= fromDate && expenseDate <= toDate;
      
      const matchesCategory = selectedCategory === 'All' || expense.payee_name === selectedCategory;

      const matchesSearch = 
        expense.payee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.particulars?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesDate && matchesCategory && matchesSearch;
    });
  }, [expenses, dateRange, searchTerm, selectedCategory]);

  const totalExpense = useMemo(() => {
    return filteredExpenses.reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0);
  }, [filteredExpenses]);

  const handleSave = async (expenseData) => {
    try {
      if (editingExpense) {
        await dbOperations.update('vouchers', editingExpense.id, expenseData);
        toast.success('Expense updated successfully');
      } else {
        // Generate a simple voucher number if not present (though backend/db might handle this)
        const newExpense = {
          ...expenseData,
          voucher_no: `EXP-${Date.now()}`, // Simple ID generation
          created_at: new Date().toISOString()
        };
        await dbOperations.insert('vouchers', newExpense);
        toast.success('Expense added successfully');
      }
      setShowModal(false);
      setEditingExpense(null);
      fetchExpenses();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('Failed to save expense');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await dbOperations.delete('vouchers', id);
        toast.success('Expense deleted successfully');
        fetchExpenses();
      } catch (error) {
        console.error('Error deleting expense:', error);
        toast.error('Failed to delete expense');
      }
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Other Expenses</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage daily office expenses like Tea, Water, Maintenance etc.</p>
        </div>
        <Button onClick={() => { setEditingExpense(null); setShowModal(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Filters & Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 p-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="All">All Categories</option>
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.label}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">From Date</label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="w-full p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">To Date</label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="w-full p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-100 dark:border-red-900/50">
          <div className="flex items-center justify-between h-full">
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">Total Expenses</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">For selected period</p>
            </div>
            <div className="text-right">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(totalExpense)}</h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Expenses List */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 uppercase text-xs">
              <tr>
                <th className="px-2 py-1">Date</th>
                <th className="px-2 py-1">Category</th>
                <th className="px-2 py-1">Description</th>
                <th className="px-2 py-1">Mode</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-2 py-2 text-center text-gray-500">Loading expenses...</td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-2 py-2 text-center text-gray-500">
                    No expenses found for the selected period.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {new Date(expense.voucher_date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-2 py-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        {expense.payee_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                      {expense.particulars || '-'}
                    </td>
                    <td className="px-6 py-4 capitalize text-gray-500 dark:text-gray-400">
                      {expense.payment_mode}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-2 py-1">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => { setEditingExpense(expense); setShowModal(true); }}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/30 transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(expense.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded dark:hover:bg-red-900/30 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingExpense ? "Edit Expense" : "Add New Expense"}
        maxWidth="max-w-2xl"
      >
        <ExpenseForm
          expense={editingExpense}
          onSave={handleSave}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  );
};

export default OtherExpenses;
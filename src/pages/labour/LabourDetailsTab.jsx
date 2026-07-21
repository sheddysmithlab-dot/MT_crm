import { useState, useEffect, useRef } from 'react';
import useLabourStore from '@/store/labourStore';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { toast } from 'sonner';
import { Edit, Trash2, Download, Search } from 'lucide-react';
import { dbOperations } from '@/lib/db';
import { validatePhoneInput, validateAadhaarInput, handlePaymentFocus, handlePaymentBlur, validateDecimalInput } from '@/utils/inputValidation';

const LabourForm = ({ labour, onSave, onCancel }) => {
  const [formData, setFormData] = useState(
    labour ? {
      ...labour,
      hourly_rate: labour.hourly_rate || (labour.daily_rate / 9),
      daily_rate: String(labour.daily_rate || 0),
      opening_balance: String(labour.opening_balance || 0)
    } : {
      name: '',
      phone: '',
      skill_type: '',
      daily_rate: '0',
      hourly_rate: 0,
      address: '',
      opening_balance: '0',
      aadhaar_number: '',
    }
  );

  const dailyRateRef = useRef(null);
  const openingBalanceRef = useRef(null);

  const handleChange = (e) => {
    let { name, value } = e.target;
    
    // Apply validation based on field type
    switch (name) {
      case 'phone':
        value = validatePhoneInput(value);
        break;
      case 'aadhaar_number':
        value = validateAadhaarInput(value);
        break;
      case 'daily_rate':
      case 'opening_balance':
        value = validateDecimalInput(value);
        break;
    }
    
    // If daily_rate changes, auto-calculate hourly_rate
    if (name === 'daily_rate') {
      const dailyRate = parseFloat(value) || 0;
      const hourlyRate = dailyRate / 9; // Divide by 9 hours
      setFormData({ 
        ...formData, 
        daily_rate: value,
        hourly_rate: hourlyRate
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.daily_rate) {
      toast.error('Name and Rate are required.');
      return;
    }
    if (!formData.skill_type) {
      toast.error('Skill/Trade is required.');
      return;
    }
    
    // Validate phone number if provided
    if (formData.phone && formData.phone.length !== 10) {
      toast.error('Phone number must be exactly 10 digits.');
      return;
    }
    
    // Validate Aadhaar number if provided
    if (formData.aadhaar_number && formData.aadhaar_number.length !== 12) {
      toast.error('Aadhaar number must be exactly 12 digits.');
      return;
    }
    
    // Convert string values back to numbers for saving
    const dailyRateNum = parseFloat(formData.daily_rate) || 0;
    const openingBalanceNum = parseFloat(formData.opening_balance) || 0;
    
    const dataToSave = {
      ...formData,
      daily_rate: dailyRateNum,
      hourly_rate: dailyRateNum / 9, // Calculate hourly rate
      opening_balance: openingBalanceNum
    };
    
    onSave(dataToSave);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
          Name *
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
          Phone
        </label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
          Skill/Trade *
        </label>
        <input
          type="text"
          name="skill_type"
          value={formData.skill_type}
          onChange={handleChange}
          placeholder="e.g., Welder, Painter, Mechanic"
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
          Rate (₹ per day/hr) *
        </label>
        <input
          type="number"
          name="daily_rate"
          value={formData.daily_rate}
          onChange={handleChange}
          step="0.01"
          min="0"
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red focus:border-transparent"
          required
        />
        {formData.daily_rate > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Hourly Rate: ₹{((formData.daily_rate || 0) / 9).toFixed(2)}/hr (9 hours basis)
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
          Address
        </label>
        <textarea
          name="address"
          value={formData.address}
          onChange={handleChange}
          rows="2"
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
          Aadhaar Number
        </label>
        <input
          type="text"
          name="aadhaar_number"
          value={formData.aadhaar_number || ''}
          onChange={handleChange}
          placeholder="12-digit Aadhaar number"
          maxLength="12"
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red focus:border-transparent"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          12-digit Aadhaar identification number
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
          Opening Balance (₹)
        </label>
        <input
          type="number"
          name="opening_balance"
          value={formData.opening_balance || ''}
          onChange={handleChange}
          step="0.01"
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red focus:border-transparent"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Initial balance for this labour (positive = amount owed to labour, negative = advance given)
        </p>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
};

const LabourDetailsTab = () => {
  const { labour: labours, fetchLabour, updateLabour, deleteLabour, loading } = useLabourStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLabour, setEditingLabour] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [labourToDelete, setLabourToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [labourBalances, setLabourBalances] = useState({});

  useEffect(() => {
    fetchLabour();
  }, [fetchLabour]);

  // Fetch and calculate net balance for all labour (same as Weekly Attendance Card Net Balance)
  useEffect(() => {
    const calculateBalances = async () => {
      if (!labours || labours.length === 0) return;
      
      try {
        const [allAttendance, allVouchers] = await Promise.all([
          dbOperations.getAll('labour_attendance'),
          dbOperations.getAll('vouchers')
        ]);
        
        const balances = {};
        
        labours.forEach(labour => {
          // Start with opening balance (positive = we owe them, negative = advance given)
          const openingBalance = parseFloat(labour.opening_balance) || 0;
          
          // Calculate total earnings from attendance (all time)
          const labourAttendance = allAttendance.filter(a => a.labour_id === labour.id);
          const totalEarnings = labourAttendance.reduce((sum, a) => sum + (parseFloat(a.payment_amount) || 0), 0);
          
          // Calculate total payments from vouchers (all time)
          const labourVouchers = allVouchers.filter(v => v.payee_type === 'labour' && v.payee_id === labour.id);
          const totalPayments = labourVouchers.reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0);
          
          // Net Balance = Opening Balance + Total Earnings - Total Payments
          balances[labour.id] = openingBalance + totalEarnings - totalPayments;
        });
        
        setLabourBalances(balances);
      } catch (error) {
        console.error('Error calculating balances:', error);
      }
    };
    
    calculateBalances();
  }, [labours]);

  const handleEdit = (labour) => {
    setEditingLabour(labour);
    setIsModalOpen(true);
  };

  const handleSave = async (labourData) => {
    try {
      await updateLabour({ ...editingLabour, ...labourData });
      toast.success('Employee updated successfully!');
      setIsModalOpen(false);
      setEditingLabour(null);
    } catch (error) {
      toast.error('Failed to update employee');
    }
  };

  const handleDelete = (labour) => {
    setLabourToDelete(labour);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteLabour(labourToDelete.id);
      toast.success(`Employee "${labourToDelete.name}" deleted successfully.`);
      setIsDeleteModalOpen(false);
      setLabourToDelete(null);
    } catch (error) {
      toast.error('Failed to delete employee');
    }
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Phone', 'Skill/Trade', 'Daily Rate', 'Current Balance'];
    const csvContent = [
      headers.join(','),
      ...filteredLabours.map((l) =>
        [
          l.name,
          l.phone || '',
          l.skill_type || '',
          l.daily_rate || 0,
          l.current_balance || 0,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employee_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Employee list exported to CSV');
  };



  const filteredLabours = (labours || []).filter(
    (l) =>
      l.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.phone?.includes(searchTerm) ||
      l.skill_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red"></div>
          <span className="ml-3 text-gray-600 dark:text-dark-text-secondary">Loading employee records...</span>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Edit Employee">
        <LabourForm
          labour={editingLabour}
          onSave={handleSave}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Employee"
        message={`Are you sure you want to delete "${labourToDelete?.name}"? This action cannot be undone.`}
      />

      <Card>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, phone, or skill..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red focus:border-transparent"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="secondary" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>

          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-left">
              <tr>
                <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300">Name</th>
                <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300">Phone</th>
                <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300">Aadhaar</th>
                <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300">Skill/Role</th>
                <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300 text-right">Rate (₹)</th>
                <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300 text-right">Net Balance</th>
                <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLabours.length > 0 ? (
                filteredLabours.map((l) => {
                  const netBalance = labourBalances[l.id] || 0;
                  return (
                  <tr
                    key={l.id}
                    className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="py-1 px-2 font-medium text-gray-900 dark:text-dark-text">{l.name}</td>
                    <td className="py-1 px-2 text-gray-700 dark:text-dark-text-secondary">{l.phone || '-'}</td>
                    <td className="py-1 px-2 text-gray-700 dark:text-dark-text-secondary">
                      {l.aadhaar_number ? (
                        <span className="font-mono text-sm">
                          {l.aadhaar_number.slice(0, 4)} {l.aadhaar_number.slice(4, 8)} {l.aadhaar_number.slice(8)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="py-1 px-2 text-gray-700 dark:text-dark-text-secondary">{l.skill_type || '-'}</td>
                    <td className="py-1 px-2 text-right text-gray-900 dark:text-dark-text font-medium">
                      ₹{parseFloat(l.daily_rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      <span className="text-xs text-gray-500 dark:text-gray-400 block">
                        (₹{((l.daily_rate || 0) / 9).toFixed(2)}/hr)
                      </span>
                    </td>
                    <td className="py-1 px-2 text-right">
                      <div className="flex flex-col items-end">
                        <span
                          className={`font-medium ${
                            netBalance > 0
                              ? 'text-red-600 dark:text-red-400'
                              : netBalance < 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          ₹{Math.abs(netBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {netBalance > 0 ? 'To Pay' : netBalance < 0 ? 'Advance' : 'Clear'}
                        </span>
                      </div>
                    </td>
                    <td className="py-1 px-2 text-right">
                      <div className="flex justify-end items-center space-x-2">
                        <Button variant="ghost" className="p-2 h-auto" onClick={() => handleEdit(l)}>
                          <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </Button>
                        <Button variant="ghost" className="p-2 h-auto" onClick={() => handleDelete(l)}>
                          <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-4">
                    <div className="flex flex-col items-center text-gray-500 dark:text-dark-text-secondary">
                      <p className="text-lg font-medium">No labour records found</p>
                      <p className="text-sm mt-1">
                        {searchTerm ? 'Try adjusting your search terms' : 'Add your first labour record to get started'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredLabours.length > 0 && (
          <div className="mt-4 text-sm text-gray-600 dark:text-dark-text-secondary">
            Showing {filteredLabours.length} of {labours.length} employee record(s)
          </div>
        )}
      </Card>
    </div>
  );
};

export default LabourDetailsTab;

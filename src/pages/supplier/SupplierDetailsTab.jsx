import { useState, useEffect } from 'react';
import useSupplierStore from '@/store/supplierStore';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { toast } from 'sonner';
import { Edit, Trash2, Download, Search } from 'lucide-react';
import { dbOperations } from '@/lib/db';

const SupplierForm = ({ supplier, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    company: '',
    address: '',
    gstin: '',
    supplier_type: '',
    credit_limit: 0,
    opening_balance: 0,
  });

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        phone: supplier.phone || '',
        company: supplier.company || '',
        address: supplier.address || '',
        gstin: supplier.gstin || '',
        supplier_type: supplier.supplier_type || '',
        credit_limit: supplier.credit_limit || 0,
        opening_balance: supplier.opening_balance || 0,
      });
    }
  }, [supplier]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast.error('Name and Phone are required.');
      return;
    }
    onSave(formData);
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
          Phone *
        </label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
          Company
        </label>
        <input
          type="text"
          name="company"
          value={formData.company}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
          Supplier Type
        </label>
        <input
          type="text"
          name="supplier_type"
          value={formData.supplier_type}
          onChange={handleChange}
          placeholder="e.g., Parts Dealer, Painting"
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red focus:border-transparent"
        />
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
          GSTIN
        </label>
        <input
          type="text"
          name="gstin"
          value={formData.gstin}
          onChange={handleChange}
          maxLength="15"
          placeholder="15 characters"
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
          Credit Limit (₹)
        </label>
        <input
          type="number"
          name="credit_limit"
          value={formData.credit_limit}
          onChange={handleChange}
          step="0.01"
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
          Opening Balance (₹)
        </label>
        <input
          type="number"
          name="opening_balance"
          value={formData.opening_balance}
          onChange={handleChange}
          step="0.01"
          placeholder="Enter opening balance"
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red focus:border-transparent"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Positive for amount owed to Supplier, Negative for advance paid
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

const SupplierDetailsTab = () => {
  const { suppliers, fetchSuppliers, updateSupplier, deleteSupplier, loading } = useSupplierStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, seteditingSupplier] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [supplierToDelete, setsupplierToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierBalances, setsupplierBalances] = useState({});

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // Calculate net balance for all suppliers
  useEffect(() => {
    const calculateBalances = async () => {
      if (!suppliers || suppliers.length === 0) return;
      
      try {
        const [allLedger, allVouchers] = await Promise.all([
          dbOperations.getAll('supplier_ledger_entries'),
          dbOperations.getAll('vouchers')
        ]);
        
        const balances = {};
        
        suppliers.forEach(supplier => {
          // Get opening balance
          const openingBalance = parseFloat(supplier.opening_balance || 0);
          
          // Calculate from ledger entries
          const supplierLedger = allLedger.filter(e => e.supplier_id === supplier.id);
          const totalDebit = supplierLedger.reduce((sum, e) => sum + (parseFloat(e.debit_amount) || 0), 0);
          const totalCredit = supplierLedger.reduce((sum, e) => sum + (parseFloat(e.credit_amount) || 0), 0);
          
          // Net Balance = Opening Balance + (Credit - Debit) from ledger
          balances[supplier.id] = openingBalance + (totalCredit - totalDebit);
        });
        
        setsupplierBalances(balances);
      } catch (error) {
        console.error('Error calculating balances:', error);
      }
    };
    
    calculateBalances();
  }, [suppliers]);

  const handleEdit = (supplier) => {
    seteditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleSave = async (supplierData) => {
    try {
      await updateSupplier({ ...editingSupplier, ...supplierData });
      toast.success('Supplier updated successfully!');
      setIsModalOpen(false);
      seteditingSupplier(null);
    } catch (error) {
      toast.error('Failed to update Supplier');
    }
  };

  const handleDelete = (Supplier) => {
    setsupplierToDelete(Supplier);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteSupplier(supplierToDelete.id);
      toast.success(`Supplier "${supplierToDelete.name}" deleted successfully.`);
      setIsDeleteModalOpen(false);
      setsupplierToDelete(null);
    } catch (error) {
      toast.error('Failed to delete Supplier');
    }
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Phone', 'Company', 'Supplier Type', 'GSTIN', 'Current Balance', 'Credit Limit'];
    const csvContent = [
      headers.join(','),
      ...filteredSuppliers.map((v) =>
        [
          v.name,
          v.phone,
          v.company || '',
          v.supplier_type || '',
          v.gstin || '',
          v.current_balance || 0,
          v.credit_limit || 0,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Suppliers_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Suppliers exported to CSV');
  };



  const filteredSuppliers = suppliers.filter(
    (v) =>
      v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.phone?.includes(searchTerm) ||
      v.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.supplier_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red"></div>
          <span className="ml-3 text-gray-600 dark:text-dark-text-secondary">Loading Suppliers...</span>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Edit Supplier">
        <SupplierForm
          supplier={editingSupplier}
          onSave={handleSave}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Supplier"
        message={`Are you sure you want to delete "${supplierToDelete?.name}"? This action cannot be undone.`}
      />

      <Card>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search Suppliers..."
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
                <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300">Company</th>
                <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300">Type</th>
                <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300 text-right">Balance</th>
                <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.length > 0 ? (
                filteredSuppliers.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="py-1 px-2 font-medium text-gray-900 dark:text-dark-text">{v.name}</td>
                    <td className="py-1 px-2 text-gray-700 dark:text-dark-text-secondary">{v.phone}</td>
                    <td className="py-1 px-2 text-gray-700 dark:text-dark-text-secondary">{v.company || '-'}</td>
                    <td className="py-1 px-2 text-gray-700 dark:text-dark-text-secondary">{v.supplier_type || '-'}</td>
                    <td className="py-1 px-2 text-right">
                      <span
                        className={`font-medium ${
                          (supplierBalances[v.id] || 0) > 0
                            ? 'text-red-600 dark:text-red-400'
                            : (supplierBalances[v.id] || 0) < 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        ₹{Math.abs(supplierBalances[v.id] || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-1 px-2 text-right">
                      <div className="flex justify-end items-center space-x-2">
                        <Button variant="ghost" className="p-2 h-auto" onClick={() => handleEdit(v)}>
                          <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </Button>
                        <Button variant="ghost" className="p-2 h-auto" onClick={() => handleDelete(v)}>
                          <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    <div className="flex flex-col items-center text-gray-500 dark:text-dark-text-secondary">
                      <p className="text-lg font-medium">No Suppliers found</p>
                      <p className="text-sm mt-1">
                        {searchTerm ? 'Try adjusting your search terms' : 'Add your first Supplier to get started'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredSuppliers.length > 0 && (
          <div className="mt-4 text-sm text-gray-600 dark:text-dark-text-secondary">
            Showing {filteredSuppliers.length} of {suppliers.length} Supplier(s)
          </div>
        )}
      </Card>
    </div>
  );
};

export default SupplierDetailsTab;


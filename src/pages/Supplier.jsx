import { useState, useEffect, useRef } from 'react';
import TabbedPage from '@/components/TabbedPage';
import SupplierDetailsTab from './supplier/SupplierDetailsTab';
import SupplierLedgerTab from './supplier/SupplierLedgerTab';
import useSupplierStore from '@/store/supplierStore';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';
import { PlusCircle } from 'lucide-react';
import { validatePhoneInput, validateGSTInput, handlePaymentFocus, handlePaymentBlur, validateDecimalInput } from '@/utils/inputValidation';

const SupplierForm = ({ supplier, onSave, onCancel }) => {
  const [formData, setFormData] = useState(
    supplier || {
      name: '',
      phone: '',
      company: '',
      address: '',
      gstin: '',
      supplier_type: '',
      opening_balance: '',
      credit_limit: '',
    }
  );

  const openingBalanceRef = useRef(null);
  const creditLimitRef = useRef(null);

  const handleChange = (e) => {
    let { name, value } = e.target;
    
    // Apply validation based on field type
    switch (name) {
      case 'phone':
        value = validatePhoneInput(value);
        break;
      case 'gstin':
        value = validateGSTInput(value);
        break;
      case 'opening_balance':
      case 'credit_limit':
        value = validateDecimalInput(value);
        break;
    }
    
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast.error('Name and Phone are required.');
      return;
    }
    
    // Validate phone number length
    if (formData.phone && formData.phone.length !== 10) {
      toast.error('Phone number must be exactly 10 digits.');
      return;
    }
    
    // Convert string values back to numbers for saving
    const dataToSave = {
      ...formData,
      opening_balance: parseFloat(formData.opening_balance) || 0,
      credit_limit: parseFloat(formData.credit_limit) || 0
    };
    
    try {
      await onSave(dataToSave);
    } catch (error) {
      toast.error('Failed to save supplier');
    }
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
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red focus:border-transparent transition-colors"
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
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red focus:border-transparent transition-colors"
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
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red focus:border-transparent transition-colors"
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
          placeholder="e.g., Hardware, Steel, Paints"
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red focus:border-transparent transition-colors"
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
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red focus:border-transparent transition-colors"
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
          placeholder="15 characters"
          maxLength="15"
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red focus:border-transparent transition-colors"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
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
            className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red focus:border-transparent transition-colors"
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
            className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red focus:border-transparent transition-colors"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {supplier ? 'Update Supplier' : 'Add Supplier'}
        </Button>
      </div>
    </form>
  );
};

const tabs = [
  { id: 'details', label: 'Supplier Details', component: SupplierDetailsTab },
  { id: 'ledger', label: 'Supplier Ledger', component: SupplierLedgerTab },
];

const Supplier = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addSupplier, fetchSuppliers } = useSupplierStore();

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleSave = async (supplierData) => {
    try {
      await addSupplier(supplierData);
      toast.success('Supplier added successfully!');
      setIsModalOpen(false);
    } catch (error) {
      toast.error('Failed to add supplier');
      console.error('Error adding supplier:', error);
    }
  };

  const headerActions = (
    <Button onClick={() => setIsModalOpen(true)}>
      <PlusCircle className="h-4 w-4 mr-2" />
      Add Supplier
    </Button>
  );

  return (
    <>
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Supplier"
      >
        <SupplierForm onSave={handleSave} onCancel={() => setIsModalOpen(false)} />
      </Modal>

      <TabbedPage
        tabs={tabs}
        title="Supplier Management"
        headerActions={headerActions}
      />
    </>
  );
};

export default Supplier;

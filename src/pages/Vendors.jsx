import { useState, useEffect, useRef } from 'react';
import TabbedPage from '@/components/TabbedPage';
import VendorDetailsTab from './vendors/VendorDetailsTab';
import VendorLedgerTab from './vendors/VendorLedgerTab';
import useVendorStore from '@/store/vendorStore';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';
import { PlusCircle } from 'lucide-react';
import { validatePhoneInput, validateGSTInput, handlePaymentFocus, handlePaymentBlur, validateDecimalInput } from '@/utils/inputValidation';

const VendorForm = ({ vendor, onSave, onCancel }) => {
  const [formData, setFormData] = useState(
    vendor || {
      name: '',
      phone: '',
      company: '',
      address: '',
      gstin: '',
      vendor_type: '',
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
      toast.error('Failed to save vendor');
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
          Phone * (10 digits only)
        </label>
        <input
          type="text"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="Enter 10-digit phone number"
          maxLength="10"
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red focus:border-transparent transition-colors"
          required
        />
        {formData.phone && formData.phone.length !== 10 && (
          <p className="text-xs text-red-500 mt-1">Phone number must be exactly 10 digits</p>
        )}
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
          Vendor Type
        </label>
        <input
          type="text"
          name="vendor_type"
          value={formData.vendor_type}
          onChange={handleChange}
          placeholder="e.g., Parts Dealer, Painting Specialist"
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
          GSTIN (15 alphanumeric characters)
        </label>
        <input
          type="text"
          name="gstin"
          value={formData.gstin}
          onChange={handleChange}
          placeholder="Enter 15-character GST number"
          maxLength="15"
          style={{ textTransform: 'uppercase' }}
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red focus:border-transparent transition-colors"
        />
        {formData.gstin && formData.gstin.length !== 15 && formData.gstin.length > 0 && (
          <p className="text-xs text-red-500 mt-1">GST number must be exactly 15 characters</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
            Opening Balance (₹)
          </label>
          <input
            ref={openingBalanceRef}
            type="text"
            name="opening_balance"
            value={formData.opening_balance}
            onChange={handleChange}
            onFocus={() => handlePaymentFocus(openingBalanceRef)}
            onBlur={() => handlePaymentBlur(openingBalanceRef)}
            placeholder="0"
            className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red focus:border-transparent transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
            Credit Limit (₹)
          </label>
          <input
            ref={creditLimitRef}
            type="text"
            name="credit_limit"
            value={formData.credit_limit}
            onChange={handleChange}
            onFocus={() => handlePaymentFocus(creditLimitRef)}
            onBlur={() => handlePaymentBlur(creditLimitRef)}
            placeholder="0"
            className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red focus:border-transparent transition-colors"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {vendor ? 'Update Vendor' : 'Add Vendor'}
        </Button>
      </div>
    </form>
  );
};

const tabs = [
  { id: 'details', label: 'Vendor Details', component: VendorDetailsTab },
  { id: 'ledger', label: 'Vendor Ledger', component: VendorLedgerTab },
];

const Vendors = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addVendor, fetchVendors } = useVendorStore();

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const handleSave = async (vendorData) => {
    try {
      await addVendor(vendorData);
      toast.success('Vendor added successfully!');
      setIsModalOpen(false);
    } catch (error) {
      toast.error('Failed to add vendor');
      console.error('Error adding vendor:', error);
    }
  };

  const headerActions = (
    <Button onClick={() => setIsModalOpen(true)}>
      <PlusCircle className="h-4 w-4 mr-2" />
      Add Vendor
    </Button>
  );

  return (
    <>
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Vendor"
      >
        <VendorForm onSave={handleSave} onCancel={() => setIsModalOpen(false)} />
      </Modal>

      <TabbedPage
        tabs={tabs}
        title="Vendor Management"
        headerActions={headerActions}
      />
    </>
  );
};

export default Vendors;

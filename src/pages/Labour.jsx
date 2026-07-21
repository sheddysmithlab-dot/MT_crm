import { useState, useEffect, useRef } from 'react';
import TabbedPage from '@/components/TabbedPage';
import LabourDetailsTab from './labour/LabourDetailsTab';
import LabourLedgerTab from './labour/LabourLedgerTab';
import LabourLedgerView from './labour/LabourLedgerView';
import useLabourStore from '@/store/labourStore';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';
import { PlusCircle } from 'lucide-react';
import { validatePhoneInput, validateAadhaarInput, handlePaymentFocus, handlePaymentBlur, validateDecimalInput } from '@/utils/inputValidation';

const LabourForm = ({ labour, onSave, onCancel }) => {
  const [formData, setFormData] = useState(
    labour || {
      name: '',
      phone: '',
      address: '',
      aadhaar_number: '',
      skill_type: '',
      hourly_rate: 0,
      daily_rate: '',
    }
  );

  const dailyRateRef = useRef(null);

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
        value = validateDecimalInput(value);
        break;
    }
    
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Employee name is required.');
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
    if (!dailyRateNum) {
      toast.error('Daily rate is required.');
      return;
    }
    
    const dataToSave = {
      ...formData,
      daily_rate: dailyRateNum,
      hourly_rate: dailyRateNum / 9 // Calculate hourly rate
    };
    
    try {
      await onSave(dataToSave);
    } catch (error) {
      toast.error('Failed to save employee');
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
          Phone (10 digits only)
        </label>
        <input
          type="text"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="Enter 10-digit phone number"
          maxLength="10"
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red focus:border-transparent transition-colors"
        />
        {formData.phone && formData.phone.length !== 10 && (
          <p className="text-xs text-red-500 mt-1">Phone number must be exactly 10 digits</p>
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
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red focus:border-transparent transition-colors"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
          Aadhaar Number (12 digits only)
        </label>
        <input
          type="text"
          name="aadhaar_number"
          value={formData.aadhaar_number}
          onChange={handleChange}
          placeholder="Enter 12-digit Aadhaar number"
          maxLength="12"
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red focus:border-transparent transition-colors"
        />
        {formData.aadhaar_number && formData.aadhaar_number.length !== 12 && (
          <p className="text-xs text-red-500 mt-1">Aadhaar number must be exactly 12 digits</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
          Skill/Trade
        </label>
        <input
          type="text"
          name="skill_type"
          value={formData.skill_type}
          onChange={handleChange}
          placeholder="e.g., Welder, Painter, Mechanic"
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red focus:border-transparent transition-colors"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
            Hourly Rate (₹/hr) - Auto Calculated
          </label>
          <input
            type="text"
            name="hourly_rate"
            value={`₹${((parseFloat(formData.daily_rate) || 0) / 9).toFixed(2)}/hr`}
            readOnly
            className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-dark-text cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">Calculated based on 9-hour work day</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
            Daily Rate (₹/day) *
          </label>
          <input
            ref={dailyRateRef}
            type="text"
            name="daily_rate"
            value={formData.daily_rate}
            onChange={handleChange}
            onFocus={() => handlePaymentFocus(dailyRateRef)}
            onBlur={() => handlePaymentBlur(dailyRateRef)}
            placeholder="0"
            className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red focus:border-transparent transition-colors"
          />
        </div>
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

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {labour ? 'Update Employee' : 'Add Employee'}
        </Button>
      </div>
    </form>
  );
};

const tabs = [
  { id: 'details', label: 'Employee Details', component: LabourDetailsTab },
  { id: 'attendance', label: 'Weekly Attendance Card', component: LabourLedgerTab },
];

const Labour = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addLabour, fetchLabour } = useLabourStore();

  useEffect(() => {
    fetchLabour();
  }, [fetchLabour]);

  const handleSave = async (labourData) => {
    try {
      await addLabour(labourData);
      toast.success('Employee added successfully!');
      setIsModalOpen(false);
    } catch (error) {
      toast.error('Failed to add employee');
      console.error('Error adding employee:', error);
    }
  };

  const headerActions = (
    <Button onClick={() => setIsModalOpen(true)}>
      <PlusCircle className="h-4 w-4 mr-2" />
      Add Employee
    </Button>
  );

  return (
    <>
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Employee"
      >
        <LabourForm onSave={handleSave} onCancel={() => setIsModalOpen(false)} />
      </Modal>

      <TabbedPage
        tabs={tabs}
        title="Employee Management"
        headerActions={headerActions}
      />
    </>
  );
};

export default Labour;

import { useState, useEffect, useRef } from 'react';
import TabbedPage from '@/components/TabbedPage';
import CustomerDetailsTab from './customer/CustomerDetailsTab';
import CustomerLedgerTab from './customer/CustomerLedgerTab';
import LeadsTab from './customer/LeadsTab';
import OverallCreditLedgerTab from './customer/OverallCreditLedgerTab';
import Button from '@/components/ui/Button';
import { PlusCircle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import useCustomerStore from '@/store/customerStore';
import { toast } from 'sonner';
import { validatePhoneInput, validateGSTInput, handlePaymentFocus, handlePaymentBlur, validateDecimalInput, validateVehicleInput } from '@/utils/inputValidation';

const CustomerForm = ({ onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '',
        company: '',
        phone: '',
        address: '',
        gstin: '',
        credit_limit: '0',
        credit_days: 30,
        opening_balance: '0',
        vehicles: []
    });
    const [vehicleInput, setVehicleInput] = useState('');

    const creditLimitRef = useRef(null);
    const openingBalanceRef = useRef(null);

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
            case 'credit_limit':
            case 'opening_balance':
                value = validateDecimalInput(value);
                break;
        }
        
        setFormData({...formData, [name]: value});
    };

    const handleAddVehicle = () => {
        if (vehicleInput.trim()) {
            setFormData(prev => ({
                ...prev,
                vehicles: [...(prev.vehicles || []), vehicleInput.trim()]
            }));
            setVehicleInput('');
        }
    };
    
    const handleVehicleInputChange = (e) => {
        const validatedValue = validateVehicleInput(e.target.value);
        setVehicleInput(validatedValue);
    };
    
    const handleVehicleKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddVehicle();
        }
    };

    const handleRemoveVehicle = (index) => {
        setFormData(prev => ({
            ...prev,
            vehicles: prev.vehicles.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if(!formData.name || !formData.phone) return toast.error("Name and Phone are required.");
        
        // Validate phone number length
        if(formData.phone && formData.phone.length !== 10) {
            return toast.error("Phone number must be exactly 10 digits.");
        }
        
        // Convert string values back to numbers for saving
        const dataToSave = {
            ...formData,
            credit_limit: parseFloat(formData.credit_limit) || 0,
            opening_balance: parseFloat(formData.opening_balance) || 0,
            credit_days: parseInt(formData.credit_days) || 30
        };
        
        console.log('📋 Customer form data being submitted:', dataToSave);
        onSave(dataToSave);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium mb-1 dark:text-dark-text">Name *</label>
                <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-lg bg-transparent dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1 dark:text-dark-text">Company</label>
                <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-lg bg-transparent dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1 dark:text-dark-text">Phone *</label>
                <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-lg bg-transparent dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1 dark:text-dark-text">Address</label>
                <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows="2"
                    className="w-full p-2 border rounded-lg bg-transparent dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1 dark:text-dark-text">GSTIN</label>
                <input
                    type="text"
                    name="gstin"
                    value={formData.gstin}
                    onChange={handleChange}
                    placeholder="15 character GST number"
                    maxLength="15"
                    className="w-full p-2 border rounded-lg bg-transparent dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-dark-text">Opening Balance (₹)</label>
                    <input
                        type="text"
                        name="opening_balance"
                        value={formData.opening_balance}
                        onChange={handleChange}
                        onFocus={(e) => handlePaymentFocus(e, openingBalanceRef)}
                        onBlur={(e) => handlePaymentBlur(e, openingBalanceRef)}
                        ref={openingBalanceRef}
                        className="w-full p-2 border rounded-lg bg-transparent dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                    />
                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
                        Enter positive value if customer owes you money
                    </p>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-dark-text">Vehicle Number</label>
                    <input 
                        type="text" 
                        value={vehicleInput} 
                        onChange={handleVehicleInputChange}
                        onKeyPress={handleVehicleKeyPress}
                        placeholder="Vehicle Number"
                        className="w-full p-2 border rounded-lg bg-transparent dark:border-gray-600 focus:ring-2 focus:ring-brand-red dark:text-dark-text" 
                    />
                </div>
            </div>
            
            {formData.vehicles && formData.vehicles.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                    {formData.vehicles.map((vehicle, index) => (
                        <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm">
                            {vehicle}
                            <button type="button" onClick={() => handleRemoveVehicle(index)} className="hover:text-red-600">×</button>
                        </span>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-dark-text">Credit Limit (₹)</label>
                    <input
                        type="number"
                        name="credit_limit"
                        value={formData.credit_limit}
                        onChange={handleChange}
                        min="0"
                        step="1"
                        className="w-full p-2 border rounded-lg bg-transparent dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-dark-text">Credit Days</label>
                    <input
                        type="number"
                        name="credit_days"
                        value={formData.credit_days}
                        onChange={handleChange}
                        min="0"
                        step="1"
                        className="w-full p-2 border rounded-lg bg-transparent dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                    />
                </div>
            </div>



            <div className="flex justify-end space-x-2 pt-4 border-t dark:border-gray-700">
                <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
                <Button type="submit">Save Customer</Button>
            </div>
        </form>
    );
};

const tabs = [
  { id: 'details', label: 'Customer Details', component: CustomerDetailsTab },
  { id: 'leads', label: 'Leads', component: LeadsTab },
  { id: 'ledger', label: 'Customer Ledger', component: CustomerLedgerTab },
  { id: 'overall-credit-ledger', label: 'Overall Credit Ledger', component: OverallCreditLedgerTab },
];

const Customer = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { addCustomer, fetchCustomers } = useCustomerStore();

    useEffect(() => {
        fetchCustomers();
    }, []);

    const handleSave = async (data) => {
        try {
            console.log('💾 Main Customer component receiving data:', data);
            const result = await addCustomer(data);
            console.log('✅ Customer add result:', result);
            toast.success("New customer added successfully!");
            setIsModalOpen(false);
        } catch (error) {
            console.error('❌ Customer add error:', error);
            toast.error("Failed to add customer: " + error.message);
        }
    };
    const headerActions = (
        <Button onClick={() => setIsModalOpen(true)}><PlusCircle className="h-4 w-4 mr-2" />Add Customer</Button>
    );

    return (
        <>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Customer">
                <CustomerForm onSave={handleSave} onCancel={() => setIsModalOpen(false)} />
            </Modal>
            <TabbedPage tabs={tabs} title="Customer Management" headerActions={headerActions} />
        </>
    );
};
export default Customer;




// // src/store/customerStore.js
// import { create } from 'zustand';
// import { persist } from 'zustand/middleware';
// import { v4 as uuidv4 } from 'uuid';

// const useCustomerStore = create(
//   persist(
//     (set, get) => ({ // Add 'get' here to read state inside actions
//       customers: [],
//       addCustomer: (customer) => set((state) => ({
//         customers: [...state.customers, { id: uuidv4(), ledger: [], ...customer }], // Initialize ledger array
//       })),
//       updateCustomer: (updatedCustomer) => set((state) => ({
//         customers: state.customers.map((c) => c.id === updatedCustomer.id ? updatedCustomer : c),
//       })),
//       deleteCustomer: (customerId) => set((state) => ({
//         customers: state.customers.filter((c) => c.id !== customerId),
//       })),

//       // --- New Function for Ledger ---
//       addLedgerEntry: (customerId, entry) => set((state) => {
//         const customers = state.customers.map(customer => {
//           if (customer.id === customerId) {
//             // Add entry and sort ledger by date (newest first for running balance calculation later)
//             const updatedLedger = [...customer.ledger, { ...entry, entryId: uuidv4(), date: entry.date || new Date().toISOString() }]
//               .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort newest first initially

//             // Recalculate running balances (start from oldest)
//             let currentBalance = 0;
//             const ledgerWithBalance = updatedLedger.reverse().map(e => { // Reverse to calculate from oldest
//               const debit = parseFloat(e.debit || 0);
//               const credit = parseFloat(e.credit || 0);
//               currentBalance += (debit - credit);
//               return { ...e, balance: currentBalance };
//             }).reverse(); // Reverse back to newest first for display

//             return { ...customer, ledger: ledgerWithBalance };
//           }
//           return customer;
//         });
//         return { customers };
//       }),
//       // --- (Optional) Function to delete a ledger entry ---
//       deleteLedgerEntry: (customerId, entryId) => set((state) => {
//          const customers = state.customers.map(customer => {
//            if (customer.id === customerId) {
//               const updatedLedger = customer.ledger.filter(e => e.entryId !== entryId)
//                  .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort

//               // Recalculate balances
//                let currentBalance = 0;
//                const ledgerWithBalance = updatedLedger.reverse().map(e => {
//                  const debit = parseFloat(e.debit || 0);
//                  const credit = parseFloat(e.credit || 0);
//                  currentBalance += (debit - credit);
//                  return { ...e, balance: currentBalance };
//                }).reverse();

//                return { ...customer, ledger: ledgerWithBalance };
//            }
//            return customer;
//          });
//          return { customers };
//       }),

//     }),
//     { name: 'customer-storage' }
//   )
// );
// export default useCustomerStore;

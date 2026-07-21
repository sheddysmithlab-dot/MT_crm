import { useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useCustomerStore from '@/store/customerStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/dexie';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { toast } from 'sonner';
import { Download, Edit, Trash2, Edit2 } from 'lucide-react';
import { validatePhoneInput, validateGSTInput, handlePaymentFocus, handlePaymentBlur, validateDecimalInput, validateVehicleInput } from '@/utils/inputValidation';

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const getEntryDate = (entry) => entry.entry_date || entry.date || entry.created_at || '';

const escapeCsvCell = (value) => {
    const text = String(value ?? '');
    if (/[",\n\r]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
};

const formatExportPhone = (phone) => {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 10) return `+91 ${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+91 ${digits.slice(2)}`;
    if (digits.length > 10) return `+${digits}`;
    return `+91 ${digits}`;
};

const getRelationInfo = (yearlyTransaction) => {
    if (yearlyTransaction >= 1000000) {
        return { label: 'High', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' };
    }
    if (yearlyTransaction >= 500000) {
        return { label: 'Very Good', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' };
    }
    if (yearlyTransaction >= 200000) {
        return { label: 'Good', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' };
    }
    if (yearlyTransaction >= 50000) {
        return { label: 'Ok', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' };
    }
    if (yearlyTransaction > 0) {
        return { label: 'Poor', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' };
    }
    return { label: 'Bad', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' };
};

const CustomerDetailsCard = ({ customer, onEdit }) => {
    return (
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-start mb-6">
                <h3 className="text-lg font-semibold dark:text-dark-text">Customer Information</h3>
                <Button onClick={onEdit} size="sm">
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                </Button>
            </div>
            
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
                        <p className="font-medium dark:text-dark-text">{customer.name}</p>
                    </div>
                    {customer.company && (
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Company</p>
                            <p className="font-medium dark:text-dark-text">{customer.company}</p>
                        </div>
                    )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                        <p className="font-medium dark:text-dark-text">{customer.phone}</p>
                    </div>
                    {customer.gstin && (
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">GSTIN</p>
                            <p className="font-medium dark:text-dark-text">{customer.gstin}</p>
                        </div>
                    )}
                </div>
                
                {customer.address && (
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Address</p>
                        <p className="font-medium dark:text-dark-text">{customer.address}</p>
                    </div>
                )}
                
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Credit Limit</p>
                        <p className="font-medium dark:text-dark-text">₹{customer.credit_limit || 0}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Credit Days</p>
                        <p className="font-medium dark:text-dark-text">{customer.credit_days || 30} days</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Opening Balance</p>
                        <p className="font-medium dark:text-dark-text">₹{parseFloat(customer.opening_balance || 0).toLocaleString('en-IN')}</p>
                    </div>
                </div>
                
                {customer.vehicles && customer.vehicles.length > 0 && (
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Vehicles</p>
                        <div className="flex flex-wrap gap-2">
                            {customer.vehicles.map((vehicle, index) => (
                                <span key={index} className="inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm">
                                    {vehicle}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const CustomerForm = ({ customer, onSave, onCancel }) => {
    const [formData, setFormData] = useState(
        customer || { name: '', phone: '', address: '', gstin: '', company: '', credit_limit: '', credit_days: 30, opening_balance: '', vehicles: [] }
    );
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
        
        setFormData(prev => ({...prev, [name]: value}));
    }

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
        if(!formData.name || !formData.phone){
            toast.error("Customer name and phone are required.");
            return;
        }
        
        // Convert string values to numbers for database
        const submissionData = {
            ...formData,
            credit_limit: parseFloat(formData.credit_limit) || 0,
            opening_balance: parseFloat(formData.opening_balance) || 0,
            credit_days: parseInt(formData.credit_days) || 30
        };
        
        onSave(submissionData);
    }
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium mb-1 dark:text-dark-text">Name *</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full mt-1 p-2 border rounded-lg bg-transparent dark:border-gray-600 focus:ring-2 focus:ring-brand-red dark:text-dark-text" required />
            </div>
             <div>
                <label className="block text-sm font-medium mb-1 dark:text-dark-text">Company</label>
                <input type="text" name="company" value={formData.company} onChange={handleChange} className="w-full mt-1 p-2 border rounded-lg bg-transparent dark:border-gray-600 focus:ring-2 focus:ring-brand-red dark:text-dark-text" />
            </div>
             <div>
                <label className="block text-sm font-medium mb-1 dark:text-dark-text">Phone *</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="10 digit phone number" maxLength="10" className="w-full mt-1 p-2 border rounded-lg bg-transparent dark:border-gray-600 focus:ring-2 focus:ring-brand-red dark:text-dark-text" required />
            </div>
             <div>
                <label className="block text-sm font-medium mb-1 dark:text-dark-text">Address</label>
                <textarea name="address" value={formData.address} onChange={handleChange} rows="2" className="w-full mt-1 p-2 border rounded-lg bg-transparent dark:border-gray-600 focus:ring-2 focus:ring-brand-red dark:text-dark-text" />
            </div>
             <div>
                <label className="block text-sm font-medium mb-1 dark:text-dark-text">GSTIN</label>
                <input type="text" name="gstin" value={formData.gstin} onChange={handleChange} placeholder="15 character GST number" maxLength="15" className="w-full mt-1 p-2 border rounded-lg bg-transparent dark:border-gray-600 focus:ring-2 focus:ring-brand-red dark:text-dark-text" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-dark-text">Opening Balance (₹)</label>
                    <input type="text" name="opening_balance" value={formData.opening_balance} onChange={handleChange} onFocus={(e) => handlePaymentFocus(e, openingBalanceRef)} onBlur={(e) => handlePaymentBlur(e, openingBalanceRef)} ref={openingBalanceRef} className="w-full mt-1 p-2 border rounded-lg bg-transparent dark:border-gray-600 focus:ring-2 focus:ring-brand-red dark:text-dark-text" />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-dark-text">Vehicle Number</label>
                    <input 
                        type="text" 
                        value={vehicleInput} 
                        onChange={handleVehicleInputChange}
                        onKeyPress={handleVehicleKeyPress}
                        placeholder="Vehicle Number"
                        className="w-full mt-1 p-2 border rounded-lg bg-transparent dark:border-gray-600 focus:ring-2 focus:ring-brand-red dark:text-dark-text" 
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
                    <input type="text" name="credit_limit" value={formData.credit_limit} onChange={handleChange} onFocus={(e) => handlePaymentFocus(e, creditLimitRef)} onBlur={(e) => handlePaymentBlur(e, creditLimitRef)} ref={creditLimitRef} className="w-full mt-1 p-2 border rounded-lg bg-transparent dark:border-gray-600 focus:ring-2 focus:ring-brand-red dark:text-dark-text" />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-dark-text">Credit Days</label>
                    <input type="number" name="credit_days" value={formData.credit_days} onChange={handleChange} className="w-full mt-1 p-2 border rounded-lg bg-transparent dark:border-gray-600 focus:ring-2 focus:ring-brand-red dark:text-dark-text" />
                </div>
            </div>
            

             <div className="flex justify-end space-x-2">
                <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
                <Button type="submit">Save Customer</Button>
            </div>
        </form>
    )
}

const CustomerDetailsTab = () => {
    const navigate = useNavigate();
    const { customers, updateCustomer, deleteCustomer } = useCustomerStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);

    // Fetch all ledger entries
    const ledgerEntries = useLiveQuery(
        () => db.customer_ledger_entries.toArray(),
        []
    ) || [];

    const inspections = useLiveQuery(
        () => db.inspections.toArray(),
        []
    ) || [];

    const customerMetrics = useMemo(() => {
        const currentYear = new Date().getFullYear();

        return customers.reduce((metrics, customer) => {
            const yearlyTransaction = ledgerEntries
                .filter((entry) => String(entry.customer_id) === String(customer.id))
                .filter((entry) => {
                    const entryDate = new Date(getEntryDate(entry));
                    return !Number.isNaN(entryDate.getTime()) && entryDate.getFullYear() === currentYear;
                })
                .reduce((sum, entry) => sum + (parseFloat(entry.debit) || 0), 0);

            const customerName = normalizeText(customer.name);
            const customerPhone = String(customer.phone || '').trim();

            const visits = inspections.filter((inspection) => {
                const inspectionDate = new Date(inspection.date || inspection.inspectionDate || inspection.created_at || inspection.createdAt);
                if (Number.isNaN(inspectionDate.getTime()) || inspectionDate.getFullYear() !== currentYear) {
                    return false;
                }

                const sameName = normalizeText(inspection.party_name || inspection.ownerName || inspection.customer_name) === customerName;
                const inspectionPhone = String(inspection.phone || inspection.contactNo || inspection.contact_no || '').trim();
                const samePhone = customerPhone && inspectionPhone === customerPhone;

                return sameName && (customerPhone ? samePhone : true);
            }).length;

            metrics[customer.id] = {
                yearlyTransaction,
                relation: getRelationInfo(yearlyTransaction),
                visits,
            };

            return metrics;
        }, {});
    }, [customers, ledgerEntries, inspections]);

    const handleEdit = (customer) => {
        setEditingCustomer(customer);
        setIsEditMode(false); // Start with view mode
        setIsModalOpen(true);
    };

    const handleEnterEditMode = () => {
        setIsEditMode(true);
    };

    const handleSave = async (customerData) => {
        try {
            await updateCustomer({ ...editingCustomer, ...customerData });
            toast.success("Customer updated!");
            setIsModalOpen(false);
            setIsEditMode(false);
        } catch (error) {
            toast.error("Failed to update customer");
        }
    };

    const handleDelete = (customer) => {
        setCustomerToDelete(customer);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        try {
            await deleteCustomer(customerToDelete.id);
            toast.success(`Customer "${customerToDelete.name}" deleted.`);
            setIsDeleteModalOpen(false);
            setCustomerToDelete(null);
        } catch (error) {
            toast.error("Failed to delete customer");
        }
    }

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setIsEditMode(false);
    };

    const handleExportCustomersCsv = () => {
        const exportRows = customers
            .filter((customer) => customer?.name || customer?.phone)
            .map((customer) => [
                `dmf ${String(customer.name || '').trim()}`.trim(),
                formatExportPhone(customer.phone),
            ]);

        if (exportRows.length === 0) {
            toast.error('No customers available to export');
            return;
        }

        const csvContent = exportRows
            .map((row) => row.map(escapeCsvCell).join(','))
            .join('\n');
        const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `dmf_customer_contacts_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Customer CSV exported');
    };

    return (
        <div>
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={isEditMode ? "Edit Customer" : "Customer Details"}>
                {isEditMode ? (
                    <CustomerForm customer={editingCustomer} onSave={handleSave} onCancel={handleCloseModal} />
                ) : (
                    <CustomerDetailsCard customer={editingCustomer} onEdit={handleEnterEditMode} />
                )}
            </Modal>
            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Customer"
                message={`Are you sure you want to delete ${customerToDelete?.name}? This action cannot be undone.`}
            />

            <div className="mb-3 flex justify-end">
                <Button onClick={handleExportCustomersCsv} variant="secondary" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                </Button>
            </div>

             <div className="overflow-x-auto">
                <table className="w-full text-xs leading-tight dark:text-dark-text-secondary">
                    <thead className="bg-gray-50 dark:bg-gray-700 text-left">
                        <tr>
                            <th className="px-2 py-2">Name</th>
                            <th className="px-2 py-2">Company</th>
                            <th className="px-2 py-2">Phone</th>
                            <th className="px-2 py-2">Address</th>
                            <th className="px-2 py-2">GSTIN</th>
                            <th className="px-2 py-2">Relations</th>
                            <th className="px-2 py-2 text-right">Visits</th>
                            <th className="px-2 py-2 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customers.length > 0 ? customers.map((c, index) => {
                            const metrics = customerMetrics[c.id] || { yearlyTransaction: 0, relation: getRelationInfo(0), visits: 0 };
                            return (
                            <tr key={c.id || `customer-${index}`} className="border-b dark:border-gray-700 even:bg-gray-50 dark:even:bg-gray-800/50">
                                <td
                                    className="px-2 py-1 font-medium align-middle dark:text-dark-text cursor-pointer hover:text-brand-red transition-colors"
                                    onClick={() => navigate(`/customer/profile/${c.id}`)}
                                >
                                    {c.name}
                                </td>
                                <td className="px-2 py-1 align-middle">{c.company || '-'}</td>
                                <td className="px-2 py-1 align-middle">{c.phone}</td>
                                <td className="px-2 py-1 align-middle max-w-72 truncate" title={c.address || ''}>{c.address || '-'}</td>
                                <td className="px-2 py-1 align-middle">{c.gstin || '-'}</td>
                                <td className="px-2 py-1 align-middle">
                                    <span
                                        className={`inline-flex min-w-16 justify-center rounded px-2 py-0.5 text-[11px] font-semibold ${metrics.relation.className}`}
                                        title={`Yearly transaction: ₹ ${metrics.yearlyTransaction.toLocaleString('en-IN')}`}
                                    >
                                        {metrics.relation.label}
                                    </span>
                                </td>
                                <td className="px-2 py-1 text-right align-middle font-semibold">{metrics.visits}</td>
                                <td className="px-2 py-1 text-right align-middle">
                                    <div className="inline-flex items-center justify-end gap-1">
                                        <button
                                            type="button"
                                            className="inline-flex h-7 w-7 items-center justify-center rounded text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-gray-700"
                                            onClick={() => handleEdit(c)}
                                            title="Edit customer"
                                        >
                                            <Edit className="h-4 w-4"/>
                                        </button>
                                        <button
                                            type="button"
                                            className="inline-flex h-7 w-7 items-center justify-center rounded text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-gray-700"
                                            onClick={() => handleDelete(c)}
                                            title="Delete customer"
                                        >
                                            <Trash2 className="h-4 w-4"/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            );
                        }) : (
                           <tr><td colSpan="8" className="text-center p-8 text-gray-500 dark:text-dark-text-secondary">
                                <p>No customers found.</p>
                                <p className="text-xs mt-1">Click "Add Customer" to get started.</p>
                           </td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CustomerDetailsTab;

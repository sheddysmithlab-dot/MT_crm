import { useState, useMemo } from 'react';
import useCustomerStore from '@/store/customerStore';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { toast } from 'sonner';
import { Edit, Trash2, UserCheck } from 'lucide-react';

const STATUS_CONFIG = {
    all:    { label: 'All',    color: 'bg-gray-100 text-gray-700 border-gray-300',       badge: 'bg-gray-100 text-gray-600' },
    urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700 border-red-400',           badge: 'bg-red-100 text-red-700' },
    hot:    { label: 'Hot',    color: 'bg-orange-100 text-orange-700 border-orange-400',  badge: 'bg-orange-100 text-orange-700' },
    warm:   { label: 'Warm',   color: 'bg-yellow-100 text-yellow-700 border-yellow-400',  badge: 'bg-yellow-100 text-yellow-700' },
    cool:   { label: 'Cool',   color: 'bg-blue-100 text-blue-700 border-blue-400',        badge: 'bg-blue-100 text-blue-700' },
    won:    { label: 'Won',    color: 'bg-green-100 text-green-700 border-green-400',     badge: 'bg-green-100 text-green-700' },
    lost:   { label: 'Lost',   color: 'bg-gray-200 text-gray-500 border-gray-400',        badge: 'bg-gray-200 text-gray-500' },
};

const STATUS_ACTIVE = {
    all:    'bg-gray-600 text-white border-gray-600',
    urgent: 'bg-red-600 text-white border-red-600',
    hot:    'bg-orange-500 text-white border-orange-500',
    warm:   'bg-yellow-500 text-white border-yellow-500',
    cool:   'bg-blue-600 text-white border-blue-600',
    won:    'bg-green-600 text-white border-green-600',
    lost:   'bg-gray-500 text-white border-gray-500',
};

const LeadForm = ({ lead, onSave, onCancel }) => {
    const [formData, setFormData] = useState(
        lead || { name: '', phone: '', address: '', company: '', email: '', source: '', status: '', notes: '', vehicles: [] }
    );
    const [vehicleInput, setVehicleInput] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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

    const handleRemoveVehicle = (index) => {
        setFormData(prev => ({
            ...prev,
            vehicles: prev.vehicles.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name || !formData.phone) {
            toast.error("Lead name and phone are required.");
            return;
        }
        onSave(formData);
    };

    const STATUS_OPTIONS = [
        { value: 'urgent', label: 'Urgent', dot: 'bg-red-500',    active: 'bg-red-600 text-white border-red-600',    inactive: 'border-red-300 text-red-600 hover:bg-red-50' },
        { value: 'hot',    label: 'Hot',    dot: 'bg-orange-500', active: 'bg-orange-500 text-white border-orange-500', inactive: 'border-orange-300 text-orange-600 hover:bg-orange-50' },
        { value: 'warm',   label: 'Warm',   dot: 'bg-yellow-400', active: 'bg-yellow-500 text-white border-yellow-500', inactive: 'border-yellow-300 text-yellow-600 hover:bg-yellow-50' },
        { value: 'cool',   label: 'Cool',   dot: 'bg-blue-500',   active: 'bg-blue-600 text-white border-blue-600',   inactive: 'border-blue-300 text-blue-600 hover:bg-blue-50' },
        { value: 'won',    label: 'Won',    dot: 'bg-green-500',  active: 'bg-green-600 text-white border-green-600',  inactive: 'border-green-300 text-green-600 hover:bg-green-50' },
        { value: 'lost',   label: 'Lost',   dot: 'bg-gray-400',   active: 'bg-gray-500 text-white border-gray-500',   inactive: 'border-gray-300 text-gray-500 hover:bg-gray-50' },
    ];

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: Name + Phone */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-dark-text">Name *</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border rounded-lg bg-transparent dark:border-gray-600 focus:ring-2 focus:ring-brand-red dark:text-dark-text" required />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-dark-text">Phone *</label>
                    <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full p-2 border rounded-lg bg-transparent dark:border-gray-600 focus:ring-2 focus:ring-brand-red dark:text-dark-text" required />
                </div>
            </div>

            {/* Row 2: Company + Source */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-dark-text">Company</label>
                    <input type="text" name="company" value={formData.company} onChange={handleChange} className="w-full p-2 border rounded-lg bg-transparent dark:border-gray-600 focus:ring-2 focus:ring-brand-red dark:text-dark-text" />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-dark-text">Source</label>
                    <select name="source" value={formData.source} onChange={handleChange} className="w-full p-2 border rounded-lg bg-transparent dark:border-gray-600 focus:ring-2 focus:ring-brand-red dark:text-dark-text">
                        <option value="">Select Source</option>
                        <option value="referral">Referral</option>
                        <option value="website">Website</option>
                        <option value="social_media">Social Media</option>
                        <option value="walk_in">Walk-in</option>
                        <option value="phone">Phone Call</option>
                        <option value="other">Other</option>
                    </select>
                </div>
            </div>

            {/* Row 3: Email */}
            <div>
                <label className="block text-sm font-medium mb-1 dark:text-dark-text">Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-2 border rounded-lg bg-transparent dark:border-gray-600 focus:ring-2 focus:ring-brand-red dark:text-dark-text" />
            </div>

            {/* Status pill selector */}
            <div>
                <label className="block text-sm font-medium mb-2 dark:text-dark-text">Status</label>
                <div className="flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, status: prev.status === opt.value ? '' : opt.value }))}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${formData.status === opt.value ? opt.active : opt.inactive}`}
                        >
                            <span className={`w-2 h-2 rounded-full ${formData.status === opt.value ? 'bg-white/80' : opt.dot}`} />
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1 dark:text-dark-text">Address</label>
                <textarea name="address" value={formData.address} onChange={handleChange} rows="2" className="w-full mt-1 p-2 border rounded-lg bg-transparent dark:border-gray-600 focus:ring-2 focus:ring-brand-red dark:text-dark-text" />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 dark:text-dark-text">Vehicles</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={vehicleInput}
                        onChange={(e) => setVehicleInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddVehicle())}
                        placeholder="Vehicle Number (e.g., MP 09 HH 2550)"
                        className="flex-1 p-2 border rounded-lg bg-transparent dark:border-gray-600 focus:ring-2 focus:ring-brand-red dark:text-dark-text"
                    />
                    <Button type="button" onClick={handleAddVehicle}>Add</Button>
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
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 dark:text-dark-text">Notes</label>
                <textarea name="notes" value={formData.notes} onChange={handleChange} rows="3" className="w-full mt-1 p-2 border rounded-lg bg-transparent dark:border-gray-600 focus:ring-2 focus:ring-brand-red dark:text-dark-text" placeholder="Additional notes about this lead..." />
            </div>
            <div className="flex justify-end space-x-2">
                <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
                <Button type="submit">Save Lead</Button>
            </div>
        </form>
    );
};

const LeadsTab = () => {
    const { leads = [], addLead, updateLead, deleteLead, convertLeadToCustomer } = useCustomerStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLead, setEditingLead] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [leadToDelete, setLeadToDelete] = useState(null);
    const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
    const [leadToConvert, setLeadToConvert] = useState(null);
    const [activeFilter, setActiveFilter] = useState('all');

    const statusCounts = useMemo(() => {
        const counts = { all: leads.length };
        Object.keys(STATUS_CONFIG).forEach(s => { if (s !== 'all') counts[s] = 0; });
        leads.forEach(l => { if (l.status && counts[l.status] !== undefined) counts[l.status]++; });
        return counts;
    }, [leads]);

    const filteredLeads = useMemo(() => {
        if (activeFilter === 'all') return leads;
        return leads.filter(l => l.status === activeFilter);
    }, [leads, activeFilter]);

    const handleAdd = () => { setEditingLead(null); setIsModalOpen(true); };
    const handleEdit = (lead) => { setEditingLead(lead); setIsModalOpen(true); };

    const handleSave = async (leadData) => {
        try {
            if (editingLead) {
                await updateLead({ ...editingLead, ...leadData });
                toast.success("Lead updated!");
            } else {
                await addLead(leadData);
                toast.success("New lead added!");
            }
            setIsModalOpen(false);
        } catch {
            toast.error("Failed to save lead");
        }
    };

    const handleDelete = (lead) => { setLeadToDelete(lead); setIsDeleteModalOpen(true); };
    const confirmDelete = async () => {
        try {
            await deleteLead(leadToDelete.id);
            toast.success(`Lead "${leadToDelete.name}" deleted.`);
            setIsDeleteModalOpen(false);
            setLeadToDelete(null);
        } catch {
            toast.error("Failed to delete lead");
        }
    };

    const handleConvert = (lead) => { setLeadToConvert(lead); setIsConvertModalOpen(true); };
    const confirmConvert = async () => {
        try {
            await convertLeadToCustomer(leadToConvert.id);
            toast.success(`Lead "${leadToConvert.name}" converted to customer!`);
            setIsConvertModalOpen(false);
            setLeadToConvert(null);
        } catch {
            toast.error("Failed to convert lead");
        }
    };

    return (
        <div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingLead ? "Edit Lead" : "Add New Lead"}>
                <LeadForm lead={editingLead} onSave={handleSave} onCancel={() => setIsModalOpen(false)} />
            </Modal>
            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Lead"
                message={`Are you sure you want to delete ${leadToDelete?.name}? This action cannot be undone.`}
            />
            <ConfirmModal
                isOpen={isConvertModalOpen}
                onClose={() => setIsConvertModalOpen(false)}
                onConfirm={confirmConvert}
                title="Convert to Customer"
                message={`Convert ${leadToConvert?.name} to a customer? This will move them to the Customer Details tab.`}
            />

            {/* Top bar: Add button + Filter chips */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <Button onClick={handleAdd}>Add Lead</Button>
                <div className="flex flex-wrap gap-1.5 ml-2">
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                        const isActive = activeFilter === key;
                        return (
                            <button
                                key={key}
                                onClick={() => setActiveFilter(key)}
                                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${isActive ? STATUS_ACTIVE[key] : cfg.color}`}
                            >
                                {cfg.label}
                                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-white/20' : 'bg-white/60'}`}>
                                    {statusCounts[key] ?? 0}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm dark:text-dark-text-secondary">
                    <thead className="bg-gray-50 dark:bg-gray-700 text-left">
                        <tr>
                            <th className="px-2 py-1">Name</th>
                            {activeFilter === 'all' && <th className="px-2 py-1">Status</th>}
                            <th className="px-2 py-1">Company</th>
                            <th className="px-2 py-1">Phone</th>
                            <th className="px-2 py-1">Email</th>
                            <th className="px-2 py-1">Source</th>
                            <th className="px-2 py-1">Vehicles</th>
                            {activeFilter !== 'all' && <th className="px-2 py-1">Notes</th>}
                            <th className="px-2 py-1 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLeads.length > 0 ? filteredLeads.map(lead => {
                            const statusCfg = STATUS_CONFIG[lead.status] || null;
                            return (
                                <tr key={lead.id} className="border-b dark:border-gray-700 even:bg-gray-50 dark:even:bg-gray-800/50">
                                    <td className="px-2 py-1 font-medium dark:text-dark-text">{lead.name}</td>
                                    {activeFilter === 'all' && (
                                        <td className="px-2 py-1">
                                            {statusCfg ? (
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusCfg.badge}`}>
                                                    {statusCfg.label}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-xs">—</span>
                                            )}
                                        </td>
                                    )}
                                    <td className="px-2 py-1">{lead.company || '-'}</td>
                                    <td className="px-2 py-1">{lead.phone}</td>
                                    <td className="px-2 py-1">{lead.email || '-'}</td>
                                    <td className="px-2 py-1 capitalize">{lead.source || '-'}</td>
                                    <td className="px-2 py-1">
                                        {lead.vehicles && lead.vehicles.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {lead.vehicles.map((vehicle, idx) => (
                                                    <span key={idx} className="inline-flex items-center px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs">
                                                        {vehicle}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : '-'}
                                    </td>
                                    {activeFilter !== 'all' && (
                                        <td className="px-2 py-1 max-w-[200px] truncate text-gray-500 dark:text-dark-text-secondary" title={lead.notes || ''}>
                                            {lead.notes || <span className="text-gray-300">—</span>}
                                        </td>
                                    )}
                                    <td className="px-2 py-1 text-right space-x-1">
                                        <Button variant="ghost" className="p-1 h-auto" onClick={() => handleConvert(lead)} title="Convert to Customer">
                                            <UserCheck className="h-4 w-4 text-green-600" />
                                        </Button>
                                        <Button variant="ghost" className="p-1 h-auto" onClick={() => handleEdit(lead)}>
                                            <Edit className="h-4 w-4 text-blue-600" />
                                        </Button>
                                        <Button variant="ghost" className="p-1 h-auto" onClick={() => handleDelete(lead)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan={activeFilter === 'all' ? 8 : 8} className="text-center p-8 text-gray-500 dark:text-dark-text-secondary">
                                    <p>{activeFilter === 'all' ? 'No leads found.' : `No ${STATUS_CONFIG[activeFilter]?.label} leads.`}</p>
                                    {activeFilter === 'all' && <p className="text-xs mt-1">Click "Add Lead" to get started.</p>}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LeadsTab;

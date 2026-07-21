import { useState, useEffect } from 'react';
import useCompanyStore from '@/store/companyStore';
import useSettingsStore from '@/store/settingsStore';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { toast } from 'sonner';
import { Building, Mail, Phone, Globe, MapPin, Banknote, Plus, Trash2, User, Upload, Save, FileText, Hash } from 'lucide-react';

const CompanyMasterTab = () => {
    const { companyDetails, updateCompanyDetails, updateContactPerson, updateBankDetails, addService, removeService, addTermsCondition, removeTermsCondition, addTermsEstimate, removeTermsEstimate, addTermsInvoice, removeTermsInvoice, updateNumberPattern } = useCompanyStore();
    const { saveCompanyMaster, loadCompanyMaster } = useSettingsStore();
    const [formData, setFormData] = useState(companyDetails);
    const [newService, setNewService] = useState('');
    const [newTerm, setNewTerm] = useState('');
    const [newEstimateTerm, setNewEstimateTerm] = useState('');
    const [newInvoiceTerm, setNewInvoiceTerm] = useState('');
    const [logoPreview, setLogoPreview] = useState(companyDetails.logo || null);
    const [numberPatterns, setNumberPatterns] = useState(companyDetails.numberPatterns || {});
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        loadCompanyData();
    }, []);

    const loadCompanyData = async () => {
        setIsLoading(true);
        const result = await loadCompanyMaster();
        if (result.success && result.data) {
            setFormData(result.data);
            updateCompanyDetails(result.data);
            setLogoPreview(result.data.logo || null);
            setNumberPatterns(result.data.numberPatterns || {});
        }
        setIsLoading(false);
    };

    useEffect(() => {
        setFormData(companyDetails);
        setLogoPreview(companyDetails.logo || null);
        setNumberPatterns(companyDetails.numberPatterns || {});
    }, [companyDetails]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handlePatternChange = (type, field, value) => {
        setNumberPatterns(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                [field]: value
            }
        }));
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 500 * 1024) { // 500KB limit
                toast.error('File size too large. Please upload an image under 500KB.');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result);
                setFormData(prev => ({ ...prev, logo: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveLogo = () => {
        setLogoPreview(null);
        setFormData(prev => ({ ...prev, logo: null }));
    };

    const handleContactChange = (role, field, value) => {
        setFormData({
            ...formData,
            [role]: { ...formData[role], [field]: value }
        });
    };

    const handleBankChange = (field, value) => {
        setFormData({
            ...formData,
            bankDetails: { ...formData.bankDetails, [field]: value }
        });
    };

    const handleSave = async () => {
        // Save number patterns
        Object.keys(numberPatterns).forEach(type => {
            updateNumberPattern(type, numberPatterns[type].pattern, numberPatterns[type].autoGenerate);
        });
        
        updateCompanyDetails(formData);
        
        // Save to new Settings backend
        const result = await saveCompanyMaster(formData);
        if (result.success) {
            toast.success('Company details updated successfully!');
        } else {
            toast.error('Failed to save company details: ' + result.error);
        }
    };

    const handleAddService = () => {
        if (newService.trim()) {
            addService(newService.trim());
            setNewService('');
            toast.success('Service added!');
        }
    };

    const handleAddTerm = () => {
        if (newTerm.trim()) {
            addTermsCondition(newTerm.trim());
            setNewTerm('');
            toast.success('Terms & Condition added!');
        }
    };

    const handleAddEstimateTerm = () => {
        if (newEstimateTerm.trim()) {
            addTermsEstimate(newEstimateTerm.trim());
            setNewEstimateTerm('');
            toast.success('Estimate term added!');
        }
    };

    const handleAddInvoiceTerm = () => {
        if (newInvoiceTerm.trim()) {
            addTermsInvoice(newInvoiceTerm.trim());
            setNewInvoiceTerm('');
            toast.success('Invoice term added!');
        }
    };

    return (
        <div className="space-y-2">
            {/* Stunning Gradient Header */}
            <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-1.5 text-white">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                <Building className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Company Master Settings</h3>
                                <p className="text-blue-100 text-xs">Manage your company information for documents and invoices</p>
                            </div>
                        </div>
                        <Button 
                            onClick={handleSave} 
                            className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg text-sm px-2 py-1"
                        >
                            <Save className="h-3 w-3 mr-1" />
                            Save
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Logo Upload Section with Pink Gradient */}
            <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-pink-600 via-rose-600 to-red-600 p-1 text-white">
                    <h4 className="text-sm font-bold flex items-center gap-1">
                        <Upload className="h-4 w-4" />
                        Company Logo
                    </h4>
                </div>
                <div className="p-2 bg-white dark:bg-dark-card">
                    <div className="flex items-center gap-3 p-1.5 border border-dashed border-pink-300 dark:border-pink-700 rounded-lg bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20">
                        <div>
                            {logoPreview ? (
                                <div className="relative">
                                    <img 
                                        src={logoPreview} 
                                        alt="Company Logo" 
                                        className="h-16 object-contain bg-white p-1 rounded-lg shadow border border-pink-300" 
                                    />
                                    <button 
                                        onClick={handleRemoveLogo}
                                        className="absolute -top-1 -right-1 bg-red-500 text-white p-0.5 rounded-full hover:bg-red-600 shadow"
                                        title="Remove Logo"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                            ) : (
                                <div className="h-16 w-16 flex items-center justify-center bg-gradient-to-br from-pink-200 to-rose-300 dark:from-pink-700 dark:to-rose-800 rounded-lg text-white shadow">
                                    <Upload className="h-6 w-6" />
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col">
                            <label className="cursor-pointer bg-gradient-to-r from-pink-600 to-rose-600 text-white px-3 py-1 rounded-lg hover:from-pink-700 hover:to-rose-700 shadow text-sm font-semibold">
                                <span>Upload Logo</span>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={handleLogoUpload}
                                />
                            </label>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                PNG or JPG, max 500KB
                            </p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Basic Information with Emerald Gradient */}
            <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-1 text-white">
                    <h4 className="text-sm font-bold flex items-center gap-1">
                        <Building className="h-4 w-4" />
                        Basic Information
                    </h4>
                </div>
                <div className="p-2 bg-white dark:bg-dark-card">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                        {/* Company Name - Emerald */}
                        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20 p-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700">
                            <label className="flex text-xs font-semibold mb-0.5 text-emerald-900 dark:text-emerald-100">
                                Company Name *
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full p-1 text-sm border border-emerald-400 dark:border-emerald-600 rounded bg-white dark:bg-dark-card dark:text-dark-text focus:ring-1 focus:ring-emerald-500 transition-all"
                            />
                        </div>
                        
                        {/* Industry - Cyan */}
                        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/30 dark:to-cyan-800/20 p-1.5 rounded-lg border border-cyan-300 dark:border-cyan-700">
                            <label className="flex text-xs font-semibold mb-0.5 text-cyan-900 dark:text-cyan-100">
                                Industry
                            </label>
                            <input
                                type="text"
                                name="industry"
                                value={formData.industry}
                                onChange={handleChange}
                                className="w-full p-1 text-sm border border-cyan-400 dark:border-cyan-600 rounded bg-white dark:bg-dark-card dark:text-dark-text focus:ring-1 focus:ring-cyan-500 transition-all"
                            />
                        </div>
                        
                        {/* Established Year - Teal */}
                        <div className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/30 dark:to-teal-800/20 p-1.5 rounded-lg border border-teal-300 dark:border-teal-700">
                            <label className="flex text-xs font-semibold mb-0.5 text-teal-900 dark:text-teal-100">
                                Established Year
                            </label>
                            <input
                                type="text"
                                name="established"
                                value={formData.established}
                                onChange={handleChange}
                                className="w-full p-1 text-sm border border-teal-400 dark:border-teal-600 rounded bg-white dark:bg-dark-card dark:text-dark-text focus:ring-1 focus:ring-teal-500 transition-all"
                            />
                        </div>
                        
                        {/* Business Type - Sky */}
                        <div className="bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-900/30 dark:to-sky-800/20 p-1.5 rounded-lg border border-sky-300 dark:border-sky-700">
                            <label className="flex text-xs font-semibold mb-0.5 text-sky-900 dark:text-sky-100">
                                Business Type
                            </label>
                            <input
                                type="text"
                                name="businessType"
                                value={formData.businessType}
                                onChange={handleChange}
                                className="w-full p-1 text-sm border border-sky-400 dark:border-sky-600 rounded bg-white dark:bg-dark-card dark:text-dark-text focus:ring-1 focus:ring-sky-500 transition-all"
                            />
                        </div>
                        
                        {/* GSTIN - Blue */}
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 p-1.5 rounded-lg border border-blue-300 dark:border-blue-700">
                            <label className="flex text-xs font-semibold mb-0.5 text-blue-900 dark:text-blue-100">
                                GSTIN *
                            </label>
                            <input
                                type="text"
                                name="gstin"
                                value={formData.gstin}
                                onChange={handleChange}
                                className="w-full p-1 text-sm border border-blue-400 dark:border-blue-600 rounded bg-white dark:bg-dark-card dark:text-dark-text focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                        </div>
                        
                        {/* Website - Indigo */}
                        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/20 p-1.5 rounded-lg border border-indigo-300 dark:border-indigo-700">
                            <label className="flex text-xs font-semibold mb-0.5 text-indigo-900 dark:text-indigo-100">
                                Website
                            </label>
                            <input
                                type="text"
                                name="website"
                                value={formData.website}
                                onChange={handleChange}
                                className="w-full p-1 text-sm border border-indigo-400 dark:border-indigo-600 rounded bg-white dark:bg-dark-card dark:text-dark-text focus:ring-1 focus:ring-indigo-500 transition-all"
                            />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Address Details with Violet Gradient */}
            <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 p-1 text-white">
                    <h4 className="text-sm font-bold flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        Address Details
                    </h4>
                </div>
                <div className="p-2 bg-white dark:bg-dark-card">
                    <div className="space-y-1.5">
                        <div className="bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/30 dark:to-violet-800/20 p-1.5 rounded-lg border border-violet-300 dark:border-violet-700">
                            <label className="flex text-xs font-semibold mb-0.5 text-violet-900 dark:text-violet-100">Address Line *</label>
                            <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full p-1 text-sm border border-violet-400 dark:border-violet-600 rounded bg-white dark:bg-dark-card dark:text-dark-text focus:ring-1 focus:ring-violet-500 transition-all" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 p-1.5 rounded-lg border border-purple-300 dark:border-purple-700">
                                <label className="flex text-xs font-semibold mb-0.5 text-purple-900 dark:text-purple-100">City *</label>
                                <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full p-1 text-sm border border-purple-400 dark:border-purple-600 rounded bg-white dark:bg-dark-card dark:text-dark-text focus:ring-1 focus:ring-purple-500 transition-all" />
                            </div>
                            <div className="bg-gradient-to-br from-fuchsia-50 to-fuchsia-100 dark:from-fuchsia-900/30 dark:to-fuchsia-800/20 p-1.5 rounded-lg border border-fuchsia-300 dark:border-fuchsia-700">
                                <label className="flex text-xs font-semibold mb-0.5 text-fuchsia-900 dark:text-fuchsia-100">State *</label>
                                <input type="text" name="state" value={formData.state} onChange={handleChange} className="w-full p-1 text-sm border border-fuchsia-400 dark:border-fuchsia-600 rounded bg-white dark:bg-dark-card dark:text-dark-text focus:ring-1 focus:ring-fuchsia-500 transition-all" />
                            </div>
                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 p-1.5 rounded-lg border border-purple-300 dark:border-purple-700">
                                <label className="flex text-xs font-semibold mb-0.5 text-purple-900 dark:text-purple-100">Pincode *</label>
                                <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} className="w-full p-1 text-sm border border-purple-400 dark:border-purple-600 rounded bg-white dark:bg-dark-card dark:text-dark-text focus:ring-1 focus:ring-purple-500 transition-all" />
                            </div>
                            <div className="bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/30 dark:to-violet-800/20 p-1.5 rounded-lg border border-violet-300 dark:border-violet-700">
                                <label className="flex text-xs font-semibold mb-0.5 text-violet-900 dark:text-violet-100">Country</label>
                                <input type="text" name="country" value={formData.country} onChange={handleChange} className="w-full p-1 text-sm border border-violet-400 dark:border-violet-600 rounded bg-white dark:bg-dark-card dark:text-dark-text focus:ring-1 focus:ring-violet-500 transition-all" />
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Contact Information with Amber Gradient */}
            <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 p-1 text-white">
                    <h4 className="text-sm font-bold flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        Contact Information
                    </h4>
                </div>
                <div className="p-2 bg-white dark:bg-dark-card">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                        <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20 p-1.5 rounded-lg border border-amber-300 dark:border-amber-700">
                            <label className="flex text-xs font-semibold mb-0.5 text-amber-900 dark:text-amber-100">Primary Phone *</label>
                            <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full p-1 text-sm border border-amber-400 dark:border-amber-600 rounded bg-white dark:bg-dark-card dark:text-dark-text focus:ring-1 focus:ring-amber-500 transition-all" />
                        </div>
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20 p-1.5 rounded-lg border border-orange-300 dark:border-orange-700">
                            <label className="flex text-xs font-semibold mb-0.5 text-orange-900 dark:text-orange-100">Primary Email *</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-1 text-sm border border-orange-400 dark:border-orange-600 rounded bg-white dark:bg-dark-card dark:text-dark-text focus:ring-1 focus:ring-orange-500 transition-all" />
                        </div>
                        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/20 p-1.5 rounded-lg border border-red-300 dark:border-red-700">
                            <label className="flex text-xs font-semibold mb-0.5 text-red-900 dark:text-red-100">Working Hours</label>
                            <input type="text" name="workingHours" value={formData.workingHours} onChange={handleChange} className="w-full p-1 text-sm border border-red-400 dark:border-red-600 rounded bg-white dark:bg-dark-card dark:text-dark-text focus:ring-1 focus:ring-red-500 transition-all" />
                        </div>
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20 p-1.5 rounded-lg border border-orange-300 dark:border-orange-700">
                            <label className="flex text-xs font-semibold mb-0.5 text-orange-900 dark:text-orange-100">Working Days</label>
                            <input type="text" name="workingDays" value={formData.workingDays} onChange={handleChange} className="w-full p-1 text-sm border border-orange-400 dark:border-orange-600 rounded bg-white dark:bg-dark-card dark:text-dark-text focus:ring-1 focus:ring-orange-500 transition-all" />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Contact Persons - Colorful Gradient Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-1.5">
                {['director', 'projectManager', 'marketingManager', 'headEngineer'].map((role, idx) => {
                    const gradients = [
                        {from: 'blue', to: 'indigo', title: 'Director'},
                        {from: 'green', to: 'emerald', title: 'Project Manager'},
                        {from: 'purple', to: 'pink', title: 'Marketing Manager'},
                        {from: 'amber', to: 'orange', title: 'Head Engineer'}
                    ];
                    const gradient = gradients[idx];
                    return (
                        <Card key={role} className="border-0 shadow-lg rounded-xl overflow-hidden">
                            <div className={`bg-gradient-to-r from-${gradient.from}-600 to-${gradient.to}-600 p-1 text-white`}>
                                <h4 className="text-sm font-bold flex items-center gap-1">
                                    <User className="h-4 w-4" />
                                    {gradient.title}
                                </h4>
                            </div>
                            <div className="p-1.5 bg-white dark:bg-dark-card space-y-1">
                                <div className={`bg-gradient-to-br from-${gradient.from}-50 to-${gradient.from}-100 dark:from-${gradient.from}-900/30 dark:to-${gradient.from}-800/20 p-1 rounded-lg border border-${gradient.from}-300 dark:border-${gradient.from}-700`}>
                                    <label className={`flex text-xs font-semibold mb-0.5 text-${gradient.from}-900 dark:text-${gradient.from}-100`}>Name</label>
                                    <input type="text" value={formData[role]?.name || ''} onChange={(e) => handleContactChange(role, 'name', e.target.value)} className={`w-full p-1 border border-${gradient.from}-400 dark:border-${gradient.from}-600 rounded bg-white dark:bg-dark-card dark:text-dark-text focus:ring-1 focus:ring-${gradient.from}-500 text-sm transition-all`} />
                                </div>
                                <div className={`bg-gradient-to-br from-${gradient.to}-50 to-${gradient.to}-100 dark:from-${gradient.to}-900/30 dark:to-${gradient.to}-800/20 p-1 rounded-lg border border-${gradient.to}-300 dark:border-${gradient.to}-700`}>
                                    <label className={`flex text-xs font-semibold mb-0.5 text-${gradient.to}-900 dark:text-${gradient.to}-100`}>Phone</label>
                                    <input type="text" value={formData[role]?.phone || ''} onChange={(e) => handleContactChange(role, 'phone', e.target.value)} className={`w-full p-1 border border-${gradient.to}-400 dark:border-${gradient.to}-600 rounded bg-white dark:bg-dark-card dark:text-dark-text focus:ring-1 focus:ring-${gradient.to}-500 text-sm transition-all`} />
                                </div>
                                <div className={`bg-gradient-to-br from-${gradient.from}-50 to-${gradient.from}-100 dark:from-${gradient.from}-900/30 dark:to-${gradient.from}-800/20 p-1 rounded-lg border border-${gradient.from}-300 dark:border-${gradient.from}-700`}>
                                    <label className={`flex text-xs font-semibold mb-0.5 text-${gradient.from}-900 dark:text-${gradient.from}-100`}>Email</label>
                                    <input type="email" value={formData[role]?.email || ''} onChange={(e) => handleContactChange(role, 'email', e.target.value)} className={`w-full p-1 border border-${gradient.from}-400 dark:border-${gradient.from}-600 rounded bg-white dark:bg-dark-card dark:text-dark-text focus:ring-1 focus:ring-${gradient.from}-500 text-sm transition-all`} />
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Bank Details with Lime/Green Gradient */}
            <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-lime-600 via-green-600 to-emerald-600 p-1 text-white">
                    <h4 className="text-sm font-bold flex items-center gap-1">
                        <Banknote className="h-4 w-4" />
                        Bank Details
                    </h4>
                </div>
                <div className="p-2 bg-white dark:bg-dark-card">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                        <div className="bg-gradient-to-br from-lime-50 to-lime-100 dark:from-lime-900/30 dark:to-lime-800/20 p-1.5 rounded-lg border border-lime-300 dark:border-lime-700">
                            <label className="flex text-xs font-semibold mb-0.5 text-lime-900 dark:text-lime-100">Bank Name</label>
                            <input type="text" value={formData.bankDetails?.bankName || ''} onChange={(e) => handleBankChange('bankName', e.target.value)} className="w-full p-1 text-sm border border-lime-400 dark:border-lime-600 rounded bg-white dark:bg-dark-card dark:text-dark-text focus:ring-1 focus:ring-lime-500 transition-all" />
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 p-1.5 rounded-lg border border-green-300 dark:border-green-700">
                            <label className="flex text-xs font-semibold mb-0.5 text-green-900 dark:text-green-100">Account Number</label>
                            <input type="text" value={formData.bankDetails?.accountNumber || ''} onChange={(e) => handleBankChange('accountNumber', e.target.value)} className="w-full p-1 text-sm border border-green-400 dark:border-green-600 rounded bg-white dark:bg-dark-card dark:text-dark-text focus:ring-1 focus:ring-green-500 transition-all" />
                        </div>
                        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20 p-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700">
                            <label className="flex text-xs font-semibold mb-0.5 text-emerald-900 dark:text-emerald-100">IFSC Code</label>
                            <input type="text" value={formData.bankDetails?.ifscCode || ''} onChange={(e) => handleBankChange('ifscCode', e.target.value)} className="w-full p-1 text-sm border border-emerald-400 dark:border-emerald-600 rounded bg-white dark:bg-dark-card dark:text-dark-text focus:ring-1 focus:ring-emerald-500 transition-all" />
                        </div>
                        <div className="bg-gradient-to-br from-lime-50 to-lime-100 dark:from-lime-900/30 dark:to-lime-800/20 p-1.5 rounded-lg border border-lime-300 dark:border-lime-700">
                            <label className="flex text-xs font-semibold mb-0.5 text-lime-900 dark:text-lime-100">Account Holder Name</label>
                            <input type="text" value={formData.bankDetails?.accountHolderName || ''} onChange={(e) => handleBankChange('accountHolderName', e.target.value)} className="w-full p-1 text-sm border border-lime-400 dark:border-lime-600 rounded bg-white dark:bg-dark-card dark:text-dark-text focus:ring-1 focus:ring-lime-500 transition-all" />
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 p-1.5 rounded-lg border border-green-300 dark:border-green-700">
                            <label className="flex text-xs font-semibold mb-0.5 text-green-900 dark:text-green-100">Branch</label>
                            <input type="text" value={formData.bankDetails?.branch || ''} onChange={(e) => handleBankChange('branch', e.target.value)} className="w-full p-1 text-sm border border-green-400 dark:border-green-600 rounded bg-white dark:bg-dark-card dark:text-dark-text focus:ring-1 focus:ring-green-500 transition-all" />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Account Pattern with Cyan Gradient */}
            <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-cyan-600 via-teal-600 to-blue-600 p-1 text-white">
                    <h4 className="text-sm font-bold flex items-center gap-1">
                        <Hash className="h-4 w-4" />
                        Account Pattern (Number Formats)
                    </h4>
                </div>
                <div className="p-2 bg-white dark:bg-dark-card">
                    <div className="space-y-1">
                        {/* Pattern Info */}
                        <div className="bg-cyan-50 dark:bg-cyan-900/20 border-l-2 border-cyan-500 p-1 rounded text-xs mb-1">
                            <p className="font-semibold text-cyan-900 dark:text-cyan-100">Placeholders: <code className="bg-cyan-100 dark:bg-cyan-800 px-0.5 rounded">{'{YYYY}'}</code> Year, <code className="bg-cyan-100 dark:bg-cyan-800 px-0.5 rounded">{'{MM}'}</code> Month, <code className="bg-cyan-100 dark:bg-cyan-800 px-0.5 rounded">{'{####}'}</code> Auto number</p>
                        </div>

                        {/* Sell Challan Pattern */}
                        <div className="grid grid-cols-12 gap-1 items-center bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-900/30 dark:to-teal-900/20 p-1 rounded-lg border border-cyan-300 dark:border-cyan-700">
                            <div className="col-span-3">
                                <label className="text-xs font-semibold text-cyan-900 dark:text-cyan-100">Sell Challan</label>
                            </div>
                            <div className="col-span-7">
                                <input type="text" value={numberPatterns.sellChallan?.pattern || ''} onChange={(e) => handlePatternChange('sellChallan', 'pattern', e.target.value)} placeholder="SC/{YYYY}/{MM}/{####}" className="w-full p-1 border border-cyan-400 dark:border-cyan-600 rounded bg-white dark:bg-dark-card dark:text-dark-text text-xs" />
                            </div>
                            <div className="col-span-2 flex items-center justify-center">
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input type="checkbox" checked={numberPatterns.sellChallan?.autoGenerate || false} onChange={(e) => handlePatternChange('sellChallan', 'autoGenerate', e.target.checked)} className="w-3 h-3 text-cyan-600 rounded focus:ring-cyan-500" />
                                    <span className="text-xs font-medium text-cyan-900 dark:text-cyan-100">Auto</span>
                                </label>
                            </div>
                        </div>

                        {/* Voucher Pattern */}
                        <div className="grid grid-cols-12 gap-1 items-center bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/30 dark:to-cyan-900/20 p-1 rounded-lg border border-teal-300 dark:border-teal-700">
                            <div className="col-span-3">
                                <label className="text-xs font-semibold text-teal-900 dark:text-teal-100">Voucher</label>
                            </div>
                            <div className="col-span-7">
                                <input type="text" value={numberPatterns.voucher?.pattern || ''} onChange={(e) => handlePatternChange('voucher', 'pattern', e.target.value)} placeholder="VCH/{YYYY}/{####}" className="w-full p-1 border border-teal-400 dark:border-teal-600 rounded bg-white dark:bg-dark-card dark:text-dark-text text-xs" />
                            </div>
                            <div className="col-span-2 flex items-center justify-center">
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input type="checkbox" checked={numberPatterns.voucher?.autoGenerate || false} onChange={(e) => handlePatternChange('voucher', 'autoGenerate', e.target.checked)} className="w-3 h-3 text-teal-600 rounded focus:ring-teal-500" />
                                    <span className="text-xs font-medium text-teal-900 dark:text-teal-100">Auto</span>
                                </label>
                            </div>
                        </div>

                        {/* Cash Receipt Pattern */}
                        <div className="grid grid-cols-12 gap-1 items-center bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/20 p-1 rounded-lg border border-blue-300 dark:border-blue-700">
                            <div className="col-span-3">
                                <label className="text-xs font-semibold text-blue-900 dark:text-blue-100">Cash Receipt</label>
                            </div>
                            <div className="col-span-7">
                                <input type="text" value={numberPatterns.cashReceipt?.pattern || ''} onChange={(e) => handlePatternChange('cashReceipt', 'pattern', e.target.value)} placeholder="CR/{YYYY}/{####}" className="w-full p-1 border border-blue-400 dark:border-blue-600 rounded bg-white dark:bg-dark-card dark:text-dark-text text-xs" />
                            </div>
                            <div className="col-span-2 flex items-center justify-center">
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input type="checkbox" checked={numberPatterns.cashReceipt?.autoGenerate || false} onChange={(e) => handlePatternChange('cashReceipt', 'autoGenerate', e.target.checked)} className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500" />
                                    <span className="text-xs font-medium text-blue-900 dark:text-blue-100">Auto</span>
                                </label>
                            </div>
                        </div>

                        {/* Estimate Pattern */}
                        <div className="grid grid-cols-12 gap-1 items-center bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-900/30 dark:to-teal-900/20 p-1 rounded-lg border border-cyan-300 dark:border-cyan-700">
                            <div className="col-span-3">
                                <label className="text-xs font-semibold text-cyan-900 dark:text-cyan-100">Estimate</label>
                            </div>
                            <div className="col-span-7">
                                <input type="text" value={numberPatterns.estimate?.pattern || ''} onChange={(e) => handlePatternChange('estimate', 'pattern', e.target.value)} placeholder="EST/{YYYY}/{####}" className="w-full p-1 border border-cyan-400 dark:border-cyan-600 rounded bg-white dark:bg-dark-card dark:text-dark-text text-xs" />
                            </div>
                            <div className="col-span-2 flex items-center justify-center">
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input type="checkbox" checked={numberPatterns.estimate?.autoGenerate || false} onChange={(e) => handlePatternChange('estimate', 'autoGenerate', e.target.checked)} className="w-3 h-3 text-cyan-600 rounded focus:ring-cyan-500" />
                                    <span className="text-xs font-medium text-cyan-900 dark:text-cyan-100">Auto</span>
                                </label>
                            </div>
                        </div>

                        {/* Invoice Pattern */}
                        <div className="grid grid-cols-12 gap-1 items-center bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/30 dark:to-cyan-900/20 p-1 rounded-lg border border-teal-300 dark:border-teal-700">
                            <div className="col-span-3">
                                <label className="text-xs font-semibold text-teal-900 dark:text-teal-100">Invoice</label>
                            </div>
                            <div className="col-span-7">
                                <input type="text" value={numberPatterns.invoice?.pattern || ''} onChange={(e) => handlePatternChange('invoice', 'pattern', e.target.value)} placeholder="INV/{YYYY}/{####}" className="w-full p-1 border border-teal-400 dark:border-teal-600 rounded bg-white dark:bg-dark-card dark:text-dark-text text-xs" />
                            </div>
                            <div className="col-span-2 flex items-center justify-center">
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input type="checkbox" checked={numberPatterns.invoice?.autoGenerate || false} onChange={(e) => handlePatternChange('invoice', 'autoGenerate', e.target.checked)} className="w-3 h-3 text-teal-600 rounded focus:ring-teal-500" />
                                    <span className="text-xs font-medium text-teal-900 dark:text-teal-100">Auto</span>
                                </label>
                            </div>
                        </div>

                        {/* Purchase Challan Pattern */}
                        <div className="grid grid-cols-12 gap-1 items-center bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/20 p-1 rounded-lg border border-blue-300 dark:border-blue-700">
                            <div className="col-span-3">
                                <label className="text-xs font-semibold text-blue-900 dark:text-blue-100">Purchase Challan</label>
                            </div>
                            <div className="col-span-7">
                                <input type="text" value={numberPatterns.purchaseChallan?.pattern || ''} onChange={(e) => handlePatternChange('purchaseChallan', 'pattern', e.target.value)} placeholder="PC/{YYYY}/{MM}/{####}" className="w-full p-1 border border-blue-400 dark:border-blue-600 rounded bg-white dark:bg-dark-card dark:text-dark-text text-xs" />
                            </div>
                            <div className="col-span-2 flex items-center justify-center">
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input type="checkbox" checked={numberPatterns.purchaseChallan?.autoGenerate || false} onChange={(e) => handlePatternChange('purchaseChallan', 'autoGenerate', e.target.checked)} className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500" />
                                    <span className="text-xs font-medium text-blue-900 dark:text-blue-100">Auto</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Services Offered with Rose Gradient */}
            <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-rose-600 via-pink-600 to-fuchsia-600 p-1 text-white">
                    <h4 className="text-sm font-bold flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        Services Offered
                    </h4>
                </div>
                <div className="p-2 bg-white dark:bg-dark-card">
                    <div className="space-y-1 mb-1.5">
                        {companyDetails.services.map((service, index) => (
                            <div key={index} className="flex justify-between items-center p-1 bg-gradient-to-r from-rose-100 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/30 rounded-lg border border-rose-300 dark:border-rose-700">
                                <span className="text-xs font-medium text-rose-900 dark:text-rose-100">{service}</span>
                                <button onClick={() => { removeService(index); toast.success('Service removed'); }} className="text-red-600 hover:text-red-700 bg-red-100 dark:bg-red-900/30 p-0.5 rounded hover:bg-red-200 transition-all">
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-1">
                        <input type="text" value={newService} onChange={(e) => setNewService(e.target.value)} placeholder="Add new service..." className="flex-1 p-1 text-sm border border-rose-400 dark:border-rose-600 rounded-lg bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 dark:text-dark-text focus:ring-1 focus:ring-rose-500 transition-all" />
                        <Button onClick={handleAddService} className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 shadow rounded-lg px-2 py-1 text-xs">
                            <Plus className="h-3 w-3 mr-0.5" />Add
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Terms & Conditions - Estimate (Green) */}
            <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 p-1 text-white">
                    <h4 className="text-sm font-bold flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        Terms & Conditions - Estimate
                    </h4>
                </div>
                <div className="p-2 bg-white dark:bg-dark-card">
                    <div className="space-y-1 mb-1.5">
                        {(companyDetails.termsEstimate || []).map((term, index) => (
                            <div key={index} className="flex justify-between items-center p-1 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg border border-green-300 dark:border-green-700">
                                <span className="text-xs font-medium text-green-900 dark:text-green-100">{term}</span>
                                <button onClick={() => { removeTermsEstimate(index); toast.success('Term removed'); }} className="text-red-600 hover:text-red-700 bg-red-100 dark:bg-red-900/30 p-0.5 rounded hover:bg-red-200 transition-all">
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-1">
                        <input type="text" value={newEstimateTerm} onChange={(e) => setNewEstimateTerm(e.target.value)} placeholder="Add new estimate term..." className="flex-1 p-1 text-sm border border-green-400 dark:border-green-600 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 dark:text-dark-text focus:ring-1 focus:ring-green-500 transition-all" />
                        <Button onClick={handleAddEstimateTerm} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow rounded-lg px-2 py-1 text-xs">
                            <Plus className="h-3 w-3 mr-0.5" />Add
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Terms & Conditions - Invoice (Blue) */}
            <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-600 p-1 text-white">
                    <h4 className="text-sm font-bold flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        Terms & Conditions - Invoice
                    </h4>
                </div>
                <div className="p-2 bg-white dark:bg-dark-card">
                    <div className="space-y-1 mb-1.5">
                        {(companyDetails.termsInvoice || []).map((term, index) => (
                            <div key={index} className="flex justify-between items-center p-1 bg-gradient-to-r from-blue-100 to-sky-100 dark:from-blue-900/30 dark:to-sky-900/30 rounded-lg border border-blue-300 dark:border-blue-700">
                                <span className="text-xs font-medium text-blue-900 dark:text-blue-100">{term}</span>
                                <button onClick={() => { removeTermsInvoice(index); toast.success('Term removed'); }} className="text-red-600 hover:text-red-700 bg-red-100 dark:bg-red-900/30 p-0.5 rounded hover:bg-red-200 transition-all">
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-1">
                        <input type="text" value={newInvoiceTerm} onChange={(e) => setNewInvoiceTerm(e.target.value)} placeholder="Add new invoice term..." className="flex-1 p-1 text-sm border border-blue-400 dark:border-blue-600 rounded-lg bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20 dark:text-dark-text focus:ring-1 focus:ring-blue-500 transition-all" />
                        <Button onClick={handleAddInvoiceTerm} className="bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 shadow rounded-lg px-2 py-1 text-xs">
                            <Plus className="h-3 w-3 mr-0.5" />Add
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Final Save Button */}
            <div className="flex justify-end">
                <Button onClick={handleSave} className="px-4 py-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg rounded-lg font-semibold text-sm">
                    <Save className="h-4 w-4 mr-1" />
                    Save All Changes
                </Button>
            </div>
        </div>
    );
};

export default CompanyMasterTab;


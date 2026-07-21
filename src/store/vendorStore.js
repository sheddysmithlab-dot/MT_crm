import { create } from 'zustand';
import { toast } from 'sonner';
import cachedDb from '@/utils/cachedDbOperations';
import { recalculateVendorBalance, generateCode } from '@/lib/db';
const dbOperations = cachedDb;
import unifiedDataFlowManager from '@/utils/unifiedDataFlowManager.js';
import unifiedSyncManager from '@/utils/unifiedSyncManager.js';
import {
  createServiceOrder,
  postVendorInvoice,
  recordVendorPayment,
  getVendorLedger,
  getVendorSummary,
  linkVendorInvoiceToJob,
  uploadVendorDocument
} from '@/utils/vendorModuleHelpers';
import { apiListOrLocal, apiSaveEntity, apiDeleteEntity } from '@/utils/apiEntityStore';
import { writeDesktopJson } from '@/utils/desktopFileWrite';

const useVendorStore = create((set, get) => ({
  vendors: [],
  selectedVendor: null,
  vendorSummary: null,
  vendorLedger: null,
  serviceOrders: [],
  vendorInvoices: [],
  loading: false,
  error: null,

  fetchVendors: async () => {
    try {
      set({ loading: true, error: null });
      const data = await apiListOrLocal('vendors', () => dbOperations.getAll('vendors'));
      // Sort by created_at descending (newest first)
      const sorted = (data || []).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      set({ vendors: sorted, loading: false });
      return sorted;
    } catch (error) {
      console.error('Error fetching vendors:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to load vendors');
      throw error;
    }
  },

  selectVendor: async (vendorId) => {
    set({ loading: true, error: null });
    try {
      const [vendor, summary, orders, invoices, ledger] = await Promise.all([
        dbOperations.getById('vendors', vendorId),
        getVendorSummary(vendorId),
        dbOperations.getByIndex('vendor_orders', 'vendorId', vendorId),
        dbOperations.getByIndex('vendor_invoices', 'vendorId', vendorId),
        getVendorLedger(vendorId)
      ]);

      set({
        selectedVendor: vendor,
        vendorSummary: summary,
        serviceOrders: orders || [],
        vendorInvoices: invoices || [],
        vendorLedger: ledger,
        loading: false
      });

      return vendor;
    } catch (error) {
      console.error('Error selecting vendor:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to load vendor details');
      throw error;
    }
  },

  addVendor: async (vendorData) => {
    try {
      set({ loading: true, error: null });
      const code = vendorData.code || await generateCode('VEN', 4);
      const newVendor = {
        code,
        name: vendorData.name,
        company: vendorData.company || null,
        phone: vendorData.phone,
        address: vendorData.address || null,
        gstin: vendorData.gstin || vendorData.GSTIN || null,
        pan: vendorData.pan || vendorData.PAN || null,
        serviceCategories: vendorData.serviceCategories || [],
        certifications: vendorData.certifications || [],
        licenseNumbers: vendorData.licenseNumbers || [],
        paymentTerms: vendorData.paymentTerms || 0,
        hourlyRate: vendorData.hourlyRate || 0,
        contractRate: vendorData.contractRate || 0,
        vendorType: vendorData.vendorType || vendorData.vendor_type || 'service_provider',
        vendor_type: vendorData.vendorType || vendorData.vendor_type || 'service_provider',
        isActive: vendorData.isActive !== false,
        opening_balance: vendorData.opening_balance || 0,
        current_balance: vendorData.opening_balance || 0,
        credit_limit: vendorData.credit_limit || 0,
        serviceType: vendorData.serviceType || null,
      };

      const data = await dbOperations.insert('vendors', newVendor);

      if (data && parseFloat(data.opening_balance) !== 0) {
        await dbOperations.insert('vendor_ledger_entries', {
          vendor_id: data.id,
          entry_date: new Date().toISOString().split('T')[0],
          particulars: 'Opening Balance',
          ref_type: 'opening',
          debit: parseFloat(data.opening_balance),
          credit: 0,
        });
      }

      // Save to backend file
      if (window.electron?.fs?.writeFile) {
        try {
          const allVendors = await dbOperations.getAll('vendors');
          await writeDesktopJson(
            'C:/malwa-crm/Data_base/vendor/Details.json',
            allVendors
          );
          console.log('✅ Vendors saved to backend');
        } catch (err) {
          console.error('❌ Failed to save vendors to backend:', err);
        }
      }

      set((state) => ({ vendors: [...state.vendors, data], loading: false }));
      toast.success('Vendor added successfully');
      return data;
    } catch (error) {
      console.error('Error adding vendor:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to add vendor');
      throw error;
    }
  },

  updateVendor: async (updatedVendor) => {
    try {
      set({ loading: true, error: null });
      await dbOperations.update('vendors', updatedVendor.id, {
        name: updatedVendor.name,
        company: updatedVendor.company,
        phone: updatedVendor.phone,
        address: updatedVendor.address,
        gstin: updatedVendor.gstin,
        serviceType: updatedVendor.serviceType,
        vendor_type: updatedVendor.vendor_type,
        credit_limit: updatedVendor.credit_limit,
        opening_balance: updatedVendor.opening_balance || 0,
      });

      // Save to backend file
      if (window.electron?.fs?.writeFile) {
        try {
          const allVendors = await dbOperations.getAll('vendors');
          await writeDesktopJson(
            'C:/malwa-crm/Data_base/vendor/Details.json',
            allVendors
          );
          console.log('✅ Vendors updated in backend');
        } catch (err) {
          console.error('❌ Failed to update vendors in backend:', err);
        }
      }

      set((state) => ({
        vendors: state.vendors.map((v) => (v.id === updatedVendor.id ? { ...v, ...updatedVendor } : v)),
        loading: false,
      }));
      toast.success('Vendor updated successfully');
    } catch (error) {
      console.error('Error updating vendor:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to update vendor');
      throw error;
    }
  },

  deleteVendor: async (vendorId) => {
    try {
      set({ loading: true, error: null });
      await dbOperations.delete('vendors', vendorId);

      // Save to backend file
      if (window.electron?.fs?.writeFile) {
        try {
          const allVendors = await dbOperations.getAll('vendors');
          await writeDesktopJson(
            'C:/malwa-crm/Data_base/vendor/Details.json',
            allVendors
          );
          console.log('✅ Vendors deleted from backend');
        } catch (err) {
          console.error('❌ Failed to delete vendors from backend:', err);
        }
      }

      set((state) => ({
        vendors: state.vendors.filter((v) => v.id !== vendorId),
        loading: false,
      }));
      toast.success('Vendor deleted successfully');
    } catch (error) {
      console.error('Error deleting vendor:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to delete vendor');
      throw error;
    }
  },

  // Service Order Operations
  createServiceOrder: async (vendorId, orderData, serviceItems = []) => {
    set({ loading: true, error: null });
    try {
      const order = await createServiceOrder(
        { ...orderData, vendorId },
        serviceItems
      );

      set((state) => ({
        serviceOrders: [...state.serviceOrders, order],
        loading: false
      }));
      toast.success('Service order created successfully');

      return order;
    } catch (error) {
      console.error('Error creating service order:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to create service order: ' + error.message);
      throw error;
    }
  },

  // Vendor Invoice Operations
  postInvoice: async (vendorId, invoiceData, serviceItems = []) => {
    set({ loading: true, error: null });
    try {
      const result = await postVendorInvoice(
        { ...invoiceData, vendorId },
        serviceItems
      );

      set((state) => ({
        vendorInvoices: [...state.vendorInvoices, result.invoice],
        loading: false
      }));
      toast.success('Vendor invoice posted successfully');

      // Refresh vendor data
      await get().selectVendor(vendorId);

      return result;
    } catch (error) {
      console.error('Error posting vendor invoice:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to post invoice: ' + error.message);
      throw error;
    }
  },

  linkInvoiceToJob: async (invoiceId, jobId) => {
    set({ loading: true, error: null });
    try {
      const result = await linkVendorInvoiceToJob(invoiceId, jobId);

      set({ loading: false });
      toast.success('Invoice linked to job successfully');

      return result;
    } catch (error) {
      console.error('Error linking invoice to job:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to link invoice: ' + error.message);
      throw error;
    }
  },

  recordPayment: async (vendorId, invoiceId, paymentData) => {
    set({ loading: true, error: null });
    try {
      const result = await recordVendorPayment(vendorId, invoiceId, paymentData);

      set({ loading: false });
      toast.success('Payment recorded successfully');

      // Refresh vendor data
      await get().selectVendor(vendorId);

      return result;
    } catch (error) {
      console.error('Error recording payment:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to record payment: ' + error.message);
      throw error;
    }
  },

  getLedger: async (vendorId, fromDate, toDate) => {
    set({ loading: true, error: null });
    try {
      const ledger = await getVendorLedger(vendorId, fromDate, toDate);
      set({ vendorLedger: ledger, loading: false });
      return ledger;
    } catch (error) {
      console.error('Error fetching ledger:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to load ledger');
      throw error;
    }
  },

  uploadDocument: async (vendorId, fileData, metadata) => {
    set({ loading: true, error: null });
    try {
      const document = await uploadVendorDocument(vendorId, fileData, metadata);

      set({ loading: false });
      toast.success('Document uploaded successfully');

      return document;
    } catch (error) {
      console.error('Error uploading document:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to upload document: ' + error.message);
      throw error;
    }
  },
}));

export default useVendorStore;

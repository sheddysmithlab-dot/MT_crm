import { create } from 'zustand';
import { toast } from 'sonner';
import cachedDb from '@/utils/cachedDbOperations';
import { recalculateSupplierBalance, generateCode } from '@/lib/db';
const dbOperations = cachedDb;
import unifiedDataFlowManager from '@/utils/unifiedDataFlowManager.js';
import unifiedSyncManager from '@/utils/unifiedSyncManager.js';
import {
  postPurchaseInvoice,
  createGRN,
  recordSupplierPayment,
  getSupplierLedger,
  getSupplierSummary,
  uploadSupplierDocument
} from '@/utils/supplierModuleHelpers';
import { apiListOrLocal } from '@/utils/apiEntityStore';

// Store constants
const SUPPLIER_STORE = 'suppliers';

const useSupplierStore = create((set, get) => ({
  suppliers: [],
  selectedSupplier: null,
  supplierSummary: null,
  supplierLedger: null,
  purchases: [],
  loading: false,
  error: null,

  fetchSuppliers: async () => {
    try {
      set({ loading: true, error: null });
      const data = await apiListOrLocal('suppliers', () => dbOperations.getAll(SUPPLIER_STORE));
      set({ suppliers: data || [], loading: false });
      return data;
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to load suppliers');
      throw error;
    }
  },

  selectSupplier: async (supplierId) => {
    set({ loading: true, error: null });
    try {
      const [supplier, summary, purchases, ledger] = await Promise.all([
        dbOperations.getById(SUPPLIER_STORE, supplierId),
        getSupplierSummary(supplierId),
        dbOperations.getByIndex('purchases', 'supplierId', supplierId),
        getSupplierLedger(supplierId)
      ]);

      set({
        selectedSupplier: supplier,
        supplierSummary: summary,
        purchases: purchases || [],
        supplierLedger: ledger,
        loading: false
      });

      return supplier;
    } catch (error) {
      console.error('Error selecting supplier:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to load supplier details');
      throw error;
    }
  },

  addSupplier: async (supplierData) => {
    try {
      set({ loading: true, error: null });
      const code = supplierData.code || await generateCode('SUP', 4);
      const newSupplier = {
        code,
        name: supplierData.name,
        company: supplierData.company || null,
        phone: supplierData.phone,
        category: supplierData.category || null,
        address: supplierData.address || null,
        gstin: supplierData.gstin || supplierData.GSTIN || null,
        pan: supplierData.pan || supplierData.PAN || null,
        paymentTerms: supplierData.paymentTerms || 0,
        creditLimit: supplierData.creditLimit || supplierData.credit_limit || 0,
        creditPeriod: supplierData.creditPeriod || 0,
        productCategories: supplierData.productCategories || [],
        supplierType: supplierData.supplierType || 'regular',
        isActive: supplierData.isActive !== false,
        opening_balance: supplierData.opening_balance || 0,
        current_balance: supplierData.opening_balance || 0,
      };

      const data = await dbOperations.insert(SUPPLIER_STORE, newSupplier);

      if (data && parseFloat(data.opening_balance) !== 0) {
        await dbOperations.insert('supplier_ledger_entries', {
          supplier_id: data.id,
          entry_date: new Date().toISOString().split('T')[0],
          particulars: 'Opening Balance',
          ref_type: 'opening',
          debit: parseFloat(data.opening_balance),
          credit: 0,
        });
      }

      set((state) => ({ suppliers: [...state.suppliers, data], loading: false }));
      toast.success('Supplier added successfully');
      return data;
    } catch (error) {
      console.error('Error adding supplier:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to add supplier');
      throw error;
    }
  },

  updateSupplier: async (updatedSupplier) => {
    try {
      set({ loading: true, error: null });
      await dbOperations.update(SUPPLIER_STORE, updatedSupplier.id, {
        name: updatedSupplier.name,
        company: updatedSupplier.company,
        phone: updatedSupplier.phone,
        address: updatedSupplier.address,
        gstin: updatedSupplier.gstin,
        category: updatedSupplier.category,
        credit_limit: updatedSupplier.credit_limit,
        opening_balance: updatedSupplier.opening_balance || 0,
        pan: updatedSupplier.pan || null,
        paymentTerms: updatedSupplier.paymentTerms || 0,
        creditPeriod: updatedSupplier.creditPeriod || 0,
        supplierType: updatedSupplier.supplierType || 'regular',
      });

      set((state) => ({
        suppliers: state.suppliers.map((s) => (s.id === updatedSupplier.id ? { ...s, ...updatedSupplier } : s)),
        loading: false,
      }));
      toast.success('Supplier updated successfully');
    } catch (error) {
      console.error('Error updating supplier:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to update supplier');
      throw error;
    }
  },

  deleteSupplier: async (supplierId) => {
    try {
      set({ loading: true, error: null });
      await dbOperations.delete(SUPPLIER_STORE, supplierId);

      set((state) => ({
        suppliers: state.suppliers.filter((s) => s.id !== supplierId),
        loading: false,
      }));
      toast.success('Supplier deleted successfully');
    } catch (error) {
      console.error('Error deleting supplier:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to delete supplier');
      throw error;
    }
  },

  // Purchase Operations
  postPurchase: async (supplierId, purchaseData, items, createGRN = true) => {
    set({ loading: true, error: null });
    try {
      const result = await postPurchaseInvoice(
        { ...purchaseData, supplierId },
        items,
        createGRN
      );

      set({ loading: false });
      toast.success('Purchase posted successfully');

      // Refresh supplier data
      await get().selectSupplier(supplierId);

      return result;
    } catch (error) {
      console.error('Error posting purchase:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to post purchase: ' + error.message);
      throw error;
    }
  },

  createGRN: async (purchaseId, challanData) => {
    set({ loading: true, error: null });
    try {
      const result = await createGRN(purchaseId, challanData);

      set({ loading: false });
      toast.success('GRN created successfully');

      return result;
    } catch (error) {
      console.error('Error creating GRN:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to create GRN: ' + error.message);
      throw error;
    }
  },

  recordPayment: async (supplierId, purchaseId, paymentData) => {
    set({ loading: true, error: null });
    try {
      const result = await recordSupplierPayment(supplierId, purchaseId, paymentData);

      set({ loading: false });
      toast.success('Payment recorded successfully');

      // Refresh supplier data
      await get().selectSupplier(supplierId);

      return result;
    } catch (error) {
      console.error('Error recording payment:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to record payment: ' + error.message);
      throw error;
    }
  },

  getLedger: async (supplierId, fromDate, toDate) => {
    set({ loading: true, error: null });
    try {
      const ledger = await getSupplierLedger(supplierId, fromDate, toDate);
      set({ supplierLedger: ledger, loading: false });
      return ledger;
    } catch (error) {
      console.error('Error fetching ledger:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to load ledger');
      throw error;
    }
  },

  uploadDocument: async (supplierId, fileData, metadata) => {
    set({ loading: true, error: null });
    try {
      const document = await uploadSupplierDocument(supplierId, fileData, metadata);

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

export default useSupplierStore;

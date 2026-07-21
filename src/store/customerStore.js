import { create } from 'zustand';
import { toast } from 'sonner';
import cachedDb from '@/utils/cachedDbOperations';
import { recalculateCustomerBalance } from '@/lib/db';
const dbOperations = cachedDb;
import unifiedDataFlowManager from '@/utils/unifiedDataFlowManager.js';
import unifiedSyncManager from '@/utils/unifiedSyncManager.js';
import { 
  saveCustomer, 
  convertLeadToCustomer,
  getCustomerWithRelations,
  getCustomerLedger,
  createInvoiceFromCustomer,
  recordCustomerPayment,
  uploadCustomerDocument,
  getCustomerDocuments,
  exportCustomerData,
  importCustomers,
  getCustomerSummary,
  searchCustomers,
  checkDuplicateCustomer
} from '@/utils/customerModuleHelpers';
import { isApiModeEnabled } from '@/api/client';
import { listCustomers, createCustomer as apiCreateCustomer, updateCustomer as apiUpdateCustomer, deleteCustomer as apiDeleteCustomer } from '@/api/customers';
import { enqueueMutation } from '@/utils/webSyncQueue';
import { isOnline } from '@/utils/networkStatus';
import { apiSaveEntity, apiDeleteEntity } from '@/utils/apiEntityStore';

const useCustomerStore = create((set, get) => ({
  customers: [],
  leads: [],
  selectedCustomer: null,
  customerSummary: null,
  customerLedger: null,
  customerDocuments: [],
  loading: false,
  error: null,

  fetchCustomers: async () => {
    set({ loading: true, error: null });
    try {
      // Option B: load from API when web mode + online
      if (isApiModeEnabled() && isOnline()) {
        try {
          const data = await listCustomers({ limit: 500 });
          const sorted = (data || []).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
          const customersList = sorted.filter(c => c.type === 'customer' || !c.type);
          const leadsList = sorted.filter(c => c.type === 'lead');
          set({ customers: customersList || [], leads: leadsList || [] });
          // Mirror into local Dexie for offline reads
          for (const row of sorted) {
            try {
              await dbOperations.put('customers', row);
            } catch {
              /* ignore mirror errors */
            }
          }
          return data;
        } catch (apiErr) {
          console.warn('[customers] API fetch failed, falling back to local:', apiErr);
        }
      }

      const data = await dbOperations.getAll('customers');
      // Sort by created_at descending (newest first)
      const sorted = (data || []).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      const customersList = sorted.filter(c => c.type === 'customer' || !c.type);
      const leadsList = sorted.filter(c => c.type === 'lead');
      
      set({ 
        customers: customersList || [], 
        leads: leadsList || []
      });
      return data;
    } catch (error) {
      console.error('Error fetching customers:', error);
      set({ error: error.message });
      toast.error('Failed to load customers');
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  searchCustomers: async (searchTerm, filters = {}) => {
    set({ loading: true, error: null });
    try {
      const results = await searchCustomers(searchTerm, filters);
      return results;
    } catch (error) {
      console.error('Error searching customers:', error);
      set({ error: error.message });
      toast.error('Search failed');
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  addCustomer: async (customer) => {
    set({ loading: true, error: null });
    try {
      console.log('📝 Adding customer with data:', customer);

      // Option B web path
      if (isApiModeEnabled()) {
        const id = customer.id || (crypto.randomUUID ? crypto.randomUUID() : `c_${Date.now()}`);
        const payload = {
          ...customer,
          id,
          type: customer.type || 'customer',
          updated_at: new Date().toISOString(),
          created_at: customer.created_at || new Date().toISOString(),
        };

        let data = payload;
        if (isOnline()) {
          try {
            data = await apiCreateCustomer(payload);
          } catch (apiErr) {
            console.warn('[customers] API create failed, queueing:', apiErr);
            await dbOperations.put('customers', payload);
            await enqueueMutation({
              table: 'customers',
              recordId: id,
              operation: 'upsert',
              data: payload,
            });
            data = payload;
            toast.warning('Saved offline — will sync when online');
          }
        } else {
          await dbOperations.put('customers', payload);
          await enqueueMutation({
            table: 'customers',
            recordId: id,
            operation: 'upsert',
            data: payload,
          });
          toast.warning('Saved offline — will sync when online');
        }

        set((state) => ({
          customers: data.type === 'lead' ? state.customers : [data, ...state.customers],
          leads: data.type === 'lead' ? [data, ...state.leads] : state.leads,
          loading: false,
        }));
        if (isOnline()) toast.success(data.type === 'lead' ? 'Lead added' : 'Customer added');
        return { success: true, customer: data };
      }

      const result = await saveCustomer(customer, false);
      
      if (!result.success) {
        console.log('❌ Customer save failed:', result.message);
        set({ loading: false });
        toast.warning(result.message);
        return result;
      }

      const data = result.customer;
      console.log('✅ Customer saved successfully:', data);

      // Create opening balance ledger entry if needed
      if (data.opening_balance && data.opening_balance > 0) {
        await dbOperations.insert('customer_ledger_entries', {
          customer_id: data.id,
          entry_date: new Date().toISOString().split('T')[0],
          particulars: 'Opening Balance',
          ref_type: 'opening',
          debit: data.opening_balance,
          credit: 0,
          balance: data.opening_balance,
        });
      }

      set((state) => ({
        customers: data.type === 'lead' ? state.customers : [data, ...state.customers],
        leads: data.type === 'lead' ? [data, ...state.leads] : state.leads,
        loading: false,
      }));

      toast.success(data.type === 'lead' ? 'Lead added successfully' : 'Customer added successfully');
      return { success: true, customer: data };
    } catch (error) {
      console.error('Error adding customer:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to add customer: ' + error.message);
      throw error;
    }
  },

  addLead: async (leadData) => {
    set({ loading: true, error: null });
    try {
      const data = await dbOperations.insert('customers', {
        ...leadData,
        type: 'lead',
        created_at: new Date().toISOString(),
      });

      set((state) => ({
        leads: [data, ...state.leads],
        loading: false,
      }));

      toast.success('Lead added successfully');
      return data;
    } catch (error) {
      console.error('Error adding lead:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to add lead: ' + error.message);
      throw error;
    }
  },

  updateLead: async (updatedLead) => {
    set({ loading: true, error: null });
    try {
      const data = await dbOperations.update('customers', updatedLead.id, {
        ...updatedLead,
        type: 'lead',
        updated_at: new Date().toISOString(),
      });

      set((state) => ({
        leads: state.leads.map((l) => (l.id === updatedLead.id ? data : l)),
        loading: false,
      }));

      toast.success('Lead updated successfully');
      return data;
    } catch (error) {
      console.error('Error updating lead:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to update lead');
      throw error;
    }
  },

  deleteLead: async (leadId) => {
    set({ loading: true, error: null });
    try {
      await dbOperations.delete('customers', leadId);

      set((state) => ({
        leads: state.leads.filter((l) => l.id !== leadId),
        loading: false,
      }));

      toast.success('Lead deleted successfully');
    } catch (error) {
      console.error('Error deleting lead:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to delete lead');
      throw error;
    }
  },

  updateCustomer: async (updatedCustomer) => {
    set({ loading: true, error: null });
    try {
      if (isApiModeEnabled()) {
        const data = await apiSaveEntity('customers', updatedCustomer, {
          isUpdate: true,
          localSave: async (payload) => {
            await dbOperations.put('customers', payload);
            return payload;
          },
        });
        set((state) => ({
          customers: state.customers.map((c) =>
            c.id === updatedCustomer.id ? data : c
          ),
          leads: state.leads.map((l) =>
            l.id === updatedCustomer.id ? data : l
          ),
          loading: false,
        }));
        toast.success(data._offline ? 'Updated offline — will sync' : 'Customer updated successfully');
        return { success: true, customer: data };
      }

      const result = await saveCustomer(updatedCustomer, true);
      
      if (!result.success) {
        set({ loading: false });
        toast.warning(result.message);
        return result;
      }

      const data = result.customer;

      set((state) => ({
        customers: state.customers.map((c) =>
          c.id === updatedCustomer.id ? data : c
        ),
        leads: state.leads.map((l) =>
          l.id === updatedCustomer.id ? data : l
        ),
        loading: false,
      }));

      toast.success('Customer updated successfully');
      return { success: true, customer: data };
    } catch (error) {
      console.error('Error updating customer:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to update customer');
      throw error;
    }
  },

  deleteCustomer: async (customerId) => {
    set({ loading: true, error: null });
    try {
      if (isApiModeEnabled()) {
        await apiDeleteEntity('customers', customerId, async (id) => {
          await dbOperations.delete('customers', id);
        });
        set((state) => ({
          customers: state.customers.filter((c) => c.id !== customerId),
          leads: state.leads.filter((l) => l.id !== customerId),
          loading: false,
        }));
        toast.success('Customer deleted successfully');
        return;
      }

      await dbOperations.delete('customers', customerId);

      set((state) => ({
        customers: state.customers.filter((c) => c.id !== customerId),
        leads: state.leads.filter((l) => l.id !== customerId),
        loading: false,
      }));

      toast.success('Customer deleted successfully');
    } catch (error) {
      console.error('Error deleting customer:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to delete customer');
      throw error;
    }
  },

  convertLeadToCustomer: async (leadId, additionalData = {}) => {
    set({ loading: true, error: null });
    try {
      const customer = await convertLeadToCustomer(leadId, additionalData);

      set((state) => ({
        leads: state.leads.filter((l) => l.id !== leadId),
        customers: [customer, ...state.customers],
        loading: false,
      }));

      toast.success('Lead converted to customer successfully');
      return customer;
    } catch (error) {
      console.error('Error converting lead:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to convert lead: ' + error.message);
      throw error;
    }
  },

  selectCustomer: async (customerId) => {
    set({ loading: true, error: null });
    try {
      const customerData = await getCustomerWithRelations(customerId);
      const summary = await getCustomerSummary(customerId);
      const documents = await getCustomerDocuments(customerId);

      set({
        selectedCustomer: customerData,
        customerSummary: summary,
        customerDocuments: documents,
        loading: false
      });

      return customerData;
    } catch (error) {
      console.error('Error selecting customer:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to load customer details');
      throw error;
    }
  },

  getCustomerLedger: async (customerId, fromDate, toDate) => {
    set({ loading: true, error: null });
    try {
      const ledger = await getCustomerLedger(customerId, fromDate, toDate);
      set({ customerLedger: ledger, loading: false });
      return ledger;
    } catch (error) {
      console.error('Error fetching ledger:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to load ledger');
      throw error;
    }
  },

  createInvoice: async (customerId, invoiceData, invoiceItems) => {
    set({ loading: true, error: null });
    try {
      const result = await createInvoiceFromCustomer(customerId, invoiceData, invoiceItems);
      
      set({ loading: false });
      toast.success('Invoice created successfully');
      
      // Refresh customer data
      await get().selectCustomer(customerId);
      
      return result;
    } catch (error) {
      console.error('Error creating invoice:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to create invoice: ' + error.message);
      throw error;
    }
  },

  recordPayment: async (customerId, invoiceId, paymentData) => {
    set({ loading: true, error: null });
    try {
      const result = await recordCustomerPayment(customerId, invoiceId, paymentData);
      
      set({ loading: false });
      toast.success('Payment recorded successfully');
      
      // Refresh customer data
      await get().selectCustomer(customerId);
      
      return result;
    } catch (error) {
      console.error('Error recording payment:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to record payment: ' + error.message);
      throw error;
    }
  },

  uploadDocument: async (customerId, fileData, metadata) => {
    set({ loading: true, error: null });
    try {
      const document = await uploadCustomerDocument(customerId, fileData, metadata);
      
      set((state) => ({
        customerDocuments: [document, ...state.customerDocuments],
        loading: false
      }));

      toast.success('Document uploaded successfully');
      return document;
    } catch (error) {
      console.error('Error uploading document:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to upload document: ' + error.message);
      throw error;
    }
  },

  exportCustomer: async (customerId) => {
    set({ loading: true, error: null });
    try {
      const result = await exportCustomerData(customerId);
      
      set({ loading: false });
      toast.success('Customer data exported successfully');
      
      return result;
    } catch (error) {
      console.error('Error exporting customer:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to export customer data');
      throw error;
    }
  },

  importCustomers: async (customersData) => {
    set({ loading: true, error: null });
    try {
      const results = await importCustomers(customersData);
      
      set({ loading: false });
      
      if (results.success.length > 0) {
        toast.success(`${results.success.length} customers imported successfully`);
      }
      
      if (results.duplicates.length > 0) {
        toast.warning(`${results.duplicates.length} duplicates found`);
      }
      
      if (results.errors.length > 0) {
        toast.error(`${results.errors.length} errors during import`);
      }
      
      // Refresh customers list
      await get().fetchCustomers();
      
      return results;
    } catch (error) {
      console.error('Error importing customers:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to import customers');
      throw error;
    }
  },

  addLedgerEntry: async (customerId, entry) => {
    set({ loading: true, error: null });
    try {
      const data = await dbOperations.insert('customer_ledger_entries', {
        customer_id: customerId,
        entry_date: entry.entry_date || new Date().toISOString().split('T')[0],
        particulars: entry.particulars,
        ref_type: entry.ref_type || null,
        ref_no: entry.ref_no || null,
        ref_id: entry.ref_id || null,
        debit: entry.debit || 0,
        credit: entry.credit || 0,
        notes: entry.notes || null,
      });

      await recalculateCustomerBalance(customerId);
      await get().fetchCustomers();

      set({ loading: false });
      toast.success('Ledger entry added successfully');
      return data;
    } catch (error) {
      console.error('Error adding ledger entry:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to add ledger entry');
      throw error;
    }
  },
}));

export default useCustomerStore;

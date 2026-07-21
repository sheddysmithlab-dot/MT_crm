import { create } from 'zustand';
import { toast } from 'sonner';
import cachedDb from '@/utils/cachedDbOperations';
import { recalculateLabourBalance } from '@/lib/db';
const dbOperations = cachedDb;
import unifiedDataFlowManager from '@/utils/unifiedDataFlowManager.js';
import unifiedSyncManager from '@/utils/unifiedSyncManager.js';
import {
  createLabourJobsheet,
  approveJobsheetWithLabourCost,
  issueJobsheetMaterials,
  recordLabourPayment,
  getLabourLedger,
  getLabourSummary,
  uploadLabourDocument
} from '@/utils/labourModuleHelpers';
import { apiListOrLocal } from '@/utils/apiEntityStore';

const useLabourStore = create((set, get) => ({
  labour: [],
  selectedLabour: null,
  labourSummary: null,
  labourLedger: null,
  jobsheets: [],
  loading: false,
  error: null,

  fetchLabour: async () => {
    try {
      set({ loading: true, error: null });
      const data = await apiListOrLocal('labour', () => dbOperations.getAll('labour'));
      // Sort by created_at descending (newest first)
      const sorted = (data || []).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      set({ labour: sorted, loading: false });
      return sorted;
    } catch (error) {
      console.error('Error fetching labour:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to load labour');
      throw error;
    }
  },

  selectLabour: async (labourId) => {
    set({ loading: true, error: null });
    try {
      const [labourData, summary, jobsheets, ledger] = await Promise.all([
        dbOperations.getById('labour', labourId),
        getLabourSummary(labourId),
        dbOperations.getByIndex('jobsheets', 'technicianId', labourId),
        getLabourLedger(labourId)
      ]);

      set({
        selectedLabour: labourData,
        labourSummary: summary,
        jobsheets: jobsheets || [],
        labourLedger: ledger,
        loading: false
      });

      return labourData;
    } catch (error) {
      console.error('Error selecting labour:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to load labour details');
      throw error;
    }
  },

  addLabour: async (labourData) => {
    try {
      set({ loading: true, error: null });
      const newLabour = {
        name: labourData.name,
        phone: labourData.phone || null,
        address: labourData.address || null,
        aadhaar_number: labourData.aadhaar_number || null,
        skill_type: labourData.skill_type || null,
        hourly_rate: labourData.hourly_rate || 0,
        daily_rate: labourData.daily_rate || 0,
        is_contractor: labourData.is_contractor || false,
        vendor_id: labourData.vendor_id || null,
        opening_balance: labourData.opening_balance || 0,
        current_balance: labourData.opening_balance || 0,
      };

      const data = await dbOperations.insert('labour', newLabour);

      if (data && parseFloat(data.opening_balance) !== 0) {
        await dbOperations.insert('labour_ledger_entries', {
          labour_id: data.id,
          entry_date: new Date().toISOString().split('T')[0],
          particulars: 'Opening Balance',
          ref_type: 'opening',
          debit: parseFloat(data.opening_balance),
          credit: 0,
        });
      }

      set((state) => ({ labour: [...state.labour, data], loading: false }));
      toast.success('Employee added successfully');
      return data;
    } catch (error) {
      console.error('Error adding labour:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to add labour');
      throw error;
    }
  },

  updateLabour: async (updatedLabour) => {
    try {
      set({ loading: true, error: null });
      await dbOperations.update('labour', updatedLabour.id, {
        name: updatedLabour.name,
        phone: updatedLabour.phone,
        address: updatedLabour.address,
        aadhaar_number: updatedLabour.aadhaar_number || null,
        skill_type: updatedLabour.skill_type,
        hourly_rate: updatedLabour.hourly_rate,
        daily_rate: updatedLabour.daily_rate,
        is_contractor: updatedLabour.is_contractor,
        vendor_id: updatedLabour.vendor_id,
        opening_balance: updatedLabour.opening_balance || 0,
      });

      set((state) => ({
        labour: state.labour.map((l) => (l.id === updatedLabour.id ? { ...l, ...updatedLabour } : l)),
        loading: false,
      }));
      toast.success('Employee updated successfully');
    } catch (error) {
      console.error('Error updating labour:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to update labour');
      throw error;
    }
  },

  deleteLabour: async (labourId) => {
    try {
      set({ loading: true, error: null });
      await dbOperations.delete('labour', labourId);

      set((state) => ({
        labour: state.labour.filter((l) => l.id !== labourId),
        loading: false,
      }));
      toast.success('Employee deleted successfully');
    } catch (error) {
      console.error('Error deleting labour:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to delete labour');
      throw error;
    }
  },

  // Jobsheet Operations
  createJobsheet: async (jobId, technicianId, jobsheetData, items = []) => {
    set({ loading: true, error: null });
    try {
      const result = await createLabourJobsheet(jobId, technicianId, jobsheetData, items);

      set((state) => ({
        jobsheets: [...state.jobsheets, result.jobsheet],
        loading: false
      }));
      toast.success('Jobsheet created successfully');

      return result;
    } catch (error) {
      console.error('Error creating jobsheet:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to create jobsheet: ' + error.message);
      throw error;
    }
  },

  approveJobsheet: async (jobsheetId, approvalData = {}) => {
    set({ loading: true, error: null });
    try {
      const result = await approveJobsheetWithLabourCost(jobsheetId, approvalData);

      set({ loading: false });
      toast.success('Jobsheet approved and labour cost posted');

      return result;
    } catch (error) {
      console.error('Error approving jobsheet:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to approve jobsheet: ' + error.message);
      throw error;
    }
  },

  issueJobsheetMaterials: async (jobsheetId) => {
    set({ loading: true, error: null });
    try {
      const result = await issueJobsheetMaterials(jobsheetId);

      set({ loading: false });
      toast.success('Materials issued successfully');

      return result;
    } catch (error) {
      console.error('Error issuing materials:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to issue materials: ' + error.message);
      throw error;
    }
  },

  recordPayment: async (labourId, paymentData, jobsheetIds = []) => {
    set({ loading: true, error: null });
    try {
      const result = await recordLabourPayment(labourId, paymentData, jobsheetIds);

      set({ loading: false });
      toast.success('Payment recorded successfully');

      // Refresh labour data
      await get().selectLabour(labourId);

      return result;
    } catch (error) {
      console.error('Error recording payment:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to record payment: ' + error.message);
      throw error;
    }
  },

  getLedger: async (labourId, fromDate, toDate) => {
    set({ loading: true, error: null });
    try {
      const ledger = await getLabourLedger(labourId, fromDate, toDate);
      set({ labourLedger: ledger, loading: false });
      return ledger;
    } catch (error) {
      console.error('Error fetching ledger:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to load ledger');
      throw error;
    }
  },

  uploadDocument: async (labourId, fileData, metadata) => {
    set({ loading: true, error: null });
    try {
      const document = await uploadLabourDocument(labourId, fileData, metadata);

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

export default useLabourStore;

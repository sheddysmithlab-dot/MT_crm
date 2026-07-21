import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import cachedDb from '@/utils/cachedDbOperations';
const dbOperations = cachedDb;
import unifiedDataFlowManager from '@/utils/unifiedDataFlowManager.js';
import unifiedSyncManager from '@/utils/unifiedSyncManager.js';
import {
  createEstimateWithItems,
  convertEstimateToJob,
  createJobsheetWithItems,
  issueChallan,
  createInvoiceWithJournal,
  getJobWithRelations,
  calculateCurrentStock,
  validateStockAvailability
} from '@/utils/jobModuleHelpers';
import { apiListOrLocal } from '@/utils/apiEntityStore';

const useJobsStore = create(
  persist(
    (set, get) => ({
      jobs: {}, // Using an object to store jobs by ID
      loading: false,
      error: null,

      // Load jobs from database
      loadJobs: async () => {
        set({ loading: true, error: null });
        try {
          const jobsArray = await apiListOrLocal('jobs', () => dbOperations.getAll('jobs'));
          const jobsMap = {};
          (jobsArray || []).forEach(job => {
            jobsMap[job.id] = job;
          });
          set({ jobs: jobsMap, loading: false });
        } catch (error) {
          console.error('Failed to load jobs:', error);
          set({ error: error.message, loading: false });
        }
      },

      // Load single job with all relations
      loadJobWithRelations: async (jobId) => {
        set({ loading: true, error: null });
        try {
          const jobData = await getJobWithRelations(jobId);
          if (jobData) {
            set(state => ({
              jobs: { ...state.jobs, [jobId]: { ...jobData.job, ...jobData } },
              loading: false
            }));
          }
        } catch (error) {
          console.error('Failed to load job with relations:', error);
          set({ error: error.message, loading: false });
        }
      },
      
      createNewJob: async (jobData) => {
        set({ loading: true, error: null });
        try {
          const jobId = uuidv4();
          const newJob = {
            id: jobId,
            ...jobData,
            status: 'Inspection',
            createdAt: new Date().toISOString(),
            syncStatus: 'pending'
          };
          
          await dbOperations.insert('jobs', newJob);
          
          set(state => ({
            jobs: { ...state.jobs, [jobId]: newJob },
            loading: false
          }));
          
          return newJob;
        } catch (error) {
          console.error('Failed to create job:', error);
          set({ error: error.message, loading: false });
          throw error;
        }
      },
      
      updateJobDetails: async (jobId, details) => {
        set({ loading: true, error: null });
        try {
          await dbOperations.update('jobs', jobId, details);
          set(state => {
            const job = state.jobs[jobId];
            if (!job) return { loading: false };
            const updatedJob = { ...job, ...details };
            return { jobs: { ...state.jobs, [jobId]: updatedJob }, loading: false };
          });
        } catch (error) {
          console.error('Failed to update job:', error);
          set({ error: error.message, loading: false });
        }
      },

      // --- Inspection Methods ---
      addInspectionItem: async (jobId, item) => {
        set({ loading: true, error: null });
        try {
          const newItem = { 
            id: uuidv4(), 
            jobId,
            ...item,
            createdAt: new Date().toISOString()
          };
          await dbOperations.insert('inspections', newItem);
          set({ loading: false });
          return newItem;
        } catch (error) {
          console.error('Failed to add inspection item:', error);
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      updateInspectionItem: async (jobId, updatedItem) => {
        set({ loading: true, error: null });
        try {
          await dbOperations.update('inspections', updatedItem.id, updatedItem);
          set({ loading: false });
        } catch (error) {
          console.error('Failed to update inspection item:', error);
          set({ error: error.message, loading: false });
        }
      },

      deleteInspectionItem: async (jobId, itemId) => {
        set({ loading: true, error: null });
        try {
          await dbOperations.delete('inspections', itemId);
          set({ loading: false });
        } catch (error) {
          console.error('Failed to delete inspection item:', error);
          set({ error: error.message, loading: false });
        }
      },

      // --- Estimate Methods ---
      createEstimate: async (jobId, estimateData, items) => {
        set({ loading: true, error: null });
        try {
          const estimate = {
            ...estimateData,
            jobId,
            customerId: estimateData.customerId,
            date: estimateData.date || new Date().toISOString(),
            status: 'Draft'
          };
          
          const result = await createEstimateWithItems(estimate, items);
          set({ loading: false });
          return result;
        } catch (error) {
          console.error('Failed to create estimate:', error);
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      generateEstimateFromInspection: async (jobId) => {
        set({ loading: true, error: null });
        try {
          const inspections = await dbOperations.getByIndex('inspections', 'jobId', jobId);
          const multipliers = { Parts: 1.5, Labour: 2, Hardware: 2, Steel: 1.5 };

          const estimateItems = inspections.map(item => ({
            id: uuidv4(),
            description: item.item || item.description,
            qty: 1,
            rate: (item.cost || 0) * (multipliers[item.category] || 1),
            originalCost: parseFloat(item.cost || 0),
            category: item.category,
          }));

          set({ loading: false });
          return estimateItems;
        } catch (error) {
          console.error('Failed to generate estimate from inspection:', error);
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      updateEstimateItem: async (jobId, updatedItem) => {
        set({ loading: true, error: null });
        try {
          await dbOperations.update('estimate_items', updatedItem.id, updatedItem);
          set({ loading: false });
        } catch (error) {
          console.error('Failed to update estimate item:', error);
          set({ error: error.message, loading: false });
        }
      },

      updateEstimateTotals: async (estimateId, newTotals) => {
        set({ loading: true, error: null });
        try {
          await dbOperations.update('estimates', estimateId, newTotals);
          set({ loading: false });
        } catch (error) {
          console.error('Failed to update estimate totals:', error);
          set({ error: error.message, loading: false });
        }
      },

      approveEstimate: async (estimateId) => {
        set({ loading: true, error: null });
        try {
          await dbOperations.update('estimates', estimateId, {
            approvalNeeded: false,
            status: 'Approved'
          });
          set({ loading: false });
        } catch (error) {
          console.error('Failed to approve estimate:', error);
          set({ error: error.message, loading: false });
        }
      },

      // Convert estimate to job
      convertEstimateToJob: async (estimateId, jobData) => {
        set({ loading: true, error: null });
        try {
          const job = await convertEstimateToJob(estimateId, jobData);
          set(state => ({
            jobs: { ...state.jobs, [job.id]: job },
            loading: false
          }));
          return job;
        } catch (error) {
          console.error('Failed to convert estimate to job:', error);
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // --- Jobsheet Methods ---
      createJobsheet: async (jobId, jobsheetData, items) => {
        set({ loading: true, error: null });
        try {
          const jobsheet = { ...jobsheetData, jobId };
          const result = await createJobsheetWithItems(jobsheet, items);
          set({ loading: false });
          return result;
        } catch (error) {
          console.error('Failed to create jobsheet:', error);
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // --- Challan Methods ---
      issueChallan: async (challanData, challanItems, jobsheetItemIds) => {
        set({ loading: true, error: null });
        try {
          const result = await issueChallan(challanData, challanItems, jobsheetItemIds);
          set({ loading: false });
          return result;
        } catch (error) {
          console.error('Failed to issue challan:', error);
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // --- Invoice Methods ---
      createInvoice: async (invoiceData, invoiceItems, journalEntry, journalLines) => {
        set({ loading: true, error: null });
        try {
          const result = await createInvoiceWithJournal(
            invoiceData,
            invoiceItems,
            journalEntry,
            journalLines
          );
          set({ loading: false });
          return result;
        } catch (error) {
          console.error('Failed to create invoice:', error);
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // --- Stock Methods ---
      checkStock: async (productId, requiredQty) => {
        try {
          return await validateStockAvailability(productId, requiredQty);
        } catch (error) {
          console.error('Failed to check stock:', error);
          return { available: false, error: error.message };
        }
      },

      getCurrentStock: async (productId) => {
        try {
          return await calculateCurrentStock(productId);
        } catch (error) {
          console.error('Failed to get current stock:', error);
          return 0;
        }
      }

    }),
    {
      name: 'jobs-storage',
    }
  )
);

export const initializeDefaultJob = async () => {
  const { jobs, createNewJob, loadJobs } = useJobsStore.getState();
  
  // Load jobs from database first
  await loadJobs();
  
  const updatedJobs = useJobsStore.getState().jobs;
  if (Object.keys(updatedJobs).length === 0) {
    console.log("No existing jobs found in database.");
    // Jobs will be created when user manually adds them
    // No default/demo jobs are created automatically
  }
};

export default useJobsStore;

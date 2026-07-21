import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import cachedDb from '@/utils/cachedDbOperations';
const dbOperations = cachedDb;
import unifiedDataFlowManager from '@/utils/unifiedDataFlowManager.js';
import unifiedSyncManager from '@/utils/unifiedSyncManager.js';
import {
  postPurchaseInvoice,
  postSalesInvoice,
  createVoucher,
  receivePayment,
  getGSTReport,
  getAccountLedger,
  createChallan,
  validateJournalBalance
} from '@/utils/accountModuleHelpers';
import { apiListOrLocal } from '@/utils/apiEntityStore';

const useAccountsStore = create(
  persist(
    (set, get) => ({
      accounts: {},
      purchases: {},
      invoices: {},
      payments: {},
      vouchers: {},
      loading: false,
      error: null,

      // Load accounts from database
      loadAccounts: async () => {
        set({ loading: true, error: null });
        try {
          const accountsArray = await dbOperations.getAll('accounts');
          const accountsMap = {};
          accountsArray.forEach(account => {
            accountsMap[account.id] = account;
          });
          set({ accounts: accountsMap, loading: false });
        } catch (error) {
          console.error('Failed to load accounts:', error);
          set({ error: error.message, loading: false });
        }
      },

      // Create account
      createAccount: async (accountData) => {
        set({ loading: true, error: null });
        try {
          const account = await dbOperations.insert('accounts', accountData);
          set(state => ({
            accounts: { ...state.accounts, [account.id]: account },
            loading: false
          }));
          return account;
        } catch (error) {
          console.error('Failed to create account:', error);
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // Post Purchase Invoice
      postPurchase: async (purchase, items, vendorId) => {
        set({ loading: true, error: null });
        try {
          const result = await postPurchaseInvoice(purchase, items, vendorId);
          set(state => ({
            purchases: { ...state.purchases, [result.purchase.id]: result.purchase },
            loading: false
          }));
          return result;
        } catch (error) {
          console.error('Failed to post purchase:', error);
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // Post Sales Invoice
      postSalesInvoice: async (invoice, items, customerId) => {
        set({ loading: true, error: null });
        try {
          const result = await postSalesInvoice(invoice, items, customerId);
          set(state => ({
            invoices: { ...state.invoices, [result.invoice.id]: result.invoice },
            loading: false
          }));
          return result;
        } catch (error) {
          console.error('Failed to post sales invoice:', error);
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // Create Voucher
      createVoucher: async (voucherData, journalLines) => {
        set({ loading: true, error: null });
        try {
          const result = await createVoucher(voucherData, journalLines);
          set(state => ({
            vouchers: { ...state.vouchers, [result.journal.id]: result.journal },
            loading: false
          }));
          return result;
        } catch (error) {
          console.error('Failed to create voucher:', error);
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // Receive Payment
      receivePayment: async (paymentData, invoiceId) => {
        set({ loading: true, error: null });
        try {
          const result = await receivePayment(paymentData, invoiceId);
          set(state => ({
            payments: { ...state.payments, [result.payment.id]: result.payment },
            loading: false
          }));
          return result;
        } catch (error) {
          console.error('Failed to receive payment:', error);
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // Get GST Report
      getGSTReport: async (fromDate, toDate) => {
        set({ loading: true, error: null });
        try {
          const report = await getGSTReport(fromDate, toDate);
          set({ loading: false });
          return report;
        } catch (error) {
          console.error('Failed to get GST report:', error);
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // Get Account Ledger
      getAccountLedger: async (accountId, fromDate, toDate) => {
        set({ loading: true, error: null });
        try {
          const ledger = await getAccountLedger(accountId, fromDate, toDate);
          set({ loading: false });
          return ledger;
        } catch (error) {
          console.error('Failed to get account ledger:', error);
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // Create Challan
      createChallan: async (challanData, items, type) => {
        set({ loading: true, error: null });
        try {
          const result = await createChallan(challanData, items, type);
          set({ loading: false });
          return result;
        } catch (error) {
          console.error('Failed to create challan:', error);
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // Validate journal balance
      validateBalance: (journalLines) => {
        return validateJournalBalance(journalLines);
      },

      // Get KPIs/Dashboard data
      getDashboardKPIs: async () => {
        set({ loading: true, error: null });
        try {
          const [accounts, journalEntries, invoices, purchases] = await Promise.all([
            dbOperations.getAll('accounts'),
            dbOperations.getAll('journal_entries'),
            dbOperations.getAll('invoices'),
            dbOperations.getAll('purchases')
          ]);

          const kpis = {
            totalAccounts: accounts.length,
            totalTransactions: journalEntries.length,
            totalInvoices: invoices.length,
            totalPurchases: purchases.length,
            pendingInvoices: invoices.filter(inv => inv.status === 'Pending').length,
            paidInvoices: invoices.filter(inv => inv.status === 'Paid').length
          };

          set({ loading: false });
          return kpis;
        } catch (error) {
          console.error('Failed to get dashboard KPIs:', error);
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // Load purchases
      loadPurchases: async () => {
        set({ loading: true, error: null });
        try {
          const purchasesArray = await apiListOrLocal('purchases', () => dbOperations.getAll('purchases'));
          const purchasesMap = {};
          (purchasesArray || []).forEach(purchase => {
            purchasesMap[purchase.id] = purchase;
          });
          set({ purchases: purchasesMap, loading: false });
        } catch (error) {
          console.error('Failed to load purchases:', error);
          set({ error: error.message, loading: false });
        }
      },

      // Load invoices
      loadInvoices: async () => {
        set({ loading: true, error: null });
        try {
          const invoicesArray = await dbOperations.getAll('invoices');
          const invoicesMap = {};
          invoicesArray.forEach(invoice => {
            invoicesMap[invoice.id] = invoice;
          });
          set({ invoices: invoicesMap, loading: false });
        } catch (error) {
          console.error('Failed to load invoices:', error);
          set({ error: error.message, loading: false });
        }
      },

      // Load payments
      loadPayments: async () => {
        set({ loading: true, error: null });
        try {
          const paymentsArray = await dbOperations.getAll('payments');
          const paymentsMap = {};
          paymentsArray.forEach(payment => {
            paymentsMap[payment.id] = payment;
          });
          set({ payments: paymentsMap, loading: false });
        } catch (error) {
          console.error('Failed to load payments:', error);
          set({ error: error.message, loading: false });
        }
      },

      // Export accounts data via Electron
      exportAccountsData: async (stores, period) => {
        try {
          if (window.electron) {
            const result = await window.electron.invoke('accounts.export', { stores, period });
            return result;
          }
          throw new Error('Electron IPC not available');
        } catch (error) {
          console.error('Failed to export accounts data:', error);
          throw error;
        }
      },

      // Import accounts data via Electron
      importAccountsData: async (sourcePath) => {
        try {
          if (window.electron) {
            const result = await window.electron.invoke('accounts.import', { sourcePath });
            return result;
          }
          throw new Error('Electron IPC not available');
        } catch (error) {
          console.error('Failed to import accounts data:', error);
          throw error;
        }
      },

      // Export GST report
      exportGSTReport: async (period, data) => {
        try {
          if (window.electron) {
            const result = await window.electron.invoke('accounts.exportGST', { period, data });
            return result;
          }
          throw new Error('Electron IPC not available');
        } catch (error) {
          console.error('Failed to export GST report:', error);
          throw error;
        }
      }
    }),
    {
      name: 'accounts-storage',
      partialize: (state) => ({
        accounts: state.accounts,
        purchases: state.purchases,
        invoices: state.invoices,
        payments: state.payments
      })
    }
  )
);

export default useAccountsStore;

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import {
  saveTemplate,
  getTemplatesByType,
  getDefaultTemplate,
  createRole,
  updateRolePermissions,
  saveTax,
  getActiveTaxes,
  importHSNCodes,
  searchHSNCodes,
  getAuditLogs,
  updateSequence,
  getCurrentSequence
} from '@/utils/settingsModuleHelpers';

const useSettingsStore = create(
  persist(
    (set, get) => ({
      generalSettings: {
        themeMode: 'system',
        selectedTheme: 'theme2',
        language: 'English',
        financialYear: 'Apr-Mar',
        autoLogoutTime: 30,
        startupPage: 'Dashboard',
        notificationsEnabled: true,
        soundAlerts: true,
        autoSaveInterval: 5,
        locale: 'en-IN',
        currency: 'INR',
        currencySymbol: '₹',
        timezone: 'Asia/Kolkata',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h'
      },

      ledgerSettings: {
        autoCalculateBalance: true,
        creditLimitAlert: 80,
        overdueHighlightColor: '#ef4444',
        defaultViewRange: 30,
        autoRounding: 'none',
        defaultPrintFormat: 'A4-portrait',
      },

      inventorySettings: {
        stockValuationMethod: 'FIFO',
        allowNegativeStock: false,
        autoGenerateItemCode: true,
        defaultUnit: 'pcs',
        autoUpdateStockOnInvoice: true,
        lowStockAlertLevel: 10,
        defaultWarehouse: 'Main Store',
      },

      invoiceSettings: {
        invoicePrefix: 'INV',
        invoiceSuffix: '',
        challanPrefix: 'CH',
        receiptPrefix: 'RCP',
        autoNumbering: true,
        termsAndConditions: 'Thank you for your business.',
        gstMode: 'Regular',
        defaultTaxRate: 18,
        showCompanyLogo: true,
        defaultPrintTemplate: 'Standard',
        pdfSaveLocation: '',
      },

      backupSettings: {
        backupFolder: '',
        autoBackup: 'Weekly',
        exportFormat: 'JSON',
        dataRetentionYears: 7,
        lastBackupDate: null,
      },

      syncSettings: {
        syncMode: 'Manual',
        apiUrl: '',
        syncFrequency: 'Daily',
        lastSyncTimestamp: null,
        cloudBackupEnabled: false,
      },

      printSettings: {
        defaultPrinter: '',
        paperSize: 'A4',
        showLogoAndInfo: true,
        footerText: 'Thank you for your business',
        currencyFormat: 'INR',
        decimalPrecision: 2,
        autoOpenAfterExport: true,
        exportLocation: '',
      },

      securitySettings: {
        appPinLock: '',
        encryptLocalData: false,
        maskAmounts: false,
        autoLockMinutes: 15,
        auditTrailEnabled: true,
        passwordMinLength: 8,
        passwordRequireSpecialChar: true,
        passwordRequireNumber: true,
        sessionTimeoutMinutes: 30,
        maxLoginAttempts: 3,
        twoFactorEnabled: false
      },

      appInfo: {
        version: '2.0.0',
        buildDate: '2025-01-06',
        developer: 'Malwa CRM',
        licenseKey: '',
      },

      // Settings Module State
      templates: [],
      roles: [],
      taxes: [],
      hsnCodes: [],
      auditLogs: [],
      sequences: {},
      loading: false,
      error: null,

      updateGeneralSettings: (updates) =>
        set((state) => ({
          generalSettings: { ...state.generalSettings, ...updates },
        })),

      updateLedgerSettings: (updates) =>
        set((state) => ({
          ledgerSettings: { ...state.ledgerSettings, ...updates },
        })),

      updateInventorySettings: (updates) =>
        set((state) => ({
          inventorySettings: { ...state.inventorySettings, ...updates },
        })),

      updateInvoiceSettings: (updates) =>
        set((state) => ({
          invoiceSettings: { ...state.invoiceSettings, ...updates },
        })),

      updateBackupSettings: (updates) =>
        set((state) => ({
          backupSettings: { ...state.backupSettings, ...updates },
        })),

      updateSyncSettings: (updates) =>
        set((state) => ({
          syncSettings: { ...state.syncSettings, ...updates },
        })),

      updatePrintSettings: (updates) =>
        set((state) => ({
          printSettings: { ...state.printSettings, ...updates },
        })),

      updateSecuritySettings: (updates) =>
        set((state) => ({
          securitySettings: { ...state.securitySettings, ...updates },
        })),

      // === NEW SETTINGS STRUCTURE ACTIONS ===
      
      // General Settings
      saveGeneralSetting: async (data) => {
        try {
          if (window.electron?.fs?.writeFile) {
            const filePath = 'C:/malwa-crm/Data_base/settings/General/general_setting.json';
            const result = await window.electron.fs.writeFile(filePath, JSON.stringify(data, null, 2));
            if (result.success) {
              set({ generalSettings: data });
              return { success: true };
            }
          }
          return { success: false, error: 'Electron not available' };
        } catch (error) {
          console.error('Error saving general setting:', error);
          return { success: false, error: error.message };
        }
      },

      loadGeneralSetting: async () => {
        try {
          if (window.electron?.fs?.readFile) {
            const filePath = 'C:/malwa-crm/Data_base/settings/General/general_setting.json';
            const result = await window.electron.fs.readFile(filePath);
            if (result.success && result.data) {
              const data = JSON.parse(result.data);
              set({ generalSettings: data });
              return { success: true, data };
            }
          }
          return { success: false, error: 'File not found' };
        } catch (error) {
          console.error('Error loading general setting:', error);
          return { success: false, error: error.message };
        }
      },

      // User Profile (My Profile)
      saveUserProfile: async (userId, profileData) => {
        try {
          if (window.electron?.fs?.writeFile) {
            const filePath = 'C:/malwa-crm/Data_base/settings/My_Profile/user_data.json';
            const result = await window.electron.fs.writeFile(filePath, JSON.stringify(profileData, null, 2));
            return { success: result.success };
          }
          return { success: false, error: 'Electron not available' };
        } catch (error) {
          console.error('Error saving user profile:', error);
          return { success: false, error: error.message };
        }
      },

      loadUserProfile: async (userId) => {
        try {
          if (window.electron?.fs?.readFile) {
            const filePath = 'C:/malwa-crm/Data_base/settings/My_Profile/user_data.json';
            const result = await window.electron.fs.readFile(filePath);
            if (result.success && result.data) {
              return { success: true, data: JSON.parse(result.data) };
            }
          }
          return { success: false, error: 'File not found' };
        } catch (error) {
          console.error('Error loading user profile:', error);
          return { success: false, error: error.message };
        }
      },

      saveUserImage: async (userId, imageData) => {
        try {
          if (window.electron?.fs?.writeFile) {
            const filePath = 'C:/malwa-crm/Data_base/settings/My_Profile/user_image.json';
            const result = await window.electron.fs.writeFile(filePath, JSON.stringify({ userId, imageData }, null, 2));
            return { success: result.success };
          }
          return { success: false, error: 'Electron not available' };
        } catch (error) {
          console.error('Error saving user image:', error);
          return { success: false, error: error.message };
        }
      },

      loadUserImage: async (userId) => {
        try {
          if (window.electron?.fs?.readFile) {
            const filePath = 'C:/malwa-crm/Data_base/settings/My_Profile/user_image.json';
            const result = await window.electron.fs.readFile(filePath);
            if (result.success && result.data) {
              return { success: true, data: JSON.parse(result.data) };
            }
          }
          return { success: false, error: 'File not found' };
        } catch (error) {
          console.error('Error loading user image:', error);
          return { success: false, error: error.message };
        }
      },

      // Company Master
      saveCompanyMaster: async (data) => {
        try {
          if (window.electron?.fs?.writeFile) {
            const filePath = 'C:/malwa-crm/Data_base/settings/Company_Master/company_master.json';
            const result = await window.electron.fs.writeFile(filePath, JSON.stringify(data, null, 2));
            return { success: result.success };
          }
          return { success: false, error: 'Electron not available' };
        } catch (error) {
          console.error('Error saving company master:', error);
          return { success: false, error: error.message };
        }
      },

      loadCompanyMaster: async () => {
        try {
          if (window.electron?.fs?.readFile) {
            const filePath = 'C:/malwa-crm/Data_base/settings/Company_Master/company_master.json';
            const result = await window.electron.fs.readFile(filePath);
            if (result.success && result.data) {
              return { success: true, data: JSON.parse(result.data) };
            }
          }
          return { success: false, error: 'File not found' };
        } catch (error) {
          console.error('Error loading company master:', error);
          return { success: false, error: error.message };
        }
      },

      // Rate List Memory
      saveRateListMemory: async (data) => {
        try {
          if (window.electron?.fs?.writeFile) {
            const filePath = 'C:/malwa-crm/Data_base/settings/Rate_List_Memory/rate_list_memory.json';
            const result = await window.electron.fs.writeFile(filePath, JSON.stringify(data, null, 2));
            return { success: result.success };
          }
          return { success: false, error: 'Electron not available' };
        } catch (error) {
          console.error('Error saving rate list memory:', error);
          return { success: false, error: error.message };
        }
      },

      loadRateListMemory: async () => {
        try {
          if (window.electron?.fs?.readFile) {
            const filePath = 'C:/malwa-crm/Data_base/settings/Rate_List_Memory/rate_list_memory.json';
            const result = await window.electron.fs.readFile(filePath);
            if (result.success && result.data) {
              return { success: true, data: JSON.parse(result.data) };
            }
          }
          return { success: false, error: 'File not found' };
        } catch (error) {
          console.error('Error loading rate list memory:', error);
          return { success: false, error: error.message };
        }
      },

      // User Management
      saveUsers: async (users) => {
        try {
          if (window.electron?.fs?.writeFile) {
            const filePath = 'C:/malwa-crm/Data_base/settings/User_Management/users.json';
            const result = await window.electron.fs.writeFile(filePath, JSON.stringify(users, null, 2));
            return { success: result.success };
          }
          return { success: false, error: 'Electron not available' };
        } catch (error) {
          console.error('Error saving users:', error);
          return { success: false, error: error.message };
        }
      },

      // Create individual user JSON file with complete credentials and permissions
      createUserFile: async (userData) => {
        try {
          if (window.electron?.fs?.createUserFile) {
            const result = await window.electron.fs.createUserFile(userData);
            return result;
          }
          return { success: false, error: 'Electron not available' };
        } catch (error) {
          console.error('Error creating user file:', error);
          return { success: false, error: error.message };
        }
      },

      // Load user data from individual JSON file
      loadUserFile: async (userId) => {
        try {
          if (window.electron?.fs?.loadUserFile) {
            const result = await window.electron.fs.loadUserFile(userId);
            return result;
          }
          return { success: false, error: 'Electron not available' };
        } catch (error) {
          console.error('Error loading user file:', error);
          return { success: false, error: error.message };
        }
      },

      loadUsers: async () => {
        try {
          if (window.electron?.fs?.readFile) {
            const filePath = 'C:/malwa-crm/Data_base/settings/User_Management/users.json';
            const result = await window.electron.fs.readFile(filePath);
            if (result.success && result.data) {
              return { success: true, data: JSON.parse(result.data) };
            }
          }
          return { success: false, error: 'File not found' };
        } catch (error) {
          console.error('Error loading users:', error);
          return { success: false, error: error.message };
        }
      },

      saveRoles: async (roles) => {
        try {
          if (window.electron?.fs?.writeFile) {
            const filePath = 'C:/malwa-crm/Data_base/settings/User_Management/roles.json';
            const result = await window.electron.fs.writeFile(filePath, JSON.stringify(roles, null, 2));
            return { success: result.success };
          }
          return { success: false, error: 'Electron not available' };
        } catch (error) {
          console.error('Error saving roles:', error);
          return { success: false, error: error.message };
        }
      },

      loadRoles: async () => {
        try {
          if (window.electron?.fs?.readFile) {
            const filePath = 'C:/malwa-crm/Data_base/settings/User_Management/roles.json';
            const result = await window.electron.fs.readFile(filePath);
            if (result.success && result.data) {
              return { success: true, data: JSON.parse(result.data) };
            }
          }
          return { success: false, error: 'File not found' };
        } catch (error) {
          console.error('Error loading roles:', error);
          return { success: false, error: error.message };
        }
      },

      saveUserPermissions: async (permissions) => {
        try {
          if (window.electron?.fs?.writeFile) {
            const filePath = 'C:/malwa-crm/Data_base/settings/User_Management/user_permissions.json';
            const result = await window.electron.fs.writeFile(filePath, JSON.stringify(permissions, null, 2));
            return { success: result.success };
          }
          return { success: false, error: 'Electron not available' };
        } catch (error) {
          console.error('Error saving user permissions:', error);
          return { success: false, error: error.message };
        }
      },

      loadUserPermissions: async () => {
        try {
          if (window.electron?.fs?.readFile) {
            const filePath = 'C:/malwa-crm/Data_base/settings/User_Management/user_permissions.json';
            const result = await window.electron.fs.readFile(filePath);
            if (result.success && result.data) {
              return { success: true, data: JSON.parse(result.data) };
            }
          }
          return { success: false, error: 'File not found' };
        } catch (error) {
          console.error('Error loading user permissions:', error);
          return { success: false, error: error.message };
        }
      },
      
      // Save individual user page access
      saveUserPageAccess: async (pageAccessData) => {
        try {
          if (window.electron?.fs?.writeFile) {
            const filePath = `C:/malwa-crm/Data_base/settings/User_Management/page_access_${pageAccessData.userId}.json`;
            const result = await window.electron.fs.writeFile(filePath, JSON.stringify(pageAccessData, null, 2));
            return { success: result.success };
          }
          return { success: false, error: 'Electron not available' };
        } catch (error) {
          console.error('Error saving user page access:', error);
          return { success: false, error: error.message };
        }
      },
      
      // Load all user page access files
      loadAllUserPageAccess: async () => {
        try {
          if (window.electron?.fs?.listDir) {
            const dirPath = 'C:/malwa-crm/Data_base/settings/User_Management';
            const result = await window.electron.fs.listDir(dirPath);
            if (result.success && result.files) {
              const pageAccessFiles = result.files.filter(f => f.startsWith('page_access_'));
              const allPageAccess = [];
              
              for (const fileName of pageAccessFiles) {
                const filePath = `${dirPath}/${fileName}`;
                const fileResult = await window.electron.fs.readFile(filePath);
                if (fileResult.success && fileResult.data) {
                  allPageAccess.push(JSON.parse(fileResult.data));
                }
              }
              
              return { success: true, data: allPageAccess };
            }
          }
          return { success: false, error: 'Electron not available' };
        } catch (error) {
          console.error('Error loading all user page access:', error);
          return { success: false, error: error.message };
        }
      },

      // Security Settings
      savePinTime: async (data) => {
        try {
          if (window.electron?.fs?.writeFile) {
            const filePath = 'C:/malwa-crm/Data_base/settings/Security/Pin_time.json';
            const result = await window.electron.fs.writeFile(filePath, JSON.stringify(data, null, 2));
            return { success: result.success };
          }
          return { success: false, error: 'Electron not available' };
        } catch (error) {
          console.error('Error saving pin time:', error);
          return { success: false, error: error.message };
        }
      },

      loadPinTime: async () => {
        try {
          if (window.electron?.fs?.readFile) {
            const filePath = 'C:/malwa-crm/Data_base/settings/Security/Pin_time.json';
            const result = await window.electron.fs.readFile(filePath);
            if (result.success && result.data) {
              return { success: true, data: JSON.parse(result.data) };
            }
          }
          return { success: false, error: 'File not found' };
        } catch (error) {
          console.error('Error loading pin time:', error);
          return { success: false, error: error.message };
        }
      },

      // User Login Limited Access
      saveUserLimitedAccess: async (data) => {
        try {
          if (window.electron?.fs?.writeFile) {
            const filePath = 'C:/malwa-crm/Data_base/settings/User_Login/user_limited_access.json';
            const result = await window.electron.fs.writeFile(filePath, JSON.stringify(data, null, 2));
            return { success: result.success };
          }
          return { success: false, error: 'Electron not available' };
        } catch (error) {
          console.error('Error saving user limited access:', error);
          return { success: false, error: error.message };
        }
      },

      loadUserLimitedAccess: async () => {
        try {
          if (window.electron?.fs?.readFile) {
            const filePath = 'C:/malwa-crm/Data_base/settings/User_Login/user_limited_access.json';
            const result = await window.electron.fs.readFile(filePath);
            if (result.success && result.data) {
              return { success: true, data: JSON.parse(result.data) };
            }
          }
          return { success: false, error: 'File not found' };
        } catch (error) {
          console.error('Error loading user limited access:', error);
          return { success: false, error: error.message };
        }
      },

      // Template Management Actions
      loadTemplates: async (type = null) => {
        set({ loading: true, error: null });
        try {
          const templates = type
            ? await getTemplatesByType(type)
            : await import('@/lib/db').then(db => db.dbOperations.getAll('templates'));
          set({ templates, loading: false });
          return templates;
        } catch (error) {
          console.error('Error loading templates:', error);
          set({ error: error.message, loading: false });
          toast.error('Failed to load templates');
          throw error;
        }
      },

      createTemplate: async (templateData) => {
        set({ loading: true, error: null });
        try {
          const template = await saveTemplate(templateData);
          set(state => ({
            templates: [...state.templates, template],
            loading: false
          }));
          toast.success('Template created successfully');
          return template;
        } catch (error) {
          console.error('Error creating template:', error);
          set({ error: error.message, loading: false });
          toast.error('Failed to create template');
          throw error;
        }
      },

      updateTemplate: async (templateId, updates) => {
        set({ loading: true, error: null });
        try {
          const template = await saveTemplate({ id: templateId, ...updates });
          set(state => ({
            templates: state.templates.map(t => t.id === templateId ? template : t),
            loading: false
          }));
          toast.success('Template updated successfully');
          return template;
        } catch (error) {
          console.error('Error updating template:', error);
          set({ error: error.message, loading: false });
          toast.error('Failed to update template');
          throw error;
        }
      },

      // Role Management Actions
      loadRoles: async () => {
        set({ loading: true, error: null });
        try {
          const db = await import('@/lib/db');
          const roles = await db.dbOperations.getAll('roles');
          set({ roles, loading: false });
          return roles;
        } catch (error) {
          console.error('Error loading roles:', error);
          set({ error: error.message, loading: false });
          toast.error('Failed to load roles');
          throw error;
        }
      },

      createRole: async (roleData, permissions) => {
        set({ loading: true, error: null });
        try {
          const result = await createRole(roleData, permissions);
          set(state => ({
            roles: [...state.roles, result.role],
            loading: false
          }));
          toast.success('Role created successfully');
          return result;
        } catch (error) {
          console.error('Error creating role:', error);
          set({ error: error.message, loading: false });
          toast.error('Failed to create role');
          throw error;
        }
      },

      updateRolePermissions: async (roleId, permissions) => {
        set({ loading: true, error: null });
        try {
          const result = await updateRolePermissions(roleId, permissions);
          set(state => ({
            roles: state.roles.map(r => r.id === roleId ? result.role : r),
            loading: false
          }));
          toast.success('Permissions updated successfully');
          return result;
        } catch (error) {
          console.error('Error updating permissions:', error);
          set({ error: error.message, loading: false });
          toast.error('Failed to update permissions');
          throw error;
        }
      },

      // Tax Management Actions
      loadTaxes: async () => {
        set({ loading: true, error: null });
        try {
          const taxes = await getActiveTaxes();
          set({ taxes, loading: false });
          return taxes;
        } catch (error) {
          console.error('Error loading taxes:', error);
          set({ error: error.message, loading: false });
          toast.error('Failed to load taxes');
          throw error;
        }
      },

      createTax: async (taxData) => {
        set({ loading: true, error: null });
        try {
          const tax = await saveTax(taxData);
          set(state => ({
            taxes: [...state.taxes, tax],
            loading: false
          }));
          toast.success('Tax created successfully');
          return tax;
        } catch (error) {
          console.error('Error creating tax:', error);
          set({ error: error.message, loading: false });
          toast.error('Failed to create tax');
          throw error;
        }
      },

      updateTax: async (taxId, updates) => {
        set({ loading: true, error: null });
        try {
          const tax = await saveTax({ id: taxId, ...updates });
          set(state => ({
            taxes: state.taxes.map(t => t.id === taxId ? tax : t),
            loading: false
          }));
          toast.success('Tax updated successfully');
          return tax;
        } catch (error) {
          console.error('Error updating tax:', error);
          set({ error: error.message, loading: false });
          toast.error('Failed to update tax');
          throw error;
        }
      },

      // HSN Code Management Actions
      importHSNCodes: async (hsnData) => {
        set({ loading: true, error: null });
        try {
          const imported = await importHSNCodes(hsnData);
          set(state => ({
            hsnCodes: [...state.hsnCodes, ...imported],
            loading: false
          }));
          toast.success(`Imported ${imported.length} HSN codes`);
          return imported;
        } catch (error) {
          console.error('Error importing HSN codes:', error);
          set({ error: error.message, loading: false });
          toast.error('Failed to import HSN codes');
          throw error;
        }
      },

      searchHSN: async (query) => {
        set({ loading: true, error: null });
        try {
          const results = await searchHSNCodes(query);
          set({ loading: false });
          return results;
        } catch (error) {
          console.error('Error searching HSN:', error);
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // Audit Log Actions
      loadAuditLogs: async (filters = {}) => {
        set({ loading: true, error: null });
        try {
          const logs = await getAuditLogs(filters);
          set({ auditLogs: logs, loading: false });
          return logs;
        } catch (error) {
          console.error('Error loading audit logs:', error);
          set({ error: error.message, loading: false });
          toast.error('Failed to load audit logs');
          throw error;
        }
      },

      // Sequence Management Actions
      loadSequence: async (sequenceKey) => {
        set({ loading: true, error: null });
        try {
          const sequence = await getCurrentSequence(sequenceKey);
          set(state => ({
            sequences: { ...state.sequences, [sequenceKey]: sequence },
            loading: false
          }));
          return sequence;
        } catch (error) {
          console.error('Error loading sequence:', error);
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      updateSequenceConfig: async (sequenceKey, updates) => {
        set({ loading: true, error: null });
        try {
          const sequence = await updateSequence(sequenceKey, updates);
          set(state => ({
            sequences: { ...state.sequences, [sequenceKey]: sequence },
            loading: false
          }));
          toast.success('Numbering sequence updated');
          return sequence;
        } catch (error) {
          console.error('Error updating sequence:', error);
          set({ error: error.message, loading: false });
          toast.error('Failed to update sequence');
          throw error;
        }
      },

      resetToDefaults: () =>
        set({
          generalSettings: {
            themeMode: 'system',
            selectedTheme: 'theme2',
            language: 'English',
            financialYear: 'Apr-Mar',
            autoLogoutTime: 30,
            startupPage: 'Dashboard',
            notificationsEnabled: true,
            soundAlerts: true,
            autoSaveInterval: 5,
          },
          ledgerSettings: {
            autoCalculateBalance: true,
            creditLimitAlert: 80,
            overdueHighlightColor: '#ef4444',
            defaultViewRange: 30,
            autoRounding: 'none',
            defaultPrintFormat: 'A4-portrait',
          },
          inventorySettings: {
            stockValuationMethod: 'FIFO',
            allowNegativeStock: false,
            autoGenerateItemCode: true,
            defaultUnit: 'pcs',
            autoUpdateStockOnInvoice: true,
            lowStockAlertLevel: 10,
            defaultWarehouse: 'Main Store',
          },
          invoiceSettings: {
            invoicePrefix: 'INV',
            invoiceSuffix: '',
            challanPrefix: 'CH',
            receiptPrefix: 'RCP',
            autoNumbering: true,
            termsAndConditions: 'Thank you for your business.',
            gstMode: 'Regular',
            defaultTaxRate: 18,
            showCompanyLogo: true,
            defaultPrintTemplate: 'Standard',
            pdfSaveLocation: '',
          },
        }),

      exportSettings: () => {
        const state = get();
        return JSON.stringify({
          generalSettings: state.generalSettings,
          ledgerSettings: state.ledgerSettings,
          inventorySettings: state.inventorySettings,
          invoiceSettings: state.invoiceSettings,
          backupSettings: state.backupSettings,
          syncSettings: state.syncSettings,
          printSettings: state.printSettings,
          securitySettings: state.securitySettings,
        }, null, 2);
      },

      importSettings: (jsonString) => {
        try {
          const imported = JSON.parse(jsonString);
          set({
            generalSettings: imported.generalSettings || get().generalSettings,
            ledgerSettings: imported.ledgerSettings || get().ledgerSettings,
            inventorySettings: imported.inventorySettings || get().inventorySettings,
            invoiceSettings: imported.invoiceSettings || get().invoiceSettings,
            backupSettings: imported.backupSettings || get().backupSettings,
            syncSettings: imported.syncSettings || get().syncSettings,
            printSettings: imported.printSettings || get().printSettings,
            securitySettings: imported.securitySettings || get().securitySettings,
          });
          return true;
        } catch (error) {
          console.error('Failed to import settings:', error);
          return false;
        }
      },
    }),
    {
      name: 'malwa-crm-settings',
    }
  )
);

export default useSettingsStore;

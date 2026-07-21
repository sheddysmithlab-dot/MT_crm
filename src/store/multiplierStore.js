import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useMultiplierStore = create(
  persist(
    (set, get) => ({
      labourMultiplier: 1,
      vendorMultiplier: 1,
      categoryMultipliers: {},

      setLabourMultiplier: (value) => set({ labourMultiplier: parseFloat(value) || 1 }),

      setVendorMultiplier: (value) => set({ vendorMultiplier: parseFloat(value) || 1 }),

      setCategoryMultiplier: (categoryName, value) =>
        set((state) => ({
          categoryMultipliers: {
            ...state.categoryMultipliers,
            [categoryName]: parseFloat(value) || 1,
          },
        })),

      removeCategoryMultiplier: (categoryName) =>
        set((state) => {
          const { [categoryName]: removed, ...rest } = state.categoryMultipliers;
          return { categoryMultipliers: rest };
        }),

      getCategoryMultiplier: (categoryName) => {
        const { categoryMultipliers } = get();
        return categoryMultipliers[categoryName] || 1;
      },

      getMultiplierByWorkType: (workBy) => {
        const { labourMultiplier, vendorMultiplier } = get();
        if (workBy === 'Labour') return labourMultiplier;
        if (workBy === 'Vendor') return vendorMultiplier;
        return 1;
      },

      resetMultipliers: () =>
        set({
          labourMultiplier: 1,
          vendorMultiplier: 1,
          categoryMultipliers: {},
        }),

      exportMultipliers: () => {
        const state = get();
        return JSON.stringify({
          labourMultiplier: state.labourMultiplier,
          vendorMultiplier: state.vendorMultiplier,
          categoryMultipliers: state.categoryMultipliers,
        }, null, 2);
      },

      importMultipliers: (jsonString) => {
        try {
          const imported = JSON.parse(jsonString);
          set({
            labourMultiplier: imported.labourMultiplier || 1,
            vendorMultiplier: imported.vendorMultiplier || 1,
            categoryMultipliers: imported.categoryMultipliers || {},
          });
          return true;
        } catch (error) {
          console.error('Failed to import multipliers:', error);
          return false;
        }
      },
    }),
    {
      name: 'malwa-crm-multipliers',
    }
  )
);

export default useMultiplierStore;

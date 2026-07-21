/**
 * Unified App State Store
 * Combines: themeStore.js + uiStore.js
 * Handles application-level UI state including theme and sidebar
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAppStateStore = create(
  persist(
    (set) => ({
      // === THEME STATE ===
      theme: 'system',
      
      // === UI STATE ===
      isSidebarOpen: true, // Default to open on desktop

      // === THEME ACTIONS ===
      setTheme: (theme) => set({ theme }),

      // === UI ACTIONS ===
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
    }),
    {
      name: 'app-state-storage',
      // Persist both theme and UI state
      partialize: (state) => ({
        theme: state.theme,
        isSidebarOpen: state.isSidebarOpen
      })
    }
  )
);

// Legacy exports for backward compatibility
export const useThemeStore = (selector) => {
  if (selector) {
    return useAppStateStore(selector);
  }
  const store = useAppStateStore();
  return {
    theme: store.theme,
    setTheme: store.setTheme
  };
};

export const useUiStore = () => {
  const store = useAppStateStore();
  return {
    isSidebarOpen: store.isSidebarOpen,
    toggleSidebar: store.toggleSidebar,
    setSidebarOpen: store.setSidebarOpen
  };
};

export default useAppStateStore;
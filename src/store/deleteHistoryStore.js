import { create } from 'zustand';
import { dbOperations } from '@/lib/db';
import { toast } from 'sonner';

/**
 * Delete History Store
 * Tracks all deleted items for undo/redo functionality
 */
const useDeleteHistoryStore = create((set, get) => ({
  // Array of deleted items with their metadata
  deleteHistory: [],
  
  // Current position in history (for redo functionality)
  currentPosition: -1,

  /**
   * Add a deleted item to history
   * @param {string} table - Table name (e.g., 'customer_ledger_entries', 'customers')
   * @param {object} data - The deleted item data
   * @param {object} metadata - Additional metadata (customerId, etc.)
   */
  addDeletedItem: (table, data, metadata = {}) => {
    const { deleteHistory, currentPosition } = get();
    
    const deletedItem = {
      id: `${table}_${data.id}_${Date.now()}`,
      table,
      data,
      metadata,
      deletedAt: new Date().toISOString(),
      isUndone: false
    };

    // Remove any items after current position (they will be lost if we add new delete)
    const newHistory = deleteHistory.slice(0, currentPosition + 1);
    
    // Add new item
    newHistory.push(deletedItem);
    
    // Keep only last 50 items to prevent memory issues
    const trimmedHistory = newHistory.slice(-50);
    
    set({
      deleteHistory: trimmedHistory,
      currentPosition: trimmedHistory.length - 1
    });

    console.log('📝 Added to delete history:', deletedItem);
  },

  /**
   * Undo last delete operation
   */
  undo: async () => {
    const { deleteHistory, currentPosition } = get();
    
    if (currentPosition < 0 || deleteHistory.length === 0) {
      toast.info('Nothing to undo');
      return false;
    }

    const itemToRestore = deleteHistory[currentPosition];
    
    if (itemToRestore.isUndone) {
      toast.info('This item is already restored');
      return false;
    }

    try {
      // Restore the item to database
      await dbOperations.insert(itemToRestore.table, itemToRestore.data);
      
      // Mark as undone
      const updatedHistory = [...deleteHistory];
      updatedHistory[currentPosition] = { ...itemToRestore, isUndone: true };
      
      set({
        deleteHistory: updatedHistory,
        currentPosition: currentPosition - 1
      });

      toast.success(`Restored deleted ${itemToRestore.table.replace('_', ' ')} entry`);
      console.log('↩️ Undo successful:', itemToRestore);
      return true;
    } catch (error) {
      console.error('Error during undo:', error);
      toast.error('Failed to restore deleted item');
      return false;
    }
  },

  /**
   * Redo last undone operation
   */
  redo: async () => {
    const { deleteHistory, currentPosition } = get();
    
    const nextPosition = currentPosition + 1;
    
    if (nextPosition >= deleteHistory.length) {
      toast.info('Nothing to redo');
      return false;
    }

    const itemToDelete = deleteHistory[nextPosition];
    
    if (!itemToDelete.isUndone) {
      toast.info('This item is already deleted');
      return false;
    }

    try {
      // Delete the item again
      await dbOperations.delete(itemToDelete.table, itemToDelete.data.id);
      
      // Mark as not undone (deleted again)
      const updatedHistory = [...deleteHistory];
      updatedHistory[nextPosition] = { ...itemToDelete, isUndone: false };
      
      set({
        deleteHistory: updatedHistory,
        currentPosition: nextPosition
      });

      toast.success(`Re-deleted ${itemToDelete.table.replace('_', ' ')} entry`);
      console.log('↪️ Redo successful:', itemToDelete);
      return true;
    } catch (error) {
      console.error('Error during redo:', error);
      toast.error('Failed to re-delete item');
      return false;
    }
  },

  /**
   * Check if undo is available
   */
  canUndo: () => {
    const { deleteHistory, currentPosition } = get();
    return currentPosition >= 0 && 
           deleteHistory.length > 0 && 
           !deleteHistory[currentPosition]?.isUndone;
  },

  /**
   * Check if redo is available
   */
  canRedo: () => {
    const { deleteHistory, currentPosition } = get();
    const nextPosition = currentPosition + 1;
    return nextPosition < deleteHistory.length && 
           deleteHistory[nextPosition]?.isUndone;
  },

  /**
   * Get count of pending (undoable) deletes
   */
  getPendingDeletesCount: () => {
    const { deleteHistory, currentPosition } = get();
    return deleteHistory.slice(0, currentPosition + 1)
      .filter(item => !item.isUndone).length;
  },

  /**
   * Clear all delete history
   */
  clearHistory: () => {
    set({
      deleteHistory: [],
      currentPosition: -1
    });
    toast.success('Delete history cleared');
  }
}));

export default useDeleteHistoryStore;

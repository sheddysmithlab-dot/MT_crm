// Data synchronization utility for cross-module updates
// Broadcasts changes across different modules in real-time

export const DATA_SYNC_EVENT = 'data-sync-update';

/**
 * Entity types for data synchronization
 */
export const SYNC_TYPES = {
  CUSTOMER: 'customer',
  VOUCHER: 'voucher',
  LEDGER: 'ledger',
  ATTENDANCE: 'attendance',
  JOB: 'job',
  INVENTORY: 'inventory',
  SUPPLIER: 'supplier',
  VENDOR: 'vendor'
};

/**
 * Broadcast a data change event to all listening components
 * @param {string} entity - The entity type (e.g., 'voucher', 'ledger', 'attendance')
 * @param {string} action - The action performed ('created', 'updated', 'deleted')
 * @param {object} data - The data that was changed
 */
export const broadcastDataChange = (entity, action, data) => {
  const event = new CustomEvent(DATA_SYNC_EVENT, {
    detail: { entity, action, data, timestamp: Date.now() }
  });
  window.dispatchEvent(event);
  
  // Log for debugging
  console.log(`[DataSync] ${entity} ${action}:`, data);
};

/**
 * Subscribe to data change events
 * @param {function} callback - Function to call when data changes
 * @returns {function} Unsubscribe function
 */
export const subscribeToDataChanges = (callback) => {
  const handler = (event) => {
    callback(event.detail);
  };
  
  window.addEventListener(DATA_SYNC_EVENT, handler);
  
  // Return unsubscribe function
  return () => {
    window.removeEventListener(DATA_SYNC_EVENT, handler);
  };
};

/**
 * Subscribe to specific entity changes
 * @param {string} entity - The entity type to listen for
 * @param {function} callback - Function to call when the entity changes
 * @returns {function} Unsubscribe function
 */
export const subscribeToEntity = (entity, callback) => {
  return subscribeToDataChanges(({ entity: changedEntity, action, data }) => {
    if (changedEntity === entity) {
      callback({ action, data });
    }
  });
};

/**
 * Subscribe to multiple entity changes
 * @param {string[]} entities - Array of entity types to listen for
 * @param {function} callback - Function to call when any of the entities change
 * @returns {function} Unsubscribe function
 */
export const subscribeToEntities = (entities, callback) => {
  return subscribeToDataChanges(({ entity, action, data }) => {
    if (entities.includes(entity)) {
      callback({ entity, action, data });
    }
  });
};

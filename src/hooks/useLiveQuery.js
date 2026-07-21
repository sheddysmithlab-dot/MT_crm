import { useState, useEffect, useRef } from 'react';
import { liveQuery } from '@/lib/db';

/**
 * React hook for Dexie live queries
 * Automatically re-renders when database data changes
 * 
 * @param {Function} querier - Query function that returns a Promise
 * @param {Array} deps - Dependencies array (like useEffect)
 * @param {any} defaultValue - Default value while loading
 * @returns {Object} - { data, loading, error }
 * 
 * @example
 * const { data: customers, loading } = useLiveQuery(
 *   () => db.customers.where('status').equals('active').toArray(),
 *   []
 * );
 */
export const useLiveQuery = (querier, deps = [], defaultValue = undefined) => {
  const [data, setData] = useState(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const subscriptionRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    try {
      // Create live query observable
      const observable = liveQuery(querier);
      
      // Subscribe to changes
      subscriptionRef.current = observable.subscribe(
        result => {
          if (!cancelled) {
            setData(result);
            setLoading(false);
          }
        },
        err => {
          if (!cancelled) {
            setError(err);
            setLoading(false);
            console.error('[useLiveQuery] Error:', err);
          }
        }
      );
    } catch (err) {
      if (!cancelled) {
        setError(err);
        setLoading(false);
        console.error('[useLiveQuery] Setup error:', err);
      }
    }

    // Cleanup
    return () => {
      cancelled = true;
      if (subscriptionRef.current && subscriptionRef.current.unsubscribe) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, deps);

  return { data, loading, error };
};

/**
 * Hook for live query with pagination
 * 
 * @param {string} tableName - Name of the table
 * @param {Object} options - Pagination options { page, limit, orderBy, orderDir, filters }
 * @returns {Object} - { data, total, page, totalPages, loading, error }
 * 
 * @example
 * const { data, total, page, totalPages } = useLiveQueryPaginated('customers', {
 *   page: 1,
 *   limit: 10,
 *   filters: { status: 'active' }
 * });
 */
export const useLiveQueryPaginated = (tableName, options = {}) => {
  const { paginate } = require('@/lib/db');
  
  return useLiveQuery(
    () => paginate(tableName, options),
    [tableName, JSON.stringify(options)],
    { data: [], total: 0, page: 1, totalPages: 0 }
  );
};

/**
 * Hook for live search across multiple fields
 * 
 * @param {string} tableName - Name of the table
 * @param {string} searchTerm - Search term
 * @param {Array<string>} fields - Fields to search in
 * @returns {Object} - { data, loading, error }
 * 
 * @example
 * const { data: results } = useLiveSearch('customers', searchTerm, ['name', 'email', 'phone']);
 */
export const useLiveSearch = (tableName, searchTerm, fields = []) => {
  const { search } = require('@/lib/db');
  
  return useLiveQuery(
    () => searchTerm ? search(tableName, searchTerm, fields) : Promise.resolve([]),
    [tableName, searchTerm, JSON.stringify(fields)],
    []
  );
};

/**
 * Hook for live aggregation
 * 
 * @param {string} tableName - Name of the table
 * @param {string} operation - Operation type: 'sum', 'avg', 'count', 'groupBy'
 * @param {string} field - Field to aggregate
 * @param {Object} filters - Optional filters
 * @returns {Object} - { data, loading, error }
 * 
 * @example
 * const { data: totalRevenue } = useLiveAggregate('invoices', 'sum', 'amount', { status: 'paid' });
 */
export const useLiveAggregate = (tableName, operation, field, filters = {}) => {
  const { aggregate } = require('@/lib/db');
  
  return useLiveQuery(
    () => aggregate[operation](tableName, field, filters),
    [tableName, operation, field, JSON.stringify(filters)],
    operation === 'groupBy' ? {} : 0
  );
};

/**
 * Hook for live count with filters
 * 
 * @param {string} tableName - Name of the table
 * @param {Object} filters - Optional filters
 * @returns {Object} - { data, loading, error }
 * 
 * @example
 * const { data: activeCount } = useLiveCount('customers', { status: 'active' });
 */
export const useLiveCount = (tableName, filters = {}) => {
  return useLiveAggregate(tableName, 'count', null, filters);
};

export default useLiveQuery;

import { dbOperations } from '@/lib/db';

/**
 * Save or update item rates in rate_list_memory table
 * This function is called automatically when creating invoices, challans, estimates, or updating stock
 * Stores both actual_price (cost/purchase) and selling_price
 * 
 * @param {Array} items - Array of items with material_name, rate/cost_price, selling_price, category_id
 * @param {string} source - Source type: 'purchase', 'sale', 'estimate', 'stock'
 */
export const saveRateListMemory = async (items, source = 'sale') => {
  if (!items || items.length === 0) return;

  try {
    const existingRates = await dbOperations.getAll('rate_list_memory') || [];
    
    for (const item of items) {
      // Get material name from various possible field names
      const materialName = item.material_name || item.name || item.item || item.productName;
      const categoryId = item.category_id || item.category || '';
      
      // Skip items without required fields
      if (!materialName) continue;

      // Get actual price (cost price) and selling price
      const actualPrice = parseFloat(item.actual_price || item.cost_price || item.cost || item.rate || 0);
      const sellingPrice = parseFloat(item.selling_price || item.rate || item.cost || 0);
      
      // Skip if both prices are invalid
      if ((isNaN(actualPrice) || actualPrice <= 0) && (isNaN(sellingPrice) || sellingPrice <= 0)) continue;

      // Find existing entry for this material and category
      const existing = existingRates.find(
        r => r.material_name?.toLowerCase() === materialName?.toLowerCase() && 
             r.category_id === categoryId
      );

      const updateData = {
        updated_at: new Date().toISOString(),
        last_source: source
      };
      
      // Update actual_price if provided and valid
      if (!isNaN(actualPrice) && actualPrice > 0) {
        updateData.actual_price = actualPrice;
      }
      
      // Update selling_price if provided and valid
      if (!isNaN(sellingPrice) && sellingPrice > 0) {
        updateData.selling_price = sellingPrice;
        updateData.rate = sellingPrice; // Keep rate for backward compatibility
      }

      if (existing) {
        // Update existing rate - merge with existing values
        await dbOperations.update('rate_list_memory', existing.id, {
          actual_price: updateData.actual_price || existing.actual_price || 0,
          selling_price: updateData.selling_price || existing.selling_price || 0,
          rate: updateData.rate || existing.rate || 0,
          updated_at: updateData.updated_at,
          last_source: source
        });
      } else {
        // Create new rate entry
        await dbOperations.insert('rate_list_memory', {
          id: `rate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          material_name: materialName,
          category_id: categoryId,
          actual_price: actualPrice > 0 ? actualPrice : 0,
          selling_price: sellingPrice > 0 ? sellingPrice : 0,
          rate: sellingPrice > 0 ? sellingPrice : actualPrice, // Default rate to selling or actual
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_source: source
        });
      }
    }
    
    // Save to backend file
    if (window.electron?.fs?.writeFile) {
      try {
        const allRates = await dbOperations.getAll('rate_list_memory');
        await window.electron.fs.writeFile(
          'C:/malwa-crm/Data_base/Rate_List_Memory/rate_list_memory.json',
          JSON.stringify(allRates, null, 2)
        );
        console.log('✅ Rate list memory saved to backend');
      } catch (err) {
        console.error('❌ Failed to save rate list memory to backend:', err);
      }
    }
  } catch (error) {
    console.error('Error saving to rate list memory:', error);
    // Don't throw error - this should not break the main invoice/challan flow
  }
};

/**
 * Get the last saved rate for a material from rate_list_memory
 * 
 * @param {string} materialName - Name of the material
 * @param {string} categoryId - Category ID
 * @returns {object|null} - Object with actual_price, selling_price, rate or null if not found
 */
export const getLastRate = async (materialName, categoryId) => {
  try {
    const allRates = await dbOperations.getAll('rate_list_memory') || [];
    const rateEntry = allRates.find(
      r => r.material_name?.toLowerCase() === materialName?.toLowerCase() && 
           r.category_id === categoryId
    );
    
    if (rateEntry) {
      return {
        actual_price: parseFloat(rateEntry.actual_price || 0),
        selling_price: parseFloat(rateEntry.selling_price || rateEntry.rate || 0),
        rate: parseFloat(rateEntry.rate || rateEntry.selling_price || 0)
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting last rate:', error);
    return null;
  }
};

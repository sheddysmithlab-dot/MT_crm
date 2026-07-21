import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { dbOperations } from '@/lib/db';
import { Check } from 'lucide-react';

/**
 * InventoryItemCombobox - Autocomplete dropdown for inventory items
 * Shows suggestions from inventory_items based on text match
 * Auto-fills category and rate when item is selected
 */
const InventoryItemCombobox = ({ 
  value, 
  onChange, 
  onItemSelect,
  placeholder = 'Enter material name', 
  className = '',
  disabled = false,
  ...props 
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredItems, setFilteredItems] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Load inventory items
  useEffect(() => {
    loadInventoryItems();
  }, []);

  const loadInventoryItems = async () => {
    try {
      const items = await dbOperations.getAll('inventory_items');
      setAllItems(items || []);
    } catch (error) {
      console.error('Error loading inventory items:', error);
      setAllItems([]);
    }
  };

  // Filter items based on input
  useEffect(() => {
    if (!value || value.length < 1 || disabled) {
      setShowDropdown(false);
      return;
    }

    const searchTerm = value.toLowerCase().trim();
    const filtered = allItems.filter(item => 
      item.material_name?.toLowerCase().includes(searchTerm)
    );

    if (filtered.length > 0) {
      setFilteredItems(filtered);
      setShowDropdown(true);
      setActiveIndex(0);
    } else {
      setShowDropdown(false);
    }
  }, [value, allItems, disabled]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showDropdown || filteredItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev < filteredItems.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[activeIndex]) {
        handleItemSelect(filteredItems[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    } else if (e.key === 'Tab' && filteredItems.length > 0) {
      e.preventDefault();
      handleItemSelect(filteredItems[0]);
    }
  };

  // Handle item selection
  const handleItemSelect = (item) => {
    if (onChange) {
      onChange({ target: { value: item.material_name } });
    }
    
    // Trigger callback with full item data for auto-filling category and rate
    if (onItemSelect) {
      onItemSelect({
        material_name: item.material_name,
        category_id: item.category_id,
        rate: item.selling_rate || item.rate || 0,
      });
    }
    
    setShowDropdown(false);
    inputRef.current?.blur();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !inputRef.current?.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (value && filteredItems.length > 0) {
            setShowDropdown(true);
          }
        }}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        autoComplete="off"
        {...props}
      />
      
      <AnimatePresence>
        {showDropdown && filteredItems.length > 0 && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-card border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            <div className="p-1">
              <div className="text-xs text-gray-500 dark:text-gray-400 px-3 py-1.5 font-medium border-b border-gray-200 dark:border-gray-600">
                Select from stock ({filteredItems.length} items)
              </div>
              {filteredItems.map((item, index) => (
                <motion.button
                  key={item.id}
                  type="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => handleItemSelect(item)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${
                    index === activeIndex
                      ? 'bg-brand-red/10 text-brand-red dark:bg-brand-red/20'
                      : 'text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-medium">{item.material_name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Rate: ₹{item.selling_rate || item.rate || 0} 
                      {item.stock_quantity && ` • Stock: ${item.stock_quantity}`}
                    </div>
                  </div>
                  {index === activeIndex && (
                    <Check className="w-4 h-4 ml-2" />
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InventoryItemCombobox;

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, X } from 'lucide-react';

const ComboBox = ({ 
  value, 
  onChange, 
  onSelect, 
  suggestions = [], 
  placeholder = "Select or type...",
  className = "",
  displayKey = "name",
  disabled = false,
  showClearButton = true,
  ...props 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!value || value.trim() === '') {
      setFilteredSuggestions(suggestions);
      return;
    }

    const searchTerm = value.toLowerCase().trim();
    const filtered = suggestions.filter(item => {
      const displayValue = typeof item === 'string' ? item : item[displayKey];
      return displayValue && displayValue.toLowerCase().includes(searchTerm);
    });

    setFilteredSuggestions(filtered);
    setHighlightedIndex(-1);
  }, [value, suggestions, displayKey]);

  const handleInputChange = (e) => {
    onChange(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  const handleSuggestionClick = (suggestion) => {
    const displayValue = typeof suggestion === 'string' ? suggestion : suggestion[displayKey];
    onChange(displayValue);
    onSelect && onSelect(suggestion);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    onSelect && onSelect(null);
    inputRef.current?.focus();
  };

  const handleToggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        inputRef.current?.focus();
      }
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      setIsOpen(true);
      return;
    }

    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
          handleSuggestionClick(filteredSuggestions[highlightedIndex]);
        } else {
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={`${className} pr-16`}
          {...props}
        />
        <div className="absolute right-1 flex items-center gap-1">
          {showClearButton && value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
              tabIndex={-1}
            >
              <X className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
            </button>
          )}
          <button
            type="button"
            onClick={handleToggleDropdown}
            disabled={disabled}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            tabIndex={-1}
          >
            <ChevronDown 
              className={`h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform ${
                isOpen ? 'transform rotate-180' : ''
              }`} 
            />
          </button>
        </div>
      </div>
      
      {isOpen && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredSuggestions.map((suggestion, index) => {
            const displayValue = typeof suggestion === 'string' ? suggestion : suggestion[displayKey];
            const sellingPrice = typeof suggestion === 'object' ? (suggestion.selling_price || suggestion.selling_rate || suggestion.rate) : null;
            const stockQuantity = typeof suggestion === 'object' ? suggestion.stock_quantity : null;
            const phone = typeof suggestion === 'object' ? suggestion.phone : null;
            const address = typeof suggestion === 'object' ? suggestion.address : null;
            const categoryName = typeof suggestion === 'object' ? suggestion.category_name : null;
            
            return (
              <div
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`px-3 py-2 cursor-pointer transition-colors ${
                  highlightedIndex === index
                    ? 'bg-blue-500 text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="font-medium">{displayValue}</span>
                    {categoryName && (
                      <span className={`text-xs mt-0.5 ${
                        highlightedIndex === index ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        📁 {categoryName}
                      </span>
                    )}
                  </div>
                  {sellingPrice && (
                    <span className={`text-sm ml-2 font-semibold ${
                      highlightedIndex === index ? 'text-white' : 'text-green-600 dark:text-green-400'
                    }`}>
                      ₹{sellingPrice}
                    </span>
                  )}
                </div>
                {stockQuantity !== null && stockQuantity !== undefined && (
                  <div className={`text-xs mt-0.5 ${
                    highlightedIndex === index ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    📦 Stock: {stockQuantity}
                  </div>
                )}
                {phone && (
                  <div className={`text-xs mt-0.5 ${
                    highlightedIndex === index ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    📱 {phone}
                  </div>
                )}
                {address && (
                  <div className={`text-xs mt-0.5 truncate ${
                    highlightedIndex === index ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    📍 {address}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isOpen && filteredSuggestions.length === 0 && value && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
          <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
            No matches found. You can type manually.
          </div>
        </div>
      )}
    </div>
  );
};

export default ComboBox;

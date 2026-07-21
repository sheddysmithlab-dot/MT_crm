import { useState, useEffect, useRef } from 'react';

const AutocompleteInput = ({ 
  value, 
  onChange, 
  onSelect, 
  suggestions = [], 
  placeholder = "Type to search...",
  className = "",
  displayKey = "name",
  ...props 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef(null);

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
      setFilteredSuggestions([]);
      setIsOpen(false);
      return;
    }

    const searchTerm = value.toLowerCase().trim();
    const filtered = suggestions.filter(item => {
      const displayValue = typeof item === 'string' ? item : item[displayKey];
      return displayValue && displayValue.toLowerCase().includes(searchTerm);
    });

    setFilteredSuggestions(filtered);
    setIsOpen(filtered.length > 0);
    setHighlightedIndex(-1);
  }, [value, suggestions, displayKey]);

  const handleInputChange = (e) => {
    onChange(e.target.value);
  };

  const handleSuggestionClick = (suggestion) => {
    const displayValue = typeof suggestion === 'string' ? suggestion : suggestion[displayKey];
    onChange(displayValue);
    onSelect && onSelect(suggestion);
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
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
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (value && filteredSuggestions.length > 0) {
            setIsOpen(true);
          }
        }}
        placeholder={placeholder}
        className={className}
        {...props}
      />
      
      {isOpen && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredSuggestions.map((suggestion, index) => {
            const displayValue = typeof suggestion === 'string' ? suggestion : suggestion[displayKey];
            const rate = typeof suggestion === 'object' ? suggestion.rate : null;
            const sellingRate = typeof suggestion === 'object' ? suggestion.selling_rate : null;
            const phone = typeof suggestion === 'object' ? suggestion.phone : null;
            const address = typeof suggestion === 'object' ? suggestion.address : null;
            
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
                  <span className="font-medium">{displayValue}</span>
                  {sellingRate && (
                    <span className={`text-sm ml-2 ${
                      highlightedIndex === index ? 'text-white' : 'text-green-600 dark:text-green-400'
                    }`}>
                      ₹{sellingRate}
                    </span>
                  )}
                </div>
                {rate && !sellingRate && (
                  <div className={`text-xs mt-0.5 ${
                    highlightedIndex === index ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    Purchase: ₹{rate}
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
    </div>
  );
};

export default AutocompleteInput;

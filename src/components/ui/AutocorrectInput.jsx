import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutocorrect } from '@/hooks/useAutocorrect';

/**
 * AutocorrectInput - Input field with spelling suggestions
 * Provides real-time spelling correction suggestions for text inputs
 */
const AutocorrectInput = ({ 
  value, 
  onChange, 
  placeholder = '', 
  className = '',
  context = 'general',
  disabled = false,
  ...props 
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const { getSuggestions } = useAutocorrect();

  // Filter suggestions based on input
  useEffect(() => {
    if (!value || value.length < 2 || disabled) {
      setShowSuggestions(false);
      return;
    }

    const suggestions = getSuggestions(value, context);
    
    if (suggestions.length > 0) {
      setFilteredSuggestions(suggestions);
      setShowSuggestions(true);
      setActiveSuggestionIndex(0);
    } else {
      setShowSuggestions(false);
    }
  }, [value, context, disabled, getSuggestions]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter' && filteredSuggestions.length > 0) {
      e.preventDefault();
      handleSuggestionClick(filteredSuggestions[activeSuggestionIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    } else if (e.key === 'Tab' && filteredSuggestions.length > 0) {
      e.preventDefault();
      handleSuggestionClick(filteredSuggestions[0]);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    const words = value.split(' ');
    words[words.length - 1] = suggestion;
    const newValue = words.join(' ') + ' ';
    
    if (onChange) {
      onChange({ target: { value: newValue } });
    }
    
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        !inputRef.current?.contains(event.target)
      ) {
        setShowSuggestions(false);
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
        placeholder={placeholder}
        className={className}
        {...props}
      />
      
      <AnimatePresence>
        {showSuggestions && filteredSuggestions.length > 0 && (
          <motion.div
            ref={suggestionsRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg shadow-lg max-h-48 overflow-y-auto"
          >
            <div className="p-1">
              <div className="text-xs text-gray-500 dark:text-dark-text-secondary px-3 py-1 font-medium">
                Did you mean?
              </div>
              {filteredSuggestions.map((suggestion, index) => (
                <motion.button
                  key={suggestion}
                  type="button"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    index === activeSuggestionIndex
                      ? 'bg-brand-red/10 text-brand-red dark:bg-brand-red/20'
                      : 'text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-surface'
                  }`}
                >
                  {suggestion}
                  {index === 0 && (
                    <span className="ml-2 text-xs text-gray-400 dark:text-dark-text-muted">
                      (Tab)
                    </span>
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

export default AutocorrectInput;

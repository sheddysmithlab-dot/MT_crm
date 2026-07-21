/**
 * Utility helpers for safe className handling
 * Prevents DOM token errors from undefined/object values
 */

/**
 * Safely concatenate className strings, filtering out invalid values
 * @param {...(string|undefined|null|boolean)} classes - Class names to combine
 * @returns {string} - Safe className string
 */
export const safeClassName = (...classes) => {
  return classes
    .filter(cls => cls && typeof cls === 'string' && cls.trim())
    .join(' ')
    .trim();
};

/**
 * Conditionally add classes with safety checks
 * @param {string} baseClasses - Base classes always applied
 * @param {boolean} condition - Condition to check
 * @param {string} conditionalClasses - Classes to add if condition is true
 * @param {string} elseClasses - Classes to add if condition is false (optional)
 * @returns {string} - Safe className string
 */
export const conditionalClassName = (baseClasses, condition, conditionalClasses, elseClasses = '') => {
  const base = typeof baseClasses === 'string' ? baseClasses : '';
  const conditional = condition 
    ? (typeof conditionalClasses === 'string' ? conditionalClasses : '')
    : (typeof elseClasses === 'string' ? elseClasses : '');
  
  return safeClassName(base, conditional);
};

/**
 * Template literal safe wrapper for dynamic classes
 * @param {string} template - Template with ${} placeholders
 * @param {...any} values - Values to interpolate safely
 * @returns {string} - Safe className string
 */
export const templateClassName = (template, ...values) => {
  try {
    // Replace ${} placeholders with safe values
    let result = template;
    values.forEach((value, index) => {
      const safeValue = (value && typeof value === 'string') ? value : '';
      result = result.replace(`$${index}`, safeValue);
    });
    return result;
  } catch (error) {
    console.warn('⚠️ Template className error:', error);
    return '';
  }
};

/**
 * Global DOM token error prevention
 * Override the native classList.add to prevent object errors
 */
export const preventDOMTokenErrors = () => {
  try {
    // Check if DOM environment exists
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      console.warn('⚠️ Not in browser environment');
      return false;
    }

    if (typeof Element === 'undefined' || !Element.prototype || !Element.prototype.classList) {
      console.warn('⚠️ DOM classList not available');
      return false;
    }

    // Check if DOMTokenList exists
    if (typeof DOMTokenList === 'undefined' || !DOMTokenList.prototype) {
      console.warn('⚠️ DOMTokenList not available');
      return false;
    }

    // Check if already patched to avoid duplicate installations
    if (DOMTokenList.prototype._malwaPatchedAdd) {
      console.log('✅ DOM token error prevention already installed');
      return true;
    }

    // Store original methods
    const originalAdd = DOMTokenList.prototype.add;
    const originalRemove = DOMTokenList.prototype.remove;
    const originalToggle = DOMTokenList.prototype.toggle;
    
    // Safe classList.add replacement
    DOMTokenList.prototype.add = function(...tokens) {
      try {
        // Validate 'this' context
        if (!this || !(this instanceof DOMTokenList)) {
          console.warn('⚠️ Invalid classList context, skipping add');
          return;
        }
        
        const safeTokens = [];
        
        for (let i = 0; i < tokens.length; i++) {
          const token = tokens[i];
          if (token && typeof token === 'string' && token.trim() !== '') {
            safeTokens.push(token);
          } else if (token) {
            console.warn('⚠️ Invalid DOM token filtered out:', token);
          }
        }
        
        // Apply each token individually using original method with proper context
        for (let i = 0; i < safeTokens.length; i++) {
          originalAdd.call(this, safeTokens[i]);
        }
      } catch (error) {
        console.error('❌ DOM token add error prevented:', error);
      }
    };

    // Safe classList.remove replacement
    DOMTokenList.prototype.remove = function(...tokens) {
      try {
        // Validate 'this' context
        if (!this || !(this instanceof DOMTokenList)) {
          console.warn('⚠️ Invalid classList context, skipping remove');
          return;
        }
        
        const safeTokens = [];
        
        for (let i = 0; i < tokens.length; i++) {
          const token = tokens[i];
          if (token && typeof token === 'string' && token.trim() !== '') {
            safeTokens.push(token);
          }
        }
        
        for (let i = 0; i < safeTokens.length; i++) {
          originalRemove.call(this, safeTokens[i]);
        }
      } catch (error) {
        console.error('❌ DOM token remove error prevented:', error);
      }
    };

    // Safe classList.toggle replacement
    DOMTokenList.prototype.toggle = function(token, force) {
      try {
        // Validate 'this' context
        if (!this || !(this instanceof DOMTokenList)) {
          console.warn('⚠️ Invalid classList context, skipping toggle');
          return false;
        }
        
        if (token && typeof token === 'string' && token.trim()) {
          return originalToggle.call(this, token, force);
        }
        return false;
      } catch (error) {
        console.error('❌ DOM token toggle error prevented:', error);
        return false;
      }
    };
    
    // Mark as patched
    DOMTokenList.prototype._malwaPatchedAdd = true;
    console.log('✅ DOM token error prevention installed');
    return true;
  } catch (error) {
    console.error('❌ Failed to install DOM token error prevention:', error);
    return false;
  }
};

/**
 * Enhanced className combiner with object support
 * @param {...(string|object|array)} classes - Classes to combine
 * @returns {string} - Safe className string
 */
export const cx = (...classes) => {
  const result = [];
  
  classes.forEach(cls => {
    if (!cls) return;
    
    if (typeof cls === 'string') {
      result.push(cls);
    } else if (typeof cls === 'object' && !Array.isArray(cls)) {
      // Handle object-style classes {active: true, disabled: false}
      Object.keys(cls).forEach(key => {
        if (cls[key]) {
          result.push(key);
        }
      });
    } else if (Array.isArray(cls)) {
      // Handle arrays recursively
      result.push(cx(...cls));
    }
  });
  
  return result.filter(Boolean).join(' ');
};

export default {
  safeClassName,
  conditionalClassName,
  templateClassName
};
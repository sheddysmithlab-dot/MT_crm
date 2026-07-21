import { motion } from 'framer-motion';

const Button = ({ children, onClick, className = '', variant = 'primary', size = 'md', type = 'button', disabled = false }) => {
  const sizes = {
    sm: 'px-3 py-2 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  
  const baseClasses = `inline-flex items-center justify-center ${sizes[size]} font-bold rounded-lg focus:outline-none focus:ring-4 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden`;
  const variants = {
    primary: 'text-white bg-brand-red hover:bg-brand-red-dark focus:ring-red-300 dark:focus:ring-red-800',
    secondary: 'text-gray-900 bg-white border border-gray-300 hover:bg-gray-100 focus:ring-gray-200 dark:bg-dark-surface dark:text-dark-text dark:border-dark-border dark:hover:bg-dark-card',
    ghost: 'text-brand-blue hover:bg-blue-50 focus:ring-brand-blue dark:text-blue-400 dark:hover:bg-dark-surface',
    success: 'text-white bg-green-600 hover:bg-green-700 focus:ring-green-300 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800',
    danger: 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-300 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-800',
  };

  // Ensure className is a string and handle all possible types
  const safeClassName = className && typeof className === 'string' ? className : '';
  
  // Validate all className parts to prevent DOMTokenList errors
  const finalClassName = [baseClasses, variants[variant], safeClassName]
    .filter(cls => cls && typeof cls === 'string' && cls.trim())
    .join(' ')
    .trim();

  return (
    <motion.button
      initial={{ y: 0, scale: 1, opacity: 1 }}
      animate={{ y: 0, scale: 1, opacity: 1 }}
      whileHover={disabled ? {} : { y: -2, scale: 1.02 }}
      whileTap={disabled ? {} : { y: 1, scale: 0.98 }}
      exit={{ y: 0, scale: 1, opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={finalClassName}
    >
      {children}
    </motion.button>
  );
};

export default Button;

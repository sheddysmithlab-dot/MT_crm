// Input validation utilities for CRM forms

// Phone number validation - only numeric, exactly 10 digits
export const validatePhoneInput = (value) => {
  // Remove all non-numeric characters
  const numericOnly = value.replace(/\D/g, '');
  // Limit to 10 digits
  return numericOnly.slice(0, 10);
};

// GST number validation - uppercase alphanumeric, exactly 15 characters
export const validateGSTInput = (value) => {
  // Convert to uppercase and remove invalid characters
  const upperCase = value.toUpperCase();
  // Allow only alphanumeric characters
  const alphanumericOnly = upperCase.replace(/[^A-Z0-9]/g, '');
  // Limit to 15 characters
  return alphanumericOnly.slice(0, 15);
};

// Aadhaar number validation - only numeric, exactly 12 digits
export const validateAadhaarInput = (value) => {
  // Remove all non-numeric characters
  const numericOnly = value.replace(/\D/g, '');
  // Limit to 12 digits
  return numericOnly.slice(0, 12);
};

// Payment/amount field handlers - keep blank instead of setting to 0
export const handlePaymentFocus = (inputRef) => {
  if (inputRef.current && (inputRef.current.value === '0' || inputRef.current.value === '0.00')) {
    inputRef.current.value = '';
  }
};

export const handlePaymentBlur = (inputRef) => {
  // Keep blank if empty - don't set to 0
  // This allows users to leave fields empty instead of forcing 0
};

// Format phone number for display (XXX-XXX-XXXX)
export const formatPhoneDisplay = (phone) => {
  if (!phone || phone.length !== 10) return phone;
  return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
};

// Format Aadhaar for display (XXXX-XXXX-XXXX)
export const formatAadhaarDisplay = (aadhaar) => {
  if (!aadhaar || aadhaar.length !== 12) return aadhaar;
  return `${aadhaar.slice(0, 4)}-${aadhaar.slice(4, 8)}-${aadhaar.slice(8)}`;
};

// Numeric only input validation
export const validateNumericInput = (value, maxLength = null) => {
  const numericOnly = value.replace(/\D/g, '');
  return maxLength ? numericOnly.slice(0, maxLength) : numericOnly;
};

// Validate decimal input for amounts (allows negative values)
export const validateDecimalInput = (value, maxDecimals = 2) => {
  // Allow optional minus sign at start, numbers and single decimal point
  const validPattern = /^-?\d*\.?\d*$/;
  if (!validPattern.test(value)) return value.slice(0, -1);
  
  // Limit decimal places
  if (value.includes('.')) {
    const parts = value.split('.');
    if (parts[1] && parts[1].length > maxDecimals) {
      return parts[0] + '.' + parts[1].slice(0, maxDecimals);
    }
  }
  
  return value;
};

// Vehicle number validation - uppercase only
export const validateVehicleInput = (value) => {
  // Convert to uppercase
  return value.toUpperCase();
};
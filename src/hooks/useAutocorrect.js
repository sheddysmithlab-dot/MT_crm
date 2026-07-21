import { useState, useCallback } from 'react';

/**
 * Custom hook for autocorrect functionality
 * Provides spelling suggestions for common words
 */
export const useAutocorrect = () => {
  // Comprehensive suggestions database
  const suggestionDatabase = {
    // Vehicle makes and models
    vehicle: ['Honda', 'Toyota', 'Maruti', 'Hyundai', 'Tata', 'Mahindra', 'Ford', 'Chevrolet', 'Nissan', 'Volkswagen'],
    service: ['Engine Repair', 'Oil Change', 'Brake Service', 'Tire Replacement', 'AC Repair', 'Battery Replacement', 'Painting', 'Denting', 'Body Work', 'Transmission Repair'],
    parts: ['Engine Oil', 'Brake Pads', 'Air Filter', 'Spark Plugs', 'Battery', 'Tires', 'Clutch Plate', 'Radiator', 'Headlight', 'Windshield'],
    
    // Customer/Vendor categories
    category: ['Regular Customer', 'VIP Customer', 'Corporate', 'Individual', 'Dealer', 'Wholesaler', 'Retailer'],
    
    // Job types
    jobType: ['Repair', 'Service', 'Maintenance', 'Inspection', 'Painting', 'Denting', 'Body Work', 'Engine Overhaul'],
    
    // Payment methods
    payment: ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Net Banking', 'Cheque', 'Account Transfer'],
    
    // Common descriptions
    description: [
      'Regular maintenance service',
      'Emergency repair',
      'Scheduled service',
      'Warranty repair',
      'Insurance claim',
      'Customer complaint',
      'Preventive maintenance',
      'Accident repair'
    ],
    
    // Cities (India)
    city: ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Indore', 'Bhopal'],
    
    // States (India)
    state: ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Gujarat', 'Rajasthan', 'Uttar Pradesh', 'Madhya Pradesh', 'Punjab', 'Haryana'],
  };

  // Common spelling corrections
  const corrections = {
    // Vehicle related
    'vehical': 'vehicle',
    'vehicl': 'vehicle',
    'veicle': 'vehicle',
    'engin': 'engine',
    'ingine': 'engine',
    'repar': 'repair',
    'repiar': 'repair',
    'servic': 'service',
    'maintenence': 'maintenance',
    'maintainance': 'maintenance',
    'inspction': 'inspection',
    'inspecion': 'inspection',
    
    // Customer related
    'custmer': 'customer',
    'costumer': 'customer',
    'customar': 'customer',
    'addres': 'address',
    'adress': 'address',
    'phon': 'phone',
    'fone': 'phone',
    'mobil': 'mobile',
    'moblie': 'mobile',
    
    // Job/Invoice related
    'estimat': 'estimate',
    'esitmate': 'estimate',
    'invice': 'invoice',
    'invoce': 'invoice',
    'payemnt': 'payment',
    'paymnt': 'payment',
    'ammount': 'amount',
    'amout': 'amount',
    
    // Parts/Inventory
    'inventry': 'inventory',
    'inventroy': 'inventory',
    'stok': 'stock',
    'supplie': 'supplier',
    'suplier': 'supplier',
    'quantiy': 'quantity',
    'quatity': 'quantity',
    'waranty': 'warranty',
    'guarntee': 'guarantee',
    
    // General
    'recieve': 'receive',
    'recive': 'receive',
    'desciption': 'description',
    'discription': 'description',
    'seperrate': 'separate',
    'seperate': 'separate',
    'occured': 'occurred',
    'sucessful': 'successful',
    'sucessfully': 'successfully',
  };

  // Get suggestions based on input and context
  const getSuggestions = useCallback((input, context = 'general') => {
    if (!input || input.length < 2) return [];

    const words = input.toLowerCase().split(' ');
    const lastWord = words[words.length - 1];
    
    const suggestions = new Set();

    // Add spelling corrections
    if (corrections[lastWord]) {
      suggestions.add(corrections[lastWord]);
    }

    // Add context-based suggestions
    if (suggestionDatabase[context]) {
      suggestionDatabase[context]
        .filter(item => item.toLowerCase().includes(lastWord))
        .forEach(item => suggestions.add(item));
    }

    // Search all databases if no context match
    if (suggestions.size === 0) {
      Object.values(suggestionDatabase).forEach(items => {
        items
          .filter(item => item.toLowerCase().includes(lastWord))
          .slice(0, 3)
          .forEach(item => suggestions.add(item));
      });
    }

    return Array.from(suggestions).slice(0, 5);
  }, []);

  // Auto-correct the input
  const autoCorrect = useCallback((input) => {
    const words = input.split(' ');
    const correctedWords = words.map(word => {
      const lowerWord = word.toLowerCase();
      return corrections[lowerWord] || word;
    });
    return correctedWords.join(' ');
  }, []);

  return {
    getSuggestions,
    autoCorrect,
    suggestionDatabase,
    corrections
  };
};

export default useAutocorrect;

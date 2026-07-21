import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import useCompanyStore from '../store/companyStore';

/**
 * Standardized export utilities for consistent PDF, CSV, and Print outputs
 * Matches the table/card UI/UX design pattern
 */

/**
 * Export data to CSV with standardized formatting
 * @param {Array} headers - Array of column headers
 * @param {Array} rows - Array of row data
 * @param {string} filename - Name of the file to download
 */
export const exportToCSV = (headers, rows, filename) => {
  try {
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        // Handle cells with commas or quotes
        const cellStr = String(cell || '');
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    return false;
  }
};

/**
 * Export data to PDF with standardized formatting and table styling
 * @param {Object} config - PDF configuration
 * @param {string} config.title - PDF title
 * @param {string} config.subtitle - PDF subtitle (optional)
 * @param {Array} config.headerInfo - Array of {label, value} objects for header info
 * @param {Array} config.tableHeaders - Array of table column headers
 * @param {Array} config.tableData - Array of table row data
 * @param {Array} config.summaryCards - Array of {label, value} objects for summary (optional)
 * @param {string} config.filename - Name of the file to download
 * @param {string} config.orientation - 'p' for portrait, 'l' for landscape (default: 'p')
 */
export const exportToPDF = (config) => {
  try {
    const {
      title,
      subtitle,
      headerInfo = [],
      tableHeaders,
      tableData,
      summaryCards = [],
      filename,
      orientation = 'p',
      columnStyles = {},
      foot = null
    } = config;

    const { companyDetails } = useCompanyStore.getState();

    const doc = new jsPDF(orientation, 'mm', 'a4');
    let yPosition = 15;

    // Add Title with brand red background effect
    doc.setFillColor(220, 53, 69); // Brand red
    doc.rect(0, 0, doc.internal.pageSize.width, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(26);
    doc.setFont(undefined, 'bold');
    doc.text(title, 14, yPosition);

    // Add Company Info on Right Side
    const rightX = doc.internal.pageSize.width - 14;
    let rightY = 12;
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(companyDetails.name || "Malwa Trolley", rightX, rightY, { align: 'right' });
    rightY += 5;
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    const address = `${companyDetails.address || ''}, ${companyDetails.city || ''}`.replace(/^, /, '').replace(/, $/, '');
    doc.text(address || "09, Nemawar Road, Udyog nagar, Palda, Indore", rightX, rightY, { align: 'right' });
    rightY += 4;
    doc.text(companyDetails.website || "www.malwatrolley.com", rightX, rightY, { align: 'right' });
    rightY += 4;
    doc.text(`Contact :- ${companyDetails.phone || '+91 822 4000 822'}`, rightX, rightY, { align: 'right' });
    rightY += 4;
    doc.text(`GSTIN : ${companyDetails.gstin || '23CLKPM9473J1ZI'}`, rightX, rightY, { align: 'right' });
    
    yPosition += 15;
    if (subtitle) {
      doc.setFontSize(14);
      doc.setFont(undefined, 'normal');
      doc.text(subtitle, 14, yPosition);
      yPosition += 8;
    }

    // Add Header Info
    if (headerInfo.length > 0) {
      doc.setFontSize(12);
      yPosition += 4;
      headerInfo.forEach((info, index) => {
        if (index > 0 && index % 3 === 0) {
          yPosition += 6;
        }
        const xPos = 14 + (index % 3) * 70;
        doc.setFont(undefined, 'normal');
        doc.text(`${info.label}:`, xPos, yPosition);
        doc.setFont(undefined, 'bold');
        doc.text(String(info.value), xPos + 35, yPosition);
      });
      yPosition += 10;
    }

    // Reset text color for content
    doc.setTextColor(0, 0, 0);
    yPosition = 50;

    // Add Summary Cards if provided
    if (summaryCards.length > 0) {
      const cardWidth = (doc.internal.pageSize.width - 28) / Math.min(summaryCards.length, 5);
      summaryCards.forEach((card, index) => {
        const xPos = 14 + (index % 5) * cardWidth;
        const cardY = yPosition + Math.floor(index / 5) * 25;
        
        // Card background
        if (card.bgColor) {
          const [r, g, b] = card.bgColor;
          doc.setFillColor(r, g, b);
        } else {
          doc.setFillColor(248, 249, 250);
        }
        doc.roundedRect(xPos, cardY, cardWidth - 2, 20, 2, 2, 'F');
        
        // Left border accent (optional, if no bgColor)
        if (!card.bgColor) {
          doc.setFillColor(220, 53, 69);
          doc.rect(xPos, cardY, 2, 20, 'F');
        }
        
        // Card text
        doc.setFontSize(10);
        if (card.textColor) {
          const [r, g, b] = card.textColor;
          doc.setTextColor(r, g, b);
        } else {
          doc.setTextColor(108, 117, 125);
        }
        doc.text(card.label, xPos + 4, cardY + 6);
        
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text(String(card.value), xPos + 4, cardY + 14);
      });
      yPosition += Math.ceil(summaryCards.length / 5) * 25 + 8;
    }

    // Add Table with autoTable
    if (tableHeaders && tableData) {
      autoTable(doc, {
        startY: yPosition,
        head: [tableHeaders],
        body: tableData,
        foot: foot ? [foot] : undefined,
        theme: 'grid',
        margin: { left: 10, right: 10 },
        styles: {
          fontSize: 11,
          cellPadding: 1.5,
          lineColor: [222, 226, 230],
          lineWidth: 0.1,
        },
        columnStyles: columnStyles,
        headStyles: {
          fillColor: [248, 249, 250],
          textColor: [73, 80, 87],
          fontStyle: 'bold',
          halign: 'left',
          lineWidth: 0.5,
          lineColor: [222, 226, 230],
          fontSize: 12
        },
        bodyStyles: {
          textColor: [33, 37, 41],
        },
        alternateRowStyles: {
          fillColor: [252, 252, 252],
        },
        footStyles: {
          fillColor: [248, 249, 250],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          lineWidth: 0.5,
          lineColor: [222, 226, 230],
          fontSize: 12
        },
      });
    }

    // Add Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(108, 117, 125);
      doc.setFont(undefined, 'normal');
      
      const footerText = `Generated on ${new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`;
      
      const textWidth = doc.getTextWidth(footerText);
      doc.text(
        footerText,
        (doc.internal.pageSize.width - textWidth) / 2,
        doc.internal.pageSize.height - 10
      );
      
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.width - 25,
        doc.internal.pageSize.height - 10
      );
    }

    // Save the PDF
    doc.save(filename || `export_${new Date().toISOString().split('T')[0]}.pdf`);
    
    return true;
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    return false;
  }
};



/**
 * Format currency for display in exports
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency symbol (default: ₹)
 */
export const formatCurrency = (amount, currency = '') => {
  const num = parseFloat(amount) || 0;
  return `${currency}${num.toLocaleString('en-IN', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  })}`;
};

/**
 * Format date for display in exports
 * @param {string|Date} date - Date to format
 */
export const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Print Helpers for Malwa CRM
 * Shared print functionality that uses the same template/data as PDF export
 * Ensures pixel-parity between Print and PDF output
 */

/**
 * Open print preview using the same template as PDF export
 * Works in both Web (iframe method) and Electron (native print dialog)
 * 
 * @param {Object} options - Print configuration
 * @param {string} options.elementId - ID of the element to print (same as PDF template)
 * @param {string} options.title - Document title for print job
 * @param {Object} options.pageSetup - Page size and margins (A4/Letter)
 * @param {boolean} options.printBackground - Whether to print backgrounds (default: true)
 */
export const openPrintPreview = ({
  elementId,
  title = 'Print Document',
  pageSetup = { size: 'A4', orientation: 'portrait', margins: '10mm' },
  printBackground = true
}) => {
  const element = document.getElementById(elementId);
  
  if (!element) {
    console.error(`Print element not found: ${elementId}`);
    return false;
  }

  // Check if Electron environment with native print support
  if (window.electron?.print) {
    return printWithElectron(element, { title, pageSetup, printBackground });
  }
  
  // Web fallback: use iframe method
  return printWithIframe(element, { title, pageSetup, printBackground });
};

/**
 * Electron native print dialog
 * Uses Electron's built-in print API with proper page setup
 */
const printWithElectron = (element, { title, pageSetup, printBackground }) => {
  try {
    const content = element.innerHTML;
    
    // Send print request to Electron main process
    window.electron.print.preview(content, {
      title,
      pageSize: pageSetup.size,
      orientation: pageSetup.orientation,
      printBackground,
      margins: pageSetup.margins
    });
    
    return true;
  } catch (error) {
    console.error('Electron print failed:', error);
    // Fallback to iframe method
    return printWithIframe(element, { title, pageSetup, printBackground });
  }
};

/**
 * Web print using hidden iframe
 * Creates a temporary iframe with the content and triggers browser print
 */
const printWithIframe = (element, { title, pageSetup, printBackground }) => {
  try {
    // Create hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow.document;
    
    // Write content to iframe with print styles
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            /* Base print styles */
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #000;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              padding: 6mm 8mm;
            }

            /* Page setup matching PDF */
            @page {
              size: ${pageSetup.size} ${pageSetup.orientation};
              margin: ${pageSetup.margins};
            }
            
            /* Ensure backgrounds print */
            @media print {
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              
              /* Hide non-printable elements */
              button, .no-print {
                display: none !important;
              }
              
              /* Prevent page breaks inside elements */
              .no-break, .print-card, .invoice-item, tr {
                page-break-inside: avoid;
                break-inside: avoid;
              }
              
              /* Table handling */
              table {
                page-break-inside: auto;
              }
              
              thead {
                display: table-header-group;
              }
              
              tfoot {
                display: table-footer-group;
              }
            }
            
            /* Copy all inline styles from parent document */
            ${Array.from(document.styleSheets)
              .map(sheet => {
                try {
                  return Array.from(sheet.cssRules)
                    .map(rule => rule.cssText)
                    .join('\n');
                } catch (e) {
                  return '';
                }
              })
              .join('\n')}
          </style>
        </head>
        <body>
          ${element.innerHTML}
        </body>
      </html>
    `);
    iframeDoc.close();

    // Wait for iframe to load, then print
    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          
          // Cleanup after print dialog closes
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        } catch (error) {
          console.error('Print failed:', error);
          document.body.removeChild(iframe);
        }
      }, 500);
    };

    return true;
  } catch (error) {
    console.error('Print with iframe failed:', error);
    return false;
  }
};

/**
 * Keyboard shortcut handler for Ctrl/Cmd+P
 * Maps to print preview for printable pages
 * 
 * @param {Function} printHandler - The print handler function to call
 */
export const setupPrintShortcut = (printHandler) => {
  const handleKeyDown = (e) => {
    // Check for Ctrl+P (Windows/Linux) or Cmd+P (Mac)
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      printHandler();
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  
  // Return cleanup function
  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
};

/**
 * Utility to check if print is supported
 */
export const isPrintSupported = () => {
  return typeof window !== 'undefined' && 
         (window.electron?.print || window.print);
};

/**
 * Print configuration presets for common document types
 */
export const PRINT_PRESETS = {
  invoice: {
    pageSetup: { size: 'A4', orientation: 'portrait', margins: '12mm' },
    printBackground: true
  },
  estimate: {
    pageSetup: { size: 'A4', orientation: 'portrait', margins: '12mm' },
    printBackground: true
  },
  jobSheet: {
    pageSetup: { size: 'A4', orientation: 'portrait', margins: '12mm' },
    printBackground: true
  },
  ledger: {
    pageSetup: { size: 'A4', orientation: 'portrait', margins: '15mm' },
    printBackground: true
  },
  report: {
    pageSetup: { size: 'A4', orientation: 'landscape', margins: '10mm' },
    printBackground: true
  }
};

export default {
  openPrintPreview,
  setupPrintShortcut,
  isPrintSupported,
  PRINT_PRESETS
};

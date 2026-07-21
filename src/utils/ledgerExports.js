import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportLedgerToPDF = (customer, entries, kpis, aging) => {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('MALWA CRM', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Malwa Body Repair & Accessories', pageWidth / 2, 27, { align: 'center' });
  doc.text('GST: 03XXXXXX1234X1Z', pageWidth / 2, 32, { align: 'center' });

  doc.setDrawColor(200);
  doc.line(15, 35, pageWidth - 15, 35);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMER LEDGER STATEMENT', pageWidth / 2, 43, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Customer Details:', 15, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${customer.name || customer.customerName}`, 15, 58);
  doc.text(`Phone: ${customer.phone || 'N/A'}`, 15, 63);
  doc.text(`GST: ${customer.gst || 'N/A'}`, 15, 68);
  doc.text(`Address: ${customer.address || 'N/A'}`, 15, 73);

  doc.setFont('helvetica', 'bold');
  doc.text('Account Summary:', pageWidth - 80, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(`Opening Balance: ₹${kpis.openingBalance.toFixed(2)}`, pageWidth - 80, 58);
  doc.text(`Current Outstanding: ₹${kpis.currentOutstanding.toFixed(2)}`, pageWidth - 80, 63);
  doc.text(`Overdue Amount: ₹${kpis.overdueAmount.toFixed(2)}`, pageWidth - 80, 68);
  doc.text(`Avg. Payment Days: ${kpis.avgPaymentDays}`, pageWidth - 80, 73);

  doc.setDrawColor(200);
  doc.line(15, 78, pageWidth - 15, 78);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Aging Analysis', 15, 86);

  const agingData = Object.entries(aging).map(([bucket, data]) => [
    bucket + ' days',
    `₹${data.amount.toFixed(2)}`,
    data.count.toString(),
  ]);

  doc.autoTable({
    startY: 90,
    head: [['Period', 'Amount', 'Count']],
    body: agingData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9, cellPadding: 2 },
    margin: { left: 15, right: 15 },
  });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Transaction Details', 15, doc.lastAutoTable.finalY + 10);

  const tableData = entries.map(entry => [
    entry.date,
    entry.docNo,
    entry.docType,
    entry.reference,
    entry.debit > 0 ? `₹${entry.debit.toFixed(2)}` : '-',
    entry.credit > 0 ? `₹${entry.credit.toFixed(2)}` : '-',
    `₹${entry.balance.toFixed(2)}`,
  ]);

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 15,
    head: [['Date', 'Doc No', 'Type', 'Reference', 'Debit', 'Credit', 'Balance']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 25 },
      2: { cellWidth: 20 },
      3: { cellWidth: 35 },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' },
      6: { cellWidth: 25, halign: 'right' },
    },
    margin: { left: 15, right: 15 },
    didDrawPage: function (data) {
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(
        `Page ${doc.internal.getCurrentPageInfo().pageNumber} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      doc.text(
        `Prepared on: ${new Date().toLocaleDateString('en-GB')}`,
        15,
        pageHeight - 10
      );
      doc.text(
        'Malwa CRM - Powered by Excellence',
        pageWidth - 15,
        pageHeight - 10,
        { align: 'right' }
      );
    },
  });

  const periodDebit = entries.reduce((sum, e) => sum + e.debit, 0);
  const periodCredit = entries.reduce((sum, e) => sum + e.credit, 0);
  const netAmount = periodDebit - periodCredit;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.text(`Period Debit: ₹${periodDebit.toFixed(2)}`, 15, finalY);
  doc.text(`Period Credit: ₹${periodCredit.toFixed(2)}`, 70, finalY);
  doc.text(`Net Amount: ₹${netAmount.toFixed(2)}`, 130, finalY);
  doc.text(`Closing Balance: ₹${kpis.currentOutstanding.toFixed(2)}`, 15, finalY + 7);

  doc.setDrawColor(200);
  doc.line(15, finalY + 12, pageWidth - 15, finalY + 12);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('This is a computer-generated statement and does not require a signature.', pageWidth / 2, finalY + 18, { align: 'center' });

  const fileName = `Statement_${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}.pdf`;
  const folderPath = `C:\\malwa-crm\\Reports\\Ledger\\${customer.name || customer.customerName}`;

  try {
    doc.save(fileName);
    return `${folderPath}\\${fileName}`;
  } catch (error) {
    console.error('Error saving PDF:', error);
    return null;
  }
};

export const exportLedgerToCSV = (customer, entries) => {
  const headers = ['Date', 'Doc No', 'Type', 'Reference', 'Notes', 'Debit', 'Credit', 'Balance'];
  const rows = entries.map(e => [
    e.date,
    e.docNo,
    e.docType,
    e.reference,
    e.notes,
    e.debit.toFixed(2),
    e.credit.toFixed(2),
    e.balance.toFixed(2),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const dateFrom = entries[0]?.date || 'start';
  const dateTo = entries[entries.length - 1]?.date || 'end';
  const fileName = `Ledger_${dateFrom}_to_${dateTo}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  const folderPath = `C:\\malwa-crm\\Exports\\Ledger\\${customer.name || customer.customerName}`;
  return `${folderPath}\\${fileName}`;
};

export const createFolderStructure = () => {
  const folders = [
    'C:\\malwa-crm\\Reports\\Ledger',
    'C:\\malwa-crm\\Exports\\Ledger',
  ];

  return folders;
};

const { generateQuotationPDF } = require('./quotationPdf');

const asDocumentShape = (invoice) => ({
  quotationNumber: invoice.invoiceNumber,
  issueDate: invoice.issueDate,
  validUntil: invoice.dueDate,
  status: invoice.status,
  taxType: invoice.taxType,
  client: invoice.client || invoice.clientId,
  items: invoice.items,
  subtotal: invoice.subtotal,
  totalDiscount: invoice.totalDiscount || invoice.discountAmount || 0,
  cgstTotal: invoice.cgstTotal ?? invoice.cgstAmount,
  sgstTotal: invoice.sgstTotal ?? invoice.sgstAmount,
  igstTotal: invoice.igstTotal ?? invoice.igstAmount,
  grandTotal: invoice.grandTotal || invoice.totalAmount,
  terms: invoice.paymentTerms,
  notes: [
    invoice.notes,
    `Amount paid: ₹ ${Number(invoice.amountPaid || 0).toFixed(2)}`,
    `Balance due: ₹ ${Number(invoice.balanceDue || 0).toFixed(2)}`
  ].filter(Boolean).join('\n')
});

function generateInvoicePDF(invoice, settings = {}) {
  return generateQuotationPDF(asDocumentShape(invoice), settings, {
    documentTitle: 'INVOICE',
    numberLabel: 'Invoice No',
    validityLabel: 'Due Date',
    footerNote: 'This is a computer-generated invoice'
  });
}

module.exports = { generateInvoicePDF };

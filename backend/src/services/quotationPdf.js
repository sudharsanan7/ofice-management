const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const amountInWords = require('../utils/amountInWords');

const money = (value) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) || 0);
const date = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const safe = (value, fallback = '—') => value === null || value === undefined || value === '' ? fallback : String(value);

function generateQuotationPDF(quotation, settings = {}, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const documentTitle = options.documentTitle || 'QUOTATION';
      const numberLabel = options.numberLabel || 'Number';
      const validityLabel = options.validityLabel || 'Valid Until';
      const footerNote = options.footerNote || 'This is a computer-generated quotation';
      const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true, info: { Title: `${documentTitle} ${quotation.quotationNumber || ''}`, Author: settings.companyName || '' } });
      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);
      const left = 40;
      const right = 555;
      const pageBottom = 770;
      const client = quotation.client || {};
      const interstate = quotation.taxType === 'inter';
      const cols = interstate
        ? [{ label: 'S.No', width: 25 }, { label: 'Product & Description', width: 145 }, { label: 'SAC', width: 42 }, { label: 'Qty', width: 32 }, { label: 'Unit Price', width: 58 }, { label: 'Discount', width: 48 }, { label: 'IGST', width: 55 }, { label: 'Total', width: 110 }]
        : [{ label: 'S.No', width: 24 }, { label: 'Product & Description', width: 128 }, { label: 'SAC', width: 38 }, { label: 'Qty', width: 29 }, { label: 'Unit Price', width: 52 }, { label: 'Discount', width: 42 }, { label: 'CGST', width: 43 }, { label: 'SGST', width: 43 }, { label: 'Total', width: 119 }];
      let y = 0;

      const drawDocumentHeader = () => {
        let companyX = left;
        const logo = settings.logo && path.resolve(__dirname, '..', '..', settings.logo.replace(/^\//, ''));
        if (logo && fs.existsSync(logo)) {
          try { doc.image(logo, left, 35, { fit: [70, 48] }); companyX = 120; } catch (_error) { /* optional logo is skipped */ }
        }
        doc.font('Helvetica-Bold').fontSize(16).fillColor('#172554').text(safe(settings.companyName, ''), companyX, 36, { width: 250 });
        const address = [settings.cin ? `CIN: ${settings.cin}` : '', settings.gstin ? `GSTIN: ${settings.gstin}` : '', settings.address?.street, [settings.address?.city, settings.address?.state, settings.address?.postalCode].filter(Boolean).join(', ')].filter(Boolean).join('\n');
        doc.font('Helvetica').fontSize(8).fillColor('#475569').text(address, companyX, 58, { width: 260, height: 55 });
        doc.font('Helvetica-Bold').fontSize(21).fillColor('#4338ca').text(documentTitle, 390, 36, { width: 165, align: 'right' });
        doc.font('Helvetica').fontSize(8.5).fillColor('#334155').text([settings.email ? `Email: ${settings.email}` : '', settings.phone ? `Phone: ${settings.phone}` : ''].filter(Boolean).join('\n'), 390, 66, { width: 165, align: 'right' });
        doc.moveTo(left, 118).lineTo(right, 118).strokeColor('#cbd5e1').stroke();
        doc.roundedRect(left, 128, 250, 76, 5).fillAndStroke('#f8fafc', '#e2e8f0');
        doc.roundedRect(305, 128, 250, 76, 5).fillAndStroke('#f8fafc', '#e2e8f0');
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#4338ca').text(`${documentTitle} DETAILS`, 50, 138);
        doc.font('Helvetica').fontSize(8.5).fillColor('#1e293b').text(`${numberLabel}: ${safe(quotation.quotationNumber)}\nIssue Date: ${date(quotation.issueDate)}\n${validityLabel}: ${date(quotation.validUntil)}\nStatus: ${safe(quotation.status).toUpperCase()}`, 50, 151, { width: 230, lineGap: 1 });
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#4338ca').text('RECEIVER', 315, 138);
        const receiverAddress = [client.billingAddress?.line1, client.billingAddress?.line2, [client.billingAddress?.city, client.billingAddress?.state, client.billingAddress?.pincode].filter(Boolean).join(', ')].filter(Boolean).join(', ');
        doc.font('Helvetica').fontSize(8.5).fillColor('#1e293b').text(`${safe(client.companyName, 'Client')}\n${client.cin ? `CIN: ${client.cin}\n` : ''}${client.gstin ? `GSTIN: ${client.gstin}\n` : ''}${receiverAddress || ''}`, 315, 151, { width: 230, height: 48, lineGap: 1 });
        y = 216;
      };

      const drawTableHeader = () => {
        doc.rect(left, y, right - left, 25).fill('#312e81');
        let x = left + 4;
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#ffffff');
        cols.forEach((col) => {
          doc.text(col.label, x, y + 8, { width: col.width - 5, align: ['Qty', 'Unit Price', 'Discount', 'CGST', 'SGST', 'IGST', 'Total'].includes(col.label) ? 'right' : 'left', lineBreak: false });
          x += col.width;
        });
        y += 25;
      };

      const nextItemPage = () => { doc.addPage(); drawDocumentHeader(); drawTableHeader(); };
      const sectionPage = () => { doc.addPage(); drawDocumentHeader(); y = 220; };
      const ensureSpace = (height, repeatTable = false) => {
        if (y + height <= pageBottom) return;
        if (repeatTable) nextItemPage(); else sectionPage();
      };
      const drawCell = (text, x, rowY, width, height, align = 'left', bold = false) => {
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(7.5).fillColor('#1e293b').text(safe(text), x, rowY + 5, { width, height: Math.max(10, height - 8), align, lineGap: 1 });
      };

      drawDocumentHeader();
      drawTableHeader();
      const rows = Array.isArray(quotation.items) ? quotation.items : [];
      rows.forEach((item, index) => {
        doc.font('Helvetica').fontSize(7.5);
        const description = safe(item.description, '');
        const descriptionHeight = doc.heightOfString(description, { width: cols[1].width - 8, lineGap: 1 });
        const rowHeight = Math.max(25, descriptionHeight + 10);
        if (y + rowHeight > pageBottom) nextItemPage();
        const rowY = y;
        if (index % 2 === 0) doc.rect(left, rowY, right - left, rowHeight).fill('#f8fafc');
        const values = interstate
          ? [String(index + 1), description, safe(item.sacCode), String(item.quantity), money(item.unitPrice), money(item.discount), money(item.igst), money(item.lineTotal)]
          : [String(index + 1), description, safe(item.sacCode), String(item.quantity), money(item.unitPrice), money(item.discount), money(item.cgst), money(item.sgst), money(item.lineTotal)];
        let x = left + 4;
        values.forEach((value, colIndex) => {
          const col = cols[colIndex];
          const align = colIndex > 2 ? 'right' : 'left';
          drawCell(value, x, rowY, col.width - 5, rowHeight, align, colIndex === values.length - 1);
          x += col.width;
        });
        y += rowHeight;
        doc.moveTo(left, y).lineTo(right, y).strokeColor('#e2e8f0').stroke();
      });

      y += 12;
      const taxLines = interstate
        ? [['IGST', quotation.igstTotal]]
        : [['CGST', quotation.cgstTotal], ['SGST', quotation.sgstTotal]];
      const totalsLines = [['Subtotal', quotation.subtotal], ['Discount', quotation.totalDiscount || 0], ...taxLines];
      const totalsHeight = totalsLines.length * 17 + 38;
      ensureSpace(totalsHeight, false);
      const totalsX = 335;
      totalsLines.forEach(([label, value]) => {
        doc.font('Helvetica').fontSize(9).fillColor('#475569').text(`${label}:`, totalsX, y, { width: 105 });
        doc.text(`${label === 'Discount' ? '− ' : ''}₹ ${money(Math.abs(Number(value) || 0))}`, totalsX + 112, y, { width: 108, align: 'right' });
        y += 17;
      });
      doc.roundedRect(totalsX - 5, y, 225, 29, 4).fill('#e0e7ff');
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#312e81').text('GRAND TOTAL', totalsX + 3, y + 9, { width: 100 });
      doc.text(`₹ ${money(quotation.grandTotal)}`, totalsX + 105, y + 9, { width: 108, align: 'right' });
      y += 40;

      const words = `Amount in words: ${amountInWords(quotation.grandTotal || 0)}`;
      let wordsHeight = doc.heightOfString(words, { width: right - left, font: 'Helvetica-Bold', fontSize: 8.5 });
      ensureSpace(wordsHeight + 12);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1e293b').text(words, left, y, { width: right - left });
      y += wordsHeight + 12;

      const addSection = (title, content) => {
        if (!content) return;
        const text = String(content);
        const height = doc.heightOfString(text, { width: right - left - 20, font: 'Helvetica', fontSize: 8 });
        ensureSpace(Math.min(height, 560) + 38);
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a').text(title, left, y, { width: right - left });
        y += 14;
        doc.roundedRect(left, y, right - left, Math.min(height + 12, 575), 4).fillAndStroke('#f8fafc', '#e2e8f0');
        doc.font('Helvetica').fontSize(8).fillColor('#475569').text(text, left + 10, y + 7, { width: right - left - 20, lineGap: 2 });
        y += Math.min(height + 12, 575) + 14;
      };
      addSection('TERMS & CONDITIONS', quotation.terms);
      addSection('NOTES', quotation.notes);

      const pages = doc.bufferedPageRange();
      for (let page = pages.start; page < pages.start + pages.count; page += 1) {
        doc.switchToPage(page);
        doc.font('Helvetica-BoldOblique').fontSize(8).fillColor('#334155').text('Thank you for your business!', left, 785, { width: right - left, align: 'center' });
        doc.font('Helvetica').fontSize(7).fillColor('#64748b').text(footerNote, left, 798, { width: right - left, align: 'center' });
        doc.text(`Page ${page - pages.start + 1} of ${pages.count}`, left, 811, { width: right - left, align: 'center' });
      }
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { generateQuotationPDF };

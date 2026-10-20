const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

/**
 * Generates a professional PDF buffer for a Quotation or Invoice
 */
const generateQuotationPDF = async (quotation, settings) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 40,
        size: 'A4'
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on('error', reject);

      // --- 1. HEADER SECTION ---
      let logoDrawn = false;
      if (settings?.logo) {
        const logoPath = path.join(__dirname, '../../', settings.logo);
        if (fs.existsSync(logoPath)) {
          try {
            doc.image(logoPath, 40, 40, { width: 110, height: 45, fit: [110, 45] });
            logoDrawn = true;
          } catch (e) {
            console.warn('[PDFService] Logo render warning:', e.message);
          }
        }
      }

      const companyX = logoDrawn ? 165 : 40;
      doc
        .font('Helvetica-Bold')
        .fontSize(15)
        .fillColor('#1e1b4b')
        .text(settings?.companyName || 'OfficeFlow Solutions Pvt Ltd', companyX, 40);

      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor('#475569')
        .text(
          [
            settings?.address?.street,
            [settings?.address?.city, settings?.address?.state, settings?.address?.postalCode].filter(Boolean).join(', '),
            settings?.gstin ? `GSTIN: ${settings.gstin}` : null,
            settings?.phone ? `Phone: ${settings.phone}` : null,
            settings?.email ? `Email: ${settings.email}` : null
          ]
            .filter(Boolean)
            .join('\n'),
          companyX,
          58
        );

      // Title & Document Info (Right Aligned)
      doc
        .font('Helvetica-Bold')
        .fontSize(22)
        .fillColor('#4f46e5')
        .text('QUOTATION', 350, 40, { align: 'right' });

      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#0f172a')
        .text(quotation.quotationNumber, 350, 68, { align: 'right' });

      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor('#64748b')
        .text(
          `Issue Date: ${new Date(quotation.issueDate).toLocaleDateString('en-IN')}\nValid Until: ${new Date(
            quotation.validUntil
          ).toLocaleDateString('en-IN')}\nStatus: ${quotation.status.toUpperCase()}`,
          350,
          82,
          { align: 'right' }
        );

      doc.moveTo(40, 130).lineTo(555, 130).strokeColor('#e2e8f0').stroke();

      // --- 2. CLIENT "PREPARED FOR" SECTION ---
      doc.rect(40, 140, 515, 65).fillColor('#f8fafc').fill();
      doc.rect(40, 140, 515, 65).strokeColor('#e2e8f0').stroke();

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#6366f1')
        .text('QUOTATION PREPARED FOR:', 50, 148);

      const client = quotation.client || {};
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#0f172a')
        .text(client.companyName || 'Valued Client', 50, 160);

      const clientAddr = [
        client.contactPerson ? `Attn: ${client.contactPerson}` : null,
        client.billingAddress?.line1,
        [client.billingAddress?.city, client.billingAddress?.state, client.billingAddress?.pincode].filter(Boolean).join(', '),
        client.gstin ? `GSTIN: ${client.gstin} (State Code: ${client.stateCode || '—'})` : null
      ]
        .filter(Boolean)
        .join(' | ');

      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor('#475569')
        .text(clientAddr, 50, 175, { width: 495 });

      // --- 3. ITEMS TABLE ---
      let tableY = 220;
      doc.rect(40, tableY, 515, 20).fillColor('#312e81').fill();

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#ffffff')
        .text('DESCRIPTION', 50, tableY + 5)
        .text('SAC', 280, tableY + 5)
        .text('QTY', 330, tableY + 5, { width: 35, align: 'right' })
        .text('RATE (INR)', 375, tableY + 5, { width: 55, align: 'right' })
        .text('DISC.', 440, tableY + 5, { width: 45, align: 'right' })
        .text('AMOUNT', 495, tableY + 5, { width: 50, align: 'right' });

      tableY += 20;

      (quotation.items || []).forEach((item, idx) => {
        const isEven = idx % 2 === 0;
        if (isEven) {
          doc.rect(40, tableY, 515, 22).fillColor('#f8fafc').fill();
        }

        doc
          .font('Helvetica')
          .fontSize(8.5)
          .fillColor('#1e293b')
          .text(item.description, 50, tableY + 6, { width: 220, ellipsis: true })
          .text(item.sacCode || '—', 280, tableY + 6)
          .text(String(item.quantity), 330, tableY + 6, { width: 35, align: 'right' })
          .text(Number(item.unitPrice).toFixed(2), 375, tableY + 6, { width: 55, align: 'right' })
          .text(Number(item.discount || 0).toFixed(2), 440, tableY + 6, { width: 45, align: 'right' })
          .font('Helvetica-Bold')
          .text(Number(item.amount).toFixed(2), 495, tableY + 6, { width: 50, align: 'right' });

        tableY += 22;
      });

      doc.moveTo(40, tableY).lineTo(555, tableY).strokeColor('#cbd5e1').stroke();
      tableY += 15;

      // --- 4. TOTALS BREAKDOWN ---
      const totalsX = 350;
      const totalsValX = 465;

      doc.font('Helvetica').fontSize(9).fillColor('#475569');

      doc.text('Subtotal:', totalsX, tableY);
      doc.text(`INR ${Number(quotation.subtotal).toFixed(2)}`, totalsValX, tableY, { align: 'right' });
      tableY += 14;

      if (quotation.totalDiscount > 0) {
        doc.text('Total Discount:', totalsX, tableY);
        doc.text(`- INR ${Number(quotation.totalDiscount).toFixed(2)}`, totalsValX, tableY, { align: 'right' });
        tableY += 14;
      }

      if (quotation.cgst > 0 || quotation.sgst > 0) {
        doc.text('CGST:', totalsX, tableY);
        doc.text(`INR ${Number(quotation.cgst).toFixed(2)}`, totalsValX, tableY, { align: 'right' });
        tableY += 14;

        doc.text('SGST:', totalsX, tableY);
        doc.text(`INR ${Number(quotation.sgst).toFixed(2)}`, totalsValX, tableY, { align: 'right' });
        tableY += 14;
      } else if (quotation.igst > 0) {
        doc.text('IGST:', totalsX, tableY);
        doc.text(`INR ${Number(quotation.igst).toFixed(2)}`, totalsValX, tableY, { align: 'right' });
        tableY += 14;
      }

      // Grand Total Highlight Box
      doc.rect(totalsX - 5, tableY + 2, 210, 26).fillColor('#e0e7ff').fill();
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#312e81')
        .text('GRAND TOTAL:', totalsX, tableY + 9)
        .text(`INR ${Number(quotation.grandTotal).toFixed(2)}`, totalsValX, tableY + 9, { align: 'right' });

      // --- 5. TERMS & CONDITIONS ---
      let termsY = tableY + 45;
      if (termsY > 680) {
        doc.addPage();
        termsY = 40;
      }

      if (quotation.terms) {
        doc
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor('#0f172a')
          .text('TERMS & CONDITIONS:', 40, termsY);

        doc
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor('#64748b')
          .text(quotation.terms, 40, termsY + 12, { width: 330 });
      }

      // Footer
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#94a3b8')
        .text('Generated via OfficeFlow Enterprise Management System', 40, 770, { align: 'center', width: 515 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  generateQuotationPDF
};

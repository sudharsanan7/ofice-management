/** All calculations use integer paise internally; persisted API values are INR. */
const round = (value) => Math.round((Number(value) || 0) * 100) / 100;
const toPaise = (value) => Math.round((Number(value) || 0) * 100);
const fromPaise = (value) => value / 100;

/** Pure pricing calculation shared by quotation and invoice modules. */
const calculateTotals = (items = [], taxType = 'intra') => {
  if (!Array.isArray(items)) throw new TypeError('Items must be an array');
  if (!['intra', 'inter'].includes(taxType)) throw new TypeError('Tax type must be intra or inter');

  let subtotalPaise = 0;
  let discountPaise = 0;
  let cgstPaise = 0;
  let sgstPaise = 0;
  let igstPaise = 0;

  const calculatedItems = items.map((item) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    const discount = Number(item.discount || 0);
    const gstRate = Number(item.gstRate || 0);
    if (!(quantity > 0) || unitPrice < 0 || discount < 0 || ![0, 5, 12, 18, 28].includes(gstRate)) {
      throw new TypeError('Invalid quotation item pricing values');
    }

    const grossPaise = Math.round(quantity * toPaise(unitPrice));
    const discountLinePaise = Math.min(grossPaise, toPaise(discount));
    const lineSubtotalPaise = Math.max(0, grossPaise - discountLinePaise);
    const lineTaxPaise = Math.round((lineSubtotalPaise * gstRate) / 100);
    // Split the already-rounded line tax so both components always sum to GST.
    const lineCgstPaise = taxType === 'intra' ? Math.floor(lineTaxPaise / 2) : 0;
    const lineSgstPaise = taxType === 'intra' ? lineTaxPaise - lineCgstPaise : 0;
    const lineIgstPaise = taxType === 'inter' ? lineTaxPaise : 0;
    subtotalPaise += lineSubtotalPaise;
    discountPaise += discountLinePaise;
    cgstPaise += lineCgstPaise;
    sgstPaise += lineSgstPaise;
    igstPaise += lineIgstPaise;

    return {
      description: item.description || '',
      sacCode: item.sacCode || '',
      quantity,
      unitPrice: fromPaise(toPaise(unitPrice)),
      discount: fromPaise(discountLinePaise),
      gstRate,
      lineSubtotal: fromPaise(lineSubtotalPaise),
      cgst: fromPaise(lineCgstPaise),
      sgst: fromPaise(lineSgstPaise),
      igst: fromPaise(lineIgstPaise),
      lineTotal: fromPaise(lineSubtotalPaise + lineTaxPaise),
      amount: fromPaise(lineSubtotalPaise),
      lineTax: fromPaise(lineTaxPaise)
    };
  });

  const totals = {
    items: calculatedItems,
    subtotal: fromPaise(subtotalPaise),
    totalDiscount: fromPaise(discountPaise),
    cgstTotal: fromPaise(cgstPaise),
    sgstTotal: fromPaise(sgstPaise),
    igstTotal: fromPaise(igstPaise),
    grandTotal: fromPaise(subtotalPaise + cgstPaise + sgstPaise + igstPaise),
    taxType
  };
  return {
    ...totals,
    taxableAmount: fromPaise(subtotalPaise),
    totalTax: fromPaise(cgstPaise + sgstPaise + igstPaise),
    cgst: totals.cgstTotal,
    sgst: totals.sgstTotal,
    igst: totals.igstTotal,
    isIntraState: taxType === 'intra'
  };
};

/** Existing state-based interface retained for invoice-module compatibility. */
const calculatePricing = ({ items = [], clientState = '', companyState = '', defaultGstRate = 18 } = {}) => {
  const client = String(clientState || '').trim().toLowerCase();
  const company = String(companyState || '').trim().toLowerCase();
  const taxType = !client || !company || client === company ? 'intra' : 'inter';
  const preparedItems = items.map((item) => ({ ...item, gstRate: item.gstRate ?? defaultGstRate }));
  const totals = calculateTotals(preparedItems, taxType);
  const legacySubtotal = fromPaise(totals.items.reduce((sum, item) => sum + toPaise(item.lineSubtotal) + toPaise(item.discount), 0));
  const legacyTax = (taxableAmount, rate) => round((taxableAmount * rate) / 100);
  const legacyItems = preparedItems.map((item, index) => {
    const taxable = totals.items[index].lineSubtotal;
    const gst = Number(item.gstRate);
    const cgst = taxType === 'intra' ? legacyTax(taxable, gst / 2) : 0;
    const sgst = taxType === 'intra' ? legacyTax(taxable, gst / 2) : 0;
    const igst = taxType === 'inter' ? legacyTax(taxable, gst) : 0;
    return { ...totals.items[index], amount: taxable, cgst, sgst, igst, lineTax: round(cgst + sgst + igst), lineTotal: round(taxable + cgst + sgst + igst) };
  });
  const taxableAmount = round(legacySubtotal - totals.totalDiscount);
  const cgst = round(legacyItems.reduce((sum, item) => sum + item.cgst, 0));
  const sgst = round(legacyItems.reduce((sum, item) => sum + item.sgst, 0));
  const igst = round(legacyItems.reduce((sum, item) => sum + item.igst, 0));
  return { ...totals, items: legacyItems, subtotal: legacySubtotal, taxableAmount, cgst, sgst, igst, cgstTotal: cgst, sgstTotal: sgst, igstTotal: igst, totalTax: round(cgst + sgst + igst), grandTotal: round(taxableAmount + cgst + sgst + igst) };
};

module.exports = { round, calculateTotals, calculatePricing };

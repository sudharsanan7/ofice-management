const InvoiceService = require('../services/invoice.service');
const { successResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const createInvoice = asyncHandler(async (req, res) => {
  const invoice = await InvoiceService.createInvoice({ data: req.body, reqUser: req.user, ipAddress: req.ip });
  return successResponse(res, { statusCode: 201, message: 'Invoice created successfully.', data: invoice });
});
const convertFromQuotation = asyncHandler(async (req, res) => {
  const invoice = await InvoiceService.convertFromQuotation({ quotationId: req.params.id, data: req.body, reqUser: req.user, ipAddress: req.ip });
  return successResponse(res, { statusCode: 201, message: 'Invoice created from quotation.', data: invoice });
});
const getInvoices = asyncHandler(async (req, res) => {
  const result = await InvoiceService.getInvoices(req.query);
  return successResponse(res, { message: 'Invoices retrieved successfully.', data: result });
});
const getInvoiceById = asyncHandler(async (req, res) => {
  const invoice = await InvoiceService.getInvoiceById(req.params.id);
  return successResponse(res, { message: 'Invoice details retrieved successfully.', data: invoice });
});
const updateInvoice = asyncHandler(async (req, res) => {
  const invoice = await InvoiceService.updateInvoice({ invoiceId: req.params.id, data: req.body, reqUser: req.user, ipAddress: req.ip });
  return successResponse(res, { message: 'Invoice updated successfully.', data: invoice });
});
const deleteInvoice = asyncHandler(async (req, res) => {
  const result = await InvoiceService.deleteInvoice({ invoiceId: req.params.id, reqUser: req.user, ipAddress: req.ip });
  return successResponse(res, { message: result.message, data: null });
});
const getPDF = asyncHandler(async (req, res) => {
  const { pdfBuffer, invoiceNumber } = await InvoiceService.getPDF(req.params.id, { reqUser: req.user, ipAddress: req.ip });
  const filename = `${invoiceNumber.replace(/[\\/]/g, '-')}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', pdfBuffer.length);
  return res.send(pdfBuffer);
});
const sendInvoiceEmail = asyncHandler(async (req, res) => {
  const result = await InvoiceService.sendInvoiceEmail({ invoiceId: req.params.id, data: req.body, reqUser: req.user, ipAddress: req.ip });
  return successResponse(res, { message: result.message, data: result.invoice });
});

module.exports = { createInvoice, convertFromQuotation, getInvoices, getInvoiceById, updateInvoice, deleteInvoice, getPDF, sendInvoiceEmail };

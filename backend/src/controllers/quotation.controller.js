const QuotationService = require('../services/quotation.service');
const { successResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const createQuotation = asyncHandler(async (req, res) => {
  const quotation = await QuotationService.createQuotation({ data: req.body, reqUser: req.user, ipAddress: req.ip });
  return successResponse(res, { statusCode: 201, message: 'Quotation created successfully.', data: quotation });
});
const getQuotations = asyncHandler(async (req, res) => {
  const result = await QuotationService.getQuotations(req.query);
  return successResponse(res, { message: 'Quotations retrieved successfully.', data: result });
});
const getSummary = asyncHandler(async (req, res) => {
  const summary = await QuotationService.getSummary();
  return successResponse(res, { message: 'Quotation summary retrieved successfully.', data: summary });
});
const getQuotationById = asyncHandler(async (req, res) => {
  const quotation = await QuotationService.getQuotationById(req.params.id);
  return successResponse(res, { message: 'Quotation details retrieved successfully.', data: quotation });
});
const updateQuotation = asyncHandler(async (req, res) => {
  const quotation = await QuotationService.updateQuotation({ quotationId: req.params.id, data: req.body, reqUser: req.user, ipAddress: req.ip });
  return successResponse(res, { message: 'Quotation updated successfully.', data: quotation });
});
const updateStatus = asyncHandler(async (req, res) => {
  const quotation = await QuotationService.updateStatus({ quotationId: req.params.id, status: req.body.status, reqUser: req.user, ipAddress: req.ip });
  return successResponse(res, { message: `Quotation status updated to ${req.body.status}.`, data: quotation });
});
const deleteQuotation = asyncHandler(async (req, res) => {
  const result = await QuotationService.deleteQuotation({ quotationId: req.params.id, reqUser: req.user, ipAddress: req.ip });
  return successResponse(res, { message: result.message, data: null });
});
const duplicateQuotation = asyncHandler(async (req, res) => {
  const quotation = await QuotationService.duplicateQuotation({ quotationId: req.params.id, reqUser: req.user, ipAddress: req.ip });
  return successResponse(res, { statusCode: 201, message: 'Quotation duplicated successfully.', data: quotation });
});
const getPDF = asyncHandler(async (req, res) => {
  const { pdfBuffer, quotationNumber } = await QuotationService.getPDF(req.params.id, { reqUser: req.user, ipAddress: req.ip });
  const filename = `${quotationNumber.replace(/[\\/]/g, '-')}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', pdfBuffer.length);
  return res.send(pdfBuffer);
});
const sendQuotationEmail = asyncHandler(async (req, res) => {
  const result = await QuotationService.sendQuotationEmail({ quotationId: req.params.id, data: req.body, reqUser: req.user, ipAddress: req.ip });
  return successResponse(res, { message: result.message, data: result.quotation });
});

module.exports = { createQuotation, getQuotations, getSummary, getQuotationById, updateQuotation, updateStatus, deleteQuotation, duplicateQuotation, getPDF, sendQuotationEmail };

const PaymentService = require('../services/payment.service');
const { successResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const createPayment = asyncHandler(async (req, res) => {
  const payment = await PaymentService.createPayment({ data: req.body, reqUser: req.user, ipAddress: req.ip });
  return successResponse(res, { statusCode: 201, message: 'Payment recorded successfully.', data: payment });
});
const getPayments = asyncHandler(async (req, res) => {
  const result = await PaymentService.getPayments(req.query);
  return successResponse(res, { message: 'Payments retrieved successfully.', data: result });
});
const getPaymentById = asyncHandler(async (req, res) => {
  const payment = await PaymentService.getPaymentById(req.params.id);
  return successResponse(res, { message: 'Payment retrieved successfully.', data: payment });
});
const deletePayment = asyncHandler(async (req, res) => {
  const result = await PaymentService.deletePayment({ paymentId: req.params.id, reqUser: req.user, ipAddress: req.ip });
  return successResponse(res, { message: result.message, data: null });
});

module.exports = { createPayment, getPayments, getPaymentById, deletePayment };

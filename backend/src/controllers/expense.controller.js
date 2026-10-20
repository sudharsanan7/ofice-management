const path = require('path');
const fs = require('fs');
const ExpenseService = require('../services/expense.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const createExpense = asyncHandler(async (req, res) => {
  const expense = await ExpenseService.createExpense({ data: req.body, file: req.file, reqUser: req.user, ipAddress: req.ip });
  return successResponse(res, { statusCode: 201, message: 'Expense recorded successfully.', data: expense });
});
const getExpenses = asyncHandler(async (req, res) => {
  const result = await ExpenseService.getExpenses(req.query);
  return successResponse(res, { message: 'Expenses retrieved successfully.', data: result });
});
const getExpenseById = asyncHandler(async (req, res) => {
  const expense = await ExpenseService.getExpenseById(req.params.id);
  return successResponse(res, { message: 'Expense retrieved successfully.', data: expense });
});
const updateExpense = asyncHandler(async (req, res) => {
  const expense = await ExpenseService.updateExpense({ expenseId: req.params.id, data: req.body, file: req.file, reqUser: req.user, ipAddress: req.ip });
  return successResponse(res, { message: 'Expense updated successfully.', data: expense });
});
const deleteExpense = asyncHandler(async (req, res) => {
  const result = await ExpenseService.deleteExpense({ expenseId: req.params.id, reqUser: req.user, ipAddress: req.ip });
  return successResponse(res, { message: result.message, data: null });
});
const downloadReceipt = asyncHandler(async (req, res) => {
  const expense = await ExpenseService.getExpenseById(req.params.id);
  if (!expense.receiptPath) return errorResponse(res, { statusCode: 404, message: 'No receipt is attached to this expense.' });
  const absolute = ExpenseService.receiptAbsolutePath(expense.receiptPath);
  if (!absolute || !fs.existsSync(absolute)) return errorResponse(res, { statusCode: 404, message: 'Receipt file was not found.' });
  return res.download(absolute, expense.receiptOriginalName || path.basename(absolute));
});

module.exports = { createExpense, getExpenses, getExpenseById, updateExpense, deleteExpense, downloadReceipt };

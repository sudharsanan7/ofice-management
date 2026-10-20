const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const ActivityLoggerService = require('./activityLogger.service');
const { createError } = require('../utils/errors');

class ExpenseService {
  static async createExpense({ data, file, reqUser, ipAddress }) {
    let expense;
    try {
      expense = await Expense.create({
        category: data.category,
        description: data.description,
        amount: data.amount,
        expenseDate: data.expenseDate || new Date(),
        receiptPath: file ? `/uploads/receipts/${file.filename}` : '',
        receiptOriginalName: file ? file.originalname : '',
        createdBy: reqUser._id,
        updatedBy: reqUser._id
      });
    } catch (error) {
      if (file) this.removeReceiptFile(`/uploads/receipts/${file.filename}`);
      throw error;
    }
    await ActivityLoggerService.log({
      user: reqUser._id, action: 'CREATE', entity: 'Expense', entityId: expense._id,
      meta: { category: expense.category, amount: expense.amount }, ipAddress
    });
    return expense.populate('createdBy', 'name email');
  }

  static async getExpenses(filters = {}) {
    const { page = 1, limit = 10, category, startDate, endDate, search } = filters;
    const query = {};
    if (category && category !== 'all') query.category = category;
    if (startDate || endDate) {
      query.expenseDate = {};
      if (startDate) query.expenseDate.$gte = new Date(startDate);
      if (endDate) query.expenseDate.$lte = new Date(`${endDate}T23:59:59.999Z`);
    }
    if (search?.trim()) query.description = { $regex: search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10));
    const [expenses, total, summary] = await Promise.all([
      Expense.find(query).sort({ expenseDate: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize)
        .populate('createdBy', 'name email').lean(),
      Expense.countDocuments(query),
      Expense.aggregate([
        { $match: query },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ])
    ]);
    const overall = summary.reduce((acc, row) => ({ total: acc.total + row.total, count: acc.count + row.count }), { total: 0, count: 0 });
    return {
      expenses,
      summary: { byCategory: summary, totalAmount: overall.total, count: overall.count },
      pagination: { page: pageNumber, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) }
    };
  }

  static async getExpenseById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw createError('Invalid expense ID.', 400);
    const expense = await Expense.findById(id).populate('createdBy', 'name email');
    if (!expense) throw createError('Expense not found.', 404);
    return expense;
  }

  static async updateExpense({ expenseId, data, file, reqUser, ipAddress }) {
    const expense = await this.getExpenseById(expenseId);
    if (reqUser.role !== 'admin' && String(expense.createdBy._id || expense.createdBy) !== String(reqUser._id)) {
      throw createError('Forbidden: You may only update expenses you created.', 403);
    }
    if (data.category !== undefined) expense.category = data.category;
    if (data.description !== undefined) expense.description = data.description;
    if (data.amount !== undefined) expense.amount = data.amount;
    if (data.expenseDate !== undefined) expense.expenseDate = data.expenseDate;
    const previousReceiptPath = expense.receiptPath;
    if (file) {
      expense.receiptPath = `/uploads/receipts/${file.filename}`;
      expense.receiptOriginalName = file.originalname;
    }
    expense.updatedBy = reqUser._id;
    try {
      await expense.save();
    } catch (error) {
      if (file) this.removeReceiptFile(`/uploads/receipts/${file.filename}`);
      throw error;
    }
    if (file) this.removeReceiptFile(previousReceiptPath);
    await ActivityLoggerService.log({ user: reqUser._id, action: 'UPDATE', entity: 'Expense', entityId: expense._id, meta: { category: expense.category, amount: expense.amount }, ipAddress });
    return expense.populate('createdBy', 'name email');
  }

  static async deleteExpense({ expenseId, reqUser, ipAddress }) {
    if (reqUser.role !== 'admin') throw createError('Forbidden: Only administrators can delete expenses.', 403);
    const expense = await this.getExpenseById(expenseId);
    await expense.deleteOne();
    this.removeReceiptFile(expense.receiptPath);
    await ActivityLoggerService.log({ user: reqUser._id, action: 'DELETE', entity: 'Expense', entityId: expenseId, meta: { category: expense.category, amount: expense.amount }, ipAddress });
    return { message: 'Expense deleted successfully.' };
  }

  static receiptAbsolutePath(receiptPath) {
    if (!receiptPath) return null;
    const filename = path.basename(receiptPath);
    return path.join(__dirname, '../../uploads/receipts', filename);
  }

  static removeReceiptFile(receiptPath) {
    const absolute = this.receiptAbsolutePath(receiptPath);
    if (absolute && fs.existsSync(absolute)) {
      try {
        fs.unlinkSync(absolute);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
  }
}

module.exports = ExpenseService;

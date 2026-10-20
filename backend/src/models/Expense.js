const mongoose = require('mongoose');

const EXPENSE_CATEGORIES = [
  'office_supplies',
  'travel',
  'utilities',
  'software',
  'salaries',
  'marketing',
  'maintenance',
  'professional_fees',
  'other'
];

const expenseSchema = new mongoose.Schema(
  {
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true, index: true },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    amount: { type: Number, required: true, min: [0.01, 'Amount must be greater than 0'] },
    expenseDate: { type: Date, required: true, default: Date.now, index: true },
    receiptPath: { type: String, default: '' },
    receiptOriginalName: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

expenseSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
module.exports.EXPENSE_CATEGORIES = EXPENSE_CATEGORIES;

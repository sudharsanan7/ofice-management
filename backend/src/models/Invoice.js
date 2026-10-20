const mongoose = require('mongoose');

const GST_RATES = [0, 5, 12, 18, 28];
const invoiceItemSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true },
  sacCode: { type: String, trim: true, default: '' },
  quantity: { type: Number, required: true, min: [Number.EPSILON, 'Quantity must be greater than 0'], default: 1 },
  unitPrice: { type: Number, required: true, min: 0, default: 0 },
  discount: { type: Number, min: 0, default: 0 },
  gstRate: { type: Number, enum: GST_RATES, default: 18 },
  lineSubtotal: { type: Number, required: true, default: 0 },
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  lineTotal: { type: Number, default: 0 },
  amount: { type: Number, default: 0 }
});

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true, trim: true },
    quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', default: null, index: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    items: {
      type: [invoiceItemSchema],
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'An invoice must contain at least one line item.'
      }
    },
    subtotal: { type: Number, required: true, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    gstRate: { type: Number, default: 18 },
    gstAmount: { type: Number, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 },
    cgstTotal: { type: Number, default: 0 },
    sgstTotal: { type: Number, default: 0 },
    igstTotal: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 },
    grandTotal: { type: Number, required: true, default: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    balanceDue: { type: Number, default: 0 },
    taxType: { type: String, enum: ['intra', 'inter'], required: true, default: 'intra' },
    issueDate: { type: Date, default: Date.now, required: true },
    dueDate: { type: Date, required: true },
    notes: { type: String, default: '' },
    paymentTerms: { type: String, default: '' },
    status: {
      type: String,
      enum: ['unpaid', 'partially_paid', 'paid', 'overdue'],
      default: 'unpaid',
      index: true
    },
    statusHistory: [{
      status: { type: String, enum: ['unpaid', 'partially_paid', 'paid', 'overdue'], required: true },
      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      changedAt: { type: Date, default: Date.now }
    }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

invoiceSchema.index({ clientId: 1, status: 1 });
invoiceSchema.index({ dueDate: 1, status: 1 });
invoiceSchema.index({ createdAt: -1 });
invoiceSchema.virtual('client', {
  ref: 'Client',
  localField: 'clientId',
  foreignField: '_id',
  justOne: true
});
invoiceSchema.set('toJSON', { virtuals: true });
invoiceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Invoice', invoiceSchema);

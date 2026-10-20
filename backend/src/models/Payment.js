const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    paymentNumber: { type: String, required: true, unique: true, index: true, trim: true },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    amount: { type: Number, required: true, min: [0.01, 'Payment amount must be greater than 0'] },
    method: {
      type: String,
      enum: ['upi', 'bank_transfer', 'cheque', 'cash', 'card', 'other'],
      required: true
    },
    paymentDate: { type: Date, required: true, default: Date.now, index: true },
    referenceNumber: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

paymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);

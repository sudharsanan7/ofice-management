const mongoose = require('mongoose');

const GST_RATES = [0, 5, 12, 18, 28];
const quotationItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, 'Item description is required'],
    trim: true
  },
  sacCode: {
    type: String,
    trim: true,
    default: ''
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [Number.EPSILON, 'Quantity must be greater than 0'],
    default: 1
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative'],
    default: 0
  },
  discount: {
    type: Number,
    min: [0, 'Discount cannot be negative'],
    default: 0
  },
  gstRate: {
    type: Number,
    enum: GST_RATES,
    default: 18
  },
  lineSubtotal: {
    type: Number,
    required: true,
    default: 0
  },
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  lineTotal: { type: Number, default: 0 }
});

const quotationSchema = new mongoose.Schema(
  {
    quotationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client reference is required'],
      index: true
    },
    issueDate: {
      type: Date,
      default: Date.now,
      required: true
    },
    validUntil: {
      type: Date,
      required: [true, 'Valid until date is required'],
      validate: {
        validator(value) { return !this.issueDate || value >= this.issueDate; },
        message: 'Valid until must be on or after the issue date'
      }
    },
    items: {
      type: [quotationItemSchema],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'A quotation must contain at least one line item.'
      }
    },
    subtotal: {
      type: Number,
      required: true,
      default: 0
    },
    totalDiscount: {
      type: Number,
      default: 0
    },
    cgstTotal: {
      type: Number,
      default: 0
    },
    sgstTotal: {
      type: Number,
      default: 0
    },
    igstTotal: {
      type: Number,
      default: 0
    },
    grandTotal: {
      type: Number,
      required: true,
      default: 0
    },
    terms: {
      type: String,
      default: ''
    },
    notes: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'sent', 'accepted', 'rejected', 'expired'],
        message: '{VALUE} is not a valid quotation status'
      },
      default: 'draft',
      index: true
    },
    taxType: { type: String, enum: ['intra', 'inter'], required: true, default: 'intra' },
    statusHistory: [{
      status: { type: String, enum: ['draft', 'sent', 'accepted', 'rejected', 'expired'], required: true },
      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      changedAt: { type: Date, default: Date.now }
    }],
    convertedToInvoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

quotationSchema.index({ client: 1, status: 1 });
quotationSchema.index({ validUntil: 1 });
quotationSchema.index({ createdAt: -1 });

quotationSchema.virtual('cgst').get(function () { return this.cgstTotal; });
quotationSchema.virtual('sgst').get(function () { return this.sgstTotal; });
quotationSchema.virtual('igst').get(function () { return this.igstTotal; });
quotationSchema.set('toJSON', { virtuals: true });
quotationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Quotation', quotationSchema);

const mongoose = require('mongoose');

// Standard Indian GSTIN Regex: 2 digits state code, 5 uppercase chars, 4 digits, 1 char, 1 entity code, 1 'Z', 1 check digit
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const clientSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      index: true
    },
    contactPerson: {
      type: String,
      required: [true, 'Contact person name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    cin: {
      type: String,
      trim: true,
      uppercase: true,
      default: ''
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
      validate: {
        validator: function (v) {
          if (!v) return true; // Optional field
          return GSTIN_REGEX.test(v);
        },
        message: 'Invalid GSTIN format. Expected 15-character Indian GST format (e.g., 33AAAAA0000A1Z5).'
      }
    },
    billingAddress: {
      line1: { type: String, default: '', trim: true },
      line2: { type: String, default: '', trim: true },
      city: { type: String, default: '', trim: true },
      state: { type: String, default: '', trim: true },
      pincode: { type: String, default: '', trim: true }
    },
    stateCode: {
      type: String,
      trim: true,
      default: ''
    },
    notes: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Auto-derive stateCode from GSTIN if provided (first 2 digits)
clientSchema.pre('save', function (next) {
  if (this.gstin && this.gstin.length >= 2) {
    this.stateCode = this.gstin.substring(0, 2);
  }
  next();
});

// Compound and text indexes for search
clientSchema.index({ companyName: 1, email: 1 });
clientSchema.index(
  {
    companyName: 'text',
    contactPerson: 'text',
    email: 'text',
    gstin: 'text',
    phone: 'text'
  },
  {
    weights: {
      companyName: 10,
      contactPerson: 5,
      email: 5,
      gstin: 3
    },
    name: 'ClientTextSearchIndex'
  }
);

module.exports = mongoose.model('Client', clientSchema);
module.exports.GSTIN_REGEX = GSTIN_REGEX;

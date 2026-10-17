const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      trim: true,
      default: 'OfficeFlow Solutions Pvt Ltd'
    },
    cin: {
      type: String,
      trim: true,
      default: ''
    },
    gstin: {
      type: String,
      trim: true,
      default: ''
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: 'Tamil Nadu' },
      postalCode: { type: String, default: '' },
      country: { type: String, default: 'India' }
    },
    state: {
      type: String,
      trim: true,
      default: 'Tamil Nadu' // Crucial for CGST/SGST vs IGST determination
    },
    email: {
      type: String,
      trim: true,
      default: 'contact@officeflow.local'
    },
    phone: {
      type: String,
      trim: true,
      default: '+91 98765 43210'
    },
    logo: {
      type: String,
      default: ''
    },
    defaultGstRate: {
      type: Number,
      default: 18,
      min: [0, 'GST rate cannot be negative'],
      max: [100, 'GST rate cannot exceed 100%']
    },
    defaultQuotationValidityDays: {
      type: Number,
      default: 30,
      min: [1, 'Validity must be at least 1 day']
    },
    defaultInvoiceDueDays: {
      type: Number,
      default: 15,
      min: [0, 'Due days cannot be negative']
    },
    numberingPrefixes: {
      quotation: { type: String, default: 'QT', trim: true },
      invoice: { type: String, default: 'INV', trim: true },
      payment: { type: String, default: 'PAY', trim: true }
    },
    defaultPaymentConditions: {
      type: String,
      default: '50% advance on project confirmation; remaining 50% on completion and handover, as per the agreed milestone schedule.'
    },
    defaultQuotationTerms: {
      type: String,
      default: '1. Quotation is valid for the specified validity period from issue date.\n2. Prices are subject to applicable GST.\n3. Any modifications to requirements may result in revised estimates.'
    },
    defaultInvoiceNotes: {
      type: String,
      default: 'Thank you for your business. Please remit payment on or before the due date.'
    },
    bankDetails: {
      accountName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      bankName: { type: String, default: '' },
      ifscCode: { type: String, default: '' },
      branch: { type: String, default: '' },
      upiId: { type: String, default: '' }
    }
  },
  {
    timestamps: true
  }
);

// Singleton helper: get or create the single settings document
settingSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('Setting', settingSchema);

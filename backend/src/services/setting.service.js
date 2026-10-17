const path = require('path');
const fs = require('fs');
const Setting = require('../models/Setting');
const ActivityLoggerService = require('./activityLogger.service');

class SettingService {
  /**
   * Retrieve the organization settings (singleton)
   */
  static async getSettings() {
    return Setting.getSettings();
  }

  /**
   * Update organization settings (Admin only)
   */
  static async updateSettings({ data, file, reqUser, ipAddress }) {
    const settings = await Setting.getSettings();

    // If new logo uploaded
    if (file) {
      // Safely delete previous logo if it exists
      if (settings.logo) {
        const oldPath = path.join(__dirname, '../../', settings.logo);
        if (fs.existsSync(oldPath)) {
          try {
            fs.unlinkSync(oldPath);
          } catch (e) {
            console.warn('[SettingService] Could not remove old logo:', e.message);
          }
        }
      }
      settings.logo = `/uploads/company/${file.filename}`;
    }

    // Parse JSON strings if multipart/form-data sent nested objects as strings
    const parseIfString = (val) => {
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch {
          return val;
        }
      }
      return val;
    };

    if (data.companyName !== undefined) settings.companyName = data.companyName;
    if (data.cin !== undefined) settings.cin = data.cin;
    if (data.gstin !== undefined) settings.gstin = data.gstin;
    if (data.email !== undefined) settings.email = data.email;
    if (data.phone !== undefined) settings.phone = data.phone;
    if (data.state !== undefined) settings.state = data.state;

    if (data.address !== undefined) {
      const parsedAddress = parseIfString(data.address);
      settings.address = { ...settings.address, ...parsedAddress };
      if (settings.address.state) {
        settings.state = settings.address.state; // Keep state in sync for GST determination
      }
    }

    if (data.defaultGstRate !== undefined) settings.defaultGstRate = Number(data.defaultGstRate);
    if (data.defaultQuotationValidityDays !== undefined) settings.defaultQuotationValidityDays = Number(data.defaultQuotationValidityDays);
    if (data.defaultInvoiceDueDays !== undefined) settings.defaultInvoiceDueDays = Number(data.defaultInvoiceDueDays);

    if (data.numberingPrefixes !== undefined) {
      const parsedPrefixes = parseIfString(data.numberingPrefixes);
      settings.numberingPrefixes = { ...settings.numberingPrefixes, ...parsedPrefixes };
    }

    if (data.defaultPaymentConditions !== undefined) settings.defaultPaymentConditions = data.defaultPaymentConditions;
    if (data.defaultQuotationTerms !== undefined) settings.defaultQuotationTerms = data.defaultQuotationTerms;
    if (data.defaultInvoiceNotes !== undefined) settings.defaultInvoiceNotes = data.defaultInvoiceNotes;

    if (data.bankDetails !== undefined) {
      const parsedBank = parseIfString(data.bankDetails);
      settings.bankDetails = { ...settings.bankDetails, ...parsedBank };
    }

    await settings.save();

    // Audit log
    await ActivityLoggerService.log({
      user: reqUser._id,
      action: 'UPDATE_SETTINGS',
      entity: 'Setting',
      entityId: settings._id,
      meta: {
        updatedFields: Object.keys(data),
        hasNewLogo: Boolean(file)
      },
      ipAddress
    });

    return settings;
  }
}

module.exports = SettingService;

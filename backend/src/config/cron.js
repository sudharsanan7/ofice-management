const cron = require('node-cron');
const QuotationService = require('../services/quotation.service');
const InvoiceService = require('../services/invoice.service');
const NotificationService = require('../services/notification.service');
let jobsInitialized = false;

/**
 * Initialize Background Cron Jobs
 */
const initCronJobs = () => {
  if (jobsInitialized) return;
  jobsInitialized = true;
  // Nightly at 00:05 - conditional updates make this safe across restarts/instances.
  cron.schedule('5 0 * * *', async () => {
    try {
      console.log('[Cron] Running quotation expiry check...');
      const count = await QuotationService.expireOverdueQuotations();
      console.log(`[Cron] Expired ${count} quotation(s).`);
    } catch (err) {
      console.error('[Cron] Error during quotation expiry job:', err);
    }
  });

  cron.schedule('10 0 * * *', async () => {
    try {
      const count = await InvoiceService.markOverdueInvoices();
      console.log(`[Cron] Marked ${count} invoice(s) overdue.`);
    } catch (err) {
      console.error('[Cron] Error during invoice overdue job:', err);
    }
  });

  cron.schedule('15 0 * * *', async () => {
    try {
      const count = await NotificationService.generateDueAndReminderNotifications();
      console.log(`[Cron] Created ${count} notification(s).`);
    } catch (err) {
      console.error('[Cron] Error during notification job:', err);
    }
  });

  console.log('[Cron] Background jobs scheduled (quotation expiry, invoice overdue, and notifications).');
};

module.exports = {
  initCronJobs
};

const nodemailer = require('nodemailer');

class MailerService {
  constructor() {
    this.transporter = null;
    this.init();
  }

  init() {
    const isConfigured =
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_USER !== 'placeholder';

    if (isConfigured) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    }
  }

  /**
   * Send a welcome / set-password invitation email
   */
  async sendWelcomeEmail({ to, name, token, tempPassword }) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const setupLink = `${frontendUrl}/reset-password?token=${token}&email=${encodeURIComponent(to)}`;

    const subject = 'Welcome to OfficeFlow — Set Up Your Account';
    const text = `Hello ${name},\n\nYou have been invited to join OfficeFlow.\n\nPlease set up your account password by visiting the following link:\n${setupLink}\n\nThis link is valid for 48 hours.\n\nWarm regards,\nThe OfficeFlow Team`;

    if (this.transporter && process.env.NODE_ENV === 'production') {
      try {
        await this.transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@officeflow.local',
          to,
          subject,
          text
        });
      } catch (err) {
        console.error('[Mailer] Failed to send email via SMTP:', err.message);
      }
    } else {
      // Dev / Test simulation
      console.log(`[Mailer Mock] Welcome Email sent to: ${to}`);
      console.log(`[Mailer Mock] Set password URL: ${setupLink}`);
    }
  }

  async sendPasswordResetEmail({ to, name, token }) {
    if (!this.transporter) throw new Error('Email transport is not configured');
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@officeflow.local',
        to,
        subject: 'Reset your OfficeFlow password',
        text: `Hello ${name},\n\nUse the following link to reset your password. It expires in one hour:\n${resetLink}\n\nIf you did not request this, you can ignore this email.`
      });
    } catch (_error) {
      throw new Error('Password reset email delivery failed');
    }
  }

  /**
   * Send quotation PDF to client
   */
  async sendQuotationEmail({ to, cc, subject, message, clientName, quotationNumber, pdfBuffer, companyName = 'OfficeFlow' }) {
    if (!this.transporter) throw new Error('Email transport is not configured');
    const emailSubject = subject || `Quotation ${quotationNumber} from ${companyName}`;
    const body = message || `Please find attached quotation ${quotationNumber}. Please contact us if you need any clarification.`;
    const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    const attachmentFilename = `${quotationNumber.replace(/[\/\\]/g, '-')}.pdf`;
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@officeflow.local',
        to,
        ...(cc ? { cc } : {}),
        subject: emailSubject,
        text: `Dear ${clientName || 'Valued Client'},\n\n${body}\n\nWarm regards,\n${companyName}`,
        html: `<div style="font-family:Arial,sans-serif;color:#1f2937;max-width:640px;margin:auto"><h2 style="color:#3730a3">${escapeHtml(companyName)}</h2><p>Dear ${escapeHtml(clientName || 'Valued Client')},</p><p>${escapeHtml(body).replace(/\n/g, '<br>')}</p><p>Warm regards,<br><strong>${escapeHtml(companyName)}</strong></p></div>`,
        attachments: [{ filename: attachmentFilename, content: pdfBuffer, contentType: 'application/pdf' }]
      });
      return { success: true };
    } catch (_error) {
      throw new Error('SMTP delivery failed');
    }
  }

  async sendInvoiceEmail({ to, cc, subject, message, clientName, invoiceNumber, pdfBuffer, companyName = 'OfficeFlow' }) {
      if (!this.transporter) throw new Error('Email transport is not configured');
      const emailSubject = subject || `Invoice ${invoiceNumber} from ${companyName}`;
      const body = message || `Please find attached invoice ${invoiceNumber}.`;
      const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
      const attachmentFilename = `${invoiceNumber.replace(/[\/\\]/g, '-')}.pdf`;
      try {
        await this.transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@officeflow.local',
          to,
          ...(cc ? { cc } : {}),
          subject: emailSubject,
          text: `Dear ${clientName || 'Valued Client'},\n\n${body}\n\nWarm regards,\n${companyName}`,
          html: `<div style="font-family:Arial,sans-serif;color:#1f2937;max-width:640px;margin:auto"><h2 style="color:#3730a3">${escapeHtml(companyName)}</h2><p>Dear ${escapeHtml(clientName || 'Valued Client')},</p><p>${escapeHtml(body).replace(/\n/g, '<br>')}</p><p>Warm regards,<br><strong>${escapeHtml(companyName)}</strong></p></div>`,
          attachments: [{ filename: attachmentFilename, content: pdfBuffer, contentType: 'application/pdf' }]
        });
        return { success: true };
      } catch (_error) {
        throw new Error('SMTP delivery failed');
    }
  }
}

module.exports = new MailerService();

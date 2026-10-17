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

    return { success: true, link: setupLink };
  }
}

module.exports = new MailerService();

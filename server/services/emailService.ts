import { InsertEmailLog, emailLogs } from "../../shared/schema";
import { db } from "../db";

interface EmailParams {
  to: string;
  subject: string;
  templateType: string;
  variables: Record<string, string>;
}

interface BrevoResponse {
  messageId: string;
}

class EmailService {
  private apiKey: string;
  private senderEmail: string;
  private senderName: string;

  constructor() {
    this.apiKey = process.env.BREVO_API_KEY || '';
    this.senderEmail = 'info@thesummit25.com';
    this.senderName = 'The Summit 25';

    if (!this.apiKey) {
      console.warn('Brevo API key not found. Email functionality will be disabled.');
    }
  }

  async sendEmail(params: EmailParams): Promise<boolean> {
    if (!this.apiKey) {
      console.warn('Email not sent - API key not configured');
      await this.logEmail(params, 'failed', 'API key not configured');
      return false;
    }

    try {
      const htmlContent = this.getEmailTemplate(params.templateType, params.variables);
      const textContent = this.stripHtml(htmlContent);

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            email: this.senderEmail,
            name: this.senderName,
          },
          to: [
            {
              email: params.to,
            },
          ],
          subject: params.subject,
          htmlContent: htmlContent,
          textContent: textContent,
        }),
      });

      if (response.ok) {
        const result: BrevoResponse = await response.json();
        await this.logEmail(params, 'sent', `Brevo sent: ${result.messageId}`);
        return true;
      } else {
        const errorText = await response.text();
        await this.logEmail(params, 'failed', `Brevo error: ${errorText}`);
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logEmail(params, 'failed', errorMessage);
      return false;
    }
  }

  private async logEmail(params: EmailParams, status: string, errorMessage?: string) {
    try {
      const emailLog: InsertEmailLog = {
        toEmail: params.to,
        fromEmail: this.senderEmail,
        subject: params.subject,
        templateType: params.templateType,
        status,
        errorMessage,
      };

      await db.insert(emailLogs).values(emailLog);
    } catch (error) {
      console.error('Failed to log email:', error);
      // Don't throw - logging failure shouldn't break email sending
    }
  }

  private getEmailTemplate(templateType: string, variables: Record<string, string>): string {
    const baseStyle = `
      <style>
        body { 
          font-family: 'Inter', Arial, sans-serif; 
          line-height: 1.6; 
          color: #2C3E50; 
          background-color: #F8FAFB;
          margin: 0;
          padding: 0;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background: white; 
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(44, 62, 80, 0.1);
        }
        .header { 
          background: linear-gradient(135deg, #2C3E50 0%, #34495E 100%); 
          color: white; 
          padding: 40px 30px;
          text-align: center;
        }
        .logo {
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .content { 
          padding: 40px 30px; 
        }
        .btn { 
          display: inline-block; 
          background: linear-gradient(135deg, #5DADE2 0%, #3498DB 100%); 
          color: white !important; 
          padding: 15px 30px; 
          text-decoration: none; 
          border-radius: 8px; 
          font-weight: 600;
          margin: 20px 0;
        }
        .footer { 
          background: #F8F9FA; 
          padding: 30px; 
          text-align: center; 
          color: #7F8C8D;
          font-size: 14px;
        }
        .code {
          font-family: 'Courier New', monospace;
          font-size: 24px;
          font-weight: bold;
          background: #ECF0F1;
          padding: 15px;
          border-radius: 8px;
          letter-spacing: 2px;
          text-align: center;
          margin: 20px 0;
          color: #2C3E50;
        }
      </style>
    `;

    let template = '';

    switch (templateType) {
      case 'invitation':
        template = `
          ${baseStyle}
          <div class="container">
            <div class="header">
              <div class="logo">THE SUMMIT 25</div>
              <p>You've Been Invited</p>
            </div>
            <div class="content">
              <h2>Congratulations, ${variables.firstName || 'there'}!</h2>
              <p>You have received an exclusive invitation to <strong>The Summit 25</strong>, a premier gathering of industry leaders, innovators, and visionaries.</p>
              
              <p>Your invitation code:</p>
              <div class="code">${variables.inviteCode}</div>
              
              <p>Use this code to complete your registration at our exclusive event portal.</p>
              
              <a href="${variables.registrationUrl}" class="btn">Complete Registration</a>
              
              <p><strong>Event Details:</strong><br>
              📅 March 15-16, 2025<br>
              📍 San Francisco<br>
              👥 Invitation Only - 500 Leaders</p>
              
              <p>We look forward to seeing you at this exclusive event!</p>
            </div>
            <div class="footer">
              <p>This invitation was sent by ${variables.inviterName || 'The Summit 25 Team'}</p>
              <p>© 2025 The Summit 25. All rights reserved.</p>
            </div>
          </div>
        `;
        break;

      case 'waitlist_confirmation':
        template = `
          ${baseStyle}
          <div class="container">
            <div class="header">
              <div class="logo">THE SUMMIT 25</div>
              <p>Application Received</p>
            </div>
            <div class="content">
              <h2>Thank you, ${variables.firstName || 'there'}!</h2>
              <p>Your application for <strong>The Summit 25</strong> has been successfully received and is under review.</p>
              
              <p>Our team will carefully evaluate your application based on:</p>
              <ul>
                <li>Industry leadership and influence</li>
                <li>Company impact and innovation</li>
                <li>Professional network and expertise</li>
                <li>Alignment with Summit values</li>
              </ul>
              
              <p>If selected, you will receive an exclusive invitation code within the next 2-3 business days.</p>
              
              <p><strong>What's Next:</strong><br>
              • Review process: 2-3 business days<br>
              • Notification via email if selected<br>
              • Limited spaces available</p>
            </div>
            <div class="footer">
              <p>© 2025 The Summit 25. All rights reserved.</p>
            </div>
          </div>
        `;
        break;

      case 'waitlist_promotion':
        template = `
          ${baseStyle}
          <div class="container">
            <div class="header">
              <div class="logo">THE SUMMIT 25</div>
              <p>You've Been Selected!</p>
            </div>
            <div class="content">
              <h2>Congratulations, ${variables.firstName || 'there'}!</h2>
              <p>We're thrilled to inform you that you have been <strong>selected</strong> from our waitlist for <strong>The Summit 25</strong>!</p>
              
              <p>Your exclusive invitation code:</p>
              <div class="code">${variables.inviteCode}</div>
              
              <p>This code grants you access to register for our exclusive event. Please complete your registration within the next 7 days to secure your spot.</p>
              
              <a href="${variables.registrationUrl}" class="btn">Complete Registration Now</a>
              
              <p><strong>Event Details:</strong><br>
              📅 March 15-16, 2025<br>
              📍 San Francisco<br>
              👥 Invitation Only - 500 Leaders</p>
              
              <p>Welcome to an exclusive community of industry leaders and innovators!</p>
            </div>
            <div class="footer">
              <p>© 2025 The Summit 25. All rights reserved.</p>
            </div>
          </div>
        `;
        break;

      case 'registration_confirmation':
        template = `
          ${baseStyle}
          <div class="container">
            <div class="header">
              <div class="logo">THE SUMMIT 25</div>
              <p>Registration Confirmed</p>
            </div>
            <div class="content">
              <h2>Welcome to The Summit 25, ${variables.firstName || 'there'}!</h2>
              <p>Your registration has been <strong>confirmed</strong>. You are now part of an exclusive community of 500 industry leaders.</p>
              
              <p><strong>Your Registration Details:</strong><br>
              👤 ${variables.firstName} ${variables.lastName}<br>
              🏢 ${variables.company}<br>
              📧 ${variables.email}</p>
              
              <p><strong>Next Steps:</strong></p>
              <ul>
                <li>You'll receive your invitation codes to invite colleagues</li>
                <li>Access your personal dashboard to manage invitations</li>
                <li>Event details and agenda will be shared soon</li>
              </ul>
              
              <a href="${variables.dashboardUrl}" class="btn">Access Your Dashboard</a>
              
              <p><strong>Event Details:</strong><br>
              📅 March 15-16, 2025<br>
              📍 San Francisco<br>
              👥 Invitation Only - 500 Leaders</p>
            </div>
            <div class="footer">
              <p>© 2025 The Summit 25. All rights reserved.</p>
            </div>
          </div>
        `;
        break;

      case 'referral_codes':
        template = `
          ${baseStyle}
          <div class="container">
            <div class="header">
              <div class="logo">THE SUMMIT 25</div>
              <p>Your Invitation Codes</p>
            </div>
            <div class="content">
              <h2>Share the Exclusivity, ${variables.firstName || 'there'}!</h2>
              <p>As a confirmed attendee of <strong>The Summit 25</strong>, you have the privilege to invite colleagues and peers.</p>
              
              <p>Your personal invitation codes:</p>
              ${variables.codes ? variables.codes.split(',').map(code => `<div class="code">${code.trim()}</div>`).join('') : ''}
              
              <p><strong>How to Use:</strong></p>
              <ul>
                <li>Share these codes with industry leaders you'd like to invite</li>
                <li>Each code can only be used once</li>
                <li>Codes expire in 90 days</li>
                <li>Track your referrals in your dashboard</li>
              </ul>
              
              <a href="${variables.dashboardUrl}" class="btn">Manage Invitations</a>
              
              <p>Help us build an incredible community of innovators and leaders!</p>
            </div>
            <div class="footer">
              <p>© 2025 The Summit 25. All rights reserved.</p>
            </div>
          </div>
        `;
        break;

      case 'referral_invitation':
        template = `
          ${baseStyle}
          <div class="container">
            <div class="header">
              <div class="logo">THE SUMMIT 25</div>
              <p>Someone Has Shared Access With You</p>
            </div>
            <div class="content">
              <h2>Hello ${variables.firstName || 'there'}!</h2>
              <p><strong>${variables.referrerName || 'A colleague'}</strong> has shared exclusive access to <strong>The Summit 25</strong> with you.</p>
              
              <p>This is a premier gathering of industry leaders, innovators, and visionaries happening March 15-16, 2025 in San Francisco.</p>
              
              <p>Your exclusive invitation code:</p>
              <div class="code">${variables.inviteCode}</div>
              
              <p><strong>Personal Message from ${variables.referrerName || 'your colleague'}:</strong></p>
              <blockquote style="border-left: 4px solid #5DADE2; padding-left: 16px; margin: 20px 0; font-style: italic; color: #555;">
                "${variables.personalMessage || 'I thought you would be a great addition to this exclusive event. Looking forward to connecting there!'}"
              </blockquote>
              
              <a href="${variables.registrationUrl}" class="btn">Accept Invitation & Register</a>
              
              <p><strong>Event Highlights:</strong></p>
              <ul>
                <li>🎯 Exclusive networking with 500 industry leaders</li>
                <li>🚀 Cutting-edge insights from top innovators</li>
                <li>🤝 Strategic partnerships and collaboration opportunities</li>
                <li>🏆 Recognition and thought leadership platform</li>
              </ul>
              
              <p><strong>Event Details:</strong><br>
              📅 March 15-16, 2025<br>
              📍 San Francisco<br>
              👥 Invitation Only - 500 Leaders</p>
              
              <p><em>This invitation expires in 90 days. Secure your spot today!</em></p>
            </div>
            <div class="footer">
              <p>This invitation was shared by ${variables.referrerName || 'a colleague'} (${variables.referrerEmail || ''})</p>
              <p>© 2025 The Summit 25. All rights reserved.</p>
            </div>
          </div>
        `;
        break;

      default:
        template = `
          ${baseStyle}
          <div class="container">
            <div class="header">
              <div class="logo">THE SUMMIT 25</div>
            </div>
            <div class="content">
              <p>Thank you for your interest in The Summit 25.</p>
            </div>
            <div class="footer">
              <p>© 2025 The Summit 25. All rights reserved.</p>
            </div>
          </div>
        `;
    }

    return template;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  // Template methods for different email types
  async sendInvitationEmail(to: string, variables: Record<string, string>) {
    return this.sendEmail({
      to,
      subject: 'You\'re Invited to The Summit 25',
      templateType: 'invitation',
      variables,
    });
  }

  async sendWaitlistConfirmation(to: string, variables: Record<string, string>) {
    return this.sendEmail({
      to,
      subject: 'Application Received - The Summit 25',
      templateType: 'waitlist_confirmation',
      variables,
    });
  }

  async sendWaitlistPromotion(to: string, variables: Record<string, string>) {
    return this.sendEmail({
      to,
      subject: 'You\'ve Been Selected for The Summit 25!',
      templateType: 'waitlist_promotion',
      variables,
    });
  }

  async sendRegistrationConfirmation(to: string, variables: Record<string, string>) {
    return this.sendEmail({
      to,
      subject: 'Registration Confirmed - The Summit 25',
      templateType: 'registration_confirmation',
      variables,
    });
  }

  async sendReferralCodes(to: string, variables: Record<string, string>) {
    return this.sendEmail({
      to,
      subject: 'Your Invitation Codes - The Summit 25',
      templateType: 'referral_codes',
      variables,
    });
  }

  async sendReferralInvitation(to: string, variables: Record<string, string>) {
    return this.sendEmail({
      to,
      subject: `${variables.referrerName || 'Someone'} has shared exclusive access to The Summit 25 with you`,
      templateType: 'referral_invitation',
      variables,
    });
  }
}

export const emailService = new EmailService();

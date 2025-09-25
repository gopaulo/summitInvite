import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../server/storage';

export const config = { runtime: 'nodejs' };

// Helper function to parse cookies
function parseCookies(cookieHeader?: string) {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  return cookies;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check user authentication
    const cookies = parseCookies(req.headers.cookie);
    const userId = cookies.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { email, personalMessage } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Get user details
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Reserve an invitation code for this email
    const unusedCode = await storage.reserveInvitationCode(userId, email);
    if (!unusedCode) {
      return res.status(400).json({ error: 'No available invitation codes' });
    }

    // Create registration URL
    const registrationUrl = `https://${process.env.VERCEL_URL || 'app.thesummit25.com'}/register?code=${unusedCode.code}`;

    // Sanitize personal message to prevent HTML injection
    const sanitizedMessage = personalMessage ? 
      personalMessage.replace(/[<>"'&]/g, (match: string) => {
        const entities = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' };
        return entities[match as keyof typeof entities] || match;
      }) : '';

    // Send the referral invitation email using Brevo API directly
    let emailSent = false;
    try {
      if (process.env.BREVO_API_KEY) {
        const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': process.env.BREVO_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sender: {
              email: 'info@thesummit25.com',
              name: 'The Summit 25',
            },
            to: [{
              email: email,
            }],
            subject: `You're Invited to The Summit 25 by ${user.firstName} ${user.lastName}`,
            htmlContent: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #2c3e50;">You're Invited to The Summit 25!</h1>
                <p>${user.firstName} ${user.lastName} from ${user.company || 'their company'} has invited you to join The Summit 25.</p>
                ${sanitizedMessage ? `<blockquote style="border-left: 3px solid #2c3e50; padding-left: 15px; margin: 20px 0;"><em>${sanitizedMessage}</em></blockquote>` : ''}
                <p style="margin: 30px 0;"><a href="${registrationUrl}" style="background: #2c3e50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Complete Your Registration</a></p>
                <p>Your invitation code: <strong>${unusedCode.code}</strong></p>
                <p>Best regards,<br>The Summit 25 Team</p>
              </div>
            `,
          }),
        });
        emailSent = emailResponse.ok;
      }
    } catch (emailError) {
      console.error('Failed to send referral invitation email:', emailError);
      emailSent = false;
    }

    if (!emailSent) {
      return res.status(500).json({ error: 'Failed to send invitation email' });
    }

    res.json({
      success: true,
      message: 'Invitation sent successfully',
      sentCode: unusedCode.code,
      sentTo: email
    });

  } catch (error) {
    console.error("Send invitation error:", error);
    res.status(500).json({ error: "Failed to send invitation" });
  }
}
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
    // Get validated code from cookie
    const cookies = parseCookies(req.headers.cookie);
    const validatedCode = cookies.validatedCode;
    
    if (!validatedCode) {
      return res.status(400).json({ error: "Please validate your invitation code first" });
    }

    const { firstName, lastName, email, company, companyRevenue, role, companyWebsite } = req.body;

    // Basic validation
    if (!firstName || !lastName || !email || !company || !companyRevenue || !role) {
      return res.status(400).json({ error: "All required fields must be provided" });
    }

    // Verify invitation code exists and is valid
    const inviteCode = await storage.validateInvitationCode(validatedCode.toUpperCase());
    if (!inviteCode) {
      return res.status(400).json({ error: "Invalid or expired invitation code" });
    }

    // Check for existing user
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "An account with this email already exists" });
    }

    // Map form data to match existing database schema
    const userData = {
      firstName,
      lastName,
      email,
      company,
      companySize: companyRevenue, // Map frontend companyRevenue to database companySize
      role,
      linkedinUrl: companyWebsite || null, // Map frontend companyWebsite to database linkedinUrl
      invitedBy: inviteCode.assignedToUserId || null
    };

    // Create new user using storage interface
    const newUser = await storage.createUser(userData);

    // Mark invitation code as used
    await storage.useInvitationCode(validatedCode.toUpperCase(), newUser.id);

    // Generate 5 invitation codes for new user
    const newCodes = await storage.generateInvitationCodes(newUser.id, 5);

    // Send registration confirmation email using Brevo API
    try {
      if (process.env.BREVO_API_KEY) {
        await fetch('https://api.brevo.com/v3/smtp/email', {
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
              email: newUser.email,
            }],
            subject: 'Welcome to The Summit 25!',
            htmlContent: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #2c3e50;">Welcome to The Summit 25!</h1>
                <p>Hi ${newUser.firstName || 'there'},</p>
                <p>Your registration is complete! You now have access to your dashboard where you can invite others.</p>
                <p>Your invitation codes: <strong>${newCodes.map(c => c.code).join(', ')}</strong></p>
                <p><a href="https://${process.env.VERCEL_URL || 'app.thesummit25.com'}/dashboard" style="background: #2c3e50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Access Your Dashboard</a></p>
                <p>Best regards,<br>The Summit 25 Team</p>
              </div>
            `,
          }),
        });
      }
    } catch (emailError) {
      console.error('Failed to send registration emails:', emailError);
      // Don't fail registration if email fails
    }

    // Set user session cookie
    const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader('Set-Cookie', [
      `userId=${newUser.id}; HttpOnly${secureFlag}; SameSite=Lax; Path=/; Max-Age=2592000`,
      `validatedCode=; HttpOnly${secureFlag}; SameSite=Lax; Path=/; Max-Age=0`
    ]);

    res.status(201).json({
      message: "Registration successful",
      user: {
        id: newUser.id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email
      },
      invitationCodes: newCodes.map(code => ({ code: code.code }))
    });

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
}
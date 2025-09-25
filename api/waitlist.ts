import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../server/storage';

export const config = { runtime: 'nodejs' };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract data from request body (handle recaptchaToken)
    const { recaptchaToken, firstName, lastName, email, company, companyRevenue, role, companyWebsite, motivation } = req.body;

    // Basic validation
    if (!firstName || !lastName || !email || !company || !companyRevenue || !role || !motivation) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['firstName', 'lastName', 'email', 'company', 'companyRevenue', 'role', 'motivation']
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check for existing waitlist entry
    const existingWaitlistEntry = await storage.findWaitlistByEmail(email);
    if (existingWaitlistEntry) {
      return res.status(400).json({ error: "You're already on the waitlist" });
    }

    // Check for existing user
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "An account with this email already exists" });
    }

    // Calculate priority score based on company revenue
    let priorityScore = 5;
    if (companyRevenue) {
      const revenue = companyRevenue.toLowerCase();
      if (revenue.includes('$5mi+')) {
        priorityScore = 10;
      } else if (revenue.includes('$3mi-$5mi')) {
        priorityScore = 9;
      } else if (revenue.includes('$1mi-$3mi')) {
        priorityScore = 8;
      } else if (revenue.includes('$500k-$1mi')) {
        priorityScore = 7;
      } else if (revenue.includes('$100k-$500k')) {
        priorityScore = 6;
      }
    }

    // Use existing database columns - waitlist has both company_revenue and linkedin_url
    const waitlistData = {
      email,
      firstName,
      lastName,
      company,
      companySize: companyRevenue, // Required field - map revenue to size
      companyRevenue, // Optional field - store original value
      role,
      linkedinUrl: companyWebsite || null, // Use actual linkedin_url column  
      motivation,
      priorityScore
    };

    // Add to waitlist using storage interface
    const newWaitlistEntry = await storage.addToWaitlist(waitlistData);

    // Send confirmation email using Brevo API
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
              email: email,
            }],
            subject: 'Welcome to The Summit 25 Waitlist!',
            htmlContent: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #2c3e50;">You're on the waitlist!</h1>
                <p>Hi ${firstName},</p>
                <p>Thank you for your interest in The Summit 25. You've been successfully added to our exclusive waitlist.</p>
                <p>We'll notify you as soon as invitation codes become available.</p>
                <p>Best regards,<br>The Summit 25 Team</p>
              </div>
            `,
          }),
        });
      }
    } catch (emailError) {
      console.error('Failed to send waitlist confirmation email:', emailError);
      // Don't fail waitlist submission if email fails
    }

    res.status(201).json({
      success: true,
      message: "Successfully added to waitlist",
      priorityScore: priorityScore
    });

  } catch (error) {
    console.error("Waitlist error:", error);
    res.status(500).json({ 
      error: "Failed to add to waitlist",
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';
import { nanoid } from "nanoid";

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

  let pool: Pool | null = null;

  try {
    // Check admin authentication
    const cookies = parseCookies(req.headers.cookie);
    if (cookies.isAdmin !== 'true') {
      return res.status(401).json({ error: "Admin access required" });
    }

    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set");
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: "Valid waitlist entry ID is required" });
    }

    // Get waitlist entry
    const entryQuery = 'SELECT * FROM waitlist WHERE id = $1';
    const entryResult = await pool.query(entryQuery, [id]);
    const entry = entryResult.rows[0];
      
    if (!entry) {
      return res.status(404).json({ error: "Waitlist entry not found" });
    }

    if (entry.status === 'promoted') {
      return res.status(400).json({ error: "User already promoted" });
    }

    // Generate invitation code
    const inviteCode = nanoid(8).toUpperCase();
    
    const insertCodeQuery = `
      INSERT INTO invitation_codes (id, code, assigned_to_user_id, created_at) 
      VALUES (gen_random_uuid(), $1, 'admin', NOW())
    `;
    await pool.query(insertCodeQuery, [inviteCode]);

    // Promote from waitlist  
    const updateQuery = `
      UPDATE waitlist 
      SET status = 'promoted', promoted_at = NOW() 
      WHERE id = $1
    `;
    await pool.query(updateQuery, [id]);

    // Send promotion email
    const registrationUrl = `https://${process.env.VERCEL_URL || 'app.thesummit25.com'}/register?code=${inviteCode}`;
    
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
              email: entry.email,
            }],
            subject: 'You\'ve been promoted from the waitlist!',
            htmlContent: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #2c3e50;">Great News - You're In!</h1>
                <p>Hi ${entry.first_name},</p>
                <p>Congratulations! You've been promoted from our waitlist and can now register for The Summit 25.</p>
                <p style="margin: 30px 0;"><a href="${registrationUrl}" style="background: #2c3e50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Complete Your Registration</a></p>
                <p>Your invitation code: <strong>${inviteCode}</strong></p>
                <p>Best regards,<br>The Summit 25 Team</p>
              </div>
            `,
          }),
        });
      }
    } catch (emailError) {
      console.error('Failed to send promotion email:', emailError);
      // Continue anyway - promotion still happened, just email failed
    }

    await pool.end();

    res.json({ 
      success: true, 
      message: "User promoted from waitlist",
      inviteCode: inviteCode
    });

  } catch (error) {
    if (pool) {
      try {
        await pool.end();
      } catch (poolError) {
        console.error('Error closing pool:', poolError);
      }
    }
    
    console.error("Promotion error:", error);
    res.status(500).json({ error: "Failed to promote user" });
  }
}
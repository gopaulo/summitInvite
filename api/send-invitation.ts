import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { users, invitationCodes } from '../shared/schema';
import { eq, and, isNull } from "drizzle-orm";
import { emailService } from '../server/services/emailService';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

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
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set");
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);

    const userId = cookies.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const { email, personalMessage } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user has available invitation codes
    const [unusedCode] = await db
      .select()
      .from(invitationCodes)
      .where(
        and(
          eq(invitationCodes.assignedToUserId, userId),
          eq(invitationCodes.isUsed, false),
          isNull(invitationCodes.reservedForEmail)
        )
      )
      .limit(1);

    if (!unusedCode) {
      return res.status(400).json({ error: 'No available invitation codes' });
    }

    // Reserve the code for the email
    await db.update(invitationCodes)
      .set({ 
        reservedForEmail: email, 
        reservedAt: new Date() 
      })
      .where(eq(invitationCodes.code, unusedCode.code));

    // Create registration URL (template expects registrationUrl, not inviteUrl)
    const registrationUrl = `https://${process.env.VERCEL_URL || 'localhost:3000'}/register?code=${unusedCode.code}`;

    // Sanitize personal message to prevent HTML injection
    const sanitizedMessage = personalMessage ? 
      personalMessage.replace(/[<>"'&]/g, (match) => {
        const entities = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' };
        return entities[match as keyof typeof entities] || match;
      }) : '';

    // Send the referral invitation email
    let emailSent = false;
    try {
      emailSent = await emailService.sendReferralInvitation(email, {
        referrerName: `${user.firstName} ${user.lastName}`,
        referrerCompany: user.company || '',
        inviteCode: unusedCode.code,
        registrationUrl: registrationUrl,
        personalMessage: sanitizedMessage,
      });
    } catch (emailError) {
      console.error('Failed to send referral invitation email:', emailError);
      emailSent = false;
    }

    // If email failed to send, unreserve the code and return error
    if (!emailSent) {
      await db.update(invitationCodes)
        .set({ 
          reservedForEmail: null, 
          reservedAt: null 
        })
        .where(eq(invitationCodes.code, unusedCode.code));
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
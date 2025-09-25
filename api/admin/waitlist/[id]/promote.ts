import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { waitlist, invitationCodes } from '../../../../shared/schema';
import { eq } from "drizzle-orm";
import { emailService } from '../../../../server/services/emailService';
import { nanoid } from "nanoid";
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
    // Check admin authentication
    const cookies = parseCookies(req.headers.cookie);
    if (cookies.isAdmin !== 'true') {
      return res.status(401).json({ error: "Admin access required" });
    }

    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set");
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);

    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: "Valid waitlist ID required" });
    }

    // Get waitlist entry
    const [entry] = await db
      .select()
      .from(waitlist)
      .where(eq(waitlist.id, id));
      
    if (!entry) {
      return res.status(404).json({ error: "Waitlist entry not found" });
    }

    if (entry.status === 'promoted') {
      return res.status(400).json({ error: "User already promoted" });
    }

    // Generate invitation code
    const inviteCode = nanoid(8).toUpperCase();
    await db.insert(invitationCodes).values({
      code: inviteCode,
      assignedToUserId: 'admin', // Admin-generated code
    });

    // Promote from waitlist  
    await db.update(waitlist)
      .set({
        status: 'promoted',
        promotedAt: new Date(),
      })
      .where(eq(waitlist.id, id));

    // Send promotion email
    const registrationUrl = `https://${process.env.VERCEL_URL || 'localhost:3000'}/register?code=${inviteCode}`;
    
    try {
      await emailService.sendWaitlistPromotion(entry.email, {
        firstName: entry.firstName,
        inviteCode: inviteCode,
        registrationUrl: registrationUrl,
      });
    } catch (emailError) {
      console.error('Failed to send promotion email:', emailError);
      // Continue anyway - promotion still happened, just email failed
    }

    res.json({ 
      success: true, 
      message: "User promoted from waitlist",
      inviteCode: inviteCode
    });

  } catch (error) {
    console.error("Promotion error:", error);
    res.status(500).json({ error: "Failed to promote user" });
  }
}
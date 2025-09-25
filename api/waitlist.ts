import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { waitlist, users } from '../shared/schema';
import { waitlistSubmissionSchema, type WaitlistData } from '../shared/schema';
import { eq } from "drizzle-orm";
import { emailService } from '../server/services/emailService';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set");
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);

    // Skip reCAPTCHA for now to get basic functionality working
    // TODO: Re-add reCAPTCHA verification later

    const validationResult = waitlistSubmissionSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid waitlist data",
        details: validationResult.error.format()
      });
    }

    const waitlistData: WaitlistData = validationResult.data;

    // Check for existing waitlist entry
    const [existingEntry] = await db
      .select()
      .from(waitlist)
      .where(eq(waitlist.email, waitlistData.email));
      
    if (existingEntry) {
      return res.status(400).json({ error: "You're already on the waitlist" });
    }

    // Check for existing user
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, waitlistData.email));
      
    if (existingUser) {
      return res.status(400).json({ error: "An account with this email already exists" });
    }

    // Calculate priority score
    let priorityScore = 5;
    if (waitlistData.companyRevenue) {
      const revenue = waitlistData.companyRevenue.toLowerCase();
      if (revenue.includes('$10m+') || revenue.includes('10m+')) {
        priorityScore = 10;
      } else if (revenue.includes('$5m-$10m') || revenue.includes('5m-10m')) {
        priorityScore = 9;
      } else if (revenue.includes('$1m-$5m') || revenue.includes('1m-5m')) {
        priorityScore = 8;
      }
    }

    // Add to waitlist
    await db.insert(waitlist).values({
      email: waitlistData.email,
      firstName: waitlistData.firstName,
      lastName: waitlistData.lastName,
      company: waitlistData.company,
      companyRevenue: waitlistData.companyRevenue,
      role: waitlistData.role,
      companyWebsite: waitlistData.companyWebsite,
      motivation: waitlistData.motivation,
      priorityScore,
    });

    // Send waitlist confirmation email
    try {
      await emailService.sendWaitlistConfirmation(waitlistData.email, {
        firstName: waitlistData.firstName,
      });
    } catch (emailError) {
      console.error('Failed to send waitlist confirmation email:', emailError);
      // Don't fail waitlist submission if email fails
    }

    res.status(201).json({
      message: "Successfully added to waitlist",
      priorityScore
    });

  } catch (error) {
    console.error("Waitlist error:", error);
    res.status(500).json({ error: "Failed to add to waitlist" });
  }
}
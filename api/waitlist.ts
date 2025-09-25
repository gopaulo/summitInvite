import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../server/storage';
import { waitlistSubmissionSchema, type WaitlistData } from '../shared/schema';
import { verifyRecaptcha } from '../server/utils/recaptcha';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const recaptchaToken = req.body.recaptchaToken;
    if (!recaptchaToken) {
      return res.status(400).json({ error: "reCAPTCHA token is required" });
    }
    
    const recaptchaResult = await verifyRecaptcha(recaptchaToken, "waitlist");
    if (!recaptchaResult.isValid) {
      return res.status(400).json({ error: "reCAPTCHA verification failed" });
    }

    const validationResult = waitlistSubmissionSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid waitlist data",
        details: validationResult.error.format()
      });
    }

    const waitlistData: WaitlistData = validationResult.data;

    const existingEntry = await storage.findWaitlistByEmail(waitlistData.email);
    if (existingEntry) {
      return res.status(400).json({ error: "You're already on the waitlist" });
    }

    const existingUser = await storage.getUserByEmail(waitlistData.email);
    if (existingUser) {
      return res.status(400).json({ error: "An account with this email already exists" });
    }

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

    await storage.addToWaitlist(waitlistData);

    res.status(201).json({
      message: "Successfully added to waitlist",
      priorityScore
    });

  } catch (error) {
    console.error("Waitlist error:", error);
    res.status(500).json({ error: "Failed to add to waitlist" });
  }
}
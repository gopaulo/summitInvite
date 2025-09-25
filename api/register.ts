import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { users, invitationCodes } from '../shared/schema';
import { registrationSchema, type RegistrationData, type InsertUser } from '../shared/schema';
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
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
    // Get validated code from cookie
    const cookies = parseCookies(req.headers.cookie);
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set");
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);

    const validatedCode = cookies.validatedCode;
    
    if (!validatedCode) {
      return res.status(400).json({ error: "No validated code in session. Please validate your invitation code first." });
    }

    const validationResult = registrationSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Invalid registration data",
        details: validationResult.error.format()
      });
    }

    const registrationData: RegistrationData = validationResult.data;

    // Validate invitation code
    const [inviteCode] = await db
      .select()
      .from(invitationCodes)
      .where(eq(invitationCodes.code, validatedCode.toUpperCase()));
    
    if (!inviteCode || inviteCode.isUsed || 
        (inviteCode.expiresAt && new Date() > inviteCode.expiresAt)) {
      return res.status(400).json({ error: "Invitation code has expired or been used" });
    }

    // Check for existing user
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, registrationData.email));
      
    if (existingUser) {
      return res.status(400).json({ error: "An account with this email already exists" });
    }
    // Create new user
    const [newUser] = await db.insert(users).values({
      firstName: registrationData.firstName,
      lastName: registrationData.lastName,
      email: registrationData.email,
      company: registrationData.company,
      companyRevenue: registrationData.companyRevenue,
      role: registrationData.role,
      companyWebsite: registrationData.companyWebsite,
      invitedBy: inviteCode.assignedToUserId || null
    }).returning();

    // Mark invitation code as used
    await db.update(invitationCodes)
      .set({ 
        isUsed: true, 
        usedByUserId: newUser.id, 
        usedAt: new Date() 
      })
      .where(eq(invitationCodes.code, validatedCode.toUpperCase()));

    // Generate invitation codes for new user
    const newCodes = [];
    for (let i = 0; i < 5; i++) {
      const code = nanoid(8).toUpperCase();
      newCodes.push(code);
      await db.insert(invitationCodes).values({
        code,
        assignedToUserId: newUser.id,
      });
    }

    // Send registration confirmation email and referral codes email
    try {
      await emailService.sendRegistrationConfirmation(newUser.email, {
        firstName: newUser.firstName || '',
        lastName: newUser.lastName || '',
        company: newUser.company || '',
        email: newUser.email,
        dashboardUrl: `https://${process.env.VERCEL_URL || 'localhost:3000'}/dashboard`,
      });
      
      // Send referral codes email
      await emailService.sendReferralCodes(newUser.email, {
        firstName: newUser.firstName || '',
        codes: newCodes.join(', '),
        dashboardUrl: `https://${process.env.VERCEL_URL || 'localhost:3000'}/dashboard`,
      });
    } catch (emailError) {
      console.error('Failed to send registration emails:', emailError);
      // Don't fail registration if email fails
    }

    // Set user session cookie with proper security attributes
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
      invitationCodes: newCodes.map(code => ({ code }))
    });

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
}
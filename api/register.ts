import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../server/storage';
import { CodeGenerator } from '../server/services/codeGenerator';
import { registrationSchema, type RegistrationData, type InsertUser } from '../shared/schema';

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

    const isCodeStillValid = await storage.validateInvitationCode(validatedCode);
    if (!isCodeStillValid) {
      return res.status(400).json({ error: "Invitation code has expired or been used" });
    }

    const existingUser = await storage.getUserByEmail(registrationData.email);
    if (existingUser) {
      return res.status(400).json({ error: "An account with this email already exists" });
    }

    const referrerUser = await storage.getUserByInvitationCode(validatedCode);
    const newUserData: InsertUser = {
      firstName: registrationData.firstName,
      lastName: registrationData.lastName,
      email: registrationData.email,
      company: registrationData.company,
      companyRevenue: registrationData.companyRevenue,
      role: registrationData.role,
      companyWebsite: registrationData.companyWebsite,
      invitedBy: referrerUser?.id || null
    };

    const newUser = await storage.createUser(newUserData);
    await storage.useInvitationCode(validatedCode, newUser.id);
    const newCodes = await CodeGenerator.generateMultipleCodes(5, newUser.id);

    // Set user session cookie
    res.setHeader('Set-Cookie', [
      `userId=${newUser.id}; HttpOnly; Secure=${process.env.NODE_ENV === 'production'}; SameSite=Lax; Path=/; Max-Age=2592000`,
      `validatedCode=; HttpOnly; Secure=${process.env.NODE_ENV === 'production'}; SameSite=Lax; Path=/; Max-Age=0`
    ]);

    res.status(201).json({
      message: "Registration successful",
      user: {
        id: newUser.id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email
      },
      invitationCodes: newCodes
    });

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
}
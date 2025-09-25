import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../server/storage';

export const config = { runtime: 'nodejs' };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: "Invitation code is required" });
    }

    // Validate invitation code using storage interface
    const inviteCode = await storage.validateInvitationCode(code.toUpperCase());
    const isValid = !!inviteCode;
    
    if (isValid) {
      // Set validation cookie
      const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';
      res.setHeader('Set-Cookie', [
        `validatedCode=${code.toUpperCase()}; HttpOnly${secureFlag}; SameSite=Lax; Path=/; Max-Age=3600`
      ]);
    }

    res.json({ 
      valid: isValid,
      message: isValid ? "Code validated successfully" : "Invalid or expired invitation code"
    });

  } catch (error) {
    console.error("Code validation error:", error);
    res.status(500).json({ error: "Failed to validate code" });
  }
}
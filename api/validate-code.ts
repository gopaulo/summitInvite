import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../server/storage';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: "Invitation code is required" });
    }

    const isValid = await storage.validateInvitationCode(code);
    
    if (isValid) {
      // Set validation cookie
      res.setHeader('Set-Cookie', [
        `validatedCode=${code}; HttpOnly; Secure=${process.env.NODE_ENV === 'production'}; SameSite=Lax; Path=/; Max-Age=1800`
      ]);
      res.json({ valid: true, message: "Code validated successfully" });
    } else {
      res.status(400).json({ error: "Invalid or expired invitation code" });
    }
  } catch (error) {
    console.error("Code validation error:", error);
    res.status(500).json({ error: "Validation failed" });
  }
}
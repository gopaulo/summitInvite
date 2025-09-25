import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { invitationCodes } from '../shared/schema';
import { eq } from "drizzle-orm";
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

    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: "Invitation code is required" });
    }

    // Validate invitation code
    const [inviteCode] = await db
      .select()
      .from(invitationCodes)
      .where(eq(invitationCodes.code, code.toUpperCase()));
    
    const isValid = inviteCode && !inviteCode.isUsed && 
      (!inviteCode.expiresAt || new Date() < inviteCode.expiresAt);
    
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
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../server/storage';

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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check admin authentication
    const cookies = parseCookies(req.headers.cookie);
    if (cookies.isAdmin !== 'true') {
      return res.status(401).json({ error: "Admin access required" });
    }

    const codes = await storage.getAllInvitationCodes();
    res.json(codes);
  } catch (error) {
    console.error("Admin codes error:", error);
    res.status(500).json({ error: "Failed to load invitation codes" });
  }
}
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

    const { type } = req.query;

    if (type === 'codes') {
      const codes = await storage.getAllInvitationCodes();
      res.json(codes);
    } else if (type === 'users') {
      const users = await storage.getAllUsers();
      res.json(users);
    } else {
      res.status(400).json({ error: "Invalid type. Use ?type=codes or ?type=users" });
    }
  } catch (error) {
    console.error("Admin management error:", error);
    res.status(500).json({ error: "Failed to load data" });
  }
}
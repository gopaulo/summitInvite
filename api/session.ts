import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../server/storage';

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
    const cookies = parseCookies(req.headers.cookie);
    const userId = cookies.userId;
    const isAdmin = cookies.isAdmin === 'true';
    
    if (userId) {
      const user = await storage.getUserById(userId);
      if (user) {
        const codes = await storage.getUserInvitationCodes(userId);
        const usedCodes = await storage.getUsedCodes(userId);
        const stats = await storage.getStats();

        return res.json({
          authenticated: true,
          isAdmin,
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            company: user.company,
            role: user.role,
            status: 'active',
            createdAt: user.createdAt || new Date().toISOString(),
            updatedAt: user.updatedAt || new Date().toISOString()
          },
          inviteCodes: codes,
          referrals: [],
          stats
        });
      }
    }

    res.json({ 
      authenticated: false,
      isAdmin: false
    });
  } catch (error) {
    console.error("Session check error:", error);
    res.status(500).json({ error: "Failed to check session" });
  }
}
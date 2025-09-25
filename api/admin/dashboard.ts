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

    const users = await storage.getAllUsers();
    const waitlist = await storage.getWaitlist();
    const codes = await storage.getAllInvitationCodes();
    
    const totalUsers = users.length;
    const totalWaitlist = waitlist.length;
    const totalCodes = codes.length;
    const usedCodes = codes.filter(c => c.isUsed).length;
    const availableCodes = totalCodes - usedCodes;
    
    res.json({
      totalRegistered: totalUsers,
      activeCodes: availableCodes,
      waitlistCount: totalWaitlist,
      totalReferrals: usedCodes,
      recentUsers: users.slice(-5).reverse(),
      recentWaitlist: waitlist.slice(-5).reverse()
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
}
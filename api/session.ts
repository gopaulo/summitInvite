import type { VercelRequest, VercelResponse } from '@vercel/node';

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
    
    // Debug logging for development
    console.log('Session check - cookies:', cookies);
    console.log('Session check - userId:', userId, 'isAdmin:', isAdmin);
    
    // For now, just return basic session info based on cookies
    // User data fetching can be handled separately by individual endpoints
    res.json({ 
      authenticated: !!userId || isAdmin,
      isAdmin: isAdmin
    });
  } catch (error) {
    console.error("Session check error:", error);
    res.status(500).json({ error: "Failed to check session" });
  }
}
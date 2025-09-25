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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check user authentication
    const cookies = parseCookies(req.headers.cookie);
    const userId = cookies.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const { email, personalMessage } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user has available invitation codes
    const availableCodes = await storage.getUserInvitationCodes(userId);
    const unusedCode = availableCodes.find(code => !code.isUsed && !code.reservedForEmail);

    if (!unusedCode) {
      return res.status(400).json({ error: 'No available invitation codes' });
    }

    // Reserve the code for the email (simplified - in a real app you'd send actual email)
    // For now, just mark it as reserved
    await storage.reserveInvitationCode(unusedCode.code, email);

    // In a real implementation, you would send an email here using SendGrid
    // For now, return success with the code info
    res.json({
      success: true,
      message: 'Invitation sent successfully',
      sentCode: unusedCode.code,
      sentTo: email
    });

  } catch (error) {
    console.error("Send invitation error:", error);
    res.status(500).json({ error: "Failed to send invitation" });
  }
}
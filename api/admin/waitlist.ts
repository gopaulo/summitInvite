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

    const { export: exportType } = req.query;
    const waitlistData = await storage.getWaitlist();

    if (exportType === 'csv') {
      // Export as CSV
      const csvHeader = 'First Name,Last Name,Email,Company,Company Revenue,Role,Website,Motivation,Priority Score,Created At\n';
      const csvRows = waitlistData.map(entry => 
        `"${entry.firstName}","${entry.lastName}","${entry.email}","${entry.company}","${entry.companyRevenue || entry.companySize}","${entry.role}","${entry.linkedinUrl || ''}","${entry.motivation.replace(/"/g, '""')}",${entry.priorityScore},"${entry.createdAt}"`
      ).join('\n');
      
      const csv = csvHeader + csvRows;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="summit25-waitlist.csv"');
      res.send(csv);
    } else {
      // Return JSON data
      res.json(waitlistData);
    }
  } catch (error) {
    console.error("Admin waitlist error:", error);
    res.status(500).json({ error: "Failed to load waitlist" });
  }
}
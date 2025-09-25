import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body;
  
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminUsername || !adminPassword) {
    return res.status(500).json({ error: "Admin credentials not configured" });
  }
  
  if (username === adminUsername && password === adminPassword) {
    res.json({ success: true, message: "Admin authenticated" });
  } else {
    res.status(401).json({ error: "Invalid admin credentials" });
  }
}
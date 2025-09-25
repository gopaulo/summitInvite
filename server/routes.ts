import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { emailService } from "./services/emailService";
import { CodeGenerator } from "./services/codeGenerator";
import {
  registrationSchema,
  waitlistSubmissionSchema,
  type RegistrationData,
  type WaitlistData,
  type InsertUser,
} from "@shared/schema";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { verifyRecaptcha } from "./utils/recaptcha";

// Admin authentication middleware
const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  // Check if user is authenticated as admin via session
  if (!req.session?.isAdmin) {
    return res.status(401).json({ error: "Unauthorized access" });
  }
  
  next();
};

// Rate limiting middleware
const codeValidationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: { error: "Too many code validation attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const waitlistLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 submissions per hour per IP
  message: { error: "Too many waitlist submissions. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const emailInvitationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 email invitations per hour per IP
  message: { error: "Too many invitation emails sent. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Admin login endpoint
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      const adminUsername = process.env.ADMIN_USERNAME;
      const adminPassword = process.env.ADMIN_PASSWORD;
      
      if (!adminUsername || !adminPassword) {
        return res.status(500).json({ error: "Admin credentials not configured" });
      }
      
      if (username === adminUsername && password === adminPassword) {
        req.session.isAdmin = true;
        res.json({ success: true, message: "Admin authenticated" });
      } else {
        res.status(401).json({ error: "Invalid admin credentials" });
      }
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Admin logout endpoint
  app.post("/api/admin/logout", async (req, res) => {
    req.session.isAdmin = false;
    res.json({ success: true, message: "Logged out" });
  });

  // Check admin authentication status
  app.get("/api/admin/me", async (req, res) => {
    if (req.session?.isAdmin) {
      res.json({ isAdmin: true });
    } else {
      res.status(401).json({ error: "Not authenticated as admin" });
    }
  });

  // Send invitation email
  app.post("/api/send-invitation", emailInvitationLimiter, async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { email, personalMessage } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Get the user and reserve an invitation code
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Reserve an available code for this email
      const inviteCode = await storage.reserveInvitationCode(user.id, email);
      
      if (!inviteCode) {
        return res.status(400).json({ error: "No invitation codes available" });
      }
      const inviteUrl = `${req.protocol}://${req.get('host')}/?code=${inviteCode.code}`;

      // Send the invitation email
      await emailService.sendReferralInvitation(email, {
        referrerName: `${user.firstName} ${user.lastName}`,
        referrerCompany: user.company || '',
        inviteCode: inviteCode.code,
        inviteUrl: inviteUrl,
        personalMessage: personalMessage || '',
      });

      res.json({ 
        success: true, 
        message: "Invitation sent successfully",
        sentCode: inviteCode.code,
        sentTo: email
      });
    } catch (error) {
      console.error("Send invitation error:", error);
      res.status(500).json({ error: "Failed to send invitation" });
    }
  });

  // Get current user session
  app.get("/api/me", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const inviteCodes = await storage.getInvitationCodesByUser(user.id);
      const referrals = await storage.getReferralTree(user.id);

      res.json({
        user,
        inviteCodes,
        referrals,
      });
    } catch (error) {
      console.error("Current user error:", error);
      res.status(500).json({ error: "Failed to fetch user data" });
    }
  });

  // Validate invitation code
  app.post("/api/validate-code", codeValidationLimiter, async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: "Invalid code format" });
      }

      const inviteCode = await storage.validateInvitationCode(code);
      
      if (inviteCode) {
        res.json({ valid: true, message: "Code is valid" });
      } else {
        res.status(400).json({ valid: false, error: "Invalid or expired invitation code" });
      }
    } catch (error) {
      console.error("Code validation error:", error);
      res.status(500).json({ error: "Failed to validate code" });
    }
  });

  // Register with invitation code
  app.post("/api/register", async (req, res) => {
    try {
      const { recaptchaToken, ...formData } = req.body;
      
      // Verify reCAPTCHA
      const recaptchaResult = await verifyRecaptcha(recaptchaToken, 'register');
      if (!recaptchaResult.isValid) {
        return res.status(400).json({ error: recaptchaResult.error || 'reCAPTCHA verification failed' });
      }
      
      const validatedData = registrationSchema.parse(formData) as RegistrationData;
      
      // Validate invitation code
      const inviteCode = await storage.validateInvitationCode(validatedData.inviteCode);
      if (!inviteCode) {
        return res.status(400).json({ error: "Invalid or expired invitation code" });
      }

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Create user
      const user = await storage.createUser({
        email: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        company: validatedData.company,
        companyRevenue: validatedData.companyRevenue,
        role: validatedData.role,
        companyWebsite: validatedData.companyWebsite,
        status: 'registered',
        invitedBy: inviteCode.assignedToUserId,
      });

      // Use the invitation code
      await storage.useInvitationCode(validatedData.inviteCode, user.id);

      // Generate invitation codes for the new user
      const codes = await storage.generateInvitationCodes(user.id, 5);
      
      // Send confirmation email
      await emailService.sendRegistrationConfirmation(user.email, {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        company: user.company || '',
        email: user.email,
        dashboardUrl: `${req.protocol}://${req.get('host')}/dashboard`,
      });

      // Send referral codes email
      await emailService.sendReferralCodes(user.email, {
        firstName: user.firstName || '',
        codes: codes.map(c => c.code).join(', '),
        dashboardUrl: `${req.protocol}://${req.get('host')}/dashboard`,
      });

      // Store user session after successful registration
      req.session.userId = user.id;
      
      res.json({ 
        success: true, 
        message: "Registration successful",
        userId: user.id 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to register user" });
    }
  });

  // Submit to waitlist
  app.post("/api/waitlist", waitlistLimiter, async (req, res) => {
    try {
      console.log("Waitlist submission received:", req.body);
      const { recaptchaToken, ...formData } = req.body;
      
      // Verify reCAPTCHA
      const recaptchaResult = await verifyRecaptcha(recaptchaToken, 'waitlist');
      if (!recaptchaResult.isValid) {
        return res.status(400).json({ error: recaptchaResult.error || 'reCAPTCHA verification failed' });
      }
      
      const validatedData = waitlistSubmissionSchema.parse(formData) as WaitlistData;
      console.log("Validation successful:", validatedData);
      
      // Check if email already exists in waitlist or registered users
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered or in waitlist" });
      }

      const waitlistEntry = await storage.addToWaitlist(validatedData);

      // Send waitlist confirmation email
      await emailService.sendWaitlistConfirmation(waitlistEntry.email, {
        firstName: waitlistEntry.firstName,
      });

      res.json({ 
        success: true, 
        message: "Successfully added to waitlist",
        priorityScore: waitlistEntry.priorityScore 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Waitlist submission error:", error);
      res.status(500).json({ error: "Failed to add to waitlist" });
    }
  });

  // Get user dashboard data
  app.get("/api/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const inviteCodes = await storage.getInvitationCodesByUser(userId);
      const referrals = await storage.getReferralTree(userId);

      res.json({
        user,
        inviteCodes,
        referrals,
      });
    } catch (error) {
      console.error("User dashboard error:", error);
      res.status(500).json({ error: "Failed to fetch user data" });
    }
  });

  // Admin routes
  app.get("/api/admin/stats", adminAuth, async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Stats error:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.get("/api/admin/waitlist", adminAuth, async (req, res) => {
    try {
      const waitlistData = await storage.getWaitlist();
      res.json(waitlistData);
    } catch (error) {
      console.error("Waitlist fetch error:", error);
      res.status(500).json({ error: "Failed to fetch waitlist" });
    }
  });

  app.post("/api/admin/waitlist/:id/promote", adminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get waitlist entry
      const waitlistData = await storage.getWaitlist();
      const entry = waitlistData.find(w => w.id === id);
      
      if (!entry) {
        return res.status(404).json({ error: "Waitlist entry not found" });
      }

      // Generate invitation code
      const codes = await storage.generateInvitationCodes('admin', 1);
      const inviteCode = codes[0];

      // Promote from waitlist
      await storage.promoteFromWaitlist(id);

      // Send promotion email
      await emailService.sendWaitlistPromotion(entry.email, {
        firstName: entry.firstName,
        inviteCode: inviteCode.code,
        registrationUrl: `${req.protocol}://${req.get('host')}/register?code=${inviteCode.code}`,
      });

      res.json({ success: true, message: "User promoted from waitlist" });
    } catch (error) {
      console.error("Promotion error:", error);
      res.status(500).json({ error: "Failed to promote user" });
    }
  });

  app.post("/api/admin/codes/generate", adminAuth, async (req, res) => {
    try {
      const { userId, count = 5 } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const codes = await storage.generateInvitationCodes(userId, count);
      
      res.json({ 
        success: true, 
        codes: codes.map(c => c.code),
        message: `Generated ${count} codes` 
      });
    } catch (error) {
      console.error("Code generation error:", error);
      res.status(500).json({ error: "Failed to generate codes" });
    }
  });

  app.get("/api/admin/codes", adminAuth, async (req, res) => {
    try {
      const codes = await storage.getAllInvitationCodes();
      res.json(codes);
    } catch (error) {
      console.error("Codes fetch error:", error);
      res.status(500).json({ error: "Failed to fetch codes" });
    }
  });

  // Export waitlist as CSV
  app.get("/api/admin/waitlist/export", adminAuth, async (req, res) => {
    try {
      const waitlistData = await storage.getWaitlist();
      
      const csvHeader = 'First Name,Last Name,Email,Company,Company Revenue,Role,Website,Motivation,Priority Score,Created At\n';
      const csvRows = waitlistData.map(entry => 
        `"${entry.firstName}","${entry.lastName}","${entry.email}","${entry.company}","${entry.companyRevenue}","${entry.role}","${entry.companyWebsite || ''}","${entry.motivation.replace(/"/g, '""')}",${entry.priorityScore},"${entry.createdAt}"`
      ).join('\n');
      
      const csv = csvHeader + csvRows;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="summit25-waitlist.csv"');
      res.send(csv);
    } catch (error) {
      console.error("CSV export error:", error);
      res.status(500).json({ error: "Failed to export waitlist" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

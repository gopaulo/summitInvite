import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import serverless from "serverless-http";

// Import all the route handlers and middleware from the original routes file
import type { Request, Response, NextFunction } from "express";
import { storage } from "../server/storage";
import { emailService } from "../server/services/emailService";
import { CodeGenerator } from "../server/services/codeGenerator";
import {
  registrationSchema,
  waitlistSubmissionSchema,
  type RegistrationData,
  type WaitlistData,
  type InsertUser,
} from "../shared/schema";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { verifyRecaptcha } from "../server/utils/recaptcha";

const app = express();

// Trust proxy for Vercel
app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configure session with PostgreSQL store for serverless
const PgSession = connectPgSimple(session);

// Ensure SESSION_SECRET is set in production
if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required');
}

app.use(session({
  store: new PgSession({
    conString: process.env.DATABASE_URL,
    tableName: 'session',
    createTableIfMissing: true // Auto-create session table
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    httpOnly: true, 
    sameSite: 'lax', 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    // Only log method, path, status, and duration - no response body to prevent PII leaks
    const logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
    console.log(logLine);
  });

  next();
});

// Admin authentication middleware
const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session?.isAdmin) {
    return res.status(401).json({ error: "Unauthorized access" });
  }
  next();
};

// Rate limiting middleware
const codeValidationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many code validation attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const waitlistLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: "Too many waitlist submissions. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const emailInvitationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: "Too many invitation emails sent. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Register all routes (removing /api prefix since Vercel handles it)
// Routes will be available as /api/* but processed as /* in the function

// Admin login endpoint
app.post("/admin/login", async (req, res) => {
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

// All the other routes with /api prefix removed
app.post("/validate-code", codeValidationLimiter, async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: "Invitation code is required" });
    }

    const isValid = await storage.validateInvitationCode(code);
    
    if (isValid) {
      if (req.session) {
        (req.session as any).validatedCode = code;
      }
      res.json({ valid: true, message: "Code validated successfully" });
    } else {
      res.status(400).json({ error: "Invalid or expired invitation code" });
    }
  } catch (error) {
    console.error("Code validation error:", error);
    res.status(500).json({ error: "Validation failed" });
  }
});

// Registration endpoint
app.post("/register", async (req, res) => {
  try {
    const validatedCode = (req.session as any)?.validatedCode;
    
    if (!validatedCode) {
      return res.status(400).json({ error: "No validated code in session. Please validate your invitation code first." });
    }

    const validationResult = registrationSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Invalid registration data",
        details: validationResult.error.format()
      });
    }

    const registrationData: RegistrationData = validationResult.data;

    const isCodeStillValid = await storage.validateInvitationCode(validatedCode);
    if (!isCodeStillValid) {
      if (req.session) {
        (req.session as any).validatedCode = undefined;
      }
      return res.status(400).json({ error: "Invitation code has expired or been used" });
    }

    const existingUser = await storage.getUserByEmail(registrationData.email);
    if (existingUser) {
      return res.status(400).json({ error: "An account with this email already exists" });
    }

    const referrerUser = await storage.getUserByInvitationCode(validatedCode);
    const newUserData: InsertUser = {
      firstName: registrationData.firstName,
      lastName: registrationData.lastName,
      email: registrationData.email,
      company: registrationData.company,
      companyRevenue: registrationData.companyRevenue,
      role: registrationData.role,
      companyWebsite: registrationData.companyWebsite,
      invitedBy: referrerUser?.id || null
    };

    const newUser = await storage.createUser(newUserData);

    await storage.useInvitationCode(validatedCode, newUser.id);

    const newCodes = await CodeGenerator.generateMultipleCodes(5, newUser.id);
    // generateMultipleCodes now returns the actual persisted codes
    req.session.userId = newUser.id;
    if (req.session) {
      (req.session as any).validatedCode = undefined;
    }

    res.status(201).json({
      message: "Registration successful",
      user: {
        id: newUser.id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email
      },
      invitationCodes: newCodes
    });

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Session check endpoint
app.get("/session", async (req, res) => {
  try {
    const userId = req.session.userId;
    const isAdmin = req.session.isAdmin;
    
    if (userId) {
      const user = await storage.getUserById(userId);
      if (user) {
        const codes = await storage.getUserInvitationCodes(userId);
        const usedCodes = await storage.getUsedCodes(userId);
        
        return res.json({
          authenticated: true,
          isAdmin: false,
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
          },
          invitationCodes: codes.map(c => c.code),
          usedCodes: usedCodes.length
        });
      }
    }
    
    if (isAdmin) {
      return res.json({
        authenticated: true,
        isAdmin: true
      });
    }
    
    res.json({ 
      authenticated: false,
      isAdmin: false
    });
  } catch (error) {
    console.error("Session check error:", error);
    res.status(500).json({ error: "Failed to check session" });
  }
});

// Logout endpoint
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ error: "Logout failed" });
    }
    res.json({ message: "Logged out successfully" });
  });
});

// Waitlist submission
app.post("/waitlist", waitlistLimiter, async (req, res) => {
  try {
    const recaptchaToken = req.body.recaptchaToken;
    if (!recaptchaToken) {
      return res.status(400).json({ error: "reCAPTCHA token is required" });
    }
    
    const recaptchaValid = await verifyRecaptcha(recaptchaToken, "waitlist");
    if (!recaptchaValid) {
      return res.status(400).json({ error: "reCAPTCHA verification failed" });
    }

    const validationResult = waitlistSubmissionSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid waitlist data",
        details: validationResult.error.format()
      });
    }

    const waitlistData: WaitlistData = validationResult.data;

    const existingEntry = await storage.findWaitlistByEmail(waitlistData.email);
    if (existingEntry) {
      return res.status(400).json({ error: "You're already on the waitlist" });
    }

    const existingUser = await storage.getUserByEmail(waitlistData.email);
    if (existingUser) {
      return res.status(400).json({ error: "An account with this email already exists" });
    }

    let priorityScore = 5;
    if (waitlistData.companyRevenue) {
      const revenue = waitlistData.companyRevenue.toLowerCase();
      if (revenue.includes('$10m+') || revenue.includes('10m+')) {
        priorityScore = 10;
      } else if (revenue.includes('$5m-$10m') || revenue.includes('5m-10m')) {
        priorityScore = 9;
      } else if (revenue.includes('$1m-$5m') || revenue.includes('1m-5m')) {
        priorityScore = 8;
      }
    }

    await storage.addToWaitlist(waitlistData);

    res.status(201).json({
      message: "Successfully added to waitlist",
      priorityScore
    });

  } catch (error) {
    console.error("Waitlist error:", error);
    res.status(500).json({ error: "Failed to add to waitlist" });
  }
});

// Admin endpoints (all require adminAuth)
app.get("/admin/dashboard", adminAuth, async (req, res) => {
  try {
    const users = await storage.getAllUsers();
    const waitlist = await storage.getWaitlist();
    const codes = await storage.getAllInvitationCodes();
    
    const totalUsers = users.length;
    const totalWaitlist = waitlist.length;
    const totalCodes = codes.length;
    const usedCodes = codes.filter(c => c.isUsed).length;
    const availableCodes = totalCodes - usedCodes;
    
    res.json({
      stats: {
        totalUsers,
        totalWaitlist,
        totalCodes,
        usedCodes,
        availableCodes
      },
      users: users.slice(0, 10),
      waitlist: waitlist.slice(0, 10)
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

app.get("/admin/users", adminAuth, async (req, res) => {
  try {
    const users = await storage.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error("Users fetch error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.get("/admin/waitlist", adminAuth, async (req, res) => {
  try {
    const waitlist = await storage.getWaitlist();
    res.json(waitlist);
  } catch (error) {
    console.error("Waitlist fetch error:", error);
    res.status(500).json({ error: "Failed to fetch waitlist" });
  }
});

app.get("/admin/codes", adminAuth, async (req, res) => {
  try {
    const codes = await storage.getAllInvitationCodes();
    res.json(codes);
  } catch (error) {
    console.error("Codes fetch error:", error);
    res.status(500).json({ error: "Failed to fetch codes" });
  }
});

app.get("/admin/waitlist/export", adminAuth, async (req, res) => {
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

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  
  console.error(`Error ${status}: ${message}`, err);
  res.status(status).json({ message });
});

// Export serverless handler
export default serverless(app, { basePath: '/api' });
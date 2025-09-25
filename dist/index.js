var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";
import session from "express-session";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  emailLogs: () => emailLogs,
  insertEmailLogSchema: () => insertEmailLogSchema,
  insertInvitationCodeSchema: () => insertInvitationCodeSchema,
  insertUserSchema: () => insertUserSchema,
  insertWaitlistSchema: () => insertWaitlistSchema,
  invitationCodes: () => invitationCodes,
  invitationCodesRelations: () => invitationCodesRelations,
  registrationSchema: () => registrationSchema,
  sessions: () => sessions,
  users: () => users,
  usersRelations: () => usersRelations,
  waitlist: () => waitlist,
  waitlistSubmissionSchema: () => waitlistSubmissionSchema
});
import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  jsonb,
  index
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull()
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  company: varchar("company"),
  companyRevenue: varchar("company_revenue"),
  role: varchar("role"),
  companyWebsite: varchar("company_website"),
  status: varchar("status").notNull().default("registered"),
  // registered, waitlisted
  invitedBy: varchar("invited_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var invitationCodes = pgTable("invitation_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code").unique().notNull(),
  assignedToUserId: varchar("assigned_to_user_id").references(() => users.id),
  usedByUserId: varchar("used_by_user_id").references(() => users.id),
  isUsed: boolean("is_used").default(false).notNull(),
  expiresAt: timestamp("expires_at"),
  reservedForEmail: varchar("reserved_for_email"),
  reservedAt: timestamp("reserved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  usedAt: timestamp("used_at")
});
var waitlist = pgTable("waitlist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  company: varchar("company").notNull(),
  companyRevenue: varchar("company_revenue").notNull(),
  role: varchar("role").notNull(),
  companyWebsite: varchar("company_website"),
  motivation: text("motivation").notNull(),
  priorityScore: integer("priority_score").default(0).notNull(),
  status: varchar("status").default("pending").notNull(),
  // pending, promoted, rejected
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  promotedAt: timestamp("promoted_at")
});
var emailLogs = pgTable("email_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  toEmail: varchar("to_email").notNull(),
  fromEmail: varchar("from_email").notNull(),
  subject: varchar("subject").notNull(),
  templateType: varchar("template_type").notNull(),
  status: varchar("status").notNull(),
  // sent, failed, pending
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").defaultNow().notNull()
});
var usersRelations = relations(users, ({ one, many }) => ({
  inviter: one(users, {
    fields: [users.invitedBy],
    references: [users.id],
    relationName: "inviter"
  }),
  invitees: many(users, {
    relationName: "inviter"
  }),
  assignedCodes: many(invitationCodes, {
    relationName: "assignedCodes"
  }),
  usedCodes: many(invitationCodes, {
    relationName: "usedCodes"
  })
}));
var invitationCodesRelations = relations(invitationCodes, ({ one }) => ({
  assignedToUser: one(users, {
    fields: [invitationCodes.assignedToUserId],
    references: [users.id],
    relationName: "assignedCodes"
  }),
  usedByUser: one(users, {
    fields: [invitationCodes.usedByUserId],
    references: [users.id],
    relationName: "usedCodes"
  })
}));
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertInvitationCodeSchema = createInsertSchema(invitationCodes).omit({
  id: true,
  createdAt: true,
  usedAt: true
});
var insertWaitlistSchema = createInsertSchema(waitlist).omit({
  id: true,
  priorityScore: true,
  status: true,
  createdAt: true,
  promotedAt: true
});
var insertEmailLogSchema = createInsertSchema(emailLogs).omit({
  id: true,
  sentAt: true
});
var registrationSchema = z.object({
  inviteCode: z.string().min(6, "Invalid invitation code"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  company: z.string().min(1, "Company name is required"),
  companyRevenue: z.enum(["$100k-$500k", "$500k-$1mi", "$1mi-$3mi", "$3mi-$5mi", "$5mi+"], {
    required_error: "Company revenue is required"
  }),
  role: z.string().min(1, "Role is required"),
  companyWebsite: z.string().url("Invalid website URL").optional().or(z.literal(""))
});
var waitlistSubmissionSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  company: z.string().min(1, "Company name is required"),
  companyRevenue: z.enum(["$100k-$500k", "$500k-$1mi", "$1mi-$3mi", "$3mi-$5mi", "$5mi+"], {
    required_error: "Company revenue is required"
  }),
  role: z.string().min(1, "Role is required"),
  companyWebsite: z.string().url("Invalid website URL").optional().or(z.literal("")),
  motivation: z.string().min(10, "Please provide more details about your motivation")
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, desc, sql as sql2, and, count, isNull, gt } from "drizzle-orm";
var DatabaseStorage = class {
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  async createUser(userData) {
    const result = await db.insert(users).values({
      ...userData,
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    if (!result || result.length === 0) {
      throw new Error("Failed to create user");
    }
    return result[0];
  }
  async generateInvitationCodes(assignedToUserId, codeCount) {
    const codes = [];
    for (let i = 0; i < codeCount; i++) {
      const code = this.generateUniqueCode();
      codes.push({
        code,
        assignedToUserId,
        isUsed: false,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1e3)
        // 90 days from now
      });
    }
    const createdCodes = await db.insert(invitationCodes).values(codes).returning();
    return createdCodes;
  }
  generateUniqueCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "SUMMIT";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
  async validateInvitationCode(code) {
    const now = /* @__PURE__ */ new Date();
    const [inviteCode] = await db.select().from(invitationCodes).where(
      and(
        eq(invitationCodes.code, code.toUpperCase()),
        eq(invitationCodes.isUsed, false),
        gt(invitationCodes.expiresAt, now)
      )
    );
    return inviteCode;
  }
  async useInvitationCode(code, usedByUserId) {
    const result = await db.update(invitationCodes).set({
      isUsed: true,
      usedByUserId,
      usedAt: /* @__PURE__ */ new Date()
    }).where(
      and(
        eq(invitationCodes.code, code.toUpperCase()),
        eq(invitationCodes.isUsed, false)
      )
    ).returning();
    return result.length > 0;
  }
  async getInvitationCodesByUser(userId) {
    return await db.select().from(invitationCodes).where(eq(invitationCodes.assignedToUserId, userId)).orderBy(desc(invitationCodes.createdAt));
  }
  async getAllInvitationCodes() {
    return await db.select().from(invitationCodes).orderBy(desc(invitationCodes.createdAt));
  }
  async getAvailableCodeForUser(userId) {
    const now = /* @__PURE__ */ new Date();
    const [availableCode] = await db.select().from(invitationCodes).where(
      and(
        eq(invitationCodes.assignedToUserId, userId),
        eq(invitationCodes.isUsed, false),
        isNull(invitationCodes.reservedForEmail),
        gt(invitationCodes.expiresAt, now)
      )
    ).limit(1);
    return availableCode || null;
  }
  async reserveInvitationCode(userId, email) {
    const now = /* @__PURE__ */ new Date();
    const [existingReservation] = await db.select().from(invitationCodes).where(
      and(
        eq(invitationCodes.assignedToUserId, userId),
        eq(invitationCodes.reservedForEmail, email),
        eq(invitationCodes.isUsed, false),
        gt(invitationCodes.expiresAt, now)
      )
    ).limit(1);
    if (existingReservation) {
      return existingReservation;
    }
    const result = await db.execute(sql2`
      WITH cte AS (
        SELECT id FROM invitation_codes 
        WHERE assigned_to_user_id = ${userId} 
          AND is_used = false 
          AND reserved_for_email IS NULL 
          AND expires_at > ${now}
        ORDER BY created_at ASC 
        FOR UPDATE SKIP LOCKED 
        LIMIT 1
      ) 
      UPDATE invitation_codes i 
      SET reserved_for_email = ${email}, reserved_at = NOW() 
      FROM cte 
      WHERE i.id = cte.id AND i.reserved_for_email IS NULL 
      RETURNING i.*
    `);
    return result.rows?.[0] || null;
  }
  async addToWaitlist(waitlistData) {
    const priorityScore = this.calculatePriorityScore(waitlistData.companyRevenue, waitlistData.role);
    const [waitlistEntry] = await db.insert(waitlist).values({
      ...waitlistData,
      priorityScore
    }).returning();
    return waitlistEntry;
  }
  calculatePriorityScore(companyRevenue, role) {
    let score = 0;
    switch (companyRevenue) {
      case "$5mi+":
        score += 50;
        break;
      case "$3mi-$5mi":
        score += 40;
        break;
      case "$1mi-$3mi":
        score += 30;
        break;
      case "$500k-$1mi":
        score += 20;
        break;
      case "$100k-$500k":
        score += 10;
        break;
    }
    const roleUpper = role.toUpperCase();
    if (roleUpper.includes("CEO") || roleUpper.includes("FOUNDER")) {
      score += 40;
    } else if (roleUpper.includes("CTO") || roleUpper.includes("VP") || roleUpper.includes("PRESIDENT")) {
      score += 30;
    } else if (roleUpper.includes("DIRECTOR") || roleUpper.includes("HEAD")) {
      score += 20;
    } else if (roleUpper.includes("MANAGER") || roleUpper.includes("LEAD")) {
      score += 10;
    }
    return score;
  }
  async getWaitlist() {
    return await db.select().from(waitlist).where(eq(waitlist.status, "pending")).orderBy(desc(waitlist.priorityScore), desc(waitlist.createdAt));
  }
  async promoteFromWaitlist(id) {
    const result = await db.update(waitlist).set({
      status: "promoted",
      promotedAt: /* @__PURE__ */ new Date()
    }).where(eq(waitlist.id, id)).returning();
    return result.length > 0;
  }
  async updateWaitlistPriority(id, priorityScore, adminNotes) {
    const result = await db.update(waitlist).set({
      priorityScore,
      adminNotes
    }).where(eq(waitlist.id, id)).returning();
    return result.length > 0;
  }
  async logEmail(emailLog) {
    const [log2] = await db.insert(emailLogs).values(emailLog).returning();
    return log2;
  }
  async getStats() {
    const [registeredCount] = await db.select({ count: count() }).from(users).where(eq(users.status, "registered"));
    const [activeCodesCount] = await db.select({ count: count() }).from(invitationCodes).where(eq(invitationCodes.isUsed, false));
    const [waitlistCountResult] = await db.select({ count: count() }).from(waitlist).where(eq(waitlist.status, "pending"));
    const [referralsCount] = await db.select({ count: count() }).from(users).where(sql2`invited_by IS NOT NULL`);
    return {
      totalRegistered: registeredCount.count,
      activeCodes: activeCodesCount.count,
      waitlistCount: waitlistCountResult.count,
      totalReferrals: referralsCount.count
    };
  }
  async getReferralTree(userId) {
    return await db.select().from(users).where(eq(users.invitedBy, userId)).orderBy(desc(users.createdAt));
  }
  // Additional methods required by API
  async getUserById(id) {
    return this.getUser(id);
  }
  async getUserByInvitationCode(code) {
    const inviteCode = await this.validateInvitationCode(code);
    if (!inviteCode?.assignedToUserId) {
      return void 0;
    }
    return this.getUser(inviteCode.assignedToUserId);
  }
  async getAllUsers() {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }
  async createInvitationCodes(codes) {
    const insertCodes = codes.map(({ code, userId }) => ({
      code,
      assignedToUserId: userId,
      isUsed: false,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1e3)
      // 90 days from now
    }));
    const createdCodes = await db.insert(invitationCodes).values(insertCodes).returning();
    return createdCodes;
  }
  async markInvitationCodeAsUsed(code) {
    await db.update(invitationCodes).set({
      isUsed: true,
      usedAt: /* @__PURE__ */ new Date()
    }).where(eq(invitationCodes.code, code.toUpperCase()));
  }
  async getUserInvitationCodes(userId) {
    return this.getInvitationCodesByUser(userId);
  }
  async getUsedCodes(userId) {
    return await db.select().from(invitationCodes).where(
      and(
        eq(invitationCodes.assignedToUserId, userId),
        eq(invitationCodes.isUsed, true)
      )
    ).orderBy(desc(invitationCodes.usedAt));
  }
  async findWaitlistByEmail(email) {
    const [entry] = await db.select().from(waitlist).where(eq(waitlist.email, email));
    return entry;
  }
};
var storage = new DatabaseStorage();

// server/services/emailService.ts
var EmailService = class {
  apiKey;
  senderEmail;
  senderName;
  constructor() {
    this.apiKey = process.env.BREVO_API_KEY || "";
    this.senderEmail = "info@thesummit25.com";
    this.senderName = "The Summit 25";
    if (!this.apiKey) {
      console.warn("Brevo API key not found. Email functionality will be disabled.");
    }
  }
  async sendEmail(params) {
    if (!this.apiKey) {
      console.warn("Email not sent - API key not configured");
      await this.logEmail(params, "failed", "API key not configured");
      return false;
    }
    try {
      const htmlContent = this.getEmailTemplate(params.templateType, params.variables);
      const textContent = this.stripHtml(htmlContent);
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": this.apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sender: {
            email: this.senderEmail,
            name: this.senderName
          },
          to: [
            {
              email: params.to
            }
          ],
          subject: params.subject,
          htmlContent,
          textContent
        })
      });
      if (response.ok) {
        const result = await response.json();
        await this.logEmail(params, "sent", `Brevo sent: ${result.messageId}`);
        return true;
      } else {
        const errorText = await response.text();
        await this.logEmail(params, "failed", `Brevo error: ${errorText}`);
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await this.logEmail(params, "failed", errorMessage);
      return false;
    }
  }
  async logEmail(params, status, errorMessage) {
    const emailLog = {
      toEmail: params.to,
      fromEmail: this.senderEmail,
      subject: params.subject,
      templateType: params.templateType,
      status,
      errorMessage
    };
    await storage.logEmail(emailLog);
  }
  getEmailTemplate(templateType, variables) {
    const baseStyle = `
      <style>
        body { 
          font-family: 'Inter', Arial, sans-serif; 
          line-height: 1.6; 
          color: #2C3E50; 
          background-color: #F8FAFB;
          margin: 0;
          padding: 0;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background: white; 
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(44, 62, 80, 0.1);
        }
        .header { 
          background: linear-gradient(135deg, #2C3E50 0%, #34495E 100%); 
          color: white; 
          padding: 40px 30px;
          text-align: center;
        }
        .logo {
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .content { 
          padding: 40px 30px; 
        }
        .btn { 
          display: inline-block; 
          background: linear-gradient(135deg, #5DADE2 0%, #3498DB 100%); 
          color: white !important; 
          padding: 15px 30px; 
          text-decoration: none; 
          border-radius: 8px; 
          font-weight: 600;
          margin: 20px 0;
        }
        .footer { 
          background: #F8F9FA; 
          padding: 30px; 
          text-align: center; 
          color: #7F8C8D;
          font-size: 14px;
        }
        .code {
          font-family: 'Courier New', monospace;
          font-size: 24px;
          font-weight: bold;
          background: #ECF0F1;
          padding: 15px;
          border-radius: 8px;
          letter-spacing: 2px;
          text-align: center;
          margin: 20px 0;
          color: #2C3E50;
        }
      </style>
    `;
    let template = "";
    switch (templateType) {
      case "invitation":
        template = `
          ${baseStyle}
          <div class="container">
            <div class="header">
              <div class="logo">THE SUMMIT 25</div>
              <p>You've Been Invited</p>
            </div>
            <div class="content">
              <h2>Congratulations, ${variables.firstName || "there"}!</h2>
              <p>You have received an exclusive invitation to <strong>The Summit 25</strong>, a premier gathering of industry leaders, innovators, and visionaries.</p>
              
              <p>Your invitation code:</p>
              <div class="code">${variables.inviteCode}</div>
              
              <p>Use this code to complete your registration at our exclusive event portal.</p>
              
              <a href="${variables.registrationUrl}" class="btn">Complete Registration</a>
              
              <p><strong>Event Details:</strong><br>
              \u{1F4C5} March 15-16, 2025<br>
              \u{1F4CD} San Francisco<br>
              \u{1F465} Invitation Only - 500 Leaders</p>
              
              <p>We look forward to seeing you at this exclusive event!</p>
            </div>
            <div class="footer">
              <p>This invitation was sent by ${variables.inviterName || "The Summit 25 Team"}</p>
              <p>\xA9 2025 The Summit 25. All rights reserved.</p>
            </div>
          </div>
        `;
        break;
      case "waitlist_confirmation":
        template = `
          ${baseStyle}
          <div class="container">
            <div class="header">
              <div class="logo">THE SUMMIT 25</div>
              <p>Application Received</p>
            </div>
            <div class="content">
              <h2>Thank you, ${variables.firstName || "there"}!</h2>
              <p>Your application for <strong>The Summit 25</strong> has been successfully received and is under review.</p>
              
              <p>Our team will carefully evaluate your application based on:</p>
              <ul>
                <li>Industry leadership and influence</li>
                <li>Company impact and innovation</li>
                <li>Professional network and expertise</li>
                <li>Alignment with Summit values</li>
              </ul>
              
              <p>If selected, you will receive an exclusive invitation code within the next 2-3 business days.</p>
              
              <p><strong>What's Next:</strong><br>
              \u2022 Review process: 2-3 business days<br>
              \u2022 Notification via email if selected<br>
              \u2022 Limited spaces available</p>
            </div>
            <div class="footer">
              <p>\xA9 2025 The Summit 25. All rights reserved.</p>
            </div>
          </div>
        `;
        break;
      case "waitlist_promotion":
        template = `
          ${baseStyle}
          <div class="container">
            <div class="header">
              <div class="logo">THE SUMMIT 25</div>
              <p>You've Been Selected!</p>
            </div>
            <div class="content">
              <h2>Congratulations, ${variables.firstName || "there"}!</h2>
              <p>We're thrilled to inform you that you have been <strong>selected</strong> from our waitlist for <strong>The Summit 25</strong>!</p>
              
              <p>Your exclusive invitation code:</p>
              <div class="code">${variables.inviteCode}</div>
              
              <p>This code grants you access to register for our exclusive event. Please complete your registration within the next 7 days to secure your spot.</p>
              
              <a href="${variables.registrationUrl}" class="btn">Complete Registration Now</a>
              
              <p><strong>Event Details:</strong><br>
              \u{1F4C5} March 15-16, 2025<br>
              \u{1F4CD} San Francisco<br>
              \u{1F465} Invitation Only - 500 Leaders</p>
              
              <p>Welcome to an exclusive community of industry leaders and innovators!</p>
            </div>
            <div class="footer">
              <p>\xA9 2025 The Summit 25. All rights reserved.</p>
            </div>
          </div>
        `;
        break;
      case "registration_confirmation":
        template = `
          ${baseStyle}
          <div class="container">
            <div class="header">
              <div class="logo">THE SUMMIT 25</div>
              <p>Registration Confirmed</p>
            </div>
            <div class="content">
              <h2>Welcome to The Summit 25, ${variables.firstName || "there"}!</h2>
              <p>Your registration has been <strong>confirmed</strong>. You are now part of an exclusive community of 500 industry leaders.</p>
              
              <p><strong>Your Registration Details:</strong><br>
              \u{1F464} ${variables.firstName} ${variables.lastName}<br>
              \u{1F3E2} ${variables.company}<br>
              \u{1F4E7} ${variables.email}</p>
              
              <p><strong>Next Steps:</strong></p>
              <ul>
                <li>You'll receive your invitation codes to invite colleagues</li>
                <li>Access your personal dashboard to manage invitations</li>
                <li>Event details and agenda will be shared soon</li>
              </ul>
              
              <a href="${variables.dashboardUrl}" class="btn">Access Your Dashboard</a>
              
              <p><strong>Event Details:</strong><br>
              \u{1F4C5} March 15-16, 2025<br>
              \u{1F4CD} San Francisco<br>
              \u{1F465} Invitation Only - 500 Leaders</p>
            </div>
            <div class="footer">
              <p>\xA9 2025 The Summit 25. All rights reserved.</p>
            </div>
          </div>
        `;
        break;
      case "referral_codes":
        template = `
          ${baseStyle}
          <div class="container">
            <div class="header">
              <div class="logo">THE SUMMIT 25</div>
              <p>Your Invitation Codes</p>
            </div>
            <div class="content">
              <h2>Share the Exclusivity, ${variables.firstName || "there"}!</h2>
              <p>As a confirmed attendee of <strong>The Summit 25</strong>, you have the privilege to invite colleagues and peers.</p>
              
              <p>Your personal invitation codes:</p>
              ${variables.codes ? variables.codes.split(",").map((code) => `<div class="code">${code.trim()}</div>`).join("") : ""}
              
              <p><strong>How to Use:</strong></p>
              <ul>
                <li>Share these codes with industry leaders you'd like to invite</li>
                <li>Each code can only be used once</li>
                <li>Codes expire in 90 days</li>
                <li>Track your referrals in your dashboard</li>
              </ul>
              
              <a href="${variables.dashboardUrl}" class="btn">Manage Invitations</a>
              
              <p>Help us build an incredible community of innovators and leaders!</p>
            </div>
            <div class="footer">
              <p>\xA9 2025 The Summit 25. All rights reserved.</p>
            </div>
          </div>
        `;
        break;
      case "referral_invitation":
        template = `
          ${baseStyle}
          <div class="container">
            <div class="header">
              <div class="logo">THE SUMMIT 25</div>
              <p>Someone Has Shared Access With You</p>
            </div>
            <div class="content">
              <h2>Hello ${variables.firstName || "there"}!</h2>
              <p><strong>${variables.referrerName || "A colleague"}</strong> has shared exclusive access to <strong>The Summit 25</strong> with you.</p>
              
              <p>This is a premier gathering of industry leaders, innovators, and visionaries happening March 15-16, 2025 in San Francisco.</p>
              
              <p>Your exclusive invitation code:</p>
              <div class="code">${variables.inviteCode}</div>
              
              <p><strong>Personal Message from ${variables.referrerName || "your colleague"}:</strong></p>
              <blockquote style="border-left: 4px solid #5DADE2; padding-left: 16px; margin: 20px 0; font-style: italic; color: #555;">
                "${variables.personalMessage || "I thought you would be a great addition to this exclusive event. Looking forward to connecting there!"}"
              </blockquote>
              
              <a href="${variables.registrationUrl}" class="btn">Accept Invitation & Register</a>
              
              <p><strong>Event Highlights:</strong></p>
              <ul>
                <li>\u{1F3AF} Exclusive networking with 500 industry leaders</li>
                <li>\u{1F680} Cutting-edge insights from top innovators</li>
                <li>\u{1F91D} Strategic partnerships and collaboration opportunities</li>
                <li>\u{1F3C6} Recognition and thought leadership platform</li>
              </ul>
              
              <p><strong>Event Details:</strong><br>
              \u{1F4C5} March 15-16, 2025<br>
              \u{1F4CD} San Francisco<br>
              \u{1F465} Invitation Only - 500 Leaders</p>
              
              <p><em>This invitation expires in 90 days. Secure your spot today!</em></p>
            </div>
            <div class="footer">
              <p>This invitation was shared by ${variables.referrerName || "a colleague"} (${variables.referrerEmail || ""})</p>
              <p>\xA9 2025 The Summit 25. All rights reserved.</p>
            </div>
          </div>
        `;
        break;
      default:
        template = `
          ${baseStyle}
          <div class="container">
            <div class="header">
              <div class="logo">THE SUMMIT 25</div>
            </div>
            <div class="content">
              <p>Thank you for your interest in The Summit 25.</p>
            </div>
            <div class="footer">
              <p>\xA9 2025 The Summit 25. All rights reserved.</p>
            </div>
          </div>
        `;
    }
    return template;
  }
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  }
  // Template methods for different email types
  async sendInvitationEmail(to, variables) {
    return this.sendEmail({
      to,
      subject: "You're Invited to The Summit 25",
      templateType: "invitation",
      variables
    });
  }
  async sendWaitlistConfirmation(to, variables) {
    return this.sendEmail({
      to,
      subject: "Application Received - The Summit 25",
      templateType: "waitlist_confirmation",
      variables
    });
  }
  async sendWaitlistPromotion(to, variables) {
    return this.sendEmail({
      to,
      subject: "You've Been Selected for The Summit 25!",
      templateType: "waitlist_promotion",
      variables
    });
  }
  async sendRegistrationConfirmation(to, variables) {
    return this.sendEmail({
      to,
      subject: "Registration Confirmed - The Summit 25",
      templateType: "registration_confirmation",
      variables
    });
  }
  async sendReferralCodes(to, variables) {
    return this.sendEmail({
      to,
      subject: "Your Invitation Codes - The Summit 25",
      templateType: "referral_codes",
      variables
    });
  }
  async sendReferralInvitation(to, variables) {
    return this.sendEmail({
      to,
      subject: `${variables.referrerName || "Someone"} has shared exclusive access to The Summit 25 with you`,
      templateType: "referral_invitation",
      variables
    });
  }
};
var emailService = new EmailService();

// server/routes.ts
import { z as z2 } from "zod";
import rateLimit from "express-rate-limit";

// server/utils/recaptcha.ts
async function verifyRecaptcha(token, expectedAction) {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) {
    console.warn("reCAPTCHA secret key not found in environment variables");
    return { isValid: false, error: "reCAPTCHA configuration error" };
  }
  if (!token) {
    return { isValid: false, error: "reCAPTCHA token is required" };
  }
  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token
      })
    });
    const data = await response.json();
    if (!data.success) {
      console.error("reCAPTCHA verification failed:", data["error-codes"]);
      return {
        isValid: false,
        error: "reCAPTCHA verification failed"
      };
    }
    if (data.action !== expectedAction) {
      console.warn(`reCAPTCHA action mismatch. Expected: ${expectedAction}, Got: ${data.action}`);
    }
    const score = data.score || 0;
    const minScore = 0.5;
    if (score < minScore) {
      console.warn(`reCAPTCHA score too low: ${score} (minimum: ${minScore})`);
      return {
        isValid: false,
        score,
        error: "reCAPTCHA score too low"
      };
    }
    return {
      isValid: true,
      score
    };
  } catch (error) {
    console.error("reCAPTCHA verification error:", error);
    return {
      isValid: false,
      error: "reCAPTCHA verification service error"
    };
  }
}

// server/routes.ts
var adminAuth = (req, res, next) => {
  if (!req.session?.isAdmin) {
    return res.status(401).json({ error: "Unauthorized access" });
  }
  next();
};
var codeValidationLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 5,
  // 5 attempts per 15 minutes
  message: { error: "Too many code validation attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false
});
var waitlistLimiter = rateLimit({
  windowMs: 60 * 60 * 1e3,
  // 1 hour
  max: 3,
  // 3 submissions per hour per IP
  message: { error: "Too many waitlist submissions. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false
});
var emailInvitationLimiter = rateLimit({
  windowMs: 60 * 60 * 1e3,
  // 1 hour
  max: 10,
  // 10 email invitations per hour per IP
  message: { error: "Too many invitation emails sent. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false
});
async function registerRoutes(app2) {
  app2.post("/api/admin/login", async (req, res) => {
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
  app2.post("/api/admin/logout", async (req, res) => {
    req.session.isAdmin = false;
    res.json({ success: true, message: "Logged out" });
  });
  app2.get("/api/admin/me", async (req, res) => {
    if (req.session?.isAdmin) {
      res.json({ isAdmin: true });
    } else {
      res.status(401).json({ error: "Not authenticated as admin" });
    }
  });
  app2.post("/api/send-invitation", emailInvitationLimiter, async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const { email, personalMessage } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const inviteCode = await storage.reserveInvitationCode(user.id, email);
      if (!inviteCode) {
        return res.status(400).json({ error: "No invitation codes available" });
      }
      const inviteUrl = `${req.protocol}://${req.get("host")}/?code=${inviteCode.code}`;
      await emailService.sendReferralInvitation(email, {
        referrerName: `${user.firstName} ${user.lastName}`,
        referrerCompany: user.company || "",
        inviteCode: inviteCode.code,
        inviteUrl,
        personalMessage: personalMessage || ""
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
  app2.get("/api/me", async (req, res) => {
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
        referrals
      });
    } catch (error) {
      console.error("Current user error:", error);
      res.status(500).json({ error: "Failed to fetch user data" });
    }
  });
  app2.post("/api/validate-code", codeValidationLimiter, async (req, res) => {
    try {
      const { code } = req.body;
      if (!code || typeof code !== "string") {
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
  app2.post("/api/register", async (req, res) => {
    try {
      const { recaptchaToken, ...formData } = req.body;
      const recaptchaResult = await verifyRecaptcha(recaptchaToken, "register");
      if (!recaptchaResult.isValid) {
        return res.status(400).json({ error: recaptchaResult.error || "reCAPTCHA verification failed" });
      }
      const validatedData = registrationSchema.parse(formData);
      const inviteCode = await storage.validateInvitationCode(validatedData.inviteCode);
      if (!inviteCode) {
        return res.status(400).json({ error: "Invalid or expired invitation code" });
      }
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }
      const user = await storage.createUser({
        email: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        company: validatedData.company,
        companyRevenue: validatedData.companyRevenue,
        role: validatedData.role,
        companyWebsite: validatedData.companyWebsite,
        status: "registered",
        invitedBy: inviteCode.assignedToUserId
      });
      await storage.useInvitationCode(validatedData.inviteCode, user.id);
      const codes = await storage.generateInvitationCodes(user.id, 5);
      await emailService.sendRegistrationConfirmation(user.email, {
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        company: user.company || "",
        email: user.email,
        dashboardUrl: `${req.protocol}://${req.get("host")}/dashboard`
      });
      await emailService.sendReferralCodes(user.email, {
        firstName: user.firstName || "",
        codes: codes.map((c) => c.code).join(", "),
        dashboardUrl: `${req.protocol}://${req.get("host")}/dashboard`
      });
      req.session.userId = user.id;
      res.json({
        success: true,
        message: "Registration successful",
        userId: user.id
      });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to register user" });
    }
  });
  app2.post("/api/waitlist", waitlistLimiter, async (req, res) => {
    try {
      console.log("Waitlist submission received:", req.body);
      const { recaptchaToken, ...formData } = req.body;
      const recaptchaResult = await verifyRecaptcha(recaptchaToken, "waitlist");
      if (!recaptchaResult.isValid) {
        return res.status(400).json({ error: recaptchaResult.error || "reCAPTCHA verification failed" });
      }
      const validatedData = waitlistSubmissionSchema.parse(formData);
      console.log("Validation successful:", validatedData);
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered or in waitlist" });
      }
      const waitlistEntry = await storage.addToWaitlist(validatedData);
      await emailService.sendWaitlistConfirmation(waitlistEntry.email, {
        firstName: waitlistEntry.firstName
      });
      res.json({
        success: true,
        message: "Successfully added to waitlist",
        priorityScore: waitlistEntry.priorityScore
      });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Waitlist submission error:", error);
      res.status(500).json({ error: "Failed to add to waitlist" });
    }
  });
  app2.get("/api/user/:userId", async (req, res) => {
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
        referrals
      });
    } catch (error) {
      console.error("User dashboard error:", error);
      res.status(500).json({ error: "Failed to fetch user data" });
    }
  });
  app2.get("/api/admin/stats", adminAuth, async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Stats error:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });
  app2.get("/api/admin/waitlist", adminAuth, async (req, res) => {
    try {
      const waitlistData = await storage.getWaitlist();
      res.json(waitlistData);
    } catch (error) {
      console.error("Waitlist fetch error:", error);
      res.status(500).json({ error: "Failed to fetch waitlist" });
    }
  });
  app2.post("/api/admin/waitlist/:id/promote", adminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const waitlistData = await storage.getWaitlist();
      const entry = waitlistData.find((w) => w.id === id);
      if (!entry) {
        return res.status(404).json({ error: "Waitlist entry not found" });
      }
      const codes = await storage.generateInvitationCodes("admin", 1);
      const inviteCode = codes[0];
      await storage.promoteFromWaitlist(id);
      await emailService.sendWaitlistPromotion(entry.email, {
        firstName: entry.firstName,
        inviteCode: inviteCode.code,
        registrationUrl: `${req.protocol}://${req.get("host")}/register?code=${inviteCode.code}`
      });
      res.json({ success: true, message: "User promoted from waitlist" });
    } catch (error) {
      console.error("Promotion error:", error);
      res.status(500).json({ error: "Failed to promote user" });
    }
  });
  app2.post("/api/admin/codes/generate", adminAuth, async (req, res) => {
    try {
      const { userId, count: count2 = 5 } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      const codes = await storage.generateInvitationCodes(userId, count2);
      res.json({
        success: true,
        codes: codes.map((c) => c.code),
        message: `Generated ${count2} codes`
      });
    } catch (error) {
      console.error("Code generation error:", error);
      res.status(500).json({ error: "Failed to generate codes" });
    }
  });
  app2.get("/api/admin/codes", adminAuth, async (req, res) => {
    try {
      const codes = await storage.getAllInvitationCodes();
      res.json(codes);
    } catch (error) {
      console.error("Codes fetch error:", error);
      res.status(500).json({ error: "Failed to fetch codes" });
    }
  });
  app2.get("/api/admin/waitlist/export", adminAuth, async (req, res) => {
    try {
      const waitlistData = await storage.getWaitlist();
      const csvHeader = "First Name,Last Name,Email,Company,Company Revenue,Role,Website,Motivation,Priority Score,Created At\n";
      const csvRows = waitlistData.map(
        (entry) => `"${entry.firstName}","${entry.lastName}","${entry.email}","${entry.company}","${entry.companyRevenue}","${entry.role}","${entry.companyWebsite || ""}","${entry.motivation.replace(/"/g, '""')}",${entry.priorityScore},"${entry.createdAt}"`
      ).join("\n");
      const csv = csvHeader + csvRows;
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="summit25-waitlist.csv"');
      res.send(csv);
    } catch (error) {
      console.error("CSV export error:", error);
      res.status(500).json({ error: "Failed to export waitlist" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use(session({
  secret: process.env.SESSION_SECRET || "summit25-dev-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: app.get("env") !== "development",
    maxAge: 24 * 60 * 60 * 1e3
    // 24 hours
  }
}));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();

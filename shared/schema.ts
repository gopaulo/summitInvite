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

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  company: varchar("company"),
  companyRevenue: varchar("company_revenue"),
  role: varchar("role"),
  companyWebsite: varchar("company_website"),
  status: varchar("status").notNull().default("registered"), // registered, waitlisted
  invitedBy: varchar("invited_by").references((): any => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Invitation codes table
export const invitationCodes = pgTable("invitation_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code").unique().notNull(),
  assignedToUserId: varchar("assigned_to_user_id").references(() => users.id),
  usedByUserId: varchar("used_by_user_id").references(() => users.id),
  isUsed: boolean("is_used").default(false).notNull(),
  expiresAt: timestamp("expires_at"),
  reservedForEmail: varchar("reserved_for_email"),
  reservedAt: timestamp("reserved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  usedAt: timestamp("used_at"),
});

// Waitlist table
export const waitlist = pgTable("waitlist", {
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
  status: varchar("status").default("pending").notNull(), // pending, promoted, rejected
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  promotedAt: timestamp("promoted_at"),
});

// Email logs table
export const emailLogs = pgTable("email_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  toEmail: varchar("to_email").notNull(),
  fromEmail: varchar("from_email").notNull(),
  subject: varchar("subject").notNull(),
  templateType: varchar("template_type").notNull(),
  status: varchar("status").notNull(), // sent, failed, pending
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  inviter: one(users, {
    fields: [users.invitedBy],
    references: [users.id],
    relationName: "inviter",
  }),
  invitees: many(users, {
    relationName: "inviter",
  }),
  assignedCodes: many(invitationCodes, {
    relationName: "assignedCodes",
  }),
  usedCodes: many(invitationCodes, {
    relationName: "usedCodes",
  }),
}));

export const invitationCodesRelations = relations(invitationCodes, ({ one }) => ({
  assignedToUser: one(users, {
    fields: [invitationCodes.assignedToUserId],
    references: [users.id],
    relationName: "assignedCodes",
  }),
  usedByUser: one(users, {
    fields: [invitationCodes.usedByUserId],
    references: [users.id],
    relationName: "usedCodes",
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvitationCodeSchema = createInsertSchema(invitationCodes).omit({
  id: true,
  createdAt: true,
  usedAt: true,
});

export const insertWaitlistSchema = createInsertSchema(waitlist).omit({
  id: true,
  priorityScore: true,
  status: true,
  createdAt: true,
  promotedAt: true,
});

export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({
  id: true,
  sentAt: true,
});

// Registration form schema
export const registrationSchema = z.object({
  inviteCode: z.string().min(6, "Invalid invitation code"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  company: z.string().min(1, "Company name is required"),
  companyRevenue: z.enum(["$100k-$500k", "$500k-$1mi", "$1mi-$3mi", "$3mi-$5mi", "$5mi+"], {
    required_error: "Company revenue is required",
  }),
  role: z.string().min(1, "Role is required"),
  companyWebsite: z.string().url("Invalid website URL").optional().or(z.literal("")),
});

export const waitlistSubmissionSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  company: z.string().min(1, "Company name is required"),
  companyRevenue: z.enum(["$100k-$500k", "$500k-$1mi", "$1mi-$3mi", "$3mi-$5mi", "$5mi+"], {
    required_error: "Company revenue is required",
  }),
  role: z.string().min(1, "Role is required"),
  companyWebsite: z.string().url("Invalid website URL").optional().or(z.literal("")),
  motivation: z.string().min(10, "Please provide more details about your motivation"),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InvitationCode = typeof invitationCodes.$inferSelect;
export type InsertInvitationCode = z.infer<typeof insertInvitationCodeSchema>;
export type Waitlist = typeof waitlist.$inferSelect;
export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;
export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type RegistrationData = z.infer<typeof registrationSchema>;
export type WaitlistData = z.infer<typeof waitlistSubmissionSchema>;

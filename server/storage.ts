import {
  users,
  invitationCodes,
  waitlist,
  emailLogs,
  type User,
  type InsertUser,
  type InvitationCode,
  type InsertInvitationCode,
  type Waitlist,
  type InsertWaitlist,
  type EmailLog,
  type InsertEmailLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, count, isNull, gt } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Invitation code operations
  generateInvitationCodes(assignedToUserId: string, codeCount: number): Promise<InvitationCode[]>;
  validateInvitationCode(code: string): Promise<InvitationCode | undefined>;
  useInvitationCode(code: string, usedByUserId: string): Promise<boolean>;
  getInvitationCodesByUser(userId: string): Promise<InvitationCode[]>;
  getAllInvitationCodes(): Promise<InvitationCode[]>;
  reserveInvitationCode(userId: string, email: string): Promise<InvitationCode | null>;
  getAvailableCodeForUser(userId: string): Promise<InvitationCode | null>;
  
  // Waitlist operations
  addToWaitlist(waitlistData: InsertWaitlist): Promise<Waitlist>;
  getWaitlist(): Promise<Waitlist[]>;
  promoteFromWaitlist(id: string): Promise<boolean>;
  updateWaitlistPriority(id: string, priorityScore: number, adminNotes?: string): Promise<boolean>;
  
  // Email log operations
  logEmail(emailLog: InsertEmailLog): Promise<EmailLog>;
  
  // Analytics
  getStats(): Promise<{
    totalRegistered: number;
    activeCodes: number;
    waitlistCount: number;
    totalReferrals: number;
  }>;
  
  getReferralTree(userId: string): Promise<User[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const result = await db
      .insert(users)
      .values({
        ...userData,
        updatedAt: new Date(),
      })
      .returning();
    return result[0];
  }

  async generateInvitationCodes(assignedToUserId: string, codeCount: number): Promise<InvitationCode[]> {
    const codes: InsertInvitationCode[] = [];
    
    for (let i = 0; i < codeCount; i++) {
      const code = this.generateUniqueCode();
      codes.push({
        code,
        assignedToUserId,
        isUsed: false,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      });
    }

    const createdCodes = await db
      .insert(invitationCodes)
      .values(codes)
      .returning();
    
    return createdCodes;
  }

  private generateUniqueCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'SUMMIT';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async validateInvitationCode(code: string): Promise<InvitationCode | undefined> {
    const now = new Date();
    const [inviteCode] = await db
      .select()
      .from(invitationCodes)
      .where(
        and(
          eq(invitationCodes.code, code.toUpperCase()),
          eq(invitationCodes.isUsed, false),
          gt(invitationCodes.expiresAt, now)
        )
      );
    
    return inviteCode;
  }

  async useInvitationCode(code: string, usedByUserId: string): Promise<boolean> {
    const result = await db
      .update(invitationCodes)
      .set({
        isUsed: true,
        usedByUserId,
        usedAt: new Date(),
      })
      .where(
        and(
          eq(invitationCodes.code, code.toUpperCase()),
          eq(invitationCodes.isUsed, false)
        )
      )
      .returning();
    
    return result.length > 0;
  }

  async getInvitationCodesByUser(userId: string): Promise<InvitationCode[]> {
    return await db
      .select()
      .from(invitationCodes)
      .where(eq(invitationCodes.assignedToUserId, userId))
      .orderBy(desc(invitationCodes.createdAt));
  }

  async getAllInvitationCodes(): Promise<InvitationCode[]> {
    return await db
      .select()
      .from(invitationCodes)
      .orderBy(desc(invitationCodes.createdAt));
  }

  async getAvailableCodeForUser(userId: string): Promise<InvitationCode | null> {
    const now = new Date();
    const [availableCode] = await db
      .select()
      .from(invitationCodes)
      .where(
        and(
          eq(invitationCodes.assignedToUserId, userId),
          eq(invitationCodes.isUsed, false),
          isNull(invitationCodes.reservedForEmail),
          gt(invitationCodes.expiresAt, now)
        )
      )
      .limit(1);
    
    return availableCode || null;
  }

  async reserveInvitationCode(userId: string, email: string): Promise<InvitationCode | null> {
    const now = new Date();
    
    // First check if we already have a reservation for this email (idempotent)
    const [existingReservation] = await db
      .select()
      .from(invitationCodes)
      .where(
        and(
          eq(invitationCodes.assignedToUserId, userId),
          eq(invitationCodes.reservedForEmail, email),
          eq(invitationCodes.isUsed, false),
          gt(invitationCodes.expiresAt, now)
        )
      )
      .limit(1);
    
    if (existingReservation) {
      return existingReservation;
    }

    // Atomically reserve exactly one available code using CTE with double-check
    const result = await db.execute(sql`
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

  async addToWaitlist(waitlistData: InsertWaitlist): Promise<Waitlist> {
    // Calculate priority score based on company size and role
    const priorityScore = this.calculatePriorityScore(waitlistData.companySize, waitlistData.role);
    
    const [waitlistEntry] = await db
      .insert(waitlist)
      .values({
        ...waitlistData,
        priorityScore,
      })
      .returning();
    
    return waitlistEntry;
  }

  private calculatePriorityScore(companySize: string, role: string): number {
    let score = 0;
    
    // Company size scoring
    switch (companySize) {
      case '1000+':
        score += 50;
        break;
      case '201-1000':
        score += 40;
        break;
      case '51-200':
        score += 30;
        break;
      case '11-50':
        score += 20;
        break;
      case '1-10':
        score += 10;
        break;
    }
    
    // Role scoring (looking for leadership keywords)
    const roleUpper = role.toUpperCase();
    if (roleUpper.includes('CEO') || roleUpper.includes('FOUNDER')) {
      score += 40;
    } else if (roleUpper.includes('CTO') || roleUpper.includes('VP') || roleUpper.includes('PRESIDENT')) {
      score += 30;
    } else if (roleUpper.includes('DIRECTOR') || roleUpper.includes('HEAD')) {
      score += 20;
    } else if (roleUpper.includes('MANAGER') || roleUpper.includes('LEAD')) {
      score += 10;
    }
    
    return score;
  }

  async getWaitlist(): Promise<Waitlist[]> {
    return await db
      .select()
      .from(waitlist)
      .where(eq(waitlist.status, 'pending'))
      .orderBy(desc(waitlist.priorityScore), desc(waitlist.createdAt));
  }

  async promoteFromWaitlist(id: string): Promise<boolean> {
    const result = await db
      .update(waitlist)
      .set({
        status: 'promoted',
        promotedAt: new Date(),
      })
      .where(eq(waitlist.id, id))
      .returning();
    
    return result.length > 0;
  }

  async updateWaitlistPriority(id: string, priorityScore: number, adminNotes?: string): Promise<boolean> {
    const result = await db
      .update(waitlist)
      .set({
        priorityScore,
        adminNotes,
      })
      .where(eq(waitlist.id, id))
      .returning();
    
    return result.length > 0;
  }

  async logEmail(emailLog: InsertEmailLog): Promise<EmailLog> {
    const [log] = await db
      .insert(emailLogs)
      .values(emailLog)
      .returning();
    
    return log;
  }

  async getStats(): Promise<{
    totalRegistered: number;
    activeCodes: number;
    waitlistCount: number;
    totalReferrals: number;
  }> {
    const [registeredCount] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.status, 'registered'));
    
    const [activeCodesCount] = await db
      .select({ count: count() })
      .from(invitationCodes)
      .where(eq(invitationCodes.isUsed, false));
    
    const [waitlistCountResult] = await db
      .select({ count: count() })
      .from(waitlist)
      .where(eq(waitlist.status, 'pending'));
    
    const [referralsCount] = await db
      .select({ count: count() })
      .from(users)
      .where(sql`invited_by IS NOT NULL`);
    
    return {
      totalRegistered: registeredCount.count,
      activeCodes: activeCodesCount.count,
      waitlistCount: waitlistCountResult.count,
      totalReferrals: referralsCount.count,
    };
  }

  async getReferralTree(userId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.invitedBy, userId))
      .orderBy(desc(users.createdAt));
  }
}

export const storage = new DatabaseStorage();

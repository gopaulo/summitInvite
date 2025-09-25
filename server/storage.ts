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
  getUserById(id: string): Promise<User | undefined>; // Alias for getUser
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByInvitationCode(code: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Invitation code operations
  generateInvitationCodes(assignedToUserId: string, codeCount: number): Promise<InvitationCode[]>;
  createInvitationCodes(codes: { code: string; userId: string }[]): Promise<InvitationCode[]>; // Alias for generateInvitationCodes
  validateInvitationCode(code: string): Promise<InvitationCode | undefined>;
  useInvitationCode(code: string, usedByUserId: string): Promise<boolean>;
  markInvitationCodeAsUsed(code: string): Promise<void>; // Alias for useInvitationCode
  getInvitationCodesByUser(userId: string): Promise<InvitationCode[]>;
  getUserInvitationCodes(userId: string): Promise<InvitationCode[]>; // Alias for getInvitationCodesByUser
  getAllInvitationCodes(): Promise<InvitationCode[]>;
  getUsedCodes(userId: string): Promise<InvitationCode[]>;
  reserveInvitationCode(userId: string, email: string): Promise<InvitationCode | null>;
  getAvailableCodeForUser(userId: string): Promise<InvitationCode | null>;
  
  // Waitlist operations
  addToWaitlist(waitlistData: InsertWaitlist): Promise<Waitlist>;
  getWaitlist(): Promise<Waitlist[]>;
  findWaitlistByEmail(email: string): Promise<Waitlist | undefined>;
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
    
    if (!result || result.length === 0) {
      throw new Error('Failed to create user');
    }
    
    return result[0] as User;
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
    
    return createdCodes as InvitationCode[];
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
    
    return (result.rows?.[0] as InvitationCode) || null;
  }

  async addToWaitlist(waitlistData: InsertWaitlist): Promise<Waitlist> {
    // Calculate priority score based on company revenue and role
    const priorityScore = this.calculatePriorityScore(waitlistData.companyRevenue, waitlistData.role);
    
    const [waitlistEntry] = await db
      .insert(waitlist)
      .values({
        ...waitlistData,
        priorityScore,
      })
      .returning();
    
    return waitlistEntry;
  }

  private calculatePriorityScore(companyRevenue: string, role: string): number {
    let score = 0;
    
    // Company revenue scoring
    switch (companyRevenue) {
      case '$5mi+':
        score += 50;
        break;
      case '$3mi-$5mi':
        score += 40;
        break;
      case '$1mi-$3mi':
        score += 30;
        break;
      case '$500k-$1mi':
        score += 20;
        break;
      case '$100k-$500k':
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

  // Additional methods required by API
  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id); // Alias for getUser
  }

  async getUserByInvitationCode(code: string): Promise<User | undefined> {
    const inviteCode = await this.validateInvitationCode(code);
    if (!inviteCode?.assignedToUserId) {
      return undefined;
    }
    return this.getUser(inviteCode.assignedToUserId);
  }

  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  async createInvitationCodes(codes: { code: string; userId: string }[]): Promise<InvitationCode[]> {
    const insertCodes: InsertInvitationCode[] = codes.map(({ code, userId }) => ({
      code,
      assignedToUserId: userId,
      isUsed: false,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    }));

    const createdCodes = await db
      .insert(invitationCodes)
      .values(insertCodes)
      .returning();
    
    return createdCodes;
  }

  async markInvitationCodeAsUsed(code: string): Promise<void> {
    await db
      .update(invitationCodes)
      .set({
        isUsed: true,
        usedAt: new Date(),
      })
      .where(eq(invitationCodes.code, code.toUpperCase()));
  }

  async getUserInvitationCodes(userId: string): Promise<InvitationCode[]> {
    return this.getInvitationCodesByUser(userId); // Alias
  }

  async getUsedCodes(userId: string): Promise<InvitationCode[]> {
    return await db
      .select()
      .from(invitationCodes)
      .where(
        and(
          eq(invitationCodes.assignedToUserId, userId),
          eq(invitationCodes.isUsed, true)
        )
      )
      .orderBy(desc(invitationCodes.usedAt));
  }

  async findWaitlistByEmail(email: string): Promise<Waitlist | undefined> {
    const [entry] = await db
      .select()
      .from(waitlist)
      .where(eq(waitlist.email, email));
    
    return entry;
  }
}

export const storage = new DatabaseStorage();

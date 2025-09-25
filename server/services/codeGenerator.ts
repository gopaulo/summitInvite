import { storage } from "../storage";

export class CodeGenerator {
  static async generateUniqueCode(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const code = this.createCode();
      const existing = await storage.validateInvitationCode(code);
      
      if (!existing) {
        return code;
      }
      
      attempts++;
    }
    
    throw new Error('Unable to generate unique code after maximum attempts');
  }
  
  private static createCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'SUMMIT';
    
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return code;
  }
  
  static async generateMultipleCodes(count: number, assignedToUserId: string): Promise<string[]> {
    // Generate and persist codes to database, then return the actual persisted codes
    const createdCodes = await storage.generateInvitationCodes(assignedToUserId, count);
    return createdCodes.map(code => code.code);
  }
}

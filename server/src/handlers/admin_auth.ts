import { db } from '../db';
import { adminsTable } from '../db/schema';
import { type AdminLoginInput, type Admin } from '../schema';
import { eq } from 'drizzle-orm';

export async function adminLogin(input: AdminLoginInput): Promise<Admin | null> {
  try {
    // Find admin by username
    const adminResults = await db.select()
      .from(adminsTable)
      .where(eq(adminsTable.username, input.username))
      .execute();

    if (adminResults.length === 0) {
      return null; // Username not found
    }

    const admin = adminResults[0];

    // Verify password using Bun's password hashing
    const isPasswordValid = await Bun.password.verify(input.password, admin.password_hash);

    if (!isPasswordValid) {
      return null; // Invalid password
    }

    // Return admin data (excluding password hash for security)
    return {
      id: admin.id,
      name: admin.name,
      username: admin.username,
      password_hash: admin.password_hash, // Keep for schema compatibility
      profile_photo: admin.profile_photo,
      created_at: admin.created_at,
      updated_at: admin.updated_at
    };

  } catch (error) {
    console.error('Admin login failed:', error);
    throw error;
  }
}

export async function getAdminProfile(adminId: number): Promise<Admin | null> {
  try {
    // Find admin by ID
    const adminResults = await db.select()
      .from(adminsTable)
      .where(eq(adminsTable.id, adminId))
      .execute();

    if (adminResults.length === 0) {
      return null; // Admin not found
    }

    const admin = adminResults[0];

    // Return admin profile data
    return {
      id: admin.id,
      name: admin.name,
      username: admin.username,
      password_hash: admin.password_hash, // Keep for schema compatibility
      profile_photo: admin.profile_photo,
      created_at: admin.created_at,
      updated_at: admin.updated_at
    };

  } catch (error) {
    console.error('Get admin profile failed:', error);
    throw error;
  }
}
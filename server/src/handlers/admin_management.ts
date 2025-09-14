import { db } from '../db';
import { adminsTable } from '../db/schema';
import { type CreateAdminInput, type UpdateAdminInput, type Admin } from '../schema';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';

export async function createAdmin(input: CreateAdminInput): Promise<Admin> {
  try {
    // Hash the password
    const password_hash = createHash('sha256').update(input.password + 'salt').digest('hex');

    // Insert admin record
    const result = await db.insert(adminsTable)
      .values({
        name: input.name,
        username: input.username,
        password_hash,
        profile_photo: input.profile_photo || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Admin creation failed:', error);
    throw error;
  }
}

export async function updateAdmin(input: UpdateAdminInput): Promise<Admin> {
  try {
    // Build update values object, only including provided fields
    const updateValues: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateValues.name = input.name;
    }

    if (input.username !== undefined) {
      updateValues.username = input.username;
    }

    if (input.password !== undefined) {
      updateValues.password_hash = createHash('sha256').update(input.password + 'salt').digest('hex');
    }

    if (input.profile_photo !== undefined) {
      updateValues.profile_photo = input.profile_photo;
    }

    // Update admin record
    const result = await db.update(adminsTable)
      .set(updateValues)
      .where(eq(adminsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Admin not found');
    }

    return result[0];
  } catch (error) {
    console.error('Admin update failed:', error);
    throw error;
  }
}

export async function getAdmins(): Promise<Admin[]> {
  try {
    const result = await db.select()
      .from(adminsTable)
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to fetch admins:', error);
    throw error;
  }
}

export async function getAdminById(adminId: number): Promise<Admin | null> {
  try {
    const result = await db.select()
      .from(adminsTable)
      .where(eq(adminsTable.id, adminId))
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Failed to fetch admin by ID:', error);
    throw error;
  }
}

export async function deleteAdmin(adminId: number): Promise<boolean> {
  try {
    const result = await db.delete(adminsTable)
      .where(eq(adminsTable.id, adminId))
      .returning()
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('Admin deletion failed:', error);
    throw error;
  }
}
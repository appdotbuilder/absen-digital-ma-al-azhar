import { db } from '../db';
import { tendiksTable } from '../db/schema';
import { type TendikLoginInput, type Tendik } from '../schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function tendikLogin(input: TendikLoginInput): Promise<Tendik | null> {
  try {
    // Find tendik by username
    const tendiks = await db.select()
      .from(tendiksTable)
      .where(eq(tendiksTable.username, input.username))
      .execute();

    if (tendiks.length === 0) {
      return null; // User not found
    }

    const tendik = tendiks[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(input.password, tendik.password_hash);
    if (!isValidPassword) {
      return null; // Invalid password
    }

    // Return tendik data (excluding password hash)
    return {
      id: tendik.id,
      name: tendik.name,
      username: tendik.username,
      password_hash: tendik.password_hash, // Keep for schema compatibility
      position: tendik.position,
      profile_photo: tendik.profile_photo,
      created_at: tendik.created_at,
      updated_at: tendik.updated_at
    };
  } catch (error) {
    console.error('Tendik login failed:', error);
    throw error;
  }
}

export async function getTendikProfile(tendikId: number): Promise<Tendik | null> {
  try {
    // Find tendik by ID
    const tendiks = await db.select()
      .from(tendiksTable)
      .where(eq(tendiksTable.id, tendikId))
      .execute();

    if (tendiks.length === 0) {
      return null; // Tendik not found
    }

    const tendik = tendiks[0];

    return {
      id: tendik.id,
      name: tendik.name,
      username: tendik.username,
      password_hash: tendik.password_hash,
      position: tendik.position,
      profile_photo: tendik.profile_photo,
      created_at: tendik.created_at,
      updated_at: tendik.updated_at
    };
  } catch (error) {
    console.error('Get tendik profile failed:', error);
    throw error;
  }
}
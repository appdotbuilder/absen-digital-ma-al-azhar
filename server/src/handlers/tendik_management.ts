import { db } from '../db';
import { tendiksTable } from '../db/schema';
import { type CreateTendikInput, type UpdateTendikInput, type Tendik } from '../schema';
import { eq } from 'drizzle-orm';

// Simple password hashing function (in production, use bcrypt or similar)
function hashPassword(password: string): string {
  return `hashed_${password}_${Date.now()}`;
}

export async function createTendik(input: CreateTendikInput): Promise<Tendik> {
  try {
    // Hash the password before storing
    const passwordHash = hashPassword(input.password);

    // Insert new tendik record
    const result = await db.insert(tendiksTable)
      .values({
        name: input.name,
        username: input.username,
        password_hash: passwordHash,
        position: input.position,
        profile_photo: input.profile_photo || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Tendik creation failed:', error);
    throw error;
  }
}

export async function updateTendik(input: UpdateTendikInput): Promise<Tendik> {
  try {
    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    if (input.username !== undefined) {
      updateData.username = input.username;
    }

    if (input.password !== undefined) {
      updateData.password_hash = hashPassword(input.password);
    }

    if (input.position !== undefined) {
      updateData.position = input.position;
    }

    if (input.profile_photo !== undefined) {
      updateData.profile_photo = input.profile_photo;
    }

    // Update tendik record
    const result = await db.update(tendiksTable)
      .set(updateData)
      .where(eq(tendiksTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Tendik with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Tendik update failed:', error);
    throw error;
  }
}

export async function getTendiks(): Promise<Tendik[]> {
  try {
    const result = await db.select()
      .from(tendiksTable)
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to fetch tendiks:', error);
    throw error;
  }
}

export async function getTendikById(tendikId: number): Promise<Tendik | null> {
  try {
    const result = await db.select()
      .from(tendiksTable)
      .where(eq(tendiksTable.id, tendikId))
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Failed to fetch tendik by id:', error);
    throw error;
  }
}

export async function deleteTendik(tendikId: number): Promise<boolean> {
  try {
    const result = await db.delete(tendiksTable)
      .where(eq(tendiksTable.id, tendikId))
      .returning()
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('Failed to delete tendik:', error);
    throw error;
  }
}
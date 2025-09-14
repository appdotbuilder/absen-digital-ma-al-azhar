import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tendiksTable } from '../db/schema';
import { type CreateTendikInput, type UpdateTendikInput } from '../schema';
import { 
  createTendik, 
  updateTendik, 
  getTendiks, 
  getTendikById, 
  deleteTendik 
} from '../handlers/tendik_management';
import { eq } from 'drizzle-orm';

// Test data
const testCreateInput: CreateTendikInput = {
  name: 'Ahmad Suharto',
  username: 'ahmad.suharto',
  password: 'password123',
  position: 'Staf TU',
  profile_photo: 'profile_photo_url.jpg'
};

const testCreateInputMinimal: CreateTendikInput = {
  name: 'Siti Aminah',
  username: 'siti.aminah',
  password: 'password456',
  position: 'Operator'
  // profile_photo is optional
};

describe('tendik_management', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createTendik', () => {
    it('should create a tendik with all fields', async () => {
      const result = await createTendik(testCreateInput);

      // Verify returned data structure
      expect(result.id).toBeDefined();
      expect(result.name).toEqual('Ahmad Suharto');
      expect(result.username).toEqual('ahmad.suharto');
      expect(result.password_hash).toBeDefined();
      expect(result.password_hash).not.toEqual('password123'); // Should be hashed
      expect(result.position).toEqual('Staf TU');
      expect(result.profile_photo).toEqual('profile_photo_url.jpg');
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should create a tendik with minimal fields', async () => {
      const result = await createTendik(testCreateInputMinimal);

      expect(result.id).toBeDefined();
      expect(result.name).toEqual('Siti Aminah');
      expect(result.username).toEqual('siti.aminah');
      expect(result.position).toEqual('Operator');
      expect(result.profile_photo).toBeNull();
    });

    it('should save tendik to database', async () => {
      const result = await createTendik(testCreateInput);

      // Query database directly to verify
      const tendiks = await db.select()
        .from(tendiksTable)
        .where(eq(tendiksTable.id, result.id))
        .execute();

      expect(tendiks).toHaveLength(1);
      expect(tendiks[0].name).toEqual('Ahmad Suharto');
      expect(tendiks[0].username).toEqual('ahmad.suharto');
      expect(tendiks[0].position).toEqual('Staf TU');
    });

    it('should reject duplicate username', async () => {
      await createTendik(testCreateInput);

      // Try to create another tendik with same username
      const duplicateInput: CreateTendikInput = {
        ...testCreateInput,
        name: 'Different Name'
      };

      await expect(createTendik(duplicateInput)).rejects.toThrow();
    });
  });

  describe('updateTendik', () => {
    it('should update tendik with partial data', async () => {
      // Create initial tendik
      const created = await createTendik(testCreateInput);

      const updateInput: UpdateTendikInput = {
        id: created.id,
        name: 'Ahmad Suharto Updated',
        position: 'Kepala TU'
      };

      const result = await updateTendik(updateInput);

      expect(result.id).toEqual(created.id);
      expect(result.name).toEqual('Ahmad Suharto Updated');
      expect(result.username).toEqual('ahmad.suharto'); // Unchanged
      expect(result.position).toEqual('Kepala TU');
      expect(result.profile_photo).toEqual('profile_photo_url.jpg'); // Unchanged
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should update password and hash it', async () => {
      const created = await createTendik(testCreateInput);
      const originalPasswordHash = created.password_hash;

      const updateInput: UpdateTendikInput = {
        id: created.id,
        password: 'newpassword123'
      };

      const result = await updateTendik(updateInput);

      expect(result.password_hash).toBeDefined();
      expect(result.password_hash).not.toEqual('newpassword123'); // Should be hashed
      expect(result.password_hash).not.toEqual(originalPasswordHash); // Should be different
    });

    it('should update profile photo to null', async () => {
      const created = await createTendik(testCreateInput);

      const updateInput: UpdateTendikInput = {
        id: created.id,
        profile_photo: null
      };

      const result = await updateTendik(updateInput);

      expect(result.profile_photo).toBeNull();
    });

    it('should throw error for non-existent tendik', async () => {
      const updateInput: UpdateTendikInput = {
        id: 999999,
        name: 'Non-existent'
      };

      await expect(updateTendik(updateInput)).rejects.toThrow(/not found/i);
    });

    it('should save updates to database', async () => {
      const created = await createTendik(testCreateInput);

      const updateInput: UpdateTendikInput = {
        id: created.id,
        name: 'Database Check Name'
      };

      await updateTendik(updateInput);

      // Verify in database
      const tendiks = await db.select()
        .from(tendiksTable)
        .where(eq(tendiksTable.id, created.id))
        .execute();

      expect(tendiks[0].name).toEqual('Database Check Name');
    });
  });

  describe('getTendiks', () => {
    it('should return empty array when no tendiks exist', async () => {
      const result = await getTendiks();
      expect(result).toEqual([]);
    });

    it('should return all tendiks', async () => {
      // Create multiple tendiks
      await createTendik(testCreateInput);
      await createTendik(testCreateInputMinimal);

      const result = await getTendiks();

      expect(result).toHaveLength(2);
      expect(result.some(t => t.name === 'Ahmad Suharto')).toBe(true);
      expect(result.some(t => t.name === 'Siti Aminah')).toBe(true);
    });

    it('should return tendiks with all required fields', async () => {
      await createTendik(testCreateInput);

      const result = await getTendiks();

      expect(result).toHaveLength(1);
      const tendik = result[0];
      expect(tendik.id).toBeDefined();
      expect(tendik.name).toBeDefined();
      expect(tendik.username).toBeDefined();
      expect(tendik.password_hash).toBeDefined();
      expect(tendik.position).toBeDefined();
      expect(tendik.created_at).toBeInstanceOf(Date);
      expect(tendik.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('getTendikById', () => {
    it('should return null for non-existent tendik', async () => {
      const result = await getTendikById(999999);
      expect(result).toBeNull();
    });

    it('should return tendik by id', async () => {
      const created = await createTendik(testCreateInput);

      const result = await getTendikById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.name).toEqual('Ahmad Suharto');
      expect(result!.username).toEqual('ahmad.suharto');
      expect(result!.position).toEqual('Staf TU');
    });

    it('should return correct tendik when multiple exist', async () => {
      const first = await createTendik(testCreateInput);
      const second = await createTendik(testCreateInputMinimal);

      const result = await getTendikById(second.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(second.id);
      expect(result!.name).toEqual('Siti Aminah');
      expect(result!.position).toEqual('Operator');
    });
  });

  describe('deleteTendik', () => {
    it('should return false for non-existent tendik', async () => {
      const result = await deleteTendik(999999);
      expect(result).toBe(false);
    });

    it('should delete tendik and return true', async () => {
      const created = await createTendik(testCreateInput);

      const result = await deleteTendik(created.id);

      expect(result).toBe(true);

      // Verify deletion in database
      const tendiks = await db.select()
        .from(tendiksTable)
        .where(eq(tendiksTable.id, created.id))
        .execute();

      expect(tendiks).toHaveLength(0);
    });

    it('should only delete specified tendik', async () => {
      const first = await createTendik(testCreateInput);
      const second = await createTendik(testCreateInputMinimal);

      const result = await deleteTendik(first.id);

      expect(result).toBe(true);

      // Verify first is deleted
      const firstCheck = await getTendikById(first.id);
      expect(firstCheck).toBeNull();

      // Verify second still exists
      const secondCheck = await getTendikById(second.id);
      expect(secondCheck).not.toBeNull();
      expect(secondCheck!.name).toEqual('Siti Aminah');
    });
  });

  describe('integration tests', () => {
    it('should handle complete CRUD workflow', async () => {
      // Create
      const created = await createTendik(testCreateInput);
      expect(created.name).toEqual('Ahmad Suharto');

      // Read
      const fetched = await getTendikById(created.id);
      expect(fetched).not.toBeNull();
      expect(fetched!.id).toEqual(created.id);

      // Update
      const updateInput: UpdateTendikInput = {
        id: created.id,
        name: 'Ahmad Updated',
        position: 'Kepala Madrasah'
      };
      const updated = await updateTendik(updateInput);
      expect(updated.name).toEqual('Ahmad Updated');
      expect(updated.position).toEqual('Kepala Madrasah');

      // List
      const allTendiks = await getTendiks();
      expect(allTendiks).toHaveLength(1);
      expect(allTendiks[0].name).toEqual('Ahmad Updated');

      // Delete
      const deleted = await deleteTendik(created.id);
      expect(deleted).toBe(true);

      // Verify deletion
      const afterDelete = await getTendikById(created.id);
      expect(afterDelete).toBeNull();

      const emptyList = await getTendiks();
      expect(emptyList).toHaveLength(0);
    });
  });
});
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { adminsTable } from '../db/schema';
import { type CreateAdminInput, type UpdateAdminInput } from '../schema';
import { 
  createAdmin, 
  updateAdmin, 
  getAdmins, 
  getAdminById, 
  deleteAdmin 
} from '../handlers/admin_management';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';

// Test input data
const testAdminInput: CreateAdminInput = {
  name: 'Test Admin',
  username: 'testadmin',
  password: 'password123',
  profile_photo: 'http://example.com/photo.jpg'
};

const minimalAdminInput: CreateAdminInput = {
  name: 'Minimal Admin',
  username: 'minimal',
  password: 'password123'
};

describe('Admin Management', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createAdmin', () => {
    it('should create an admin with all fields', async () => {
      const result = await createAdmin(testAdminInput);

      expect(result.name).toEqual('Test Admin');
      expect(result.username).toEqual('testadmin');
      expect(result.profile_photo).toEqual('http://example.com/photo.jpg');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);

      // Verify password was hashed
      expect(result.password_hash).toBeDefined();
      expect(result.password_hash).not.toEqual('password123');
      
      // Verify password hash is valid
      const expectedHash = createHash('sha256').update('password123' + 'salt').digest('hex');
      expect(result.password_hash).toEqual(expectedHash);
    });

    it('should create an admin with minimal fields', async () => {
      const result = await createAdmin(minimalAdminInput);

      expect(result.name).toEqual('Minimal Admin');
      expect(result.username).toEqual('minimal');
      expect(result.profile_photo).toBeNull();
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save admin to database', async () => {
      const result = await createAdmin(testAdminInput);

      const admins = await db.select()
        .from(adminsTable)
        .where(eq(adminsTable.id, result.id))
        .execute();

      expect(admins).toHaveLength(1);
      expect(admins[0].name).toEqual('Test Admin');
      expect(admins[0].username).toEqual('testadmin');
    });

    it('should throw error for duplicate username', async () => {
      await createAdmin(testAdminInput);

      const duplicateInput: CreateAdminInput = {
        name: 'Another Admin',
        username: 'testadmin', // Same username
        password: 'differentpass'
      };

      await expect(createAdmin(duplicateInput)).rejects.toThrow();
    });
  });

  describe('updateAdmin', () => {
    it('should update admin with all fields', async () => {
      const created = await createAdmin(testAdminInput);

      const updateInput: UpdateAdminInput = {
        id: created.id,
        name: 'Updated Admin',
        username: 'updatedadmin',
        password: 'newpassword123',
        profile_photo: 'http://example.com/newphoto.jpg'
      };

      const result = await updateAdmin(updateInput);

      expect(result.name).toEqual('Updated Admin');
      expect(result.username).toEqual('updatedadmin');
      expect(result.profile_photo).toEqual('http://example.com/newphoto.jpg');
      
      // Verify new password hash
      const expectedHash = createHash('sha256').update('newpassword123' + 'salt').digest('hex');
      expect(result.password_hash).toEqual(expectedHash);
    });

    it('should update admin with partial fields', async () => {
      const created = await createAdmin(testAdminInput);

      const updateInput: UpdateAdminInput = {
        id: created.id,
        name: 'Partially Updated'
      };

      const result = await updateAdmin(updateInput);

      expect(result.name).toEqual('Partially Updated');
      expect(result.username).toEqual('testadmin'); // Should remain unchanged
      expect(result.profile_photo).toEqual('http://example.com/photo.jpg'); // Should remain unchanged
    });

    it('should update profile photo to null', async () => {
      const created = await createAdmin(testAdminInput);

      const updateInput: UpdateAdminInput = {
        id: created.id,
        profile_photo: null
      };

      const result = await updateAdmin(updateInput);

      expect(result.profile_photo).toBeNull();
      expect(result.name).toEqual('Test Admin'); // Should remain unchanged
    });

    it('should throw error for non-existent admin', async () => {
      const updateInput: UpdateAdminInput = {
        id: 99999,
        name: 'Non-existent'
      };

      await expect(updateAdmin(updateInput)).rejects.toThrow(/Admin not found/i);
    });
  });

  describe('getAdmins', () => {
    it('should return empty array when no admins exist', async () => {
      const result = await getAdmins();
      expect(result).toHaveLength(0);
    });

    it('should return all admins', async () => {
      await createAdmin(testAdminInput);
      await createAdmin(minimalAdminInput);

      const result = await getAdmins();

      expect(result).toHaveLength(2);
      expect(result.map(admin => admin.name)).toContain('Test Admin');
      expect(result.map(admin => admin.name)).toContain('Minimal Admin');
    });

    it('should return admins with all fields', async () => {
      await createAdmin(testAdminInput);

      const result = await getAdmins();

      expect(result).toHaveLength(1);
      const admin = result[0];
      expect(admin.name).toBeDefined();
      expect(admin.username).toBeDefined();
      expect(admin.password_hash).toBeDefined();
      expect(admin.created_at).toBeInstanceOf(Date);
      expect(admin.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('getAdminById', () => {
    it('should return admin when exists', async () => {
      const created = await createAdmin(testAdminInput);

      const result = await getAdminById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.name).toEqual('Test Admin');
      expect(result!.username).toEqual('testadmin');
    });

    it('should return null when admin does not exist', async () => {
      const result = await getAdminById(99999);
      expect(result).toBeNull();
    });

    it('should return admin with all fields', async () => {
      const created = await createAdmin(testAdminInput);

      const result = await getAdminById(created.id);

      expect(result!.name).toBeDefined();
      expect(result!.username).toBeDefined();
      expect(result!.password_hash).toBeDefined();
      expect(result!.profile_photo).toBeDefined();
      expect(result!.created_at).toBeInstanceOf(Date);
      expect(result!.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('deleteAdmin', () => {
    it('should delete existing admin', async () => {
      const created = await createAdmin(testAdminInput);

      const result = await deleteAdmin(created.id);

      expect(result).toBe(true);

      // Verify admin was deleted
      const deletedAdmin = await getAdminById(created.id);
      expect(deletedAdmin).toBeNull();
    });

    it('should return false for non-existent admin', async () => {
      const result = await deleteAdmin(99999);
      expect(result).toBe(false);
    });

    it('should remove admin from database', async () => {
      const created = await createAdmin(testAdminInput);

      await deleteAdmin(created.id);

      const admins = await db.select()
        .from(adminsTable)
        .where(eq(adminsTable.id, created.id))
        .execute();

      expect(admins).toHaveLength(0);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle multiple admin operations', async () => {
      // Create multiple admins
      const admin1 = await createAdmin(testAdminInput);
      const admin2 = await createAdmin(minimalAdminInput);

      // Get all admins
      let allAdmins = await getAdmins();
      expect(allAdmins).toHaveLength(2);

      // Update one admin
      await updateAdmin({
        id: admin1.id,
        name: 'Updated Test Admin'
      });

      // Verify update
      const updatedAdmin = await getAdminById(admin1.id);
      expect(updatedAdmin!.name).toEqual('Updated Test Admin');

      // Delete one admin
      await deleteAdmin(admin2.id);

      // Verify remaining admin
      allAdmins = await getAdmins();
      expect(allAdmins).toHaveLength(1);
      expect(allAdmins[0].name).toEqual('Updated Test Admin');
    });
  });
});
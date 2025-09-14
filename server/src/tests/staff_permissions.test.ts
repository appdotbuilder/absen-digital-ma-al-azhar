import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { staffPermissionsTable, tendiksTable, adminsTable } from '../db/schema';
import { type CreateStaffPermissionInput } from '../schema';
import { 
  createStaffPermission, 
  getStaffPermissions, 
  getTendikPermissions, 
  deleteStaffPermission 
} from '../handlers/staff_permissions';
import { eq } from 'drizzle-orm';

// Helper function to create prerequisite admin
async function createTestAdmin() {
  const adminResult = await db.insert(adminsTable)
    .values({
      name: 'Test Admin',
      username: 'testadmin',
      password_hash: 'hashed_password'
    })
    .returning()
    .execute();
  return adminResult[0];
}

// Helper function to create prerequisite tendik
async function createTestTendik() {
  const tendikResult = await db.insert(tendiksTable)
    .values({
      name: 'Test Staff',
      username: 'teststaff',
      password_hash: 'hashed_password',
      position: 'Staf TU'
    })
    .returning()
    .execute();
  return tendikResult[0];
}

describe('Staff Permissions Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createStaffPermission', () => {
    it('should create a staff permission successfully', async () => {
      // Create prerequisite records
      const admin = await createTestAdmin();
      const tendik = await createTestTendik();

      const testInput: CreateStaffPermissionInput = {
        tendik_id: tendik.id,
        date: '2024-01-15',
        permission_type: 'Sakit',
        description: 'Demam tinggi, perlu istirahat',
        approved_by: admin.id
      };

      const result = await createStaffPermission(testInput);

      // Verify returned permission
      expect(result.id).toBeDefined();
      expect(result.tendik_id).toEqual(tendik.id);
      expect(result.date).toEqual(new Date('2024-01-15'));
      expect(result.permission_type).toEqual('Sakit');
      expect(result.description).toEqual('Demam tinggi, perlu istirahat');
      expect(result.approved_by).toEqual(admin.id);
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save permission to database', async () => {
      const admin = await createTestAdmin();
      const tendik = await createTestTendik();

      const testInput: CreateStaffPermissionInput = {
        tendik_id: tendik.id,
        date: '2024-01-15',
        permission_type: 'Izin',
        description: 'Keperluan keluarga',
        approved_by: admin.id
      };

      const result = await createStaffPermission(testInput);

      // Verify in database
      const permissions = await db.select()
        .from(staffPermissionsTable)
        .where(eq(staffPermissionsTable.id, result.id))
        .execute();

      expect(permissions).toHaveLength(1);
      expect(permissions[0].tendik_id).toEqual(tendik.id);
      expect(permissions[0].permission_type).toEqual('Izin');
      expect(permissions[0].approved_by).toEqual(admin.id);
    });

    it('should throw error when tendik does not exist', async () => {
      const admin = await createTestAdmin();

      const testInput: CreateStaffPermissionInput = {
        tendik_id: 999, // Non-existent tendik ID
        date: '2024-01-15',
        permission_type: 'Sakit',
        description: 'Test permission',
        approved_by: admin.id
      };

      await expect(createStaffPermission(testInput)).rejects.toThrow(/tendik with id 999 does not exist/i);
    });

    it('should throw error when admin does not exist', async () => {
      const tendik = await createTestTendik();

      const testInput: CreateStaffPermissionInput = {
        tendik_id: tendik.id,
        date: '2024-01-15',
        permission_type: 'Sakit',
        description: 'Test permission',
        approved_by: 999 // Non-existent admin ID
      };

      await expect(createStaffPermission(testInput)).rejects.toThrow(/admin with id 999 does not exist/i);
    });
  });

  describe('getStaffPermissions', () => {
    it('should return empty array when no permissions exist', async () => {
      const result = await getStaffPermissions();
      expect(result).toHaveLength(0);
    });

    it('should return all staff permissions', async () => {
      // Create prerequisite records
      const admin = await createTestAdmin();
      const tendik1 = await createTestTendik();
      
      // Create second tendik
      const tendik2Result = await db.insert(tendiksTable)
        .values({
          name: 'Test Staff 2',
          username: 'teststaff2',
          password_hash: 'hashed_password',
          position: 'Operator'
        })
        .returning()
        .execute();
      const tendik2 = tendik2Result[0];

      // Create multiple permissions
      await createStaffPermission({
        tendik_id: tendik1.id,
        date: '2024-01-15',
        permission_type: 'Sakit',
        description: 'Flu',
        approved_by: admin.id
      });

      await createStaffPermission({
        tendik_id: tendik2.id,
        date: '2024-01-16',
        permission_type: 'Izin',
        description: 'Keperluan keluarga',
        approved_by: admin.id
      });

      const result = await getStaffPermissions();

      expect(result).toHaveLength(2);
      expect(result[0].tendik_id).toEqual(tendik1.id);
      expect(result[0].permission_type).toEqual('Sakit');
      expect(result[1].tendik_id).toEqual(tendik2.id);
      expect(result[1].permission_type).toEqual('Izin');
    });
  });

  describe('getTendikPermissions', () => {
    it('should return empty array when tendik has no permissions', async () => {
      const tendik = await createTestTendik();
      
      const result = await getTendikPermissions(tendik.id);
      expect(result).toHaveLength(0);
    });

    it('should return only permissions for specific tendik', async () => {
      // Create prerequisite records
      const admin = await createTestAdmin();
      const tendik1 = await createTestTendik();
      
      // Create second tendik
      const tendik2Result = await db.insert(tendiksTable)
        .values({
          name: 'Test Staff 2',
          username: 'teststaff2',
          password_hash: 'hashed_password',
          position: 'Operator'
        })
        .returning()
        .execute();
      const tendik2 = tendik2Result[0];

      // Create permissions for both tendiks
      await createStaffPermission({
        tendik_id: tendik1.id,
        date: '2024-01-15',
        permission_type: 'Sakit',
        description: 'Flu',
        approved_by: admin.id
      });

      await createStaffPermission({
        tendik_id: tendik1.id,
        date: '2024-01-16',
        permission_type: 'Izin',
        description: 'Pribadi',
        approved_by: admin.id
      });

      await createStaffPermission({
        tendik_id: tendik2.id,
        date: '2024-01-17',
        permission_type: 'Cuti',
        description: 'Liburan',
        approved_by: admin.id
      });

      // Get permissions for tendik1 only
      const result = await getTendikPermissions(tendik1.id);

      expect(result).toHaveLength(2);
      expect(result.every(p => p.tendik_id === tendik1.id)).toBe(true);
      expect(result[0].permission_type).toEqual('Sakit');
      expect(result[1].permission_type).toEqual('Izin');
    });

    it('should return empty array for non-existent tendik', async () => {
      const result = await getTendikPermissions(999);
      expect(result).toHaveLength(0);
    });
  });

  describe('deleteStaffPermission', () => {
    it('should delete permission and return true when permission exists', async () => {
      // Create prerequisite records and permission
      const admin = await createTestAdmin();
      const tendik = await createTestTendik();

      const permission = await createStaffPermission({
        tendik_id: tendik.id,
        date: '2024-01-15',
        permission_type: 'Sakit',
        description: 'Test permission',
        approved_by: admin.id
      });

      const result = await deleteStaffPermission(permission.id);

      expect(result).toBe(true);

      // Verify permission is deleted from database
      const permissions = await db.select()
        .from(staffPermissionsTable)
        .where(eq(staffPermissionsTable.id, permission.id))
        .execute();

      expect(permissions).toHaveLength(0);
    });

    it('should return false when permission does not exist', async () => {
      const result = await deleteStaffPermission(999);
      expect(result).toBe(false);
    });

    it('should not affect other permissions when deleting one', async () => {
      // Create prerequisite records and multiple permissions
      const admin = await createTestAdmin();
      const tendik = await createTestTendik();

      const permission1 = await createStaffPermission({
        tendik_id: tendik.id,
        date: '2024-01-15',
        permission_type: 'Sakit',
        description: 'Permission 1',
        approved_by: admin.id
      });

      const permission2 = await createStaffPermission({
        tendik_id: tendik.id,
        date: '2024-01-16',
        permission_type: 'Izin',
        description: 'Permission 2',
        approved_by: admin.id
      });

      // Delete first permission
      const result = await deleteStaffPermission(permission1.id);
      expect(result).toBe(true);

      // Verify second permission still exists
      const remainingPermissions = await db.select()
        .from(staffPermissionsTable)
        .where(eq(staffPermissionsTable.id, permission2.id))
        .execute();

      expect(remainingPermissions).toHaveLength(1);
      expect(remainingPermissions[0].id).toEqual(permission2.id);
    });
  });
});
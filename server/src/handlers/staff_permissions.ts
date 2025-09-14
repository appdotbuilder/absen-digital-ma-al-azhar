import { db } from '../db';
import { staffPermissionsTable, tendiksTable, adminsTable } from '../db/schema';
import { type CreateStaffPermissionInput, type StaffPermission } from '../schema';
import { eq } from 'drizzle-orm';

export async function createStaffPermission(input: CreateStaffPermissionInput): Promise<StaffPermission> {
  try {
    // Validate that tendik exists
    const tendikExists = await db.select({ id: tendiksTable.id })
      .from(tendiksTable)
      .where(eq(tendiksTable.id, input.tendik_id))
      .execute();

    if (tendikExists.length === 0) {
      throw new Error(`Tendik with ID ${input.tendik_id} does not exist`);
    }

    // Validate that admin exists
    const adminExists = await db.select({ id: adminsTable.id })
      .from(adminsTable)
      .where(eq(adminsTable.id, input.approved_by))
      .execute();

    if (adminExists.length === 0) {
      throw new Error(`Admin with ID ${input.approved_by} does not exist`);
    }

    // Insert staff permission record
    const result = await db.insert(staffPermissionsTable)
      .values({
        tendik_id: input.tendik_id,
        date: input.date,
        permission_type: input.permission_type,
        description: input.description,
        approved_by: input.approved_by
      })
      .returning()
      .execute();

    // Convert date string to Date object
    const permission = result[0];
    return {
      ...permission,
      date: new Date(permission.date)
    };
  } catch (error) {
    console.error('Staff permission creation failed:', error);
    throw error;
  }
}

export async function getStaffPermissions(): Promise<StaffPermission[]> {
  try {
    const result = await db.select()
      .from(staffPermissionsTable)
      .execute();

    // Convert date strings to Date objects
    return result.map(permission => ({
      ...permission,
      date: new Date(permission.date)
    }));
  } catch (error) {
    console.error('Failed to fetch staff permissions:', error);
    throw error;
  }
}

export async function getTendikPermissions(tendikId: number): Promise<StaffPermission[]> {
  try {
    const result = await db.select()
      .from(staffPermissionsTable)
      .where(eq(staffPermissionsTable.tendik_id, tendikId))
      .execute();

    // Convert date strings to Date objects
    return result.map(permission => ({
      ...permission,
      date: new Date(permission.date)
    }));
  } catch (error) {
    console.error('Failed to fetch tendik permissions:', error);
    throw error;
  }
}

export async function deleteStaffPermission(permissionId: number): Promise<boolean> {
  try {
    const result = await db.delete(staffPermissionsTable)
      .where(eq(staffPermissionsTable.id, permissionId))
      .returning({ id: staffPermissionsTable.id })
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('Failed to delete staff permission:', error);
    throw error;
  }
}
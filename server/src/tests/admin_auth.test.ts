import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { adminsTable } from '../db/schema';
import { type AdminLoginInput } from '../schema';
import { adminLogin, getAdminProfile } from '../handlers/admin_auth';
import { eq } from 'drizzle-orm';

// Test data
const testAdminData = {
  name: 'Test Admin',
  username: 'testadmin',
  password: 'testpass123',
  profile_photo: 'test-photo.jpg'
};

const testLoginInput: AdminLoginInput = {
  username: 'testadmin',
  password: 'testpass123'
};

describe('adminLogin', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should authenticate admin with valid credentials', async () => {
    // Create test admin with hashed password
    const passwordHash = await Bun.password.hash(testAdminData.password);
    const insertResult = await db.insert(adminsTable)
      .values({
        name: testAdminData.name,
        username: testAdminData.username,
        password_hash: passwordHash,
        profile_photo: testAdminData.profile_photo
      })
      .returning()
      .execute();

    const testAdmin = insertResult[0];

    // Test authentication
    const result = await adminLogin(testLoginInput);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(testAdmin.id);
    expect(result!.name).toBe(testAdminData.name);
    expect(result!.username).toBe(testAdminData.username);
    expect(result!.password_hash).toBe(passwordHash);
    expect(result!.profile_photo).toBe(testAdminData.profile_photo);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent username', async () => {
    const invalidInput: AdminLoginInput = {
      username: 'nonexistent',
      password: 'testpass123'
    };

    const result = await adminLogin(invalidInput);

    expect(result).toBeNull();
  });

  it('should return null for invalid password', async () => {
    // Create test admin
    const passwordHash = await Bun.password.hash(testAdminData.password);
    await db.insert(adminsTable)
      .values({
        name: testAdminData.name,
        username: testAdminData.username,
        password_hash: passwordHash,
        profile_photo: testAdminData.profile_photo
      })
      .execute();

    const invalidInput: AdminLoginInput = {
      username: 'testadmin',
      password: 'wrongpassword'
    };

    const result = await adminLogin(invalidInput);

    expect(result).toBeNull();
  });

  it('should authenticate admin with null profile photo', async () => {
    // Create test admin with null profile photo
    const passwordHash = await Bun.password.hash(testAdminData.password);
    const insertResult = await db.insert(adminsTable)
      .values({
        name: testAdminData.name,
        username: testAdminData.username,
        password_hash: passwordHash,
        profile_photo: null
      })
      .returning()
      .execute();

    const testAdmin = insertResult[0];

    // Test authentication
    const result = await adminLogin(testLoginInput);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(testAdmin.id);
    expect(result!.profile_photo).toBeNull();
  });

  it('should handle case-sensitive username matching', async () => {
    // Create test admin
    const passwordHash = await Bun.password.hash(testAdminData.password);
    await db.insert(adminsTable)
      .values({
        name: testAdminData.name,
        username: testAdminData.username,
        password_hash: passwordHash
      })
      .execute();

    const caseInput: AdminLoginInput = {
      username: 'TESTADMIN', // Different case
      password: 'testpass123'
    };

    const result = await adminLogin(caseInput);

    expect(result).toBeNull(); // Should not match due to case sensitivity
  });
});

describe('getAdminProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return admin profile by valid ID', async () => {
    // Create test admin
    const passwordHash = await Bun.password.hash(testAdminData.password);
    const insertResult = await db.insert(adminsTable)
      .values({
        name: testAdminData.name,
        username: testAdminData.username,
        password_hash: passwordHash,
        profile_photo: testAdminData.profile_photo
      })
      .returning()
      .execute();

    const testAdmin = insertResult[0];

    // Test getting profile
    const result = await getAdminProfile(testAdmin.id);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(testAdmin.id);
    expect(result!.name).toBe(testAdminData.name);
    expect(result!.username).toBe(testAdminData.username);
    expect(result!.password_hash).toBe(passwordHash);
    expect(result!.profile_photo).toBe(testAdminData.profile_photo);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent admin ID', async () => {
    const result = await getAdminProfile(99999); // Non-existent ID

    expect(result).toBeNull();
  });

  it('should return admin profile with null profile photo', async () => {
    // Create test admin with null profile photo
    const passwordHash = await Bun.password.hash(testAdminData.password);
    const insertResult = await db.insert(adminsTable)
      .values({
        name: testAdminData.name,
        username: testAdminData.username,
        password_hash: passwordHash,
        profile_photo: null
      })
      .returning()
      .execute();

    const testAdmin = insertResult[0];

    // Test getting profile
    const result = await getAdminProfile(testAdmin.id);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(testAdmin.id);
    expect(result!.profile_photo).toBeNull();
  });

  it('should verify data is retrieved from database correctly', async () => {
    // Create test admin
    const passwordHash = await Bun.password.hash(testAdminData.password);
    const insertResult = await db.insert(adminsTable)
      .values({
        name: testAdminData.name,
        username: testAdminData.username,
        password_hash: passwordHash,
        profile_photo: testAdminData.profile_photo
      })
      .returning()
      .execute();

    const testAdmin = insertResult[0];

    // Get profile via handler
    const handlerResult = await getAdminProfile(testAdmin.id);

    // Verify by querying database directly
    const dbResults = await db.select()
      .from(adminsTable)
      .where(eq(adminsTable.id, testAdmin.id))
      .execute();

    const dbAdmin = dbResults[0];

    // Compare handler result with direct database query
    expect(handlerResult).not.toBeNull();
    expect(handlerResult!.id).toBe(dbAdmin.id);
    expect(handlerResult!.name).toBe(dbAdmin.name);
    expect(handlerResult!.username).toBe(dbAdmin.username);
    expect(handlerResult!.password_hash).toBe(dbAdmin.password_hash);
    expect(handlerResult!.profile_photo).toBe(dbAdmin.profile_photo);
    expect(handlerResult!.created_at.getTime()).toBe(dbAdmin.created_at.getTime());
    expect(handlerResult!.updated_at.getTime()).toBe(dbAdmin.updated_at.getTime());
  });
});
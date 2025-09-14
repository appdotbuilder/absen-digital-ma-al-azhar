import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tendiksTable } from '../db/schema';
import { type TendikLoginInput } from '../schema';
import { tendikLogin, getTendikProfile } from '../handlers/tendik_auth';
import bcrypt from 'bcryptjs';

// Test tendik data
const testTendikData = {
  name: 'John Doe',
  username: 'johndoe',
  password: 'password123',
  position: 'Staf TU' as const,
  profile_photo: 'https://example.com/photo.jpg'
};

const testLoginInput: TendikLoginInput = {
  username: 'johndoe',
  password: 'password123'
};

describe('tendikLogin', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should authenticate tendik with valid credentials', async () => {
    // Create tendik with hashed password
    const passwordHash = await bcrypt.hash(testTendikData.password, 10);
    const result = await db.insert(tendiksTable)
      .values({
        name: testTendikData.name,
        username: testTendikData.username,
        password_hash: passwordHash,
        position: testTendikData.position,
        profile_photo: testTendikData.profile_photo
      })
      .returning()
      .execute();

    const createdTendik = result[0];

    // Test login
    const loginResult = await tendikLogin(testLoginInput);

    expect(loginResult).not.toBeNull();
    expect(loginResult!.id).toEqual(createdTendik.id);
    expect(loginResult!.name).toEqual(testTendikData.name);
    expect(loginResult!.username).toEqual(testTendikData.username);
    expect(loginResult!.position).toEqual(testTendikData.position);
    expect(loginResult!.profile_photo).toEqual(testTendikData.profile_photo);
    expect(loginResult!.created_at).toBeInstanceOf(Date);
    expect(loginResult!.updated_at).toBeInstanceOf(Date);
    expect(loginResult!.password_hash).toBeDefined(); // Should include password_hash for schema compatibility
  });

  it('should return null for non-existent username', async () => {
    const invalidInput: TendikLoginInput = {
      username: 'nonexistent',
      password: 'password123'
    };

    const result = await tendikLogin(invalidInput);
    expect(result).toBeNull();
  });

  it('should return null for invalid password', async () => {
    // Create tendik
    const passwordHash = await bcrypt.hash(testTendikData.password, 10);
    await db.insert(tendiksTable)
      .values({
        name: testTendikData.name,
        username: testTendikData.username,
        password_hash: passwordHash,
        position: testTendikData.position,
        profile_photo: testTendikData.profile_photo
      })
      .execute();

    // Test with wrong password
    const invalidInput: TendikLoginInput = {
      username: testTendikData.username,
      password: 'wrongpassword'
    };

    const result = await tendikLogin(invalidInput);
    expect(result).toBeNull();
  });

  it('should handle tendik with null profile photo', async () => {
    // Create tendik without profile photo
    const passwordHash = await bcrypt.hash(testTendikData.password, 10);
    const result = await db.insert(tendiksTable)
      .values({
        name: testTendikData.name,
        username: testTendikData.username,
        password_hash: passwordHash,
        position: testTendikData.position,
        profile_photo: null
      })
      .returning()
      .execute();

    const loginResult = await tendikLogin(testLoginInput);

    expect(loginResult).not.toBeNull();
    expect(loginResult!.profile_photo).toBeNull();
  });

  it('should authenticate different positions correctly', async () => {
    // Test with different position
    const passwordHash = await bcrypt.hash(testTendikData.password, 10);
    await db.insert(tendiksTable)
      .values({
        name: 'Jane Smith',
        username: 'janesmith',
        password_hash: passwordHash,
        position: 'Kepala Madrasah',
        profile_photo: null
      })
      .execute();

    const loginInput: TendikLoginInput = {
      username: 'janesmith',
      password: 'password123'
    };

    const result = await tendikLogin(loginInput);

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('Jane Smith');
    expect(result!.position).toEqual('Kepala Madrasah');
  });
});

describe('getTendikProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should retrieve tendik profile by ID', async () => {
    // Create tendik
    const passwordHash = await bcrypt.hash(testTendikData.password, 10);
    const result = await db.insert(tendiksTable)
      .values({
        name: testTendikData.name,
        username: testTendikData.username,
        password_hash: passwordHash,
        position: testTendikData.position,
        profile_photo: testTendikData.profile_photo
      })
      .returning()
      .execute();

    const createdTendik = result[0];

    // Test profile retrieval
    const profile = await getTendikProfile(createdTendik.id);

    expect(profile).not.toBeNull();
    expect(profile!.id).toEqual(createdTendik.id);
    expect(profile!.name).toEqual(testTendikData.name);
    expect(profile!.username).toEqual(testTendikData.username);
    expect(profile!.position).toEqual(testTendikData.position);
    expect(profile!.profile_photo).toEqual(testTendikData.profile_photo);
    expect(profile!.password_hash).toBeDefined();
    expect(profile!.created_at).toBeInstanceOf(Date);
    expect(profile!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent tendik ID', async () => {
    const result = await getTendikProfile(999);
    expect(result).toBeNull();
  });

  it('should handle tendik with null profile photo in profile retrieval', async () => {
    // Create tendik without profile photo
    const passwordHash = await bcrypt.hash(testTendikData.password, 10);
    const result = await db.insert(tendiksTable)
      .values({
        name: testTendikData.name,
        username: testTendikData.username,
        password_hash: passwordHash,
        position: testTendikData.position,
        profile_photo: null
      })
      .returning()
      .execute();

    const createdTendik = result[0];

    const profile = await getTendikProfile(createdTendik.id);

    expect(profile).not.toBeNull();
    expect(profile!.profile_photo).toBeNull();
    expect(profile!.name).toEqual(testTendikData.name);
  });

  it('should retrieve profile for different positions', async () => {
    // Create tendik with Operator position
    const passwordHash = await bcrypt.hash('testpass', 10);
    const result = await db.insert(tendiksTable)
      .values({
        name: 'System Operator',
        username: 'sysop',
        password_hash: passwordHash,
        position: 'Operator',
        profile_photo: null
      })
      .returning()
      .execute();

    const createdTendik = result[0];

    const profile = await getTendikProfile(createdTendik.id);

    expect(profile).not.toBeNull();
    expect(profile!.name).toEqual('System Operator');
    expect(profile!.username).toEqual('sysop');
    expect(profile!.position).toEqual('Operator');
  });
});
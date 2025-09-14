import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  adminsTable, 
  tendiksTable, 
  attendanceTable, 
  geotagSettingsTable, 
  systemSettingsTable, 
  holidaysTable,
  staffPermissionsTable 
} from '../db/schema';
import { eq } from 'drizzle-orm';
import { initializeDatabase, seedTestData } from '../handlers/database_init';

describe('initializeDatabase', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create default admin user', async () => {
    await initializeDatabase();

    const admins = await db.select()
      .from(adminsTable)
      .where(eq(adminsTable.username, 'munir'))
      .execute();

    expect(admins).toHaveLength(1);
    expect(admins[0].name).toEqual('Munir Administrator');
    expect(admins[0].username).toEqual('munir');
    expect(admins[0].password_hash).toMatch(/^hashed_admin123_/);
    expect(admins[0].profile_photo).toBeNull();
    expect(admins[0].created_at).toBeInstanceOf(Date);
  });

  it('should create initial system settings', async () => {
    await initializeDatabase();

    const settings = await db.select()
      .from(systemSettingsTable)
      .execute();

    expect(settings).toHaveLength(1);
    expect(settings[0].academic_year).toEqual('2025/2026');
    expect(settings[0].school_logo).toBeNull();
    expect(settings[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create default geotag settings', async () => {
    await initializeDatabase();

    const geotagSettings = await db.select()
      .from(geotagSettingsTable)
      .execute();

    expect(geotagSettings).toHaveLength(1);
    expect(geotagSettings[0].school_latitude).toEqual(-6.2088);
    expect(geotagSettings[0].school_longitude).toEqual(106.8456);
    expect(geotagSettings[0].tolerance_radius).toEqual(100.0);
    expect(geotagSettings[0].updated_at).toBeInstanceOf(Date);
  });

  it('should not create duplicate admin when run multiple times', async () => {
    await initializeDatabase();
    await initializeDatabase(); // Run twice

    const admins = await db.select()
      .from(adminsTable)
      .where(eq(adminsTable.username, 'munir'))
      .execute();

    expect(admins).toHaveLength(1); // Should still be only one
  });

  it('should not create duplicate settings when run multiple times', async () => {
    await initializeDatabase();
    await initializeDatabase(); // Run twice

    const settings = await db.select()
      .from(systemSettingsTable)
      .execute();

    expect(settings).toHaveLength(1); // Should still be only one

    const geotagSettings = await db.select()
      .from(geotagSettingsTable)
      .execute();

    expect(geotagSettings).toHaveLength(1); // Should still be only one
  });
});

describe('seedTestData', () => {
  beforeEach(async () => {
    await createDB();
    await initializeDatabase(); // Need admin user for seedTestData
  });
  afterEach(resetDB);

  it('should create test tendik users', async () => {
    await seedTestData();

    const tendiks = await db.select()
      .from(tendiksTable)
      .execute();

    expect(tendiks.length).toBeGreaterThanOrEqual(3);

    // Check for specific test users
    const zaki = tendiks.find(t => t.username === 'zaki');
    expect(zaki).toBeDefined();
    expect(zaki?.name).toEqual('Zaki Rahman');
    expect(zaki?.position).toEqual('Kepala TU');
    expect(zaki?.password_hash).toMatch(/^hashed_zaki123_/);

    const ngiza = tendiks.find(t => t.username === 'ngiza');
    expect(ngiza).toBeDefined();
    expect(ngiza?.name).toEqual('Ngiza Sari');
    expect(ngiza?.position).toEqual('Staf TU');

    const ahmad = tendiks.find(t => t.username === 'ahmad');
    expect(ahmad).toBeDefined();
    expect(ahmad?.name).toEqual('Ahmad Operator');
    expect(ahmad?.position).toEqual('Operator');
  });

  it('should create sample attendance records', async () => {
    await seedTestData();

    const attendance = await db.select()
      .from(attendanceTable)
      .execute();

    expect(attendance.length).toBeGreaterThan(0);

    // Verify attendance record structure
    const record = attendance[0];
    expect(record.tendik_id).toBeDefined();
    expect(record.date).toBeDefined();
    expect(record.checkin_time).toBeInstanceOf(Date);
    expect(record.checkout_time).toBeInstanceOf(Date);
    expect(['Hadir', 'Terlambat', 'Alpha']).toContain(record.status);
    expect(typeof record.latitude).toBe('number');
    expect(typeof record.longitude).toBe('number');
    expect(record.selfie_photo).toMatch(/^selfie_.*\.jpg$/);
  });

  it('should create test holidays', async () => {
    await seedTestData();

    const holidays = await db.select()
      .from(holidaysTable)
      .execute();

    expect(holidays.length).toBeGreaterThanOrEqual(2);

    const newYear = holidays.find(h => h.date === '2025-01-01');
    expect(newYear).toBeDefined();
    expect(newYear?.description).toEqual('Tahun Baru Masehi');

    const independence = holidays.find(h => h.date === '2025-08-17');
    expect(independence).toBeDefined();
    expect(independence?.description).toEqual('Hari Kemerdekaan Indonesia');
  });

  it('should create test staff permissions', async () => {
    await seedTestData();

    const permissions = await db.select()
      .from(staffPermissionsTable)
      .execute();

    expect(permissions.length).toBeGreaterThan(0);

    const permission = permissions[0];
    expect(permission.tendik_id).toBeDefined();
    expect(permission.date).toBeDefined();
    expect(permission.permission_type).toEqual('Izin Sakit');
    expect(permission.description).toEqual('Sakit demam, perlu istirahat di rumah');
    expect(permission.approved_by).toBeDefined();
    expect(permission.created_at).toBeInstanceOf(Date);
  });

  it('should throw error if admin not found', async () => {
    // Delete the admin user to simulate missing admin
    await db.delete(adminsTable)
      .where(eq(adminsTable.username, 'munir'))
      .execute();

    await expect(seedTestData()).rejects.toThrow(/Admin user not found/i);
  });

  it('should not create duplicate tendiks when run multiple times', async () => {
    await seedTestData();
    await seedTestData(); // Run twice

    const tendiks = await db.select()
      .from(tendiksTable)
      .execute();

    // Should still have only unique usernames
    const usernames = tendiks.map(t => t.username);
    const uniqueUsernames = new Set(usernames);
    expect(usernames.length).toEqual(uniqueUsernames.size);

    // Check specific users still exist only once
    const zakiRecords = tendiks.filter(t => t.username === 'zaki');
    expect(zakiRecords).toHaveLength(1);
  });

  it('should create attendance records with proper date range', async () => {
    await seedTestData();

    const attendance = await db.select()
      .from(attendanceTable)
      .execute();

    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);

    attendance.forEach(record => {
      const recordDate = new Date(record.date);
      expect(recordDate >= sevenDaysAgo).toBe(true);
      expect(recordDate <= today).toBe(true);
    });
  });

  it('should create attendance with realistic check-in/out times', async () => {
    await seedTestData();

    const attendance = await db.select()
      .from(attendanceTable)
      .execute();

    attendance.forEach(record => {
      if (record.checkin_time) {
        const checkinHour = record.checkin_time.getHours();
        expect(checkinHour).toBeGreaterThanOrEqual(8);
        expect(checkinHour).toBeLessThan(9);
      }

      if (record.checkout_time) {
        const checkoutHour = record.checkout_time.getHours();
        expect(checkoutHour).toBeGreaterThanOrEqual(16);
        expect(checkoutHour).toBeLessThan(17);
      }

      // Check-out should be after check-in
      if (record.checkin_time && record.checkout_time) {
        expect(record.checkout_time > record.checkin_time).toBe(true);
      }
    });
  });
});
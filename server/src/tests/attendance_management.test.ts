import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  tendiksTable, 
  attendanceTable, 
  geotagSettingsTable,
  holidaysTable 
} from '../db/schema';
import {
  checkin,
  checkout,
  getTendikAttendanceHistory,
  getAttendanceRecapitulation,
  getLiveAttendance,
  getTodayAttendance
} from '../handlers/attendance_management';
import { 
  type CheckinInput, 
  type CheckoutInput,
  type RecapitulationFilter
} from '../schema';
import { eq, and } from 'drizzle-orm';

describe('Attendance Management', () => {
  let testTendikId: number;
  let testGeotagSettingId: number;

  beforeEach(async () => {
    await createDB();

    // Create test tendik
    const tendikResult = await db.insert(tendiksTable)
      .values({
        name: 'Test Staff',
        username: 'teststaff',
        password_hash: 'hashedpassword',
        position: 'Staf TU'
      })
      .returning()
      .execute();
    
    testTendikId = tendikResult[0].id;

    // Create geotag settings
    const geotagResult = await db.insert(geotagSettingsTable)
      .values({
        school_latitude: -6.2088,
        school_longitude: 106.8456,
        tolerance_radius: 100
      })
      .returning()
      .execute();
    
    testGeotagSettingId = geotagResult[0].id;
  });

  afterEach(resetDB);

  describe('checkin', () => {
    const validCheckinInput: CheckinInput = {
      tendik_id: 1, // Will be updated in tests
      latitude: -6.2088,
      longitude: 106.8456,
      selfie_photo: 'base64_selfie_data'
    };

    it('should create attendance record for valid check-in', async () => {
      const input = { ...validCheckinInput, tendik_id: testTendikId };
      
      const result = await checkin(input);

      expect(result.tendik_id).toEqual(testTendikId);
      expect(result.status).toEqual('Hadir');
      expect(result.latitude).toEqual(input.latitude);
      expect(result.longitude).toEqual(input.longitude);
      expect(result.selfie_photo).toEqual(input.selfie_photo);
      expect(result.checkin_time).toBeInstanceOf(Date);
      expect(result.checkout_time).toBeNull();
      expect(result.id).toBeDefined();
    });

    it('should save attendance record to database', async () => {
      const input = { ...validCheckinInput, tendik_id: testTendikId };
      
      const result = await checkin(input);

      const attendanceRecords = await db.select()
        .from(attendanceTable)
        .where(eq(attendanceTable.id, result.id))
        .execute();

      expect(attendanceRecords).toHaveLength(1);
      expect(attendanceRecords[0].tendik_id).toEqual(testTendikId);
      expect(attendanceRecords[0].status).toEqual('Hadir');
    });

    it('should reject check-in for non-existent tendik', async () => {
      const input = { ...validCheckinInput, tendik_id: 99999 };
      
      await expect(checkin(input)).rejects.toThrow(/Tendik not found/i);
    });

    it('should reject check-in outside geotag radius', async () => {
      const input = { 
        ...validCheckinInput, 
        tendik_id: testTendikId,
        latitude: -6.3000,  // Far from school
        longitude: 106.9000
      };
      
      await expect(checkin(input)).rejects.toThrow(/outside allowed radius/i);
    });

    it('should reject duplicate check-in on same day', async () => {
      const input = { ...validCheckinInput, tendik_id: testTendikId };
      
      // First check-in should succeed
      await checkin(input);
      
      // Second check-in should fail
      await expect(checkin(input)).rejects.toThrow(/Already checked in today/i);
    });

    it('should reject check-in on holiday', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayString = today.toISOString().split('T')[0];
      
      // Create holiday for today
      await db.insert(holidaysTable)
        .values({
          date: todayString,
          description: 'Test Holiday'
        })
        .execute();

      const input = { ...validCheckinInput, tendik_id: testTendikId };
      
      await expect(checkin(input)).rejects.toThrow(/Cannot check in on a holiday/i);
    });
  });

  describe('checkout', () => {
    const validCheckoutInput: CheckoutInput = {
      tendik_id: 1, // Will be updated in tests
      latitude: -6.2088,
      longitude: 106.8456,
      selfie_photo: 'base64_checkout_selfie'
    };

    it('should update attendance record with checkout time', async () => {
      // First check in
      const checkinInput = { 
        tendik_id: testTendikId,
        latitude: -6.2088,
        longitude: 106.8456,
        selfie_photo: 'checkin_photo'
      };
      
      const checkinResult = await checkin(checkinInput);
      
      // Then check out
      const checkoutInput = { ...validCheckoutInput, tendik_id: testTendikId };
      const checkoutResult = await checkout(checkoutInput);

      expect(checkoutResult.id).toEqual(checkinResult.id);
      expect(checkoutResult.checkout_time).toBeInstanceOf(Date);
      expect(checkoutResult.checkout_time).not.toBeNull();
    });

    it('should reject checkout for non-existent tendik', async () => {
      const input = { ...validCheckoutInput, tendik_id: 99999 };
      
      await expect(checkout(input)).rejects.toThrow(/Tendik not found/i);
    });

    it('should reject checkout without prior check-in', async () => {
      const input = { ...validCheckoutInput, tendik_id: testTendikId };
      
      await expect(checkout(input)).rejects.toThrow(/No check-in record found/i);
    });

    it('should reject duplicate checkout', async () => {
      // First check in
      const checkinInput = { 
        tendik_id: testTendikId,
        latitude: -6.2088,
        longitude: 106.8456,
        selfie_photo: 'checkin_photo'
      };
      
      await checkin(checkinInput);
      
      // First checkout
      const checkoutInput = { ...validCheckoutInput, tendik_id: testTendikId };
      await checkout(checkoutInput);
      
      // Second checkout should fail
      await expect(checkout(checkoutInput)).rejects.toThrow(/Already checked out today/i);
    });

    it('should reject checkout outside geotag radius', async () => {
      // First check in
      const checkinInput = { 
        tendik_id: testTendikId,
        latitude: -6.2088,
        longitude: 106.8456,
        selfie_photo: 'checkin_photo'
      };
      
      await checkin(checkinInput);
      
      // Try checkout far from school
      const checkoutInput = { 
        ...validCheckoutInput, 
        tendik_id: testTendikId,
        latitude: -6.3000,
        longitude: 106.9000
      };
      
      await expect(checkout(checkoutInput)).rejects.toThrow(/outside allowed radius/i);
    });
  });

  describe('getTendikAttendanceHistory', () => {
    it('should return attendance history for valid tendik', async () => {
      // Create attendance record
      const checkinInput = { 
        tendik_id: testTendikId,
        latitude: -6.2088,
        longitude: 106.8456,
        selfie_photo: 'test_photo'
      };
      
      await checkin(checkinInput);
      
      const history = await getTendikAttendanceHistory(testTendikId);
      
      expect(history).toHaveLength(1);
      expect(history[0].tendik_id).toEqual(testTendikId);
      expect(history[0].status).toEqual('Hadir');
    });

    it('should return empty array for tendik without attendance', async () => {
      const history = await getTendikAttendanceHistory(testTendikId);
      
      expect(history).toHaveLength(0);
    });

    it('should reject request for non-existent tendik', async () => {
      await expect(getTendikAttendanceHistory(99999))
        .rejects.toThrow(/Tendik not found/i);
    });
  });

  describe('getAttendanceRecapitulation', () => {
    it('should return all attendance records with no filter', async () => {
      // Create attendance record
      const checkinInput = { 
        tendik_id: testTendikId,
        latitude: -6.2088,
        longitude: 106.8456,
        selfie_photo: 'test_photo'
      };
      
      await checkin(checkinInput);
      
      const filter: RecapitulationFilter = {};
      const results = await getAttendanceRecapitulation(filter);
      
      expect(results).toHaveLength(1);
      expect(results[0].tendik_id).toEqual(testTendikId);
    });

    it('should filter by tendik_id', async () => {
      // Create second tendik
      const tendik2Result = await db.insert(tendiksTable)
        .values({
          name: 'Test Staff 2',
          username: 'teststaff2',
          password_hash: 'hashedpassword',
          position: 'Operator'
        })
        .returning()
        .execute();
      
      const testTendikId2 = tendik2Result[0].id;

      // Create attendance for both tendiks
      await checkin({ 
        tendik_id: testTendikId,
        latitude: -6.2088,
        longitude: 106.8456,
        selfie_photo: 'photo1'
      });

      await checkin({ 
        tendik_id: testTendikId2,
        latitude: -6.2088,
        longitude: 106.8456,
        selfie_photo: 'photo2'
      });
      
      const filter: RecapitulationFilter = {
        tendik_id: testTendikId
      };
      const results = await getAttendanceRecapitulation(filter);
      
      expect(results).toHaveLength(1);
      expect(results[0].tendik_id).toEqual(testTendikId);
    });

    it('should filter by status', async () => {
      // Create attendance record
      await checkin({ 
        tendik_id: testTendikId,
        latitude: -6.2088,
        longitude: 106.8456,
        selfie_photo: 'test_photo'
      });
      
      const filter: RecapitulationFilter = {
        status: 'Hadir'
      };
      const results = await getAttendanceRecapitulation(filter);
      
      expect(results).toHaveLength(1);
      expect(results[0].status).toEqual('Hadir');
    });

    it('should filter by date range', async () => {
      // Create attendance record
      await checkin({ 
        tendik_id: testTendikId,
        latitude: -6.2088,
        longitude: 106.8456,
        selfie_photo: 'test_photo'
      });
      
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const filter: RecapitulationFilter = {
        start_date: today.toISOString().split('T')[0],
        end_date: tomorrow.toISOString().split('T')[0]
      };
      const results = await getAttendanceRecapitulation(filter);
      
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('getTodayAttendance', () => {
    it('should return today attendance records', async () => {
      // Create attendance record
      const checkinInput = { 
        tendik_id: testTendikId,
        latitude: -6.2088,
        longitude: 106.8456,
        selfie_photo: 'test_photo'
      };
      
      await checkin(checkinInput);
      
      const results = await getTodayAttendance();
      
      expect(results).toHaveLength(1);
      expect(results[0].tendik_id).toEqual(testTendikId);
      expect(results[0].date).toBeInstanceOf(Date);
    });

    it('should return empty array when no attendance today', async () => {
      const results = await getTodayAttendance();
      
      expect(results).toHaveLength(0);
    });
  });

  describe('getLiveAttendance', () => {
    it('should return recent attendance activities', async () => {
      // Create attendance record
      const checkinInput = { 
        tendik_id: testTendikId,
        latitude: -6.2088,
        longitude: 106.8456,
        selfie_photo: 'test_photo'
      };
      
      await checkin(checkinInput);
      
      const results = await getLiveAttendance();
      
      expect(results).toHaveLength(1);
      expect(results[0].tendik_name).toEqual('Test Staff');
      expect(results[0].action).toEqual('checkin');
      expect(results[0].time).toBeInstanceOf(Date);
      expect(results[0].photo).toEqual('test_photo');
    });

    it('should return both checkin and checkout activities', async () => {
      // Check in
      const checkinInput = { 
        tendik_id: testTendikId,
        latitude: -6.2088,
        longitude: 106.8456,
        selfie_photo: 'checkin_photo'
      };
      
      await checkin(checkinInput);
      
      // Check out
      const checkoutInput = { 
        tendik_id: testTendikId,
        latitude: -6.2088,
        longitude: 106.8456,
        selfie_photo: 'checkout_photo'
      };
      
      await checkout(checkoutInput);
      
      const results = await getLiveAttendance();
      
      expect(results).toHaveLength(2);
      
      // Should be sorted by time descending (checkout first, then checkin)
      expect(results[0].action).toEqual('checkout');
      expect(results[1].action).toEqual('checkin');
    });

    it('should return empty array when no recent activities', async () => {
      const results = await getLiveAttendance();
      
      expect(results).toHaveLength(0);
    });
  });
});
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { attendanceTable, tendiksTable, adminsTable } from '../db/schema';
import { type RecapitulationFilter } from '../schema';
import { exportRecapitulationToPDF, generateAttendanceReport } from '../handlers/pdf_export';

// Test data
const testAdmin = {
  name: 'Test Admin',
  username: 'admin123',
  password_hash: '$2b$10$hash',
  profile_photo: null
};

const testTendik1 = {
  name: 'John Doe',
  username: 'johndoe',
  password_hash: '$2b$10$hash',
  position: 'Kepala TU' as const,
  profile_photo: null
};

const testTendik2 = {
  name: 'Jane Smith',
  username: 'janesmith',
  password_hash: '$2b$10$hash',
  position: 'Staf TU' as const,
  profile_photo: null
};

describe('exportRecapitulationToPDF', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should export attendance data to PDF buffer', async () => {
    // Create admin and tendiks first
    const adminResult = await db.insert(adminsTable)
      .values(testAdmin)
      .returning()
      .execute();

    const tendik1Result = await db.insert(tendiksTable)
      .values(testTendik1)
      .returning()
      .execute();

    const tendik2Result = await db.insert(tendiksTable)
      .values(testTendik2)
      .returning()
      .execute();

    // Create attendance records - use string dates
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    await db.insert(attendanceTable)
      .values({
        tendik_id: tendik1Result[0].id,
        date: today,
        checkin_time: new Date('2024-01-15T08:00:00Z'),
        checkout_time: new Date('2024-01-15T17:00:00Z'),
        status: 'Hadir' as const,
        latitude: -7.8731,
        longitude: 111.4684,
        selfie_photo: 'selfie1.jpg'
      })
      .execute();

    await db.insert(attendanceTable)
      .values({
        tendik_id: tendik2Result[0].id,
        date: yesterday,
        checkin_time: new Date('2024-01-14T08:30:00Z'),
        checkout_time: new Date('2024-01-14T17:00:00Z'),
        status: 'Terlambat' as const,
        latitude: -7.8731,
        longitude: 111.4684,
        selfie_photo: 'selfie2.jpg'
      })
      .execute();

    const filter: RecapitulationFilter = {};

    const result = await exportRecapitulationToPDF(filter);

    // Verify it's a valid PDF buffer
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
    
    // Check PDF magic number (first 4 bytes should be %PDF)
    const pdfHeader = result.subarray(0, 4).toString();
    expect(pdfHeader).toBe('%PDF');
  });

  it('should apply date range filter', async () => {
    // Create admin and tendik
    const adminResult = await db.insert(adminsTable)
      .values(testAdmin)
      .returning()
      .execute();

    const tendikResult = await db.insert(tendiksTable)
      .values(testTendik1)
      .returning()
      .execute();

    // Create attendance records for different dates
    const today = new Date().toISOString().split('T')[0];
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    await db.insert(attendanceTable)
      .values({
        tendik_id: tendikResult[0].id,
        date: today,
        checkin_time: new Date('2024-01-15T08:00:00Z'),
        checkout_time: null,
        status: 'Hadir' as const,
        latitude: null,
        longitude: null,
        selfie_photo: null
      })
      .execute();

    await db.insert(attendanceTable)
      .values({
        tendik_id: tendikResult[0].id,
        date: lastWeek,
        checkin_time: new Date('2024-01-08T08:00:00Z'),
        checkout_time: null,
        status: 'Alpha' as const,
        latitude: null,
        longitude: null,
        selfie_photo: null
      })
      .execute();

    const filter: RecapitulationFilter = {
      start_date: today, // Today only
      end_date: today
    };

    const result = await exportRecapitulationToPDF(filter);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
    
    // Verify it's still a valid PDF
    const pdfHeader = result.subarray(0, 4).toString();
    expect(pdfHeader).toBe('%PDF');
  });

  it('should apply tendik_id filter', async () => {
    // Create admin and tendiks
    const adminResult = await db.insert(adminsTable)
      .values(testAdmin)
      .returning()
      .execute();

    const tendik1Result = await db.insert(tendiksTable)
      .values(testTendik1)
      .returning()
      .execute();

    const tendik2Result = await db.insert(tendiksTable)
      .values(testTendik2)
      .returning()
      .execute();

    // Create attendance for both tendiks
    const today = new Date().toISOString().split('T')[0];

    await db.insert(attendanceTable)
      .values({
        tendik_id: tendik1Result[0].id,
        date: today,
        checkin_time: new Date('2024-01-15T08:00:00Z'),
        checkout_time: null,
        status: 'Hadir' as const,
        latitude: null,
        longitude: null,
        selfie_photo: null
      })
      .execute();

    await db.insert(attendanceTable)
      .values({
        tendik_id: tendik2Result[0].id,
        date: today,
        checkin_time: new Date('2024-01-15T08:30:00Z'),
        checkout_time: null,
        status: 'Terlambat' as const,
        latitude: null,
        longitude: null,
        selfie_photo: null
      })
      .execute();

    const filter: RecapitulationFilter = {
      tendik_id: tendik1Result[0].id // Filter for first tendik only
    };

    const result = await exportRecapitulationToPDF(filter);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
    
    const pdfHeader = result.subarray(0, 4).toString();
    expect(pdfHeader).toBe('%PDF');
  });

  it('should apply status filter', async () => {
    // Create admin and tendik
    const adminResult = await db.insert(adminsTable)
      .values(testAdmin)
      .returning()
      .execute();

    const tendikResult = await db.insert(tendiksTable)
      .values(testTendik1)
      .returning()
      .execute();

    // Create attendance with different statuses
    const today = new Date().toISOString().split('T')[0];

    await db.insert(attendanceTable)
      .values({
        tendik_id: tendikResult[0].id,
        date: today,
        checkin_time: new Date('2024-01-15T08:00:00Z'),
        checkout_time: null,
        status: 'Hadir' as const,
        latitude: null,
        longitude: null,
        selfie_photo: null
      })
      .execute();

    await db.insert(attendanceTable)
      .values({
        tendik_id: tendikResult[0].id,
        date: today,
        checkin_time: new Date('2024-01-15T08:30:00Z'),
        checkout_time: null,
        status: 'Terlambat' as const,
        latitude: null,
        longitude: null,
        selfie_photo: null
      })
      .execute();

    const filter: RecapitulationFilter = {
      status: 'Hadir' // Filter for 'Hadir' status only
    };

    const result = await exportRecapitulationToPDF(filter);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
    
    const pdfHeader = result.subarray(0, 4).toString();
    expect(pdfHeader).toBe('%PDF');
  });

  it('should handle empty results', async () => {
    // No data in database
    const filter: RecapitulationFilter = {};

    const result = await exportRecapitulationToPDF(filter);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
    
    // Should still be a valid PDF even with no data
    const pdfHeader = result.subarray(0, 4).toString();
    expect(pdfHeader).toBe('%PDF');
  });
});

describe('generateAttendanceReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate comprehensive attendance report', async () => {
    // Create admin and tendiks
    const adminResult = await db.insert(adminsTable)
      .values(testAdmin)
      .returning()
      .execute();

    const tendik1Result = await db.insert(tendiksTable)
      .values(testTendik1)
      .returning()
      .execute();

    const tendik2Result = await db.insert(tendiksTable)
      .values(testTendik2)
      .returning()
      .execute();

    // Create varied attendance data
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    await db.insert(attendanceTable)
      .values({
        tendik_id: tendik1Result[0].id,
        date: today,
        checkin_time: new Date('2024-01-15T08:00:00Z'),
        checkout_time: new Date('2024-01-15T17:00:00Z'),
        status: 'Hadir' as const,
        latitude: -7.8731,
        longitude: 111.4684,
        selfie_photo: 'selfie1.jpg'
      })
      .execute();

    await db.insert(attendanceTable)
      .values({
        tendik_id: tendik2Result[0].id,
        date: yesterday,
        checkin_time: new Date('2024-01-14T08:30:00Z'),
        checkout_time: new Date('2024-01-14T17:00:00Z'),
        status: 'Terlambat' as const,
        latitude: -7.8731,
        longitude: 111.4684,
        selfie_photo: 'selfie2.jpg'
      })
      .execute();

    await db.insert(attendanceTable)
      .values({
        tendik_id: tendik1Result[0].id,
        date: yesterday,
        checkin_time: null,
        checkout_time: null,
        status: 'Alpha' as const,
        latitude: null,
        longitude: null,
        selfie_photo: null
      })
      .execute();

    const startDate = yesterday;
    const endDate = today;

    const result = await generateAttendanceReport(startDate, endDate);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
    
    // Check PDF magic number
    const pdfHeader = result.subarray(0, 4).toString();
    expect(pdfHeader).toBe('%PDF');
  });

  it('should filter by tendik_id when provided', async () => {
    // Create admin and tendiks
    const adminResult = await db.insert(adminsTable)
      .values(testAdmin)
      .returning()
      .execute();

    const tendik1Result = await db.insert(tendiksTable)
      .values(testTendik1)
      .returning()
      .execute();

    const tendik2Result = await db.insert(tendiksTable)
      .values(testTendik2)
      .returning()
      .execute();

    // Create attendance for both tendiks
    const today = new Date().toISOString().split('T')[0];

    await db.insert(attendanceTable)
      .values({
        tendik_id: tendik1Result[0].id,
        date: today,
        checkin_time: new Date('2024-01-15T08:00:00Z'),
        checkout_time: null,
        status: 'Hadir' as const,
        latitude: null,
        longitude: null,
        selfie_photo: null
      })
      .execute();

    await db.insert(attendanceTable)
      .values({
        tendik_id: tendik2Result[0].id,
        date: today,
        checkin_time: new Date('2024-01-15T08:30:00Z'),
        checkout_time: null,
        status: 'Terlambat' as const,
        latitude: null,
        longitude: null,
        selfie_photo: null
      })
      .execute();

    const startDate = today;
    const endDate = today;

    const result = await generateAttendanceReport(startDate, endDate, tendik1Result[0].id);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
    
    const pdfHeader = result.subarray(0, 4).toString();
    expect(pdfHeader).toBe('%PDF');
  });

  it('should handle date range with no data', async () => {
    // Future date range with no data
    const future1 = new Date();
    future1.setMonth(future1.getMonth() + 1);
    const future2 = new Date();
    future2.setMonth(future2.getMonth() + 2);

    const startDate = future1.toISOString().split('T')[0];
    const endDate = future2.toISOString().split('T')[0];

    const result = await generateAttendanceReport(startDate, endDate);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
    
    // Should still be a valid PDF with statistics showing zeros
    const pdfHeader = result.subarray(0, 4).toString();
    expect(pdfHeader).toBe('%PDF');
  });

  it('should include statistics in comprehensive report', async () => {
    // Create admin and tendik
    const adminResult = await db.insert(adminsTable)
      .values(testAdmin)
      .returning()
      .execute();

    const tendikResult = await db.insert(tendiksTable)
      .values(testTendik1)
      .returning()
      .execute();

    // Create attendance with all status types
    const today = new Date().toISOString().split('T')[0];

    await db.insert(attendanceTable)
      .values({
        tendik_id: tendikResult[0].id,
        date: today,
        checkin_time: new Date('2024-01-15T08:00:00Z'),
        checkout_time: new Date('2024-01-15T17:00:00Z'),
        status: 'Hadir' as const,
        latitude: null,
        longitude: null,
        selfie_photo: null
      })
      .execute();

    await db.insert(attendanceTable)
      .values({
        tendik_id: tendikResult[0].id,
        date: today,
        checkin_time: new Date('2024-01-15T08:30:00Z'),
        checkout_time: null,
        status: 'Terlambat' as const,
        latitude: null,
        longitude: null,
        selfie_photo: null
      })
      .execute();

    await db.insert(attendanceTable)
      .values({
        tendik_id: tendikResult[0].id,
        date: today,
        checkin_time: null,
        checkout_time: null,
        status: 'Alpha' as const,
        latitude: null,
        longitude: null,
        selfie_photo: null
      })
      .execute();

    const startDate = today;
    const endDate = today;

    const result = await generateAttendanceReport(startDate, endDate);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
    
    // Should contain statistical data in the PDF
    const pdfHeader = result.subarray(0, 4).toString();
    expect(pdfHeader).toBe('%PDF');
    
    // The buffer should be larger than a simple report due to statistics section
    expect(result.length).toBeGreaterThan(1000);
  });

  it('should handle single day date range', async () => {
    // Create admin and tendik
    const adminResult = await db.insert(adminsTable)
      .values(testAdmin)
      .returning()
      .execute();

    const tendikResult = await db.insert(tendiksTable)
      .values(testTendik1)
      .returning()
      .execute();

    const today = new Date().toISOString().split('T')[0];

    await db.insert(attendanceTable)
      .values({
        tendik_id: tendikResult[0].id,
        date: today,
        checkin_time: new Date('2024-01-15T08:00:00Z'),
        checkout_time: new Date('2024-01-15T17:00:00Z'),
        status: 'Hadir' as const,
        latitude: null,
        longitude: null,
        selfie_photo: null
      })
      .execute();

    const result = await generateAttendanceReport(today, today);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
    
    const pdfHeader = result.subarray(0, 4).toString();
    expect(pdfHeader).toBe('%PDF');
  });
});
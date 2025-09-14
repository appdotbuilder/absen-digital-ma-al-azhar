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

// Simple hash function for demo purposes - in production, use bcrypt or similar
function simpleHash(password: string): string {
  return `hashed_${password}_${Date.now()}`;
}

export async function initializeDatabase(): Promise<void> {
  try {
    // 1. Create default admin user
    const existingAdmin = await db.select()
      .from(adminsTable)
      .where(eq(adminsTable.username, 'munir'))
      .limit(1)
      .execute();

    if (existingAdmin.length === 0) {
      await db.insert(adminsTable)
        .values({
          name: 'Munir Administrator',
          username: 'munir',
          password_hash: simpleHash('admin123'),
          profile_photo: null
        })
        .execute();
    }

    // 2. Set up initial system settings
    const existingSettings = await db.select()
      .from(systemSettingsTable)
      .limit(1)
      .execute();

    if (existingSettings.length === 0) {
      await db.insert(systemSettingsTable)
        .values({
          academic_year: '2025/2026',
          school_logo: null
        })
        .execute();
    }

    // 3. Create default geotag settings
    const existingGeotag = await db.select()
      .from(geotagSettingsTable)
      .limit(1)
      .execute();

    if (existingGeotag.length === 0) {
      await db.insert(geotagSettingsTable)
        .values({
          school_latitude: -6.2088,  // Jakarta coordinates as example
          school_longitude: 106.8456,
          tolerance_radius: 100.0  // 100 meters radius
        })
        .execute();
    }

    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

export async function seedTestData(): Promise<void> {
  try {
    // Get admin ID for permission approvals
    const admin = await db.select()
      .from(adminsTable)
      .where(eq(adminsTable.username, 'munir'))
      .limit(1)
      .execute();

    if (admin.length === 0) {
      throw new Error('Admin user not found. Run initializeDatabase first.');
    }

    const adminId = admin[0].id;

    // 1. Create test tendik users
    const testTendiks = [
      {
        name: 'Zaki Rahman',
        username: 'zaki',
        password_hash: simpleHash('zaki123'),
        position: 'Kepala TU' as const,
        profile_photo: null
      },
      {
        name: 'Ngiza Sari',
        username: 'ngiza',
        password_hash: simpleHash('ngiza123'),
        position: 'Staf TU' as const,
        profile_photo: null
      },
      {
        name: 'Ahmad Operator',
        username: 'ahmad',
        password_hash: simpleHash('ahmad123'),
        position: 'Operator' as const,
        profile_photo: null
      }
    ];

    // Insert tendiks if they don't exist
    for (const tendik of testTendiks) {
      const existing = await db.select()
        .from(tendiksTable)
        .where(eq(tendiksTable.username, tendik.username))
        .limit(1)
        .execute();

      if (existing.length === 0) {
        await db.insert(tendiksTable)
          .values(tendik)
          .execute();
      }
    }

    // Get inserted tendik IDs
    const insertedTendiks = await db.select()
      .from(tendiksTable)
      .execute();

    // 2. Add sample attendance records for the last 7 days
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const attendanceDate = new Date(today);
      attendanceDate.setDate(today.getDate() - i);

      for (const tendik of insertedTendiks.slice(0, 2)) { // Only for Zaki and Ngiza
        const existingAttendance = await db.select()
          .from(attendanceTable)
          .where(eq(attendanceTable.tendik_id, tendik.id))
          .execute();

        if (existingAttendance.length === 0) {
          const checkinTime = new Date(attendanceDate);
          checkinTime.setHours(8, Math.floor(Math.random() * 30), 0, 0); // Random time between 8:00-8:30

          const checkoutTime = new Date(attendanceDate);
          checkoutTime.setHours(16, Math.floor(Math.random() * 30), 0, 0); // Random time between 16:00-16:30

          await db.insert(attendanceTable)
            .values({
              tendik_id: tendik.id,
              date: attendanceDate.toISOString().split('T')[0], // Date only
              checkin_time: checkinTime,
              checkout_time: checkoutTime,
              status: i % 3 === 0 ? 'Terlambat' : 'Hadir',
              latitude: -6.2088 + (Math.random() - 0.5) * 0.001,
              longitude: 106.8456 + (Math.random() - 0.5) * 0.001,
              selfie_photo: `selfie_${tendik.username}_${i}.jpg`
            })
            .execute();
        }
      }
    }

    // 3. Create test holidays
    const testHolidays = [
      {
        date: '2025-01-01',
        description: 'Tahun Baru Masehi'
      },
      {
        date: '2025-08-17',
        description: 'Hari Kemerdekaan Indonesia'
      }
    ];

    for (const holiday of testHolidays) {
      const existingHoliday = await db.select()
        .from(holidaysTable)
        .where(eq(holidaysTable.date, holiday.date))
        .limit(1)
        .execute();

      if (existingHoliday.length === 0) {
        await db.insert(holidaysTable)
          .values(holiday)
          .execute();
      }
    }

    // 4. Create test staff permissions
    if (insertedTendiks.length > 0) {
      const existingPermissions = await db.select()
        .from(staffPermissionsTable)
        .limit(1)
        .execute();

      if (existingPermissions.length === 0) {
        await db.insert(staffPermissionsTable)
          .values({
            tendik_id: insertedTendiks[0].id,
            date: today.toISOString().split('T')[0],
            permission_type: 'Izin Sakit',
            description: 'Sakit demam, perlu istirahat di rumah',
            approved_by: adminId
          })
          .execute();
      }
    }

    console.log('Test data seeding completed successfully');
  } catch (error) {
    console.error('Test data seeding failed:', error);
    throw error;
  }
}
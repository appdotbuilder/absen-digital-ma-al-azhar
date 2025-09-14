import { db } from '../db';
import { 
  attendanceTable, 
  tendiksTable, 
  geotagSettingsTable,
  holidaysTable 
} from '../db/schema';
import { 
  type CheckinInput, 
  type CheckoutInput, 
  type Attendance,
  type RecapitulationFilter,
  type LiveAttendance
} from '../schema';
import { eq, and, gte, lte, desc, between, SQL } from 'drizzle-orm';

// Helper function to calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Helper function to generate random time within range
function generateRandomTime(startHour: number, startMinute: number, endHour: number, endMinute: number, date: Date): Date {
  const startTime = startHour * 60 + startMinute; // Convert to minutes
  const endTime = endHour * 60 + endMinute;
  const randomTime = Math.floor(Math.random() * (endTime - startTime + 1)) + startTime;
  
  const hour = Math.floor(randomTime / 60);
  const minute = randomTime % 60;
  
  const result = new Date(date);
  result.setHours(hour, minute, 0, 0);
  return result;
}

// Helper function to check if date is a holiday
async function isHoliday(date: Date): Promise<boolean> {
  try {
    const dateString = date.toISOString().split('T')[0];
    const holidays = await db.select()
      .from(holidaysTable)
      .where(eq(holidaysTable.date, dateString))
      .execute();
    
    return holidays.length > 0;
  } catch (error) {
    console.error('Failed to check holiday status:', error);
    return false;
  }
}

export async function checkin(input: CheckinInput): Promise<Attendance> {
  try {
    // Verify tendik exists
    const tendik = await db.select()
      .from(tendiksTable)
      .where(eq(tendiksTable.id, input.tendik_id))
      .execute();

    if (tendik.length === 0) {
      throw new Error('Tendik not found');
    }

    // Get geotag settings
    const geotagSettings = await db.select()
      .from(geotagSettingsTable)
      .execute();

    if (geotagSettings.length === 0) {
      throw new Error('Geotag settings not configured');
    }

    const settings = geotagSettings[0];
    
    // Validate location
    const distance = calculateDistance(
      input.latitude,
      input.longitude,
      settings.school_latitude,
      settings.school_longitude
    );

    if (distance > settings.tolerance_radius) {
      throw new Error('Location is outside allowed radius');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split('T')[0];

    // Check if already checked in today
    const existingAttendance = await db.select()
      .from(attendanceTable)
      .where(
        and(
          eq(attendanceTable.tendik_id, input.tendik_id),
          eq(attendanceTable.date, todayString)
        )
      )
      .execute();

    if (existingAttendance.length > 0) {
      throw new Error('Already checked in today');
    }

    // Check if today is a holiday
    const holidayStatus = await isHoliday(today);
    if (holidayStatus) {
      throw new Error('Cannot check in on a holiday');
    }

    const now = new Date();
    let checkinTime = now;
    let status: 'Hadir' | 'Terlambat' | 'Alpha' = 'Hadir';

    // Check if late (after 07:00 WIB)
    const sevenAM = new Date(today);
    sevenAM.setHours(7, 0, 0, 0);

    if (now > sevenAM) {
      // Generate random time between 06:30-07:00 WIB
      checkinTime = generateRandomTime(6, 30, 7, 0, today);
      status = 'Terlambat';
    }

    // Insert attendance record
    const result = await db.insert(attendanceTable)
      .values({
        tendik_id: input.tendik_id,
        date: todayString,
        checkin_time: checkinTime,
        checkout_time: null,
        status: status,
        latitude: input.latitude,
        longitude: input.longitude,
        selfie_photo: input.selfie_photo
      })
      .returning()
      .execute();

    const attendance = result[0];
    return {
      ...attendance,
      date: new Date(attendance.date)
    };
  } catch (error) {
    console.error('Check-in failed:', error);
    throw error;
  }
}

export async function checkout(input: CheckoutInput): Promise<Attendance> {
  try {
    // Verify tendik exists
    const tendik = await db.select()
      .from(tendiksTable)
      .where(eq(tendiksTable.id, input.tendik_id))
      .execute();

    if (tendik.length === 0) {
      throw new Error('Tendik not found');
    }

    // Get geotag settings
    const geotagSettings = await db.select()
      .from(geotagSettingsTable)
      .execute();

    if (geotagSettings.length === 0) {
      throw new Error('Geotag settings not configured');
    }

    const settings = geotagSettings[0];
    
    // Validate location
    const distance = calculateDistance(
      input.latitude,
      input.longitude,
      settings.school_latitude,
      settings.school_longitude
    );

    if (distance > settings.tolerance_radius) {
      throw new Error('Location is outside allowed radius');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split('T')[0];

    // Find existing attendance record for today
    const existingAttendance = await db.select()
      .from(attendanceTable)
      .where(
        and(
          eq(attendanceTable.tendik_id, input.tendik_id),
          eq(attendanceTable.date, todayString)
        )
      )
      .execute();

    if (existingAttendance.length === 0) {
      throw new Error('No check-in record found for today');
    }

    const attendance = existingAttendance[0];

    if (attendance.checkout_time !== null) {
      throw new Error('Already checked out today');
    }

    const now = new Date();
    let checkoutTime = now;
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // Apply checkout time logic
    if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday-Friday
      const twoPM = new Date(today);
      twoPM.setHours(14, 0, 0, 0);
      
      if (now < twoPM) {
        // Generate random time between 14:00-14:30 WIB
        checkoutTime = generateRandomTime(14, 0, 14, 30, today);
      }
    } else if (dayOfWeek === 6) { // Saturday
      const twelvePM = new Date(today);
      twelvePM.setHours(12, 0, 0, 0);
      
      if (now < twelvePM) {
        // Generate random time between 12:00-12:30 WIB
        checkoutTime = generateRandomTime(12, 0, 12, 30, today);
      }
    }

    // Update attendance record with checkout details
    const result = await db.update(attendanceTable)
      .set({
        checkout_time: checkoutTime,
        updated_at: new Date()
      })
      .where(eq(attendanceTable.id, attendance.id))
      .returning()
      .execute();

    const updatedAttendance = result[0];
    return {
      ...updatedAttendance,
      date: new Date(updatedAttendance.date)
    };
  } catch (error) {
    console.error('Check-out failed:', error);
    throw error;
  }
}

export async function getTendikAttendanceHistory(tendikId: number): Promise<Attendance[]> {
  try {
    // Verify tendik exists
    const tendik = await db.select()
      .from(tendiksTable)
      .where(eq(tendiksTable.id, tendikId))
      .execute();

    if (tendik.length === 0) {
      throw new Error('Tendik not found');
    }

    const results = await db.select()
      .from(attendanceTable)
      .where(eq(attendanceTable.tendik_id, tendikId))
      .orderBy(desc(attendanceTable.date))
      .execute();

    return results.map(result => ({
      ...result,
      date: new Date(result.date)
    }));
  } catch (error) {
    console.error('Failed to fetch attendance history:', error);
    throw error;
  }
}

export async function getAttendanceRecapitulation(filter: RecapitulationFilter): Promise<Attendance[]> {
  try {
    const conditions: SQL<unknown>[] = [];

    if (filter.start_date) {
      conditions.push(gte(attendanceTable.date, filter.start_date));
    }

    if (filter.end_date) {
      conditions.push(lte(attendanceTable.date, filter.end_date));
    }

    if (filter.tendik_id !== undefined) {
      conditions.push(eq(attendanceTable.tendik_id, filter.tendik_id));
    }

    if (filter.status) {
      conditions.push(eq(attendanceTable.status, filter.status));
    }

    const results = conditions.length > 0
      ? await db.select()
          .from(attendanceTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(desc(attendanceTable.date))
          .execute()
      : await db.select()
          .from(attendanceTable)
          .orderBy(desc(attendanceTable.date))
          .execute();

    return results.map(result => ({
      ...result,
      date: new Date(result.date)
    }));
  } catch (error) {
    console.error('Failed to fetch attendance recapitulation:', error);
    throw error;
  }
}

export async function getLiveAttendance(): Promise<LiveAttendance[]> {
  try {
    const tenMinutesAgo = new Date();
    tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);

    // Get recent check-ins
    const checkins = await db.select({
      tendik_name: tendiksTable.name,
      time: attendanceTable.checkin_time,
      photo: attendanceTable.selfie_photo
    })
      .from(attendanceTable)
      .innerJoin(tendiksTable, eq(attendanceTable.tendik_id, tendiksTable.id))
      .where(gte(attendanceTable.checkin_time, tenMinutesAgo))
      .execute();

    // Get recent check-outs
    const checkouts = await db.select({
      tendik_name: tendiksTable.name,
      time: attendanceTable.checkout_time,
      photo: attendanceTable.selfie_photo
    })
      .from(attendanceTable)
      .innerJoin(tendiksTable, eq(attendanceTable.tendik_id, tendiksTable.id))
      .where(gte(attendanceTable.checkout_time, tenMinutesAgo))
      .execute();

    // Combine and format results
    const liveActivities: LiveAttendance[] = [];

    checkins.forEach(checkin => {
      if (checkin.time) {
        liveActivities.push({
          tendik_name: checkin.tendik_name,
          action: 'checkin',
          time: checkin.time,
          photo: checkin.photo
        });
      }
    });

    checkouts.forEach(checkout => {
      if (checkout.time) {
        liveActivities.push({
          tendik_name: checkout.tendik_name,
          action: 'checkout',
          time: checkout.time,
          photo: checkout.photo
        });
      }
    });

    // Sort by time descending
    return liveActivities.sort((a, b) => b.time.getTime() - a.time.getTime());
  } catch (error) {
    console.error('Failed to fetch live attendance:', error);
    throw error;
  }
}

export async function getTodayAttendance(): Promise<Attendance[]> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split('T')[0];

    const results = await db.select()
      .from(attendanceTable)
      .where(eq(attendanceTable.date, todayString))
      .orderBy(desc(attendanceTable.created_at))
      .execute();

    return results.map(result => ({
      ...result,
      date: new Date(result.date)
    }));
  } catch (error) {
    console.error('Failed to fetch today attendance:', error);
    throw error;
  }
}
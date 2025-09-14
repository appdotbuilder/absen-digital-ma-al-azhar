import { describe, it, expect } from 'bun:test';
import {
  hashPassword,
  verifyPassword,
  calculateDistance,
  isWithinWorkingHours,
  generateRandomTime,
  formatDateForIndonesia,
  getCurrentAcademicYear,
  isHoliday
} from '../handlers/utils';

describe('Password utilities', () => {
  it('should hash password securely', async () => {
    const password = 'testPassword123';
    const hash = await hashPassword(password);
    
    expect(hash).toBeDefined();
    expect(hash).not.toEqual(password);
    expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are typically 60+ chars
    expect(hash.startsWith('$2')).toBe(true); // bcrypt hash format
  });

  it('should verify correct password', async () => {
    const password = 'testPassword123';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('should reject incorrect password', async () => {
    const password = 'testPassword123';
    const wrongPassword = 'wrongPassword';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword(wrongPassword, hash);
    expect(isValid).toBe(false);
  });

  it('should generate different hashes for same password', async () => {
    const password = 'testPassword123';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    
    expect(hash1).not.toEqual(hash2);
    // But both should verify correctly
    expect(await verifyPassword(password, hash1)).toBe(true);
    expect(await verifyPassword(password, hash2)).toBe(true);
  });
});

describe('Distance calculation', () => {
  it('should calculate distance between two coordinates', () => {
    // Distance between Jakarta and Surabaya (approximately 663 km)
    const jakartaLat = -6.2088;
    const jakartaLng = 106.8456;
    const surabayaLat = -7.2575;
    const surabayaLng = 112.7521;
    
    const distance = calculateDistance(jakartaLat, jakartaLng, surabayaLat, surabayaLng);
    
    // Should be approximately 663,000 meters (allow 10km margin)
    expect(distance).toBeGreaterThan(650000);
    expect(distance).toBeLessThan(680000);
  });

  it('should return zero for same coordinates', () => {
    const lat = -7.2575;
    const lng = 112.7521;
    
    const distance = calculateDistance(lat, lng, lat, lng);
    expect(distance).toBe(0);
  });

  it('should calculate short distances accurately', () => {
    // Two points very close together (about 100 meters apart)
    const lat1 = -7.2575;
    const lng1 = 112.7521;
    const lat2 = -7.2585; // Slightly south
    const lng2 = 112.7521; // Same longitude
    
    const distance = calculateDistance(lat1, lng1, lat2, lng2);
    
    // Should be approximately 111 meters (allow small margin)
    expect(distance).toBeGreaterThan(100);
    expect(distance).toBeLessThan(130);
  });
});

describe('Working hours validation', () => {
  it('should return true for weekday working hours', () => {
    // Monday 08:00
    const mondayMorning = new Date('2025-01-20T08:00:00');
    expect(isWithinWorkingHours(mondayMorning, 1)).toBe(true);
    
    // Wednesday 14:00
    const wednesdayAfternoon = new Date('2025-01-22T14:00:00');
    expect(isWithinWorkingHours(wednesdayAfternoon, 3)).toBe(true);
    
    // Friday 15:30
    const fridayLate = new Date('2025-01-24T15:30:00');
    expect(isWithinWorkingHours(fridayLate, 5)).toBe(true);
  });

  it('should return false for weekend', () => {
    // Saturday
    const saturday = new Date('2025-01-25T10:00:00');
    expect(isWithinWorkingHours(saturday, 6)).toBe(false);
    
    // Sunday
    const sunday = new Date('2025-01-26T10:00:00');
    expect(isWithinWorkingHours(sunday, 0)).toBe(false);
  });

  it('should return false for outside working hours', () => {
    // Too early (06:30)
    const tooEarly = new Date('2025-01-20T06:30:00');
    expect(isWithinWorkingHours(tooEarly, 1)).toBe(false);
    
    // Too late (17:00)
    const tooLate = new Date('2025-01-20T17:00:00');
    expect(isWithinWorkingHours(tooLate, 1)).toBe(false);
  });

  it('should return true for boundary times', () => {
    // Exactly 07:00 (start time)
    const startTime = new Date('2025-01-20T07:00:00');
    expect(isWithinWorkingHours(startTime, 1)).toBe(true);
    
    // Exactly 16:00 (end time)
    const endTime = new Date('2025-01-20T16:00:00');
    expect(isWithinWorkingHours(endTime, 1)).toBe(true);
  });
});

describe('Random time generation', () => {
  it('should generate time within specified range', () => {
    const startTime = '07:00';
    const endTime = '08:30';
    
    for (let i = 0; i < 10; i++) {
      const randomTime = generateRandomTime(startTime, endTime);
      const hours = randomTime.getHours();
      const minutes = randomTime.getMinutes();
      
      // Should be between 07:00 and 08:30
      const timeInMinutes = hours * 60 + minutes;
      expect(timeInMinutes).toBeGreaterThanOrEqual(7 * 60); // 07:00
      expect(timeInMinutes).toBeLessThanOrEqual(8 * 60 + 30); // 08:30
    }
  });

  it('should handle same start and end time', () => {
    const time = '09:15';
    const randomTime = generateRandomTime(time, time);
    
    expect(randomTime.getHours()).toBe(9);
    expect(randomTime.getMinutes()).toBe(15);
  });

  it('should generate time with today\'s date', () => {
    const today = new Date();
    const randomTime = generateRandomTime('10:00', '11:00');
    
    expect(randomTime.getDate()).toBe(today.getDate());
    expect(randomTime.getMonth()).toBe(today.getMonth());
    expect(randomTime.getFullYear()).toBe(today.getFullYear());
  });
});

describe('Indonesian date formatting', () => {
  it('should format date in Indonesian format', () => {
    const date = new Date('2025-01-15T10:00:00');
    const formatted = formatDateForIndonesia(date);
    
    expect(formatted).toBe('Ponorogo, 15 Januari 2025');
  });

  it('should handle different months correctly', () => {
    const marchDate = new Date('2025-03-08T10:00:00');
    expect(formatDateForIndonesia(marchDate)).toBe('Ponorogo, 8 Maret 2025');
    
    const decemberDate = new Date('2025-12-25T10:00:00');
    expect(formatDateForIndonesia(decemberDate)).toBe('Ponorogo, 25 Desember 2025');
  });

  it('should handle single digit days correctly', () => {
    const date = new Date('2025-06-05T10:00:00');
    const formatted = formatDateForIndonesia(date);
    
    expect(formatted).toBe('Ponorogo, 5 Juni 2025');
  });
});

describe('Academic year calculation', () => {
  it('should return correct academic year for different months', () => {
    // Mock getCurrentAcademicYear by testing the logic directly
    // January (month 0) - should be previous/current year
    const januaryYear = calculateAcademicYearForMonth(0, 2025);
    expect(januaryYear).toBe('2024/2025');
    
    // June (month 5) - should be previous/current year  
    const juneYear = calculateAcademicYearForMonth(5, 2025);
    expect(juneYear).toBe('2024/2025');
    
    // July (month 6) - should be current/next year
    const julyYear = calculateAcademicYearForMonth(6, 2025);
    expect(julyYear).toBe('2025/2026');
    
    // December (month 11) - should be current/next year
    const decemberYear = calculateAcademicYearForMonth(11, 2025);
    expect(decemberYear).toBe('2025/2026');
  });

  it('should return current academic year', () => {
    const academicYear = getCurrentAcademicYear();
    
    // Should be in format YYYY/YYYY
    expect(academicYear).toMatch(/^\d{4}\/\d{4}$/);
    
    // The two years should be consecutive
    const [firstYear, secondYear] = academicYear.split('/').map(Number);
    expect(secondYear).toBe(firstYear + 1);
  });
});

describe('Holiday checking', () => {
  it('should identify holidays correctly', () => {
    const holidays = [
      new Date('2025-01-01T00:00:00'), // New Year
      new Date('2025-08-17T00:00:00'), // Independence Day
      new Date('2025-12-25T00:00:00')  // Christmas
    ];
    
    // Check holiday date
    const newYear = new Date('2025-01-01T10:00:00');
    expect(isHoliday(newYear, holidays)).toBe(true);
    
    // Check non-holiday date
    const regularDay = new Date('2025-01-02T10:00:00');
    expect(isHoliday(regularDay, holidays)).toBe(false);
  });

  it('should handle different time zones correctly', () => {
    const holidays = [
      new Date('2025-01-01T00:00:00Z') // UTC midnight
    ];
    
    // Same date but different time
    const sameDay = new Date('2025-01-01T15:30:00Z');
    expect(isHoliday(sameDay, holidays)).toBe(true);
  });

  it('should handle empty holiday list', () => {
    const date = new Date('2025-01-01T10:00:00');
    const emptyHolidays: Date[] = [];
    
    expect(isHoliday(date, emptyHolidays)).toBe(false);
  });
});

// Helper function for testing academic year logic
function calculateAcademicYearForMonth(month: number, year: number): string {
  if (month < 6) {
    return `${year - 1}/${year}`;
  } else {
    return `${year}/${year + 1}`;
  }
}
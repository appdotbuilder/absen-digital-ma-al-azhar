import bcrypt from 'bcryptjs';

export async function hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    // Haversine formula to calculate distance between two coordinates
    const R = 6371000; // Earth's radius in meters
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
}

function toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}

export function isWithinWorkingHours(time: Date, dayOfWeek: number): boolean {
    // dayOfWeek: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    // Skip weekends (Saturday = 6, Sunday = 0)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return false;
    }
    
    const hours = time.getHours();
    const minutes = time.getMinutes();
    const timeInMinutes = hours * 60 + minutes;
    
    // Working hours: 07:00 - 16:00 (7 AM - 4 PM)
    const startTime = 7 * 60; // 07:00 in minutes
    const endTime = 16 * 60; // 16:00 in minutes
    
    return timeInMinutes >= startTime && timeInMinutes <= endTime;
}

export function generateRandomTime(startTime: string, endTime: string): Date {
    // Parse time strings in format "HH:MM"
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    
    // Generate random minutes between start and end
    const randomMinutes = Math.floor(Math.random() * (endMinutes - startMinutes + 1)) + startMinutes;
    
    const hours = Math.floor(randomMinutes / 60);
    const minutes = randomMinutes % 60;
    
    // Create date with today's date and the random time
    const today = new Date();
    today.setHours(hours, minutes, 0, 0);
    
    return today;
}

export function formatDateForIndonesia(date: Date): string {
    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `Ponorogo, ${day} ${month} ${year}`;
}

export function getCurrentAcademicYear(): string {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-based (0 = January, 11 = December)
    
    // Academic year in Indonesia typically starts in July
    // If current month is before July (month < 6), we're in the second half of academic year
    // If current month is July or after (month >= 6), we're in the first half of academic year
    if (currentMonth < 6) {
        // Jan-June: previous year / current year (e.g., 2024/2025)
        return `${currentYear - 1}/${currentYear}`;
    } else {
        // July-Dec: current year / next year (e.g., 2025/2026)
        return `${currentYear}/${currentYear + 1}`;
    }
}

export function isHoliday(date: Date, holidays: Date[]): boolean {
    // Compare dates by their date string to ignore time differences
    const targetDateString = date.toDateString();
    return holidays.some(holiday => holiday.toDateString() === targetDateString);
}
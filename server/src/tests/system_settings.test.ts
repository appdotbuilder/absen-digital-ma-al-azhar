import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { geotagSettingsTable, holidaysTable, systemSettingsTable } from '../db/schema';
import { 
    type UpdateGeotagSettingInput,
    type CreateHolidayInput,
    type UpdateSystemSettingInput
} from '../schema';
import { 
    updateGeotagSettings,
    getGeotagSettings,
    createHoliday,
    getHolidays,
    deleteHoliday,
    updateSystemSettings,
    getSystemSettings
} from '../handlers/system_settings';
import { eq } from 'drizzle-orm';

// Test inputs
const testGeotagInput: UpdateGeotagSettingInput = {
    school_latitude: -6.2088,
    school_longitude: 106.8456,
    tolerance_radius: 100
};

const testHolidayInput: CreateHolidayInput = {
    date: '2025-01-01',
    description: 'New Year Holiday'
};

const testSystemSettingsInput: UpdateSystemSettingInput = {
    academic_year: '2024/2025',
    school_logo: 'logo.png'
};

describe('System Settings Handlers', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    describe('Geotag Settings', () => {
        it('should create new geotag settings when none exist', async () => {
            const result = await updateGeotagSettings(testGeotagInput);

            expect(result.school_latitude).toEqual(-6.2088);
            expect(result.school_longitude).toEqual(106.8456);
            expect(result.tolerance_radius).toEqual(100);
            expect(result.id).toBeDefined();
            expect(result.updated_at).toBeInstanceOf(Date);
        });

        it('should update existing geotag settings', async () => {
            // Create initial settings
            await updateGeotagSettings(testGeotagInput);

            // Update with new values
            const updatedInput: UpdateGeotagSettingInput = {
                school_latitude: -7.2575,
                school_longitude: 112.7521,
                tolerance_radius: 200
            };

            const result = await updateGeotagSettings(updatedInput);

            expect(result.school_latitude).toEqual(-7.2575);
            expect(result.school_longitude).toEqual(112.7521);
            expect(result.tolerance_radius).toEqual(200);
            expect(result.updated_at).toBeInstanceOf(Date);
        });

        it('should save geotag settings to database', async () => {
            const result = await updateGeotagSettings(testGeotagInput);

            const settings = await db.select()
                .from(geotagSettingsTable)
                .where(eq(geotagSettingsTable.id, result.id))
                .execute();

            expect(settings).toHaveLength(1);
            expect(settings[0].school_latitude).toEqual(-6.2088);
            expect(settings[0].school_longitude).toEqual(106.8456);
            expect(settings[0].tolerance_radius).toEqual(100);
        });

        it('should get geotag settings', async () => {
            await updateGeotagSettings(testGeotagInput);

            const result = await getGeotagSettings();

            expect(result).not.toBeNull();
            expect(result!.school_latitude).toEqual(-6.2088);
            expect(result!.school_longitude).toEqual(106.8456);
            expect(result!.tolerance_radius).toEqual(100);
        });

        it('should return null when no geotag settings exist', async () => {
            const result = await getGeotagSettings();
            expect(result).toBeNull();
        });
    });

    describe('Holidays', () => {
        it('should create a holiday', async () => {
            const result = await createHoliday(testHolidayInput);

            expect(result.date).toBeInstanceOf(Date);
            expect(result.date.toISOString().split('T')[0]).toEqual('2025-01-01');
            expect(result.description).toEqual('New Year Holiday');
            expect(result.id).toBeDefined();
            expect(result.created_at).toBeInstanceOf(Date);
        });

        it('should save holiday to database', async () => {
            const result = await createHoliday(testHolidayInput);

            const holidays = await db.select()
                .from(holidaysTable)
                .where(eq(holidaysTable.id, result.id))
                .execute();

            expect(holidays).toHaveLength(1);
            expect(holidays[0].description).toEqual('New Year Holiday');
            expect(holidays[0].date).toEqual('2025-01-01'); // Database returns date as string
        });

        it('should get all holidays ordered by date', async () => {
            // Create multiple holidays
            await createHoliday(testHolidayInput);
            await createHoliday({
                date: '2025-12-25',
                description: 'Christmas Day'
            });
            await createHoliday({
                date: '2025-08-17',
                description: 'Independence Day'
            });

            const result = await getHolidays();

            expect(result).toHaveLength(3);
            expect(result[0].description).toEqual('New Year Holiday');
            expect(result[1].description).toEqual('Independence Day');
            expect(result[2].description).toEqual('Christmas Day');
        });

        it('should return empty array when no holidays exist', async () => {
            const result = await getHolidays();
            expect(result).toHaveLength(0);
        });

        it('should delete a holiday', async () => {
            const holiday = await createHoliday(testHolidayInput);

            const result = await deleteHoliday(holiday.id);

            expect(result).toBe(true);

            // Verify deletion
            const holidays = await db.select()
                .from(holidaysTable)
                .where(eq(holidaysTable.id, holiday.id))
                .execute();

            expect(holidays).toHaveLength(0);
        });

        it('should return false when deleting non-existent holiday', async () => {
            const result = await deleteHoliday(999);
            expect(result).toBe(false);
        });

        it('should create multiple holidays with different dates', async () => {
            const holiday1 = await createHoliday({
                date: '2025-01-01',
                description: 'New Year'
            });

            const holiday2 = await createHoliday({
                date: '2025-01-02',
                description: 'New Year Holiday'
            });

            expect(holiday1.id).not.toEqual(holiday2.id);
            expect(holiday1.description).toEqual('New Year');
            expect(holiday2.description).toEqual('New Year Holiday');

            const allHolidays = await getHolidays();
            expect(allHolidays).toHaveLength(2);
        });
    });

    describe('System Settings', () => {
        it('should create new system settings when none exist', async () => {
            const result = await updateSystemSettings(testSystemSettingsInput);

            expect(result.academic_year).toEqual('2024/2025');
            expect(result.school_logo).toEqual('logo.png');
            expect(result.id).toBeDefined();
            expect(result.updated_at).toBeInstanceOf(Date);
        });

        it('should update existing system settings', async () => {
            // Create initial settings
            await updateSystemSettings(testSystemSettingsInput);

            // Update with new values
            const updatedInput: UpdateSystemSettingInput = {
                academic_year: '2025/2026',
                school_logo: 'new_logo.png'
            };

            const result = await updateSystemSettings(updatedInput);

            expect(result.academic_year).toEqual('2025/2026');
            expect(result.school_logo).toEqual('new_logo.png');
            expect(result.updated_at).toBeInstanceOf(Date);
        });

        it('should partially update system settings', async () => {
            // Create initial settings
            await updateSystemSettings(testSystemSettingsInput);

            // Update only academic year
            const result = await updateSystemSettings({
                academic_year: '2025/2026'
            });

            expect(result.academic_year).toEqual('2025/2026');
            expect(result.school_logo).toEqual('logo.png'); // Should remain unchanged
        });

        it('should save system settings to database', async () => {
            const result = await updateSystemSettings(testSystemSettingsInput);

            const settings = await db.select()
                .from(systemSettingsTable)
                .where(eq(systemSettingsTable.id, result.id))
                .execute();

            expect(settings).toHaveLength(1);
            expect(settings[0].academic_year).toEqual('2024/2025');
            expect(settings[0].school_logo).toEqual('logo.png');
        });

        it('should get system settings', async () => {
            await updateSystemSettings(testSystemSettingsInput);

            const result = await getSystemSettings();

            expect(result).not.toBeNull();
            expect(result!.academic_year).toEqual('2024/2025');
            expect(result!.school_logo).toEqual('logo.png');
        });

        it('should return null when no system settings exist', async () => {
            const result = await getSystemSettings();
            expect(result).toBeNull();
        });

        it('should create settings with default academic year when none provided', async () => {
            const result = await updateSystemSettings({
                school_logo: 'test_logo.png'
            });

            expect(result.academic_year).toEqual('2025/2026');
            expect(result.school_logo).toEqual('test_logo.png');
        });

        it('should handle null school logo', async () => {
            const result = await updateSystemSettings({
                academic_year: '2024/2025',
                school_logo: null
            });

            expect(result.academic_year).toEqual('2024/2025');
            expect(result.school_logo).toBeNull();
        });
    });

    describe('Data Integration', () => {
        it('should maintain separate records for different settings', async () => {
            // Create all types of settings
            const geotagResult = await updateGeotagSettings(testGeotagInput);
            const holidayResult = await createHoliday(testHolidayInput);
            const systemResult = await updateSystemSettings(testSystemSettingsInput);

            // Verify all exist independently
            const geotag = await getGeotagSettings();
            const holidays = await getHolidays();
            const system = await getSystemSettings();

            expect(geotag).not.toBeNull();
            expect(holidays).toHaveLength(1);
            expect(system).not.toBeNull();

            expect(geotag!.id).toEqual(geotagResult.id);
            expect(holidays[0].id).toEqual(holidayResult.id);
            expect(system!.id).toEqual(systemResult.id);
        });
    });
});
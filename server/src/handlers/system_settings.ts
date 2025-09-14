import { db } from '../db';
import { geotagSettingsTable, holidaysTable, systemSettingsTable } from '../db/schema';
import { 
    type UpdateGeotagSettingInput,
    type GeotagSetting,
    type CreateHolidayInput,
    type Holiday,
    type UpdateSystemSettingInput,
    type SystemSetting
} from '../schema';
import { eq } from 'drizzle-orm';

export async function updateGeotagSettings(input: UpdateGeotagSettingInput): Promise<GeotagSetting> {
    try {
        // Try to get existing settings first
        const existingSettings = await db.select()
            .from(geotagSettingsTable)
            .limit(1)
            .execute();

        if (existingSettings.length > 0) {
            // Update existing record
            const result = await db.update(geotagSettingsTable)
                .set({
                    school_latitude: input.school_latitude,
                    school_longitude: input.school_longitude,
                    tolerance_radius: input.tolerance_radius,
                    updated_at: new Date()
                })
                .where(eq(geotagSettingsTable.id, existingSettings[0].id))
                .returning()
                .execute();

            return result[0];
        } else {
            // Create new record
            const result = await db.insert(geotagSettingsTable)
                .values({
                    school_latitude: input.school_latitude,
                    school_longitude: input.school_longitude,
                    tolerance_radius: input.tolerance_radius,
                    updated_at: new Date()
                })
                .returning()
                .execute();

            return result[0];
        }
    } catch (error) {
        console.error('Geotag settings update failed:', error);
        throw error;
    }
}

export async function getGeotagSettings(): Promise<GeotagSetting | null> {
    try {
        const result = await db.select()
            .from(geotagSettingsTable)
            .limit(1)
            .execute();

        return result.length > 0 ? result[0] : null;
    } catch (error) {
        console.error('Get geotag settings failed:', error);
        throw error;
    }
}

export async function createHoliday(input: CreateHolidayInput): Promise<Holiday> {
    try {
        const result = await db.insert(holidaysTable)
            .values({
                date: input.date,
                description: input.description,
                created_at: new Date()
            })
            .returning()
            .execute();

        // Convert date string to Date object for the schema
        return {
            ...result[0],
            date: new Date(result[0].date)
        };
    } catch (error) {
        console.error('Holiday creation failed:', error);
        throw error;
    }
}

export async function getHolidays(): Promise<Holiday[]> {
    try {
        const result = await db.select()
            .from(holidaysTable)
            .orderBy(holidaysTable.date)
            .execute();

        // Convert date strings to Date objects for the schema
        return result.map(holiday => ({
            ...holiday,
            date: new Date(holiday.date)
        }));
    } catch (error) {
        console.error('Get holidays failed:', error);
        throw error;
    }
}

export async function deleteHoliday(holidayId: number): Promise<boolean> {
    try {
        const result = await db.delete(holidaysTable)
            .where(eq(holidaysTable.id, holidayId))
            .returning()
            .execute();

        return result.length > 0;
    } catch (error) {
        console.error('Holiday deletion failed:', error);
        throw error;
    }
}

export async function updateSystemSettings(input: UpdateSystemSettingInput): Promise<SystemSetting> {
    try {
        // Try to get existing settings first
        const existingSettings = await db.select()
            .from(systemSettingsTable)
            .limit(1)
            .execute();

        if (existingSettings.length > 0) {
            // Update existing record
            const updateData: any = {
                updated_at: new Date()
            };

            if (input.academic_year !== undefined) {
                updateData.academic_year = input.academic_year;
            }

            if (input.school_logo !== undefined) {
                updateData.school_logo = input.school_logo;
            }

            const result = await db.update(systemSettingsTable)
                .set(updateData)
                .where(eq(systemSettingsTable.id, existingSettings[0].id))
                .returning()
                .execute();

            return result[0];
        } else {
            // Create new record with default values
            const result = await db.insert(systemSettingsTable)
                .values({
                    academic_year: input.academic_year || '2025/2026',
                    school_logo: input.school_logo || null,
                    updated_at: new Date()
                })
                .returning()
                .execute();

            return result[0];
        }
    } catch (error) {
        console.error('System settings update failed:', error);
        throw error;
    }
}

export async function getSystemSettings(): Promise<SystemSetting | null> {
    try {
        const result = await db.select()
            .from(systemSettingsTable)
            .limit(1)
            .execute();

        return result.length > 0 ? result[0] : null;
    } catch (error) {
        console.error('Get system settings failed:', error);
        throw error;
    }
}
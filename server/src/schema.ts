import { z } from 'zod';

// Enum for staff positions
export const positionEnum = z.enum([
  'Kepala Madrasah',
  'Kepala TU',
  'Staf TU', 
  'Operator',
  'Penjaga Sekolah'
]);

export type Position = z.infer<typeof positionEnum>;

// Enum for attendance status
export const attendanceStatusEnum = z.enum([
  'Hadir',
  'Terlambat',
  'Alpha'
]);

export type AttendanceStatus = z.infer<typeof attendanceStatusEnum>;

// Admin schema
export const adminSchema = z.object({
  id: z.number(),
  name: z.string(),
  username: z.string(),
  password_hash: z.string(),
  profile_photo: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Admin = z.infer<typeof adminSchema>;

// Input schema for creating admin
export const createAdminInputSchema = z.object({
  name: z.string().min(1),
  username: z.string().min(3),
  password: z.string().min(6),
  profile_photo: z.string().nullable().optional()
});

export type CreateAdminInput = z.infer<typeof createAdminInputSchema>;

// Input schema for updating admin
export const updateAdminInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  username: z.string().min(3).optional(),
  password: z.string().min(6).optional(),
  profile_photo: z.string().nullable().optional()
});

export type UpdateAdminInput = z.infer<typeof updateAdminInputSchema>;

// Tendik (staff) schema
export const tendikSchema = z.object({
  id: z.number(),
  name: z.string(),
  username: z.string(),
  password_hash: z.string(),
  position: positionEnum,
  profile_photo: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Tendik = z.infer<typeof tendikSchema>;

// Input schema for creating tendik
export const createTendikInputSchema = z.object({
  name: z.string().min(1),
  username: z.string().min(3),
  password: z.string().min(6),
  position: positionEnum,
  profile_photo: z.string().nullable().optional()
});

export type CreateTendikInput = z.infer<typeof createTendikInputSchema>;

// Input schema for updating tendik
export const updateTendikInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  username: z.string().min(3).optional(),
  password: z.string().min(6).optional(),
  position: positionEnum.optional(),
  profile_photo: z.string().nullable().optional()
});

export type UpdateTendikInput = z.infer<typeof updateTendikInputSchema>;

// Attendance schema
export const attendanceSchema = z.object({
  id: z.number(),
  tendik_id: z.number(),
  date: z.coerce.date(),
  checkin_time: z.coerce.date().nullable(),
  checkout_time: z.coerce.date().nullable(),
  status: attendanceStatusEnum,
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  selfie_photo: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Attendance = z.infer<typeof attendanceSchema>;

// Input schema for check-in
export const checkinInputSchema = z.object({
  tendik_id: z.number(),
  latitude: z.number(),
  longitude: z.number(),
  selfie_photo: z.string()
});

export type CheckinInput = z.infer<typeof checkinInputSchema>;

// Input schema for check-out
export const checkoutInputSchema = z.object({
  tendik_id: z.number(),
  latitude: z.number(),
  longitude: z.number(),
  selfie_photo: z.string()
});

export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

// Staff permissions schema
export const staffPermissionSchema = z.object({
  id: z.number(),
  tendik_id: z.number(),
  date: z.coerce.date(),
  permission_type: z.string(),
  description: z.string(),
  approved_by: z.number(), // admin_id
  created_at: z.coerce.date()
});

export type StaffPermission = z.infer<typeof staffPermissionSchema>;

// Input schema for creating staff permission
export const createStaffPermissionInputSchema = z.object({
  tendik_id: z.number(),
  date: z.string(), // ISO date string
  permission_type: z.string(),
  description: z.string(),
  approved_by: z.number()
});

export type CreateStaffPermissionInput = z.infer<typeof createStaffPermissionInputSchema>;

// Geotag settings schema
export const geotagSettingSchema = z.object({
  id: z.number(),
  school_latitude: z.number(),
  school_longitude: z.number(),
  tolerance_radius: z.number(), // in meters
  updated_at: z.coerce.date()
});

export type GeotagSetting = z.infer<typeof geotagSettingSchema>;

// Input schema for updating geotag settings
export const updateGeotagSettingInputSchema = z.object({
  school_latitude: z.number(),
  school_longitude: z.number(),
  tolerance_radius: z.number()
});

export type UpdateGeotagSettingInput = z.infer<typeof updateGeotagSettingInputSchema>;

// Holiday schema
export const holidaySchema = z.object({
  id: z.number(),
  date: z.coerce.date(),
  description: z.string(),
  created_at: z.coerce.date()
});

export type Holiday = z.infer<typeof holidaySchema>;

// Input schema for creating holiday
export const createHolidayInputSchema = z.object({
  date: z.string(), // ISO date string
  description: z.string()
});

export type CreateHolidayInput = z.infer<typeof createHolidayInputSchema>;

// System settings schema
export const systemSettingSchema = z.object({
  id: z.number(),
  academic_year: z.string(),
  school_logo: z.string().nullable(),
  updated_at: z.coerce.date()
});

export type SystemSetting = z.infer<typeof systemSettingSchema>;

// Input schema for updating system settings
export const updateSystemSettingInputSchema = z.object({
  academic_year: z.string().optional(),
  school_logo: z.string().nullable().optional()
});

export type UpdateSystemSettingInput = z.infer<typeof updateSystemSettingInputSchema>;

// Login input schemas
export const adminLoginInputSchema = z.object({
  username: z.string(),
  password: z.string()
});

export type AdminLoginInput = z.infer<typeof adminLoginInputSchema>;

export const tendikLoginInputSchema = z.object({
  username: z.string(),
  password: z.string()
});

export type TendikLoginInput = z.infer<typeof tendikLoginInputSchema>;

// Recapitulation filter schema
export const recapitulationFilterSchema = z.object({
  start_date: z.string().optional(), // ISO date string
  end_date: z.string().optional(), // ISO date string
  tendik_id: z.number().optional(),
  status: attendanceStatusEnum.optional()
});

export type RecapitulationFilter = z.infer<typeof recapitulationFilterSchema>;

// Dashboard live attendance schema
export const liveAttendanceSchema = z.object({
  tendik_name: z.string(),
  action: z.enum(['checkin', 'checkout']),
  time: z.coerce.date(),
  photo: z.string().nullable()
});

export type LiveAttendance = z.infer<typeof liveAttendanceSchema>;
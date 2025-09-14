import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  numeric, 
  integer, 
  pgEnum, 
  date,
  real
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const positionEnum = pgEnum('position', [
  'Kepala Madrasah',
  'Kepala TU', 
  'Staf TU',
  'Operator',
  'Penjaga Sekolah'
]);

export const attendanceStatusEnum = pgEnum('attendance_status', [
  'Hadir',
  'Terlambat',
  'Alpha'
]);

// Admins table
export const adminsTable = pgTable('admins', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  profile_photo: text('profile_photo'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Tendik (staff/teachers) table
export const tendiksTable = pgTable('tendiks', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  position: positionEnum('position').notNull(),
  profile_photo: text('profile_photo'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Attendance table
export const attendanceTable = pgTable('attendance', {
  id: serial('id').primaryKey(),
  tendik_id: integer('tendik_id').notNull().references(() => tendiksTable.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  checkin_time: timestamp('checkin_time'), // Nullable by default
  checkout_time: timestamp('checkout_time'), // Nullable by default
  status: attendanceStatusEnum('status').notNull(),
  latitude: real('latitude'), // Nullable by default
  longitude: real('longitude'), // Nullable by default
  selfie_photo: text('selfie_photo'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Staff permissions table
export const staffPermissionsTable = pgTable('staff_permissions', {
  id: serial('id').primaryKey(),
  tendik_id: integer('tendik_id').notNull().references(() => tendiksTable.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  permission_type: text('permission_type').notNull(),
  description: text('description').notNull(),
  approved_by: integer('approved_by').notNull().references(() => adminsTable.id),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Geotag settings table
export const geotagSettingsTable = pgTable('geotag_settings', {
  id: serial('id').primaryKey(),
  school_latitude: real('school_latitude').notNull(),
  school_longitude: real('school_longitude').notNull(),
  tolerance_radius: real('tolerance_radius').notNull(), // in meters
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Holidays table
export const holidaysTable = pgTable('holidays', {
  id: serial('id').primaryKey(),
  date: date('date').notNull(),
  description: text('description').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// System settings table
export const systemSettingsTable = pgTable('system_settings', {
  id: serial('id').primaryKey(),
  academic_year: text('academic_year').notNull(),
  school_logo: text('school_logo'), // Nullable by default
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Relations
export const adminsRelations = relations(adminsTable, ({ many }) => ({
  approvedPermissions: many(staffPermissionsTable)
}));

export const tendiksRelations = relations(tendiksTable, ({ many }) => ({
  attendances: many(attendanceTable),
  permissions: many(staffPermissionsTable)
}));

export const attendanceRelations = relations(attendanceTable, ({ one }) => ({
  tendik: one(tendiksTable, {
    fields: [attendanceTable.tendik_id],
    references: [tendiksTable.id]
  })
}));

export const staffPermissionsRelations = relations(staffPermissionsTable, ({ one }) => ({
  tendik: one(tendiksTable, {
    fields: [staffPermissionsTable.tendik_id],
    references: [tendiksTable.id]
  }),
  approvedBy: one(adminsTable, {
    fields: [staffPermissionsTable.approved_by],
    references: [adminsTable.id]
  })
}));

// TypeScript types for the table schemas
export type Admin = typeof adminsTable.$inferSelect;
export type NewAdmin = typeof adminsTable.$inferInsert;

export type Tendik = typeof tendiksTable.$inferSelect;
export type NewTendik = typeof tendiksTable.$inferInsert;

export type Attendance = typeof attendanceTable.$inferSelect;
export type NewAttendance = typeof attendanceTable.$inferInsert;

export type StaffPermission = typeof staffPermissionsTable.$inferSelect;
export type NewStaffPermission = typeof staffPermissionsTable.$inferInsert;

export type GeotagSetting = typeof geotagSettingsTable.$inferSelect;
export type NewGeotagSetting = typeof geotagSettingsTable.$inferInsert;

export type Holiday = typeof holidaysTable.$inferSelect;
export type NewHoliday = typeof holidaysTable.$inferInsert;

export type SystemSetting = typeof systemSettingsTable.$inferSelect;
export type NewSystemSetting = typeof systemSettingsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  admins: adminsTable,
  tendiks: tendiksTable,
  attendance: attendanceTable,
  staffPermissions: staffPermissionsTable,
  geotagSettings: geotagSettingsTable,
  holidays: holidaysTable,
  systemSettings: systemSettingsTable
};
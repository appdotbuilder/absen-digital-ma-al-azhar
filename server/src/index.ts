import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import {
  adminLoginInputSchema,
  tendikLoginInputSchema,
  createAdminInputSchema,
  updateAdminInputSchema,
  createTendikInputSchema,
  updateTendikInputSchema,
  checkinInputSchema,
  checkoutInputSchema,
  createStaffPermissionInputSchema,
  updateGeotagSettingInputSchema,
  createHolidayInputSchema,
  updateSystemSettingInputSchema,
  recapitulationFilterSchema
} from './schema';
import { z } from 'zod';

// Import handlers
import { adminLogin, getAdminProfile } from './handlers/admin_auth';
import { tendikLogin, getTendikProfile } from './handlers/tendik_auth';
import { 
  createAdmin, 
  updateAdmin, 
  getAdmins, 
  getAdminById, 
  deleteAdmin 
} from './handlers/admin_management';
import { 
  createTendik, 
  updateTendik, 
  getTendiks, 
  getTendikById, 
  deleteTendik 
} from './handlers/tendik_management';
import { 
  checkin, 
  checkout, 
  getTendikAttendanceHistory, 
  getAttendanceRecapitulation,
  getLiveAttendance,
  getTodayAttendance
} from './handlers/attendance_management';
import { 
  createStaffPermission, 
  getStaffPermissions, 
  getTendikPermissions,
  deleteStaffPermission
} from './handlers/staff_permissions';
import { 
  updateGeotagSettings, 
  getGeotagSettings, 
  createHoliday, 
  getHolidays, 
  deleteHoliday,
  updateSystemSettings,
  getSystemSettings
} from './handlers/system_settings';
import { exportRecapitulationToPDF, generateAttendanceReport } from './handlers/pdf_export';
import { uploadProfilePhoto, uploadSchoolLogo, uploadSelfiePhoto } from './handlers/file_upload';
import { initializeDatabase, seedTestData } from './handlers/database_init';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  adminLogin: publicProcedure
    .input(adminLoginInputSchema)
    .mutation(({ input }) => adminLogin(input)),
    
  tendikLogin: publicProcedure
    .input(tendikLoginInputSchema)
    .mutation(({ input }) => tendikLogin(input)),
    
  getAdminProfile: publicProcedure
    .input(z.object({ adminId: z.number() }))
    .query(({ input }) => getAdminProfile(input.adminId)),
    
  getTendikProfile: publicProcedure
    .input(z.object({ tendikId: z.number() }))
    .query(({ input }) => getTendikProfile(input.tendikId)),

  // Admin management routes
  createAdmin: publicProcedure
    .input(createAdminInputSchema)
    .mutation(({ input }) => createAdmin(input)),
    
  updateAdmin: publicProcedure
    .input(updateAdminInputSchema)
    .mutation(({ input }) => updateAdmin(input)),
    
  getAdmins: publicProcedure
    .query(() => getAdmins()),
    
  getAdminById: publicProcedure
    .input(z.object({ adminId: z.number() }))
    .query(({ input }) => getAdminById(input.adminId)),
    
  deleteAdmin: publicProcedure
    .input(z.object({ adminId: z.number() }))
    .mutation(({ input }) => deleteAdmin(input.adminId)),

  // Tendik management routes
  createTendik: publicProcedure
    .input(createTendikInputSchema)
    .mutation(({ input }) => createTendik(input)),
    
  updateTendik: publicProcedure
    .input(updateTendikInputSchema)
    .mutation(({ input }) => updateTendik(input)),
    
  getTendiks: publicProcedure
    .query(() => getTendiks()),
    
  getTendikById: publicProcedure
    .input(z.object({ tendikId: z.number() }))
    .query(({ input }) => getTendikById(input.tendikId)),
    
  deleteTendik: publicProcedure
    .input(z.object({ tendikId: z.number() }))
    .mutation(({ input }) => deleteTendik(input.tendikId)),

  // Attendance routes
  checkin: publicProcedure
    .input(checkinInputSchema)
    .mutation(({ input }) => checkin(input)),
    
  checkout: publicProcedure
    .input(checkoutInputSchema)
    .mutation(({ input }) => checkout(input)),
    
  getTendikAttendanceHistory: publicProcedure
    .input(z.object({ tendikId: z.number() }))
    .query(({ input }) => getTendikAttendanceHistory(input.tendikId)),
    
  getAttendanceRecapitulation: publicProcedure
    .input(recapitulationFilterSchema)
    .query(({ input }) => getAttendanceRecapitulation(input)),
    
  getLiveAttendance: publicProcedure
    .query(() => getLiveAttendance()),
    
  getTodayAttendance: publicProcedure
    .query(() => getTodayAttendance()),

  // Staff permissions routes
  createStaffPermission: publicProcedure
    .input(createStaffPermissionInputSchema)
    .mutation(({ input }) => createStaffPermission(input)),
    
  getStaffPermissions: publicProcedure
    .query(() => getStaffPermissions()),
    
  getTendikPermissions: publicProcedure
    .input(z.object({ tendikId: z.number() }))
    .query(({ input }) => getTendikPermissions(input.tendikId)),
    
  deleteStaffPermission: publicProcedure
    .input(z.object({ permissionId: z.number() }))
    .mutation(({ input }) => deleteStaffPermission(input.permissionId)),

  // System settings routes
  updateGeotagSettings: publicProcedure
    .input(updateGeotagSettingInputSchema)
    .mutation(({ input }) => updateGeotagSettings(input)),
    
  getGeotagSettings: publicProcedure
    .query(() => getGeotagSettings()),
    
  createHoliday: publicProcedure
    .input(createHolidayInputSchema)
    .mutation(({ input }) => createHoliday(input)),
    
  getHolidays: publicProcedure
    .query(() => getHolidays()),
    
  deleteHoliday: publicProcedure
    .input(z.object({ holidayId: z.number() }))
    .mutation(({ input }) => deleteHoliday(input.holidayId)),
    
  updateSystemSettings: publicProcedure
    .input(updateSystemSettingInputSchema)
    .mutation(({ input }) => updateSystemSettings(input)),
    
  getSystemSettings: publicProcedure
    .query(() => getSystemSettings()),

  // PDF export routes
  exportRecapitulationToPDF: publicProcedure
    .input(recapitulationFilterSchema)
    .query(({ input }) => exportRecapitulationToPDF(input)),
    
  generateAttendanceReport: publicProcedure
    .input(z.object({ 
      startDate: z.string(), 
      endDate: z.string(), 
      tendikId: z.number().optional() 
    }))
    .query(({ input }) => generateAttendanceReport(input.startDate, input.endDate, input.tendikId)),

  // File upload routes (Note: These would typically be handled differently in a real app)
  uploadProfilePhoto: publicProcedure
    .input(z.object({ 
      file: z.any(), 
      userId: z.number(), 
      userType: z.enum(['admin', 'tendik']) 
    }))
    .mutation(({ input }) => uploadProfilePhoto(input.file, input.userId, input.userType)),
    
  uploadSchoolLogo: publicProcedure
    .input(z.object({ file: z.any() }))
    .mutation(({ input }) => uploadSchoolLogo(input.file)),
    
  uploadSelfiePhoto: publicProcedure
    .input(z.object({ file: z.any(), tendikId: z.number() }))
    .mutation(({ input }) => uploadSelfiePhoto(input.file, input.tendikId)),

  // Database initialization routes (for setup)
  initializeDatabase: publicProcedure
    .mutation(() => initializeDatabase()),
    
  seedTestData: publicProcedure
    .mutation(() => seedTestData()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`MA AL-AZHAR Attendance Management TRPC Server listening at port: ${port}`);
  console.log(`Academic Year: 2025/2026`);
}

start();
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { promises as fs } from 'fs';
import { join } from 'path';
import { uploadProfilePhoto, uploadSchoolLogo, uploadSelfiePhoto } from '../handlers/file_upload';

// Mock file creation helper
function createMockFile(content: string, type: string = 'image/jpeg', size?: number): File {
  const buffer = Buffer.from(content);
  const actualSize = size || buffer.length;
  
  // Create a mock File object with all required properties and methods
  const mockFile = {
    name: 'test.jpg',
    type,
    size: size !== undefined ? size : actualSize,
    lastModified: Date.now(),
    
    // Required File methods
    arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    text: async () => content,
    slice: () => mockFile,
    stream: () => new ReadableStream(),
    bytes: async () => new Uint8Array(buffer),
    
    // Additional methods to satisfy File interface
    json: async () => JSON.parse(content),
    formData: async () => new FormData(),
    blob: async () => new Blob([buffer], { type }),
    
    // Symbol.toStringTag for proper type checking
    [Symbol.toStringTag]: 'File'
  } as unknown as File;
  
  return mockFile;
}

// Helper to create large file for size testing
function createLargeFile(sizeInMB: number): File {
  const content = 'x'.repeat(sizeInMB * 1024 * 1024);
  return createMockFile(content, 'image/jpeg');
}

// Cleanup helper
async function cleanupUploads(): Promise<void> {
  try {
    await fs.rm('uploads', { recursive: true, force: true });
  } catch (error) {
    // Ignore if directory doesn't exist
  }
}

describe('File Upload Handlers', () => {
  beforeEach(async () => {
    await cleanupUploads();
  });

  afterEach(async () => {
    await cleanupUploads();
  });

  describe('uploadProfilePhoto', () => {
    const validFile = createMockFile('valid image content', 'image/jpeg');

    it('should upload admin profile photo successfully', async () => {
      const result = await uploadProfilePhoto(validFile, 1, 'admin');

      expect(result).toMatch(/^\/uploads\/profile_photos\/admin\/admin_1_[a-f0-9-]+\.jpg$/);
      
      // Verify file exists
      const filePath = result.substring(1); // Remove leading slash
      const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });

    it('should upload tendik profile photo successfully', async () => {
      const result = await uploadProfilePhoto(validFile, 5, 'tendik');

      expect(result).toMatch(/^\/uploads\/profile_photos\/tendik\/tendik_5_[a-f0-9-]+\.jpg$/);
      
      // Verify file exists
      const filePath = result.substring(1);
      const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });

    it('should handle different image types', async () => {
      const pngFile = createMockFile('png content', 'image/png');
      const result = await uploadProfilePhoto(pngFile, 1, 'admin');

      expect(result).toMatch(/\.png$/);
    });

    it('should handle webp images', async () => {
      const webpFile = createMockFile('webp content', 'image/webp');
      const result = await uploadProfilePhoto(webpFile, 2, 'tendik');

      expect(result).toMatch(/\.webp$/);
    });

    it('should throw error for invalid file type', async () => {
      const invalidFile = createMockFile('text content', 'text/plain');
      
      await expect(uploadProfilePhoto(invalidFile, 1, 'admin'))
        .rejects.toThrow(/Invalid file type/i);
    });

    it('should throw error for file too large', async () => {
      const largeFile = createLargeFile(6); // 6MB, exceeds 5MB limit
      
      await expect(uploadProfilePhoto(largeFile, 1, 'admin'))
        .rejects.toThrow(/File size too large/i);
    });

    it('should throw error for invalid user ID', async () => {
      await expect(uploadProfilePhoto(validFile, 0, 'admin'))
        .rejects.toThrow(/Invalid user ID/i);

      await expect(uploadProfilePhoto(validFile, -1, 'admin'))
        .rejects.toThrow(/Invalid user ID/i);
    });

    it('should throw error for invalid user type', async () => {
      await expect(uploadProfilePhoto(validFile, 1, 'invalid' as any))
        .rejects.toThrow(/Invalid user type/i);
    });

    it('should throw error when no file provided', async () => {
      await expect(uploadProfilePhoto(null as any, 1, 'admin'))
        .rejects.toThrow(/No file provided/i);
    });

    it('should create directory structure if not exists', async () => {
      // First upload should create directories
      const result1 = await uploadProfilePhoto(validFile, 1, 'admin');
      expect(result1).toMatch(/^\/uploads\/profile_photos\/admin\//);

      // Second upload should use existing directories
      const result2 = await uploadProfilePhoto(validFile, 2, 'tendik');
      expect(result2).toMatch(/^\/uploads\/profile_photos\/tendik\//);

      // Verify both directories exist
      const adminDirExists = await fs.access('uploads/profile_photos/admin').then(() => true).catch(() => false);
      const tendikDirExists = await fs.access('uploads/profile_photos/tendik').then(() => true).catch(() => false);
      
      expect(adminDirExists).toBe(true);
      expect(tendikDirExists).toBe(true);
    });
  });

  describe('uploadSchoolLogo', () => {
    const validFile = createMockFile('school logo content', 'image/png');

    it('should upload school logo successfully', async () => {
      const result = await uploadSchoolLogo(validFile);

      expect(result).toMatch(/^\/uploads\/school_logo\/school_logo_[a-f0-9-]+\.png$/);
      
      // Verify file exists
      const filePath = result.substring(1);
      const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });

    it('should handle jpeg images', async () => {
      const jpegFile = createMockFile('jpeg logo', 'image/jpeg');
      const result = await uploadSchoolLogo(jpegFile);

      expect(result).toMatch(/\.jpg$/);
    });

    it('should throw error for invalid file type', async () => {
      const invalidFile = createMockFile('pdf content', 'application/pdf');
      
      await expect(uploadSchoolLogo(invalidFile))
        .rejects.toThrow(/Invalid file type/i);
    });

    it('should throw error for file too large', async () => {
      const largeFile = createLargeFile(7); // 7MB
      
      await expect(uploadSchoolLogo(largeFile))
        .rejects.toThrow(/File size too large/i);
    });

    it('should throw error when no file provided', async () => {
      await expect(uploadSchoolLogo(undefined as any))
        .rejects.toThrow(/No file provided/i);
    });

    it('should create upload directory if not exists', async () => {
      const result = await uploadSchoolLogo(validFile);
      expect(result).toMatch(/^\/uploads\/school_logo\//);

      // Verify directory exists
      const dirExists = await fs.access('uploads/school_logo').then(() => true).catch(() => false);
      expect(dirExists).toBe(true);
    });
  });

  describe('uploadSelfiePhoto', () => {
    const validFile = createMockFile('selfie content', 'image/jpeg');

    it('should upload selfie photo successfully', async () => {
      const result = await uploadSelfiePhoto(validFile, 10);

      expect(result).toMatch(/^\/uploads\/selfie_photos\/selfie_10_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z_[a-f0-9-]+\.jpg$/);
      
      // Verify file exists
      const filePath = result.substring(1);
      const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });

    it('should include timestamp in filename', async () => {
      const result1 = await uploadSelfiePhoto(validFile, 1);
      const result2 = await uploadSelfiePhoto(validFile, 1);

      // Both should have different timestamps and UUIDs
      expect(result1).not.toEqual(result2);
      
      // Both should contain timestamp pattern
      expect(result1).toMatch(/selfie_1_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z_/);
      expect(result2).toMatch(/selfie_1_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z_/);
    });

    it('should handle different image formats', async () => {
      const pngFile = createMockFile('png selfie', 'image/png');
      const result = await uploadSelfiePhoto(pngFile, 5);

      expect(result).toMatch(/\.png$/);
      expect(result).toMatch(/selfie_5_/);
    });

    it('should throw error for invalid tendik ID', async () => {
      await expect(uploadSelfiePhoto(validFile, 0))
        .rejects.toThrow(/Invalid tendik ID/i);

      await expect(uploadSelfiePhoto(validFile, -5))
        .rejects.toThrow(/Invalid tendik ID/i);
    });

    it('should throw error for invalid file type', async () => {
      const videoFile = createMockFile('video content', 'video/mp4');
      
      await expect(uploadSelfiePhoto(videoFile, 1))
        .rejects.toThrow(/Invalid file type/i);
    });

    it('should throw error for file too large', async () => {
      const largeFile = createLargeFile(6);
      
      await expect(uploadSelfiePhoto(largeFile, 1))
        .rejects.toThrow(/File size too large/i);
    });

    it('should throw error when no file provided', async () => {
      await expect(uploadSelfiePhoto(null as any, 1))
        .rejects.toThrow(/No file provided/i);
    });

    it('should create directory if not exists', async () => {
      const result = await uploadSelfiePhoto(validFile, 1);
      expect(result).toMatch(/^\/uploads\/selfie_photos\//);

      // Verify directory exists
      const dirExists = await fs.access('uploads/selfie_photos').then(() => true).catch(() => false);
      expect(dirExists).toBe(true);
    });
  });

  describe('File validation edge cases', () => {
    it('should handle exactly 5MB file (at limit)', async () => {
      const exactLimitFile = createLargeFile(5); // Exactly 5MB
      
      // Should not throw error
      const result = await uploadProfilePhoto(exactLimitFile, 1, 'admin');
      expect(result).toMatch(/^\/uploads\/profile_photos\/admin\//);
    });

    it('should handle empty file', async () => {
      const emptyFile = createMockFile('', 'image/jpeg');
      
      // Should upload successfully (empty files are valid)
      const result = await uploadSelfiePhoto(emptyFile, 1);
      expect(result).toMatch(/^\/uploads\/selfie_photos\//);
    });

    it('should handle special characters in generated filenames', async () => {
      const validFile = createMockFile('content', 'image/jpeg');
      
      const result = await uploadSelfiePhoto(validFile, 123);
      
      // Should handle the timestamp with special characters safely
      expect(result).toMatch(/selfie_123_/);
      
      // Verify file was created successfully
      const filePath = result.substring(1);
      const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });
  });
});
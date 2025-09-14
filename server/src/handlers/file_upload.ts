import { promises as fs } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

// Configuration
const UPLOAD_BASE_DIR = 'uploads';
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Utility function to ensure directory exists
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

// Utility function to validate file type and size
function validateFile(file: File, allowedTypes: string[] = ALLOWED_IMAGE_TYPES): void {
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }
}

// Utility function to get file extension from MIME type
function getFileExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp'
  };
  return extensions[mimeType] || '.jpg';
}

// Utility function to save file
async function saveFile(file: File, filePath: string): Promise<void> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(filePath, buffer);
}

export async function uploadProfilePhoto(file: File, userId: number, userType: 'admin' | 'tendik'): Promise<string> {
  try {
    // Validate input parameters
    if (!file) {
      throw new Error('No file provided');
    }

    if (!userId || userId <= 0) {
      throw new Error('Invalid user ID');
    }

    if (!['admin', 'tendik'].includes(userType)) {
      throw new Error('Invalid user type. Must be admin or tendik');
    }

    // Validate file
    validateFile(file);

    // Create directory path
    const uploadDir = join(UPLOAD_BASE_DIR, 'profile_photos', userType);
    await ensureDirectoryExists(uploadDir);

    // Generate unique filename
    const fileExtension = getFileExtension(file.type);
    const filename = `${userType}_${userId}_${randomUUID()}${fileExtension}`;
    const filePath = join(uploadDir, filename);

    // Save file
    await saveFile(file, filePath);

    // Return relative path for database storage
    return `/${filePath.replace(/\\/g, '/')}`;

  } catch (error) {
    console.error('Profile photo upload failed:', error);
    throw error;
  }
}

export async function uploadSchoolLogo(file: File): Promise<string> {
  try {
    // Validate input
    if (!file) {
      throw new Error('No file provided');
    }

    // Validate file
    validateFile(file);

    // Create directory path
    const uploadDir = join(UPLOAD_BASE_DIR, 'school_logo');
    await ensureDirectoryExists(uploadDir);

    // Generate unique filename
    const fileExtension = getFileExtension(file.type);
    const filename = `school_logo_${randomUUID()}${fileExtension}`;
    const filePath = join(uploadDir, filename);

    // Save file
    await saveFile(file, filePath);

    // Return relative path for database storage
    return `/${filePath.replace(/\\/g, '/')}`;

  } catch (error) {
    console.error('School logo upload failed:', error);
    throw error;
  }
}

export async function uploadSelfiePhoto(file: File, tendikId: number): Promise<string> {
  try {
    // Validate input parameters
    if (!file) {
      throw new Error('No file provided');
    }

    if (!tendikId || tendikId <= 0) {
      throw new Error('Invalid tendik ID');
    }

    // Validate file
    validateFile(file);

    // Create directory path
    const uploadDir = join(UPLOAD_BASE_DIR, 'selfie_photos');
    await ensureDirectoryExists(uploadDir);

    // Generate unique filename with timestamp for selfies
    const fileExtension = getFileExtension(file.type);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `selfie_${tendikId}_${timestamp}_${randomUUID()}${fileExtension}`;
    const filePath = join(uploadDir, filename);

    // Save file
    await saveFile(file, filePath);

    // Return relative path for database storage
    return `/${filePath.replace(/\\/g, '/')}`;

  } catch (error) {
    console.error('Selfie photo upload failed:', error);
    throw error;
  }
}
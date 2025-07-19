import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';

// Configure multer for file uploads
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Ensure upload directory exists
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'proofs');

async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating upload directory:', error);
  }
}

// Process and save uploaded proof images
export async function processProofImage(
  buffer: Buffer,
  originalName: string,
  userId: number,
  assignmentId: number
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    await ensureUploadDir();
    
    const fileExtension = path.extname(originalName).toLowerCase();
    const fileName = `proof_${userId}_${assignmentId}_${randomUUID()}${fileExtension}`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    
    // Process image with Sharp
    let processedBuffer = buffer;
    
    // Resize if image is too large
    const metadata = await sharp(buffer).metadata();
    if (metadata.width && metadata.width > 1920) {
      processedBuffer = await sharp(buffer)
        .resize(1920, null, { withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
    }
    
    // Add watermark or metadata for verification
    processedBuffer = await sharp(processedBuffer)
      .composite([{
        input: Buffer.from(`<svg width="200" height="50">
          <rect width="200" height="50" fill="rgba(0,0,0,0.7)" />
          <text x="10" y="20" fill="white" font-size="12" font-family="Arial">EngageMarket Proof</text>
          <text x="10" y="35" fill="white" font-size="10" font-family="Arial">${new Date().toISOString().split('T')[0]}</text>
        </svg>`),
        gravity: 'southeast'
      }])
      .toBuffer();
    
    // Save processed image
    await fs.writeFile(filePath, processedBuffer);
    
    // Return relative URL path
    const relativeUrl = `/uploads/proofs/${fileName}`;
    return { success: true, url: relativeUrl };
    
  } catch (error) {
    console.error('Error processing proof image:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Image processing failed' 
    };
  }
}

// Validate proof image
export function validateProofImage(file: Express.Multer.File): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!file) {
    errors.push('No file provided');
    return { valid: false, errors };
  }
  
  // Check file type
  if (!file.mimetype.startsWith('image/')) {
    errors.push('File must be an image');
  }
  
  // Check file size (10MB)
  if (file.size > 10 * 1024 * 1024) {
    errors.push('File size must be less than 10MB');
  }
  
  // Check supported formats
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!supportedTypes.includes(file.mimetype)) {
    errors.push('Supported formats: JPEG, JPG, PNG, WebP');
  }
  
  return { valid: errors.length === 0, errors };
}

// Delete proof file
export async function deleteProofFile(url: string): Promise<boolean> {
  try {
    const fileName = path.basename(url);
    const filePath = path.join(UPLOAD_DIR, fileName);
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    console.error('Error deleting proof file:', error);
    return false;
  }
}

// Get file size in human-readable format
export function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}
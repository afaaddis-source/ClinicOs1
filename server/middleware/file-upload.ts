import multer from 'multer';
import path from 'path';
import fs from 'fs';
import type { Request } from 'express';

// Ensure upload directories exist
const uploadDir = path.join(process.cwd(), 'uploads');
const patientFilesDir = path.join(uploadDir, 'patient-files');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(patientFilesDir)) {
  fs.mkdirSync(patientFilesDir, { recursive: true });
}

// Allowed file types and their MIME types
const allowedMimeTypes = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'image/tiff': ['.tiff', '.tif']
} as const;

// File size limits (in bytes)
const fileLimits = {
  image: 5 * 1024 * 1024, // 5MB for images
  document: 10 * 1024 * 1024, // 10MB for documents
  default: 5 * 1024 * 1024 // 5MB default
};

// File filter function
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = Object.keys(allowedMimeTypes);
  
  if (!allowedTypes.includes(file.mimetype)) {
    const error = new Error(`File type not allowed: ${file.mimetype}`) as any;
    error.code = 'LIMIT_UNEXPECTED_FILE';
    error.field = file.fieldname;
    return cb(error, false);
  }

  // Additional file extension check
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = allowedMimeTypes[file.mimetype as keyof typeof allowedMimeTypes];
  
  if (!allowedExtensions.includes(ext)) {
    const error = new Error(`File extension not allowed: ${ext}`) as any;
    error.code = 'LIMIT_UNEXPECTED_FILE';
    error.field = file.fieldname;
    return cb(error, false);
  }

  // Check file size based on type
  const isImage = file.mimetype.startsWith('image/');
  const maxSize = isImage ? fileLimits.image : fileLimits.document;
  
  // Note: file.size is not available in fileFilter, but we'll set up size limits in multer options
  cb(null, true);
};

// Storage configuration for patient files
const patientFileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const patientId = req.params.patientId || req.body.patientId;
    if (!patientId) {
      return cb(new Error('Patient ID is required for file upload'), '');
    }
    
    const patientDir = path.join(patientFilesDir, patientId);
    if (!fs.existsSync(patientDir)) {
      fs.mkdirSync(patientDir, { recursive: true });
    }
    
    cb(null, patientDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, '_') // Replace special chars with underscore
      .substring(0, 50); // Limit length
    
    const filename = `${timestamp}-${baseName}${ext}`;
    cb(null, filename);
  }
});

// Multer configuration for patient files
export const uploadPatientFile = multer({
  storage: patientFileStorage,
  fileFilter,
  limits: {
    fileSize: fileLimits.default,
    files: 5, // Maximum 5 files per request
    fields: 10, // Maximum 10 non-file fields
    fieldSize: 1024 * 1024, // 1MB max field size
    fieldNameSize: 100, // 100 bytes max field name size
    headerPairs: 20 // Maximum 20 header pairs
  },
}).array('files', 5);

// Memory storage for temporary processing (e.g., profile pictures)
const memoryStorage = multer.memoryStorage();

export const uploadToMemory = multer({
  storage: memoryStorage,
  fileFilter,
  limits: {
    fileSize: fileLimits.image, // Smaller limit for memory uploads
    files: 1,
    fields: 5,
    fieldSize: 1024 * 100, // 100KB max field size
    fieldNameSize: 50,
    headerPairs: 10
  }
}).single('file');

// Utility functions
export const getFileType = (filename: string): 'image' | 'document' | 'unknown' => {
  const ext = path.extname(filename).toLowerCase();
  
  if (['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif'].includes(ext)) {
    return 'image';
  }
  
  if (['.pdf', '.doc', '.docx', '.txt'].includes(ext)) {
    return 'document';
  }
  
  return 'unknown';
};

export const deleteFile = async (filePath: string): Promise<void> => {
  try {
    await fs.promises.access(filePath);
    await fs.promises.unlink(filePath);
  } catch (error) {
    // File doesn't exist or couldn't be deleted
    console.warn(`Could not delete file: ${filePath}`, error);
  }
};

export const getFileInfo = async (filePath: string) => {
  try {
    const stats = await fs.promises.stat(filePath);
    const ext = path.extname(filePath);
    const filename = path.basename(filePath);
    
    return {
      filename,
      size: stats.size,
      type: getFileType(filename),
      extension: ext,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      exists: true
    };
  } catch (error) {
    return {
      filename: path.basename(filePath),
      size: 0,
      type: 'unknown' as const,
      extension: '',
      createdAt: new Date(),
      modifiedAt: new Date(),
      exists: false
    };
  }
};

// Clean up old temporary files (run periodically)
export const cleanupTempFiles = async (maxAge: number = 24 * 60 * 60 * 1000) => {
  try {
    const tempDirs = [uploadDir];
    const now = Date.now();
    
    for (const dir of tempDirs) {
      if (!fs.existsSync(dir)) continue;
      
      const files = await fs.promises.readdir(dir, { withFileTypes: true });
      
      for (const file of files) {
        if (file.isFile()) {
          const filePath = path.join(dir, file.name);
          const stats = await fs.promises.stat(filePath);
          
          if (now - stats.mtime.getTime() > maxAge) {
            await deleteFile(filePath);
            console.log(`Cleaned up old file: ${filePath}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up temporary files:', error);
  }
};

// Sanitize filename to prevent path traversal attacks
export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace unsafe characters
    .replace(/^\.+/, '') // Remove leading dots
    .substring(0, 255) // Limit length
    .toLowerCase();
};

// Validate file content (basic checks)
export const validateFileContent = async (file: Express.Multer.File): Promise<boolean> => {
  try {
    // For images, we can check if they're valid by attempting to read headers
    if (file.mimetype.startsWith('image/')) {
      // Basic check for image magic numbers
      const buffer = file.buffer || await fs.promises.readFile(file.path);
      
      // JPEG
      if (file.mimetype === 'image/jpeg' && 
          buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        return true;
      }
      
      // PNG
      if (file.mimetype === 'image/png' && 
          buffer[0] === 0x89 && buffer[1] === 0x50 && 
          buffer[2] === 0x4E && buffer[3] === 0x47) {
        return true;
      }
      
      // WebP
      if (file.mimetype === 'image/webp' && 
          buffer.toString('ascii', 0, 4) === 'RIFF' &&
          buffer.toString('ascii', 8, 12) === 'WEBP') {
        return true;
      }
    }
    
    // For PDFs
    if (file.mimetype === 'application/pdf') {
      const buffer = file.buffer || await fs.promises.readFile(file.path);
      return buffer.toString('ascii', 0, 4) === '%PDF';
    }
    
    // For other file types, assume they're valid if they passed the initial checks
    return true;
    
  } catch (error) {
    console.error('File content validation error:', error);
    return false;
  }
};

// Error handler for file upload errors
export const handleUploadError = (error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(413).json({
          error: 'FILE_TOO_LARGE',
          message: 'File size exceeds the maximum limit. Images: 5MB, Documents: 10MB.',
          code: 'LIMIT_FILE_SIZE',
          maxSizes: fileLimits
        });
        
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          error: 'TOO_MANY_FILES',
          message: 'Too many files uploaded. Maximum 5 files allowed.',
          code: 'LIMIT_FILE_COUNT'
        });
        
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          error: 'INVALID_FILE_TYPE',
          message: 'File type not allowed. Only images (JPG, PNG, WebP) and documents (PDF, DOC, DOCX, TXT) are permitted.',
          code: 'LIMIT_UNEXPECTED_FILE',
          allowedTypes: Object.keys(allowedMimeTypes)
        });
        
      default:
        return res.status(400).json({
          error: 'UPLOAD_ERROR',
          message: 'File upload failed: ' + error.message,
          code: error.code
        });
    }
  }
  
  // Handle custom file validation errors
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'INVALID_FILE_TYPE',
      message: error.message,
      code: 'LIMIT_UNEXPECTED_FILE'
    });
  }
  
  next(error);
};
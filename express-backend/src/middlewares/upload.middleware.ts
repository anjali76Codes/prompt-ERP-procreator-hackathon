import multer from 'multer';
import { env } from '../config/env';

const ALLOWED_MIME = new Set<string>([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'text/plain',
  'text/markdown',
]);

const storage = multer.memoryStorage();

export const resourceUpload = multer({
  storage,
  limits: {
    fileSize: env.RESOURCE_MAX_FILE_MB * 1024 * 1024,
    files: env.RESOURCE_MAX_FILES,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    cb(new Error(`Unsupported file type: ${file.mimetype}`));
  },
});

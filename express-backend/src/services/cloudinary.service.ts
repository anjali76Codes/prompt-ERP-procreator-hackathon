import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { env } from '../config/env';
import type { CloudinaryResourceType, ResourceAttachment } from '../models/Resource';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key:    env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Pick the Cloudinary resource_type for an incoming file. Images go to the
 * 'image' bucket so we get transformations; everything else (PDF, DOCX, ZIP…)
 * goes to 'raw' so Cloudinary doesn't try to transcode.
 */
const pickResourceType = (mime: string): CloudinaryResourceType => {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  return 'raw';
};

interface UploadOptions {
  /** Subfolder under the configured base folder, e.g. "<divisionId>/<subjectId>". */
  scope: string;
  originalName: string;
  mimeType: string;
}

export const uploadBufferToCloudinary = (
  buffer: Buffer,
  { scope, originalName, mimeType }: UploadOptions
): Promise<ResourceAttachment> => {
  const resourceType = pickResourceType(mimeType);
  const folder = `${env.CLOUDINARY_FOLDER}/${scope}`.replace(/\/+$/, '');

  return new Promise<ResourceAttachment>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      },
      (err, result: UploadApiResponse | undefined) => {
        if (err || !result) {
          return reject(err ?? new Error('Cloudinary upload returned no result'));
        }
        resolve({
          name: originalName,
          size: result.bytes,
          mimeType,
          url: result.secure_url,
          publicId: result.public_id,
          resourceType,
          format: result.format,
          uploadedAt: new Date(),
        });
      }
    );
    stream.end(buffer);
  });
};

export const destroyCloudinaryFile = async (
  publicId: string,
  resourceType: CloudinaryResourceType
): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
  } catch {
    // Swallow — orphan files in Cloudinary are non-fatal for the API contract.
  }
};

export const destroyManyCloudinaryFiles = async (
  attachments: Pick<ResourceAttachment, 'publicId' | 'resourceType'>[]
): Promise<void> => {
  await Promise.all(attachments.map(a => destroyCloudinaryFile(a.publicId, a.resourceType)));
};

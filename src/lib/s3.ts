import { api } from './api';

const DEFAULT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const MAX_SERVER_FALLBACK_BYTES = 15 * 1024 * 1024; // 15 MB

export interface UploadResult {
  url: string;
  provider: 's3' | 'local';
}

export interface UploadOptions {
  allowedTypes?: string[];
  maxSizeBytes?: number;
}

/**
 * Upload an image, PDF, or video to AWS S3.
 * Uses a presigned S3 PUT URL first (supports large files without server payload limits),
 * and falls back to same-origin `/api/admin/upload-s3` if direct S3 PUT is blocked by CORS.
 */
export async function uploadMediaToS3(
  file: File,
  folder = 'o-learning',
  options: UploadOptions = {}
): Promise<UploadResult> {
  const { allowedTypes = DEFAULT_IMAGE_TYPES, maxSizeBytes = 5 * 1024 * 1024 } = options;

  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    throw new Error(`Unsupported file type (${file.type || 'unknown'}).`);
  }
  if (file.size > maxSizeBytes) {
    const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
    throw new Error(`File size must be ${maxMb} MB or less.`);
  }

  const contentType = file.type || 'application/octet-stream';

  // 1. Try direct browser-to-S3 upload using a presigned URL from our EC2/Express backend
  try {
    const presign = await api<{
      configured: boolean;
      uploadUrl?: string;
      publicUrl?: string;
    }>('/api/admin/s3-presign', {
      method: 'POST',
      body: JSON.stringify({
        filename: file.name,
        contentType,
        folder,
      }),
    });

    if (presign.configured && presign.uploadUrl && presign.publicUrl) {
      const putRes = await fetch(presign.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: file,
      });
      if (putRes.ok) {
        return { url: presign.publicUrl, provider: 's3' };
      }
    }
  } catch {
    // Fall through to server-side S3 upload
  }

  // 2. Fallback: upload via same-origin Express backend -> S3 (no browser CORS needed)
  if (file.size > MAX_SERVER_FALLBACK_BYTES) {
    throw new Error('Large file upload to S3 failed. Please ensure S3 bucket CORS allows PUT from this domain.');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read selected file.'));
    reader.readAsDataURL(file);
  });

  const res = await api<{ url: string; provider?: 's3' | 'local' }>('/api/admin/upload-s3', {
    method: 'POST',
    body: JSON.stringify({
      filename: file.name,
      contentType,
      folder,
      dataUrl,
    }),
  });

  return {
    url: res.url,
    provider: res.provider || 's3',
  };
}

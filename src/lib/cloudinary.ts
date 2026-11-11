import { api } from './api';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface UploadResult {
  url: string;
  provider: 'cloudinary' | 'local';
  warning?: string;
}

export function getOptimizedCloudinaryUrl(url: string, width = 960): string {
  if (!url || !url.includes('res.cloudinary.com') || url.includes('/f_auto')) {
    return url;
  }
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
}

export async function uploadImageAsset(file: File, folder = 'o-learning'): Promise<UploadResult> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Please upload a valid image file (JPG, PNG, WEBP, GIF, or SVG).');
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('Image size must be 5 MB or less.');
  }

  // 1. Try direct Cloudinary upload when configured via environment variables
  if (CLOUD_NAME && UPLOAD_PRESET) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', folder);

      // Ask backend if a server-side Cloudinary signature is available (e.g. when preset is signed)
      try {
        const sig = await api<{
          signed: boolean;
          signature?: string;
          timestamp?: number;
          apiKey?: string;
        }>('/api/admin/cloudinary-signature', {
          method: 'POST',
          body: JSON.stringify({ folder }),
        });
        if (sig.signed && sig.signature && sig.timestamp && sig.apiKey) {
          formData.append('api_key', sig.apiKey);
          formData.append('timestamp', String(sig.timestamp));
          formData.append('signature', sig.signature);
        }
      } catch {
        // Proceed with unsigned upload preset
      }

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const json = (await res.json()) as { secure_url?: string; error?: { message?: string } };
      if (res.ok && json.secure_url) {
        return {
          url: getOptimizedCloudinaryUrl(json.secure_url),
          provider: 'cloudinary',
        };
      }
      // If Cloudinary upload preset is still signed-only, fall through to server upload fallback with helpful notice
      const cloudErr = json.error?.message || 'Cloudinary upload rejected.';
      const fallback = await uploadToLocalServer(file);
      return {
        url: fallback,
        provider: 'local',
        warning: `Stored via app server (${cloudErr}). Whitelist the upload preset as Unsigned in Cloudinary for direct CDN delivery.`,
      };
    } catch {
      const fallback = await uploadToLocalServer(file);
      return {
        url: fallback,
        provider: 'local',
        warning: 'Stored via app server fallback.',
      };
    }
  }

  const fallback = await uploadToLocalServer(file);
  return { url: fallback, provider: 'local' };
}

async function uploadToLocalServer(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read selected file.'));
    reader.readAsDataURL(file);
  });

  const res = await api<{ url: string }>('/api/admin/upload', {
    method: 'POST',
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type,
      dataUrl,
    }),
  });
  return res.url;
}


import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const AWS_REGION = process.env.AWS_REGION || 'ap-southeast-2';
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET || 'o-learning-platform-media-2026';

let cachedClient: S3Client | null = null;

export function isS3Configured(): boolean {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      AWS_S3_BUCKET &&
      AWS_REGION
  );
}

function getS3Client(): S3Client {
  if (!isS3Configured()) {
    throw new Error('AWS S3 credentials are not configured on the server.');
  }
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return cachedClient;
}

function buildObjectKey(filename: string, folder = 'uploads'): string {
  const cleanFolder = folder.replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9/_-]/g, '_') || 'uploads';
  const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80) || 'file';
  return `${cleanFolder}/${Date.now()}-${cleanName}`;
}

export function getS3PublicUrl(key: string): string {
  return `https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
}

/** Upload a Buffer directly to AWS S3 and return its public URL. */
export async function uploadBufferToS3(params: {
  buffer: Buffer;
  filename: string;
  contentType: string;
  folder?: string;
}): Promise<{ url: string; key: string; bucket: string }> {
  const s3 = getS3Client();
  const key = buildObjectKey(params.filename, params.folder);

  await s3.send(
    new PutObjectCommand({
      Bucket: AWS_S3_BUCKET,
      Key: key,
      Body: params.buffer,
      ContentType: params.contentType || 'application/octet-stream',
    })
  );

  return {
    url: getS3PublicUrl(key),
    key,
    bucket: AWS_S3_BUCKET,
  };
}

/** Generate a short-lived presigned PUT URL for direct browser-to-S3 uploads. */
export async function createS3PresignedUpload(params: {
  filename: string;
  contentType: string;
  folder?: string;
}): Promise<{ uploadUrl: string; publicUrl: string; key: string; bucket: string }> {
  const s3 = getS3Client();
  const key = buildObjectKey(params.filename, params.folder);

  const command = new PutObjectCommand({
    Bucket: AWS_S3_BUCKET,
    Key: key,
    ContentType: params.contentType || 'application/octet-stream',
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

  return {
    uploadUrl,
    publicUrl: getS3PublicUrl(key),
    key,
    bucket: AWS_S3_BUCKET,
  };
}

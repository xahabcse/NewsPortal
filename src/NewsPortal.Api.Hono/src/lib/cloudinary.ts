// Cloudinary helpers for image upload/delete.
// Uses the same Cloudinary account as the Portfolio project (drwezeylt).
// Images go under the `newsportal/` folder for organisation.

import type { Env } from './env';

const UPLOAD_FOLDER = 'newsportal';

/** Generate a SHA-1 signature for Cloudinary signed-upload requests. */
async function sha1(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-1', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Upload a remote image URL straight into Cloudinary (no local buffering).
 * Returns the Cloudinary CDN URL or `null` if the upload fails.
 */
export async function uploadFromUrl(env: Env['Bindings'], imageUrl: string, publicIdHint?: string): Promise<string | null> {
  if (!env.CLOUDINARY_API_SECRET) return null;
  if (!imageUrl) return null;

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = UPLOAD_FOLDER;
  const publicId = publicIdHint ? `${folder}/${publicIdHint}` : undefined;

  // The string to sign is the alphabetically-sorted params (without api_key/file/signature).
  const params: Record<string, string> = { folder, timestamp: String(timestamp) };
  if (publicId) params.public_id = publicId;

  const toSign =
    Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&') + env.CLOUDINARY_API_SECRET;
  const signature = await sha1(toSign);

  const form = new FormData();
  form.append('file', imageUrl);
  form.append('api_key', env.CLOUDINARY_API_KEY);
  form.append('timestamp', String(timestamp));
  form.append('folder', folder);
  if (publicId) form.append('public_id', publicId);
  form.append('signature', signature);

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: form }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { secure_url?: string };
    return json.secure_url ?? null;
  } catch {
    return null;
  }
}

/** Delete an image by public_id. */
export async function deleteByPublicId(env: Env['Bindings'], publicId: string): Promise<boolean> {
  if (!env.CLOUDINARY_API_SECRET) return false;
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `public_id=${publicId}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`;
  const signature = await sha1(toSign);

  const form = new FormData();
  form.append('public_id', publicId);
  form.append('api_key', env.CLOUDINARY_API_KEY);
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/destroy`,
    { method: 'POST', body: form }
  );
  return res.ok;
}

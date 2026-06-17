import { createHash } from 'node:crypto';
import { env } from '../../config/env.js';

const DEFAULT_FOLDER = 'aptico/profile-banners';

function getConfig() {
  return {
    cloudName: env.cloudinaryCloudName,
    apiKey: env.cloudinaryApiKey,
    apiSecret: env.cloudinaryApiSecret,
    folder: env.cloudinaryUploadFolder || DEFAULT_FOLDER
  };
}

export function isCloudinaryConfigured() {
  const config = getConfig();
  return Boolean(config.cloudName && config.apiKey && config.apiSecret);
}

function ensureCloudinaryConfigured() {
  const config = getConfig();

  if (!config.cloudName || !config.apiKey || !config.apiSecret) {
    const error = new Error('Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
    error.statusCode = 503;
    throw error;
  }

  return config;
}

function signParams(params, apiSecret) {
  const payload = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return createHash('sha1').update(`${payload}${apiSecret}`).digest('hex');
}

function createFormData(params, signature, apiKey) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      formData.append(key, String(value));
    }
  }

  formData.append('api_key', apiKey);
  formData.append('signature', signature);

  return formData;
}

function getCloudinaryError(payload, fallbackMessage) {
  return payload?.error?.message || payload?.message || fallbackMessage;
}

export async function uploadProfileBannerToCloudinary({ userId, buffer, contentType, fileName }) {
  const config = ensureCloudinaryConfigured();
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `user-${userId}-${Date.now()}`;
  const params = {
    folder: config.folder,
    invalidate: true,
    overwrite: true,
    public_id: publicId,
    timestamp
  };
  const signature = signParams(params, config.apiSecret);
  const formData = createFormData(params, signature, config.apiKey);
  const uploadName = String(fileName || 'profile-banner').replace(/[^\w.-]+/g, '-').slice(0, 120) || 'profile-banner';

  formData.append('file', new Blob([buffer], { type: contentType }), uploadName);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, {
    method: 'POST',
    body: formData
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(getCloudinaryError(payload, 'Cloudinary banner upload failed.'));
    error.statusCode = response.status >= 500 ? 502 : response.status;
    throw error;
  }

  return {
    banner_url: payload.secure_url,
    banner_public_id: payload.public_id,
    banner_asset_id: payload.asset_id || null
  };
}

export async function deleteCloudinaryAsset(publicId) {
  if (!publicId) {
    return { skipped: true };
  }

  const config = ensureCloudinaryConfigured();
  const timestamp = Math.floor(Date.now() / 1000);
  const params = {
    invalidate: true,
    public_id: publicId,
    timestamp
  };
  const signature = signParams(params, config.apiSecret);
  const formData = createFormData(params, signature, config.apiKey);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`, {
    method: 'POST',
    body: formData
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(getCloudinaryError(payload, 'Cloudinary banner removal failed.'));
    error.statusCode = response.status >= 500 ? 502 : response.status;
    throw error;
  }

  return payload;
}

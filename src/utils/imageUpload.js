
import { uploadToImageKit } from './imagekitUpload';

export const generateImageFileName = (userId, type, extension = 'jpg') => {
  const timestamp = Date.now();
  return `${userId}_${type}_${timestamp}.${extension}`;
};

export const getImageStoragePath = (imageType, userId) => {
  const basePath = `users/${userId}`;
  switch (imageType) {
    case 'profileImage':
      return `${basePath}/profile`;
    case 'idCardFront':
    case 'idCardBack':
    case 'studentCard':
    case 'universityCardFront':
    case 'universityCardBack':
      return `${basePath}/documents`;
    case 'driverLicense':
    case 'proofOfOwnership':
    case 'criminalBackground':
      return `${basePath}/driver-documents`;
    case 'vehicleFront':
    case 'vehicleBack':
    case 'vehicleInterior':
      return `${basePath}/vehicle`;
    default:
      return `${basePath}/misc`;
  }
};

export const uploadUserImages = async (userId, images = {}, onProgress) => {
  const uploaded = {};
  console.log('[imageUpload] uploadUserImages: start', { userId, keys: Object.keys(images || {}) });
  const keys = Object.keys(images || {});
  await Promise.all(
    keys.map(async (key) => {
      const uri = images[key];
      if (!uri || typeof uri !== 'string') return;
      if (uri.startsWith('http://') || uri.startsWith('https://')) {
        uploaded[key] = uri;
        if (typeof onProgress === 'function') onProgress({ key, status: 'remote', url: uri });
        return;
      }
      if (typeof onProgress === 'function') onProgress({ key, status: 'started' });
      try {
        const folder = `users/${userId}`;
        const url = await uploadToImageKit(uri, folder);
        uploaded[key] = url;
        if (typeof onProgress === 'function') onProgress({ key, status: 'imagekit_ok', url });
      } catch (err) {
        uploaded[key] = null;
        if (typeof onProgress === 'function') onProgress({ key, status: 'failed', error: err?.message || err });
      }
    })
  );
  console.log('[imageUpload] uploadUserImages: finished', { uploaded });
  return { uploaded };
};

export default {
  generateImageFileName,
  getImageStoragePath,
  uploadUserImages,
};

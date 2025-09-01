import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

// Cloudinary config (user provided cloud name)
const CLOUDINARY_CLOUD_NAME = 'dk7l9tdif';
const CLOUDINARY_UNSIGNED_PRESET = 'ml_default'; // ajusta si tu preset tiene otro nombre
// Nuevo dato proporcionado por el usuario
const CLOUDINARY_PID = 'd8ccbce3-5648-4753-a75b-6595549f9ab1';

// Convertir una URI a ArrayBuffer/Uint8Array (más fiable en React Native/Expo)
const uriToArrayBuffer = async (uri) => {
  console.log('[imageUpload] uriToArrayBuffer: converting uri -> arrayBuffer', { uri });
  try {
    const resp = await fetch(uri);
    // prefer arrayBuffer sobre blob en RN/Expo
    const buffer = await resp.arrayBuffer();
    console.log('[imageUpload] uriToArrayBuffer: fetch->arrayBuffer success', { uri, byteLength: buffer.byteLength });
    return new Uint8Array(buffer);
  } catch (fetchErr) {
    console.warn('[imageUpload] uriToArrayBuffer: fetch failed, attempting XHR fallback', fetchErr?.message || fetchErr);
    return await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () {
        try {
          // response is ArrayBuffer when responseType = 'arraybuffer'
          const arr = new Uint8Array(xhr.response);
          console.log('[imageUpload] uriToArrayBuffer: XHR success', { uri, byteLength: arr.byteLength });
          resolve(arr);
        } catch (e) {
          reject(e);
        }
      };
      xhr.onerror = function (e) {
        console.error('[imageUpload] uriToArrayBuffer: XHR failed', e);
        reject(new Error('XHR failed: ' + (e?.toString() || 'unknown')));
      };
      xhr.responseType = 'arraybuffer';
      xhr.open('GET', uri, true);
      xhr.send(null);
    });
  }
};

// Sube una URI local a Firebase Storage y devuelve la downloadURL; si la URI
// ya es remota, devuelve la misma URL.
export const uploadImage = async (uri, path, fileName) => {
  if (!uri) return null;
  if (uri.startsWith('http://') || uri.startsWith('https://')) return uri;

  try {
    console.log('[imageUpload] uploadImage: starting upload to Firebase', { path, fileName, uri });
  // En ambientes RN/Expo los Blobs pueden no ser compatibles con el SDK web de Firebase.
  // Usamos ArrayBuffer/Uint8Array que uploadBytes soporta.
  const buffer = await uriToArrayBuffer(uri);
  const imageRef = ref(storage, `${path}/${fileName}`);
  await uploadBytes(imageRef, buffer);
  const downloadURL = await getDownloadURL(imageRef);
    console.log('[imageUpload] uploadImage: firebase upload success', { downloadURL });
    return downloadURL;
  } catch (error) {
  console.error('[imageUpload] Firebase upload error:', { message: error.message, code: error.code, error });
    throw error;
  }
};

// Subida a Cloudinary (unsigned preset) — devuelve secure_url
export const uploadToCloudinary = async (uri, folder = '') => {
  if (!uri) return null;
  try {
    console.log('[imageUpload] uploadToCloudinary: starting', { folder, uri });
    const form = new FormData();
    form.append('file', { uri, type: 'image/jpeg', name: 'photo.jpg' });
  form.append('upload_preset', CLOUDINARY_UNSIGNED_PRESET);
  // Enviar el PID adicional que nos compartiste (se incluye como campo extra)
  form.append('pid', CLOUDINARY_PID);
    if (folder) form.append('folder', folder);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: form,
    });
    const json = await res.json();
    if (!res.ok) {
      console.error('[imageUpload] Cloudinary upload failed:', json);
      throw new Error(json.error?.message || 'Cloudinary upload failed');
    }
    console.log('[imageUpload] uploadToCloudinary: success', { secure_url: json.secure_url });
    return json.secure_url;
  } catch (err) {
    console.error('[imageUpload] Cloudinary upload error:', err);
    throw err;
  }
};

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
      console.log('[imageUpload] uploadUserImages: processing', { key, uriType: uri?.slice(0, 40) });
      // Si ya es una URL remota, mantenerla
      if (uri.startsWith('http://') || uri.startsWith('https://')) {
        console.log('[imageUpload] uploadUserImages: remote url detected, keeping as-is', { key, uri });
        uploaded[key] = uri;
        if (typeof onProgress === 'function') onProgress({ key, status: 'remote', url: uri });
        return;
      }
      if (uri.startsWith('file://') || uri.startsWith('content://')) {
        console.log('[imageUpload] uploadUserImages: local file detected, uploading to Cloudinary', { key });
        if (typeof onProgress === 'function') onProgress({ key, status: 'started' });
        try {
          const folder = `users/${userId}`;
          if (typeof onProgress === 'function') onProgress({ key, status: 'trying_cloudinary' });
          const cloudUrl = await uploadToCloudinary(uri, folder);
          if (cloudUrl) {
            console.log('[imageUpload] uploadUserImages: cloudinary ok', { key, cloudUrl });
            uploaded[key] = cloudUrl;
            if (typeof onProgress === 'function') onProgress({ key, status: 'cloudinary_ok', url: cloudUrl });
            return;
          }
        } catch (cloudErr) {
          console.error('[imageUpload] Cloudinary upload failed for ' + key + ':', cloudErr?.message || cloudErr);
          // Mark explicitly as failed -> set to null so Firestore won't store local file:// URIs
          // Intentar fallback a Firebase Storage antes de marcar como null
          if (typeof onProgress === 'function') onProgress({ key, status: 'cloudinary_failed', error: cloudErr?.message || cloudErr });
          try {
            const storagePath = getImageStoragePath(key, userId);
            const fileName = generateImageFileName(userId, key);
            if (typeof onProgress === 'function') onProgress({ key, status: 'trying_firebase' });
            const firebaseUrl = await uploadImage(uri, storagePath, fileName);
            if (firebaseUrl) {
              console.log('[imageUpload] Firebase upload ok', { key, firebaseUrl });
              uploaded[key] = firebaseUrl;
              if (typeof onProgress === 'function') onProgress({ key, status: 'firebase_ok', url: firebaseUrl });
              return;
            }
          } catch (fbErr) {
            console.error('[imageUpload] Firebase upload fallback failed for ' + key + ':', { message: fbErr?.message, code: fbErr?.code, fbErr });
            // siguimos para marcar fallo abajo
          }
          // Si todo falla, marcar como null
          uploaded[key] = null;
          if (typeof onProgress === 'function') onProgress({ key, status: 'failed', error: cloudErr?.message || cloudErr });
        }
      }
    })
  );
  console.log('[imageUpload] uploadUserImages: finished', { uploaded });
  return uploaded;
};

export default {
  uploadImage,
  generateImageFileName,
  getImageStoragePath,
  uploadUserImages,
};

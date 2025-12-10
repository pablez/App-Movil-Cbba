// Utilidad para subir imágenes a ImageKit
// Docs: https://docs.imagekit.io/api-reference/upload-file-api

import { Platform } from 'react-native';

const IMAGEKIT_PUBLIC_KEY = 'public_ceBHZ54ec2j7656Ctn6hiZvKtkk=';
const IMAGEKIT_PRIVATE_KEY = 'private_3qOFj8Iup8P5txEQa3HYnRSoUhE=';
const IMAGEKIT_URL = 'https://upload.imagekit.io/api/v1/files/upload';
const IMAGEKIT_BASE = 'https://ik.imagekit.io/transportApp';

// Helper para obtener el nombre del archivo desde la URI
function getFileName(uri) {
  if (!uri) return 'file.jpg';
  const parts = uri.split('/');
  return parts[parts.length - 1] || 'file.jpg';
}

export async function uploadToImageKit(uri, folder = 'users', fileName = null) {
  try {
    // Leer el archivo como base64
    let base64;
    if (Platform.OS === 'web') {
      throw new Error('No soportado en web');
    } else {
      // React Native: usar fetch para obtener el blob y FileReader para base64
      const response = await fetch(uri);
      const blob = await response.blob();
      base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result;
          const base64str = dataUrl.split(',')[1];
          resolve(base64str);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    const name = fileName || getFileName(uri);
    const formData = new FormData();
    formData.append('file', base64);
    formData.append('fileName', name);
    formData.append('folder', folder);
    formData.append('useUniqueFileName', 'true');
    formData.append('publicKey', IMAGEKIT_PUBLIC_KEY);

    // Autenticación básica con clave privada
    const headers = {
      'Authorization': 'Basic ' + btoa(IMAGEKIT_PRIVATE_KEY + ':'),
      'Accept': 'application/json',
    };

    const res = await fetch(IMAGEKIT_URL, {
      method: 'POST',
      headers,
      body: formData,
    });
    const json = await res.json();
    if (!json || !json.url) throw new Error(json.message || 'Error subiendo imagen');
    return json.url;
  } catch (err) {
    console.error('Error al subir a ImageKit:', err);
    throw err;
  }
}

// Utilidad para generar una URL transformada de ImageKit
// Ejemplo de uso:
// getImageKitTransformedUrl(url, { width: 400, height: 300, crop: 'maintain_ratio' })
export function getImageKitTransformedUrl(url, { width, height, crop = 'maintain_ratio', quality, format } = {}) {
  if (!url) return '';
  // Extraer base y path
  const match = url.match(/(https:\/\/[^\/]+\/[^\/]+)(\/.*)/);
  if (!match) return url;
  const base = match[1];
  const path = match[2].replace(/^\//, '');
  // Construir string de transformación
  let tr = [];
  if (width) tr.push(`w-${width}`);
  if (height) tr.push(`h-${height}`);
  if (crop) tr.push(`c-${crop}`);
  if (quality) tr.push(`q-${quality}`);
  if (format) tr.push(`f-${format}`);
  const trStr = tr.length ? `tr:${tr.join(',')}/` : '';
  return `${base}/${trStr}${path}`;
}

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

/**
 * Uploads an image to Firebase Storage
 * @param {string} uri - Local image URI
 * @param {string} path - Storage path for the image
 * @param {string} fileName - Name for the uploaded file
 * @returns {Promise<string>} - Download URL of uploaded image
 */
export const uploadImage = async (uri, path, fileName) => {
  try {
    // Fetch the image
    const response = await fetch(uri);
    const blob = await response.blob();
    
    // Create reference
    const imageRef = ref(storage, `${path}/${fileName}`);
    
    // Upload image
    const snapshot = await uploadBytes(imageRef, blob);
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error('Failed to upload image');
  }
};

/**
 * Uploads multiple images
 * @param {Array} images - Array of {uri, path, fileName} objects
 * @returns {Promise<Array>} - Array of download URLs
 */
export const uploadMultipleImages = async (images) => {
  try {
    const uploadPromises = images.map(({ uri, path, fileName }) => 
      uploadImage(uri, path, fileName)
    );
    
    const urls = await Promise.all(uploadPromises);
    return urls;
  } catch (error) {
    console.error('Error uploading multiple images:', error);
    throw new Error('Failed to upload one or more images');
  }
};

/**
 * Generates a unique filename for an image
 * @param {string} userId - User ID
 * @param {string} type - Image type (profile, vehicle, document, etc.)
 * @param {string} extension - File extension (jpg, png, etc.)
 * @returns {string} - Unique filename
 */
export const generateImageFileName = (userId, type, extension = 'jpg') => {
  const timestamp = Date.now();
  return `${userId}_${type}_${timestamp}.${extension}`;
};

/**
 * Gets the appropriate storage path for different image types
 * @param {string} imageType - Type of image
 * @param {string} userId - User ID
 * @returns {string} - Storage path
 */
export const getImageStoragePath = (imageType, userId) => {
  const basePath = `users/${userId}`;
  
  switch (imageType) {
    case 'profileImage':
      return `${basePath}/profile`;
    case 'idCardFront':
    case 'idCardBack':
    case 'studentCard':
      return `${basePath}/documents`;
    case 'driverLicense':
    case 'proofOfOwnership':
    case 'criminalBackground':
      return `${basePath}/driver-documents`;
    case 'vehiclePhotos.front':
    case 'vehiclePhotos.back':
    case 'vehiclePhotos.interior':
      return `${basePath}/vehicle`;
    default:
      return `${basePath}/misc`;
  }
};

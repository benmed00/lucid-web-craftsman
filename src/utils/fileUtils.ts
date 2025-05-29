// File_name : src/utils/fileUtils.ts

import { ImageFile, DocumentFile, FileUploadError, isImageFile, isDocumentFile } from '../types/fileTypes';
import { ERROR_MESSAGES } from '../constants';

// File size limits (in bytes)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
] as const;

export const getFileExtension = (fileName: string): string => {
  return fileName.split('.').pop() || '';
};

// Using type guard functions from fileTypes.ts
export const validateFileUpload = (file: File): FileUploadError | null => {
  if (file.size > MAX_FILE_SIZE) {
    return {
      code: 'FILE_TOO_LARGE',
      message: ERROR_MESSAGES.FILE_SIZE_ERROR,
      file
    };
  }

  if (isImageFile(file)) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return {
        code: 'INVALID_FILE_TYPE',
        message: ERROR_MESSAGES.FILE_TYPE_ERROR,
        file
      };
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return {
        code: 'FILE_TOO_LARGE',
        message: 'Image too large (max 5MB)',
        file
      };
    }
  } else if (!isDocumentFile(file)) {
    return {
      code: 'INVALID_FILE_TYPE',
      message: 'Type de fichier non supporté.',
      file
    };
  }

  return null;
};

export const compressImage = async (file: ImageFile): Promise<Blob> => {
  try {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // Calculate new dimensions while maintaining aspect ratio
    const maxWidth = 1920;
    const maxHeight = 1080;
    let width = img.width;
    let height = img.height;

    if (width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }

    if (height > maxHeight) {
      width = (width * maxHeight) / height;
      height = maxHeight;
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);

    // Convert to WebP for better compression
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Could not convert image'));
        },
        'image/webp',
        0.8
      );
    });

    URL.revokeObjectURL(img.src);
    return blob;
  } catch (error) {
    console.error('Error compressing image:', error);
    throw error;
  }
};

export const convertToWebP = async (file: ImageFile): Promise<Blob> => {
  try {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Could not convert to WebP'));
        },
        'image/webp',
        0.8
      );
    });

    URL.revokeObjectURL(img.src);
    return blob;
  } catch (error) {
    console.error('Error converting to WebP:', error);
    throw error;
  }
};

export const generateFilePreview = async (file: File): Promise<string> => {
  try {
    if (isImageFile(file)) {
      return URL.createObjectURL(file);
    }
    return '';
  } catch (error) {
    console.error('Error generating file preview:', error);
    throw error;
  }
};

export const getFileSizeString = (size: number): string => {
  if (size < 1024) return `${size} bytes`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

// Export constants for use in other files
export { MAX_FILE_SIZE, MAX_IMAGE_SIZE, ALLOWED_IMAGE_TYPES, ALLOWED_DOCUMENT_TYPES };

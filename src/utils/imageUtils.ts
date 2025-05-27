// File_name: src/utils/imageUtils.ts

/* Description: This file is used to generate the correct path for images in the assets folder
 * getImageUrl fait la distinction entre environnement dev/prod ✅
 */

/**
 * Resolves a local or remote image URL based on the provided filename.
 * 
 * - If `filename` is a full URL (starts with http:// or https://), it returns it as-is.
 * - If `filename` is null or undefined, it returns the base image directory.
 * - If `filename` is a relative name, it builds the full local path to the image.
 *
 * @param filename - The name of the image file or a full URL.
 * @param baseUrl - The base URL of the app (default from import.meta.env.BASE_URL).
 * @returns The complete URL pointing to the image resource.
 */
export function getImageUrl(filename: string | null | undefined, baseUrl = import.meta.env.BASE_URL): string {
  // If no filename is provided, return the default assets path
  if (!filename) {
    return `${baseUrl || ''}assets/images/`.replace(/\/+/g, '/');
  }

  // If filename is already a complete URL, return as-is
  if (/^https?:\/\//i.test(filename)) {
    return filename;
  }

  // Normalize baseUrl by replacing multiple slashes
  const normalizedBase = baseUrl ? baseUrl.replace(/\/+$/, '') : '';
  // Remove any leading slashes from filename
  const normalizedFilename = filename.replace(/^\/+/, '');

  // Construct and normalize the final path
  return `${normalizedBase}/assets/images/${normalizedFilename}`.replace(/\/+/g, '/');
}

/**
 * Version flexible pour autoriser chemins absolus (URLs ou '/')
 * @param path Chemin du fichier ou URL complète
 * @returns URL directe si absolue, ou chemin local sinon
 */
export const getImageUrlFlexible = (path: string): string => {
  if (path.startsWith('http') || path.startsWith('/')) {
    return path;
  }
  return getImageUrl(path);
};

/**
 * Version de debug pour console.log
 */
export const getImageUrlDebug = (filename: string): string => {
  const url = getImageUrl(filename);
  console.log(`🔍 Image URL for '${filename}': ${url}`);
  return url;
};


export const getImageUrl_old = (path: string): string => {
  // Use import.meta.env.BASE_URL for production, empty string for development
  const baseUrl: string = import.meta.env.BASE_URL || '';

  // Ensure path starts with / if it's not already
  const normalizedPath: string = path.startsWith('/') ? path : `/${path}`;

  // Return the full path
  return `${baseUrl}${normalizedPath}`;
};

export const getImageUrl_0 = (filename: string, baseUrl?: string): string => {
  // Clean up filename by removing leading slashes
  const cleanFilename = filename.replace(/^\/+/, '');
  
  // If we're in dev environment (PROD is false) and no baseUrl provided,
  // return just the filename without any base path
  if (!import.meta.env.PROD && !baseUrl) {
    return cleanFilename;
  }
  
  // Normalize base URL by removing trailing slashes
  const cleanBase = (baseUrl || import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
  
  // Return the full path
  return `${cleanBase}/assets/images/${cleanFilename}`;
};

export const getImageUrl_new = (filename: string): string => {
  const basePath: string = import.meta.env.BASE_URL || '/';
  console.log("Base-Path : ", basePath);
  return `${basePath}assets/images/${filename}`;
};

// Keeping this as a reference implementation
export const getImageUrl_flexible = (path: string) => {
  // Si c'est déjà une URL absolue (ou commence par slash), on renvoie tel quel
  if (path.startsWith("http") || path.startsWith("/")) {
    return path;
  }
  // Sinon on construit le chemin local
  return import.meta.env.PROD
    ? `/lucid-web-craftsman/assets/images/${path}`
    : `/assets/images/${path}`;
};
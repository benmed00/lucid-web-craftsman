// File_name: src/utils/imageUtils.ts

/* Description: This file is used to generate the correct path for images in the assets folder
 * getImageUrl fait la distinction entre environnement dev/prod ✅
 */

export const getImageUrl_old = (path: string): string => {
  // Use import.meta.env.BASE_URL for production, empty string for development
  const baseUrl: string = import.meta.env.BASE_URL || '';

  // Ensure path starts with / if it's not already
  const normalizedPath: string = path.startsWith('/') ? path : `/${path}`;

  // Return the full path
  return `${baseUrl}${normalizedPath}`;
};

export const getImageUrl = (relativePath: string) =>
  import.meta.env.PROD
    ? `/lucid-web-craftsman/${relativePath}`
    : `${relativePath}`;


export const getImageUrl_new = (filename: string): string => {
  const basePath: string = import.meta.env.BASE_URL || '/';
  console.log("Base-Path : ", basePath);
  return `${basePath}assets/images/${filename}`;
};

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
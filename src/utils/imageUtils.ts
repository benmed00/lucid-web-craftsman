// File_name: src/utils/imageUtils.ts

/* Description: This file is used to generate the correct path for images in the assets folder
 * getImageUrl fait la distinction entre environnement dev/prod ✅
 */

/**
 * Génère une URL vers une image dans le dossier public/assets/images
 * @param filename Nom du fichier (ex: 'logo.png')
 * @param baseUrl (Optionnel) Base URL à utiliser (par exemple: '/lucid-web-craftsman')
 * @returns Chemin complet vers l'image (ex: '/lucid-web-craftsman/assets/images/logo.png')
 */
export function getImageUrl(filename: string | null | undefined, baseUrl = import.meta.env.BASE_URL): string {
  // If filename is null/undefined, return the base path
  if (!filename) {
    return `${baseUrl || ''}assets/images/`;
  }

  // Normalize baseUrl by replacing multiple slashes with single slash
  const normalizedBase = baseUrl ? baseUrl.replace(/\/+/g, '/') : '';
  
  // Remove leading slash from filename if it exists
  const normalizedFilename = filename.replace(/^\/+/g, '');
  
  // Return the full path with proper slash normalization
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
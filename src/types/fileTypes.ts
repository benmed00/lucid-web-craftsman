// File_name : src/types/fileTypes.ts

export interface File extends globalThis.File {}

export type ImageFile = File & {
  type: 'image/jpeg' | 'image/png' | 'image/webp';
};

export type DocumentFile = File & {
  type: 'application/pdf' | 'application/msword' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
};

export type AllowedFileTypes = ImageFile | DocumentFile;

export type FileUploadError = {
  code: 'FILE_TOO_LARGE' | 'INVALID_FILE_TYPE' | 'UPLOAD_FAILED';
  message: string;
  file?: File;
};

// Add type guard functions
export const isImageFile = (file: File): file is ImageFile => {
  return ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
};

export const isDocumentFile = (file: File): file is DocumentFile => {
  return [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ].includes(file.type);
};

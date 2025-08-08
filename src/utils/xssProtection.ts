import DOMPurify from 'dompurify';

// XSS Protection utilities
export const sanitizeHtmlContent = (content: string): string => {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a'],
    ALLOWED_ATTR: ['href', 'target'],
    ALLOW_DATA_ATTR: false,
  });
};

export const sanitizeUserInput = (input: string): string => {
  // Remove any HTML tags and encode special characters
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
};

export const validateAndSanitizeEmail = (email: string): string => {
  const sanitized = sanitizeUserInput(email.toLowerCase().trim());
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    throw new Error('Format d\'email invalide');
  }
  return sanitized;
};

export const validateAndSanitizeName = (name: string): string => {
  const sanitized = sanitizeUserInput(name.trim());
  if (sanitized.length < 2) {
    throw new Error('Le nom doit contenir au moins 2 caractères');
  }
  if (sanitized.length > 100) {
    throw new Error('Le nom ne peut pas dépasser 100 caractères');
  }
  // Allow only letters, spaces, hyphens, and apostrophes
  const nameRegex = /^[a-zA-ZÀ-ÿ\s\-']+$/;
  if (!nameRegex.test(sanitized)) {
    throw new Error('Le nom contient des caractères non autorisés');
  }
  return sanitized;
};

export const validatePassword = (password: string): void => {
  if (password.length < 8) {
    throw new Error('Le mot de passe doit contenir au moins 8 caractères');
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error('Le mot de passe doit contenir au moins une majuscule');
  }
  if (!/[a-z]/.test(password)) {
    throw new Error('Le mot de passe doit contenir au moins une minuscule');
  }
  if (!/[0-9]/.test(password)) {
    throw new Error('Le mot de passe doit contenir au moins un chiffre');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    throw new Error('Le mot de passe doit contenir au moins un caractère spécial');
  }
};

// Content Security Policy helpers
export const generateNonce = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};
import DOMPurify from 'dompurify';

// Enhanced XSS Protection utilities with stricter controls
export const sanitizeHtmlContent = (content: string): string => {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a'],
    ALLOWED_ATTR: ['href', 'target'],
    ALLOW_DATA_ATTR: false,
    FORBID_ATTR: ['style', 'onclick', 'onload', 'onerror', 'onmouseover'],
    FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form'],
  });
};

export const sanitizeUserInput = (input: string): string => {
  // Remove any HTML tags and encode special characters
  // IMPORTANT: & must be replaced FIRST to avoid double-encoding entities
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
};

// Enhanced email validation with additional security checks
export const validateAndSanitizeEmail = (email: string): string => {
  const sanitized = sanitizeUserInput(email.toLowerCase().trim());
  
  // Check for potential XSS attempts in email
  if (sanitized.includes('javascript:') || sanitized.includes('<script')) {
    throw new Error('Format d\'email invalide - caractères dangereux détectés');
  }
  
  // Basic email validation with stricter regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(sanitized)) {
    throw new Error('Format d\'email invalide');
  }
  
  // Check email length to prevent buffer overflow attempts
  if (sanitized.length > 254) {
    throw new Error('Adresse email trop longue');
  }
  
  return sanitized;
};

// Enhanced phone validation with sanitization
export const validatePhoneNumber = (phone: string): string => {
  const sanitized = sanitizeUserInput(phone.trim());
  
  // Remove formatting and validate basic phone number pattern
  const cleanPhone = sanitized.replace(/[\s\-\(\)\.]/g, '');
  
  // Basic phone validation (international format)
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(cleanPhone)) {
    throw new Error('Format de téléphone invalide');
  }
  
  if (sanitized.length > 20) {
    throw new Error('Numéro de téléphone trop long');
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
  
  // Enhanced regex to prevent code injection
  const nameRegex = /^[a-zA-ZÀ-ÿ\s\-'\.]+$/;
  if (!nameRegex.test(sanitized)) {
    throw new Error('Le nom contient des caractères non autorisés');
  }
  
  // Check for potential script injection patterns
  const dangerousPatterns = ['javascript:', '<script', 'eval(', 'onclick'];
  const lowerName = sanitized.toLowerCase();
  for (const pattern of dangerousPatterns) {
    if (lowerName.includes(pattern)) {
      throw new Error('Le nom contient des caractères dangereux');
    }
  }
  
  return sanitized;
};

// Enhanced password validation with additional security requirements
export const validatePassword = (password: string): void => {
  if (password.length < 8) {
    throw new Error('Le mot de passe doit contenir au moins 8 caractères');
  }
  if (password.length > 128) {
    throw new Error('Le mot de passe ne peut pas dépasser 128 caractères');
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
  
  // Check for common weak patterns
  const weakPatterns = [
    /(.)\1{2,}/, // Three or more repeated characters
    /123|abc|qwe/i, // Sequential patterns
    /password|motdepasse/i, // Common words
  ];
  
  for (const pattern of weakPatterns) {
    if (pattern.test(password)) {
      throw new Error('Le mot de passe ne doit pas contenir de motifs prévisibles');
    }
  }
};

// Enhanced nonce generation with crypto.randomUUID fallback
export const generateNonce = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// New function: Sanitize file names for uploads
export const sanitizeFileName = (fileName: string): string => {
  // Remove path traversal attempts and dangerous characters
  return fileName
    .replace(/[\/\\\?\%\*\:\|"<>]/g, '_')
    .replace(/\.\./g, '_')
    .replace(/^\./, '_')
    .trim()
    .substring(0, 255);
};

// New function: Validate file types for uploads
export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  const fileType = file.type.toLowerCase();
  return allowedTypes.some(type => fileType.includes(type));
};

// Rate limiting helper for preventing brute force attacks
export const createRateLimiter = (maxAttempts: number, windowMs: number) => {
  const attempts = new Map<string, { count: number; resetTime: number }>();
  
  return {
    isAllowed: (identifier: string): boolean => {
      const now = Date.now();
      const record = attempts.get(identifier);
      
      if (!record || now > record.resetTime) {
        attempts.set(identifier, { count: 1, resetTime: now + windowMs });
        return true;
      }
      
      if (record.count >= maxAttempts) {
        return false;
      }
      
      record.count++;
      return true;
    },
    reset: (identifier: string): void => {
      attempts.delete(identifier);
    }
  };
};
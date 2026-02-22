import { z } from 'zod';
import { sanitizeUserInput } from './xssProtection';

// Regex patterns for validation
const NAME_REGEX = /^[a-zA-ZÀ-ÿ\s\-'\.]+$/;
const PHONE_REGEX = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]*$/;
const POSTAL_CODE_REGEX: Record<string, RegExp> = {
  FR: /^\d{5}$/,
  BE: /^\d{4}$/,
  CH: /^\d{4}$/,
  MC: /^\d{5}$/,
  LU: /^\d{4}$/,
};

// Dangerous patterns to detect XSS/injection attempts
const DANGEROUS_PATTERNS = [
  'javascript:',
  '<script',
  'eval(',
  'onclick',
  'onerror',
  'onload',
  '<img',
  '<svg',
  'data:',
];

// Custom validation function to check for dangerous patterns
const containsDangerousPatterns = (value: string): boolean => {
  const lowerValue = value.toLowerCase();
  return DANGEROUS_PATTERNS.some((pattern) => lowerValue.includes(pattern));
};

// Sanitizing transformer for string fields
const sanitizedString = (minLength = 0, maxLength = 255) =>
  z
    .string()
    .trim()
    .min(minLength, `Ce champ doit contenir au moins ${minLength} caractères`)
    .max(maxLength, `Ce champ ne peut pas dépasser ${maxLength} caractères`)
    .transform((val) => sanitizeUserInput(val))
    .refine((val) => !containsDangerousPatterns(val), {
      message: 'Caractères non autorisés détectés',
    });

// Name schema with strict validation
const nameSchema = z
  .string()
  .trim()
  .min(2, 'Le nom doit contenir au moins 2 caractères')
  .max(50, 'Le nom ne peut pas dépasser 50 caractères')
  .refine((val) => NAME_REGEX.test(val), {
    message: 'Le nom contient des caractères non autorisés',
  })
  .refine((val) => !containsDangerousPatterns(val), {
    message: 'Caractères dangereux détectés',
  })
  .transform((val) => sanitizeUserInput(val.trim()));

// Email schema with comprehensive validation
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(5, 'Email requis')
  .max(254, 'Adresse email trop longue')
  .email('Adresse email invalide')
  .refine((val) => !containsDangerousPatterns(val), {
    message: "Format d'email invalide - caractères dangereux détectés",
  })
  .refine((val) => !val.includes('..'), {
    message: "Format d'email invalide",
  })
  .refine(
    (val) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val),
    {
      message: "Format d'email invalide",
    }
  );

// Phone schema (optional but validated if provided)
const phoneSchema = z
  .string()
  .optional()
  .transform((val) => val?.trim() || '')
  .refine(
    (val) => {
      if (!val) return true; // Empty is ok since optional
      return val.length <= 20;
    },
    { message: 'Numéro de téléphone trop long' }
  )
  .refine(
    (val) => {
      if (!val) return true;
      return PHONE_REGEX.test(val);
    },
    { message: 'Format de téléphone invalide' }
  )
  .refine(
    (val) => {
      if (!val) return true;
      return !containsDangerousPatterns(val);
    },
    { message: 'Caractères non autorisés dans le téléphone' }
  )
  .transform((val) => (val ? sanitizeUserInput(val) : ''));

// Address schema
const addressSchema = z
  .string()
  .trim()
  .min(5, "L'adresse doit contenir au moins 5 caractères")
  .max(200, "L'adresse ne peut pas dépasser 200 caractères")
  .refine((val) => !containsDangerousPatterns(val), {
    message: "Caractères non autorisés dans l'adresse",
  })
  .transform((val) => sanitizeUserInput(val));

// Optional address complement
const addressComplementSchema = z
  .string()
  .optional()
  .transform((val) => val?.trim() || '')
  .refine(
    (val) => {
      if (!val) return true;
      return val.length <= 100;
    },
    { message: "Le complément d'adresse ne peut pas dépasser 100 caractères" }
  )
  .refine(
    (val) => {
      if (!val) return true;
      return !containsDangerousPatterns(val);
    },
    { message: 'Caractères non autorisés' }
  )
  .transform((val) => (val ? sanitizeUserInput(val) : ''));

// City schema
const citySchema = z
  .string()
  .trim()
  .min(2, 'La ville doit contenir au moins 2 caractères')
  .max(100, 'Le nom de ville ne peut pas dépasser 100 caractères')
  .refine((val) => /^[a-zA-ZÀ-ÿ\s\-'\.]+$/.test(val), {
    message: 'Le nom de ville contient des caractères non autorisés',
  })
  .refine((val) => !containsDangerousPatterns(val), {
    message: 'Caractères dangereux détectés',
  })
  .transform((val) => sanitizeUserInput(val));

// Country schema with whitelist
const countrySchema = z.enum(['FR', 'BE', 'CH', 'MC', 'LU'], {
  errorMap: () => ({ message: 'Pays non supporté' }),
});

// Dynamic postal code validation based on country
const createPostalCodeSchema = (country: string) => {
  const regex = POSTAL_CODE_REGEX[country] || /^[A-Za-z0-9\s\-]{3,10}$/;
  return z
    .string()
    .trim()
    .min(3, 'Code postal requis')
    .max(10, 'Code postal trop long')
    .refine((val) => regex.test(val), {
      message: `Code postal invalide pour ${country}`,
    })
    .refine((val) => !containsDangerousPatterns(val), {
      message: 'Caractères non autorisés',
    })
    .transform((val) => sanitizeUserInput(val));
};

// Step 1: Customer Information Schema
export const customerInfoSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
});

// Step 2: Shipping Address Schema (requires country for postal code validation)
export const shippingAddressSchema = z
  .object({
    address: addressSchema,
    addressComplement: addressComplementSchema,
    postalCode: z.string().trim().min(1, 'Code postal requis'),
    city: citySchema,
    country: countrySchema,
  })
  .refine(
    (data) => {
      const regex = POSTAL_CODE_REGEX[data.country];
      if (regex) {
        return regex.test(data.postalCode);
      }
      return true;
    },
    {
      message: 'Code postal invalide pour ce pays',
      path: ['postalCode'],
    }
  );

// Complete checkout form schema
export const checkoutFormSchema = z
  .object({
    firstName: nameSchema,
    lastName: nameSchema,
    email: emailSchema,
    phone: phoneSchema,
    address: addressSchema,
    addressComplement: addressComplementSchema,
    postalCode: z.string().trim().min(1, 'Code postal requis'),
    city: citySchema,
    country: countrySchema,
  })
  .refine(
    (data) => {
      const regex = POSTAL_CODE_REGEX[data.country];
      if (regex) {
        return regex.test(data.postalCode);
      }
      return true;
    },
    {
      message: 'Code postal invalide pour ce pays',
      path: ['postalCode'],
    }
  );

// Promo code validation schema
export const promoCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(1, 'Veuillez entrer un code promo')
  .max(50, 'Code promo trop long')
  .refine((val) => /^[A-Z0-9\-_]+$/.test(val), {
    message: 'Format de code promo invalide',
  })
  .refine((val) => !containsDangerousPatterns(val), {
    message: 'Caractères non autorisés',
  });

// Types
export type CustomerInfo = z.infer<typeof customerInfoSchema>;
export type ShippingAddress = z.infer<typeof shippingAddressSchema>;
export type CheckoutFormData = z.infer<typeof checkoutFormSchema>;

// Validation functions with error messages
export const validateCustomerInfo = (
  data: unknown
): {
  success: boolean;
  data?: CustomerInfo;
  errors?: Record<string, string>;
} => {
  const result = customerInfoSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  result.error.issues.forEach((issue) => {
    const path = issue.path.join('.');
    errors[path] = issue.message;
  });

  return { success: false, errors };
};

export const validateShippingAddress = (
  data: unknown
): {
  success: boolean;
  data?: ShippingAddress;
  errors?: Record<string, string>;
} => {
  const result = shippingAddressSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  result.error.issues.forEach((issue) => {
    const path = issue.path.join('.');
    errors[path] = issue.message;
  });

  return { success: false, errors };
};

export const validateCheckoutForm = (
  data: unknown
): {
  success: boolean;
  data?: CheckoutFormData;
  errors?: Record<string, string>;
} => {
  const result = checkoutFormSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  result.error.issues.forEach((issue) => {
    const path = issue.path.join('.');
    errors[path] = issue.message;
  });

  return { success: false, errors };
};

export const validatePromoCode = (
  code: string
): {
  success: boolean;
  data?: string;
  error?: string;
} => {
  const result = promoCodeSchema.safeParse(code);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    error: result.error.issues[0]?.message || 'Code invalide',
  };
};

// Utility to get field error from validation result
export const getFieldError = (
  errors: Record<string, string> | undefined,
  field: string
): string | undefined => {
  return errors?.[field];
};

// File_name : src/utils/validationUtils.ts

import { ValidationPattern, ValidationMessages, FormField } from '../types/formTypes';
import { CountryCode } from '../types/commonTypes';
import { Product, ProductCategory, ProductStatus } from '../types/productTypes';
import { User, UserRole } from '../types/userTypes';
import { Cart, CartActions, CartItem } from '../types/cartTypes';
import { BlogPost, BlogCategory } from '../types/blogTypes';
import { ERROR_MESSAGES, USER_ROLES, PRODUCT_CATEGORIES, BLOG_CATEGORIES } from '../constants';
import { ImageFile } from '../utils/fileUtils';
import { FORM_CONSTANTS } from './formUtils';
import { MAX_FILE_SIZE, ALLOWED_IMAGE_TYPES } from '../utils/fileUtils';

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string, country: CountryCode = 'FR'): boolean => {
  const phoneRegex = /^\+?[0-9]{10,15}$/;
  return phoneRegex.test(phone);
};

export const validatePostalCode = (postalCode: string, country: CountryCode = 'FR'): boolean => {
  switch (country) {
    case 'FR':
      return /^[0-9]{5}$/.test(postalCode);
    case 'BE':
      return /^[0-9]{4}$/.test(postalCode);
    case 'LU':
      return /^[0-9]{4}$/.test(postalCode);
    case 'DE':
      return /^[0-9]{5}$/.test(postalCode);
    case 'GB':
      return /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/.test(postalCode);
    default:
      return /^[0-9]{5}$/.test(postalCode);
  }
};

export const validatePassword = (password: string): boolean => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
  return passwordRegex.test(password);
};

export const validateForm = (fields: Record<string, FormField>): boolean => {
  return Object.values(fields).every(field => field.isValid);
};

export const getFirstError = (fields: Record<string, FormField>): string | null => {
  const errorField = Object.values(fields).find(field => !field.isValid && field.error);
  return errorField?.error || null;
};

export const validateField = (
  value: string,
  type: keyof ValidationPattern,
  country: CountryCode = 'FR'
): boolean => {
  const pattern = FORM_CONSTANTS.patterns[type];
  if (typeof pattern === 'object' && 'default' in pattern) {
    const regex = pattern[country] || pattern.default;
    return regex.test(value);
  }
  return pattern.test(value);
};

export const getErrorMessage = (
  type: keyof ValidationMessages,
  country: CountryCode = 'FR'
): string => {
  const message = FORM_CONSTANTS.validationMessages[type];
  if (typeof message === 'object' && 'default' in message) {
    return message[country] || message.default;
  }
  return message;
};

export const validateAddress = (address: {
  street: string;
  postalCode: string;
  city: string;
  country: CountryCode;
}): boolean => {
  return (
    validateField(address.street, 'required') &&
    validatePostalCode(address.postalCode, address.country) &&
    validateField(address.city, 'required')
  );
};

export const validateCreditCard = (cardNumber: string): boolean => {
  // Basic Luhn algorithm validation
  const digits = cardNumber.replace(/\s/g, '');
  if (!/^[0-9]{15,16}$/.test(digits)) return false;

  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n = (n % 10) + 1;
    }
    sum += n;
    alternate = !alternate;
  }
  return (sum % 10) === 0;
};

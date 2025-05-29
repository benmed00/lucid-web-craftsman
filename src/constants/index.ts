// File_name : src/constants/index.ts

import { CountryCode } from '../types/commonTypes';
import { ProductCategory } from '../types/productTypes';
import { BlogCategory } from '../types/blogTypes';
import { UserRole } from '../types/userTypes';

// Application Settings
export const APP_NAME = 'Lucid Web Craftsman';
export const APP_VERSION = '1.0.0';
export const DEFAULT_LOCALE = 'fr';
export const SUPPORTED_LOCALES = ['fr', 'en'];

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.lucid-web-craftsman.com';
export const API_TIMEOUT = 30000; // 30 seconds
export const API_RETRY_COUNT = 3;
export const API_RETRY_DELAY = 1000; // 1 second

// Cart Configuration
export const CART_COOKIE_NAME = 'lucid_cart';
export const CART_COOKIE_EXPIRY = 30; // days
export const MAX_CART_ITEMS = 100;
export const CART_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
  CHECKOUT: 'checkout'
} as const;

// Product Configuration
export const DEFAULT_CURRENCY = 'EUR';
export const CURRENCY_SYMBOLS = {
  EUR: '€',
  USD: '$',
  GBP: '£'
};

// Shipping Configuration
export const FREE_SHIPPING_THRESHOLD = 100; // in EUR
export const DEFAULT_SHIPPING_COST = 10; // in EUR

// Supported Countries
export const SUPPORTED_COUNTRIES: CountryCode[] = ['FR', 'BE', 'LU'];
export const SHIPPING_ZONES = {
  EUROPE: ['FR', 'BE', 'LU', 'DE', 'GB'],
  WORLDWIDE: ['ES', 'IT', 'PT']
};

// Product Categories
export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'furniture',
  'decor',
  'lighting',
  'accessories',
  'outdoor'
];

// Blog Categories
export const BLOG_CATEGORIES: BlogCategory[] = [
  'design',
  'inspiration',
  'tips',
  'news',
  'events'
];

// User Roles
export const USER_ROLES: UserRole[] = ['customer', 'admin', 'manager'];

// Form Configuration
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Pagination
export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 100;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Une erreur réseau est survenue. Veuillez réessayer plus tard.',
  AUTH_ERROR: 'Identifiants invalides. Veuillez vérifier votre email et mot de passe.',
  CART_ERROR: 'Une erreur est survenue lors du traitement de votre panier.',
  ORDER_ERROR: 'Une erreur est survenue lors du traitement de votre commande.',
  PAYMENT_ERROR: 'Une erreur est survenue lors du paiement. Veuillez vérifier vos informations de carte.',
  FILE_SIZE_ERROR: 'Le fichier est trop volumineux. Taille maximale: 5MB.',
  FILE_TYPE_ERROR: 'Type de fichier non autorisé. Formats acceptés: JPEG, PNG, WEBP.'
};

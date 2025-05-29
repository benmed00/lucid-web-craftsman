// File_name : src/utils/dateUtils.ts

import { DEFAULT_LOCALE } from '../constants';

export const formatDate = (date: Date | string, format: string = 'long'): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  switch (format) {
    case 'short':
      return d.toLocaleDateString(DEFAULT_LOCALE, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    case 'medium':
      return d.toLocaleDateString(DEFAULT_LOCALE, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    case 'long':
      return d.toLocaleDateString(DEFAULT_LOCALE, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    case 'full':
      return d.toLocaleDateString(DEFAULT_LOCALE, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    default:
      return d.toLocaleDateString(DEFAULT_LOCALE);
  }
};

export const formatTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString(DEFAULT_LOCALE, {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getRelativeTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return 'à l\'instant';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} heure${hours > 1 ? 's' : ''} ago`;
  if (weeks < 1) return `${days} jour${days > 1 ? 's' : ''} ago`;
  if (months < 1) return `${weeks} semaine${weeks > 1 ? 's' : ''} ago`;
  if (years < 1) return `${months} mois${months > 1 ? 's' : ''} ago`;
  return `${years} an${years > 1 ? 's' : ''} ago`;
};

export const isFutureDate = (date: Date | string): boolean => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d > new Date();
};

export const isPastDate = (date: Date | string): boolean => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d < new Date();
};

export const getDaysUntil = (date: Date | string): number => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = d.getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

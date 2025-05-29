export const slugify = (str: string): string => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const capitalizeWords = (str: string): string => {
  return str
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
};

export const truncate = (str: string, length: number, suffix = '...'): string => {
  if (str.length <= length) return str;
  return str.slice(0, length) + suffix;
};

export const formatPhoneNumber = (phone: string): string => {
  return phone.replace(/\D/g, '').replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
};

export const formatPostalCode = (postalCode: string, country: string = 'FR'): string => {
  const code = postalCode.replace(/\D/g, '');
  
  switch (country) {
    case 'FR':
      return code;
    case 'BE':
      return code;
    case 'LU':
      return code;
    case 'DE':
      return code;
    case 'GB':
      return code.toUpperCase();
    default:
      return code;
  }
};

export const formatPriceRange = (min: number, max: number): string => {
  if (min === max) return `${min}`;
  return `${min} - ${max}`;
};

export const formatDimensions = (dimensions: { width: number; height: number; depth: number; unit: string }): string => {
  const { width, height, depth, unit } = dimensions;
  return `${width}${unit} × ${height}${unit} × ${depth}${unit}`;
};

export const formatWeight = (weight: number, unit: string = 'kg'): string => {
  return `${weight}${unit}`;
};

export const formatRating = (rating: number, max: number = 5): string => {
  const stars = '★'.repeat(Math.floor(rating));
  const emptyStars = '☆'.repeat(max - Math.floor(rating));
  return `${stars}${emptyStars} (${rating.toFixed(1)})`;
};

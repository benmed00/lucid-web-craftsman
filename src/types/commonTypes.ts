// File_name : src/types/commonTypes.ts

export type CountryCode = 'FR' | 'BE' | 'LU' | 'DE' | 'GB' | 'ES' | 'IT' | 'PT';

export interface Address {
  street: string;
  complement?: string;
  postalCode: string;
  city: string;
  country: CountryCode;
}

export interface ContactInfo {
  email: string;
  phone: string;
  address: Address;
}

export type FormField = {
  value: string;
  isValid: boolean;
  error?: string;
  touched: boolean;
};

export type ValidationPattern = {
  [key: string]: RegExp | { [key: string]: RegExp };
};

export type ValidationMessages = {
  [key: string]: string | { [key: string]: string };
};

export type AutocompleteValues = {
  [key: string]: string;
};

export interface FormConstants {
  validationMessages: ValidationMessages;
  patterns: ValidationPattern;
  autocomplete: {
    personal: AutocompleteValues;
    payment: AutocompleteValues;
  };
}

// File_name : src/types/formTypes.ts

export type ValidationPattern = {
  [key: string]: RegExp | {
    [key: string]: RegExp;
    default: RegExp;
  };
};

export type ValidationMessages = {
  [key: string]: string | {
    [key: string]: string;
    default: string;
  };
};

export type FormField = {
  value: string;
  isValid: boolean;
  error?: string;
  touched: boolean;
};

export type FormConstants = {
  validationMessages: ValidationMessages;
  patterns: ValidationPattern;
  autocomplete: {
    personal: Record<string, string>;
    payment: Record<string, string>;
  };
};

export type ValidationType = keyof ValidationPattern;

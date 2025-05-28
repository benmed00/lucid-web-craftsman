export const FORM_CONSTANTS = {
  VALIDATION_MESSAGES: {
    required: "Ce champ est requis",
    email: "Veuillez entrer une adresse email valide",
    phone: "Veuillez entrer un numéro de téléphone valide",
    postalCode: {
      FR: "Veuillez entrer un code postal français valide (5 chiffres)",
      default: "Veuillez entrer un code postal valide"
    },
    cardNumber: "Veuillez entrer un numéro de carte valide",
    expiry: "Format invalide (MM/AA)",
    cvc: "Le CVC doit contenir 3 chiffres",
    nameOnCard: "Ce champ est requis"
  },
  PATTERNS: {
    email: /^\S+@\S+\.\S+$/,
    phone: /^\+?\d{10,15}$/, // International phone numbers
    postalCode: {
      FR: /^\d{5}$/,
      default: /^\d{5}$|^\d{4}-\d{4}$/ // French or Belgian format
    },
    cardNumber: /^\d{4} \d{4} \d{4} \d{4}$/, // With spaces
    expiry: /^\d{2}\/\d{2}$/, // MM/YY
    cvc: /^\d{3}$/,
    name: /^[a-zA-Z\sàâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ-]+$/ // French letters and hyphens
  },
  AUTOCOMPLETE: {
    PERSONAL: {
      firstName: "given-name",
      lastName: "family-name",
      email: "email",
      phone: "tel",
      address: "street-address",
      addressComplement: "address-line2",
      postalCode: "postal-code",
      city: "address-level2",
      country: "country"
    },
    PAYMENT: {
      cardNumber: "cc-number",
      expiry: "cc-exp",
      cvc: "cc-csc",
      nameOnCard: "cc-name"
    }
  }
};

export const validateField = (value: string, type: 'email' | 'phone' | 'postalCode' | 'cardNumber' | 'expiry' | 'cvc' | 'required' | 'name', country: string = "FR") => {
  const pattern = FORM_CONSTANTS.PATTERNS[type];
  if (typeof pattern === 'object' && 'default' in pattern) {
    return pattern[country] || pattern.default;
  }
  return pattern;
};

export const getErrorMessage = (type: keyof typeof FORM_CONSTANTS.VALIDATION_MESSAGES, country: string = "FR") => {
  const message = FORM_CONSTANTS.VALIDATION_MESSAGES[type];
  if (typeof message === 'object' && 'default' in message) {
    return message[country] || message.default;
  }
  return message;
};

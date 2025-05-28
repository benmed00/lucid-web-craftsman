import { useState, useCallback } from "react";
import { FORM_CONSTANTS, validateField, getErrorMessage } from "@/utils/formUtils";

interface FormField {
  value: string;
  error: string;
  isValid: boolean;
}

interface UseFormConfig {
  initialValues: Record<string, string>;
  validationSchema?: Record<string, 'email' | 'phone' | 'postalCode' | 'cardNumber' | 'expiry' | 'cvc' | 'required' | 'nameOnCard'>;
  country?: string;
}

export const useForm = ({
  initialValues,
  validationSchema = {},
  country = "FR"
}: UseFormConfig) => {
  const [fields, setFields] = useState<Record<string, FormField>>(
    Object.entries(initialValues).reduce((acc, [key, value]) => ({
      ...acc,
      [key]: {
        value,
        error: "",
        isValid: true
      }
    }), {})
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");

  const validateField = useCallback(
    (name: string, value: string) => {
      const field = fields[name];
      if (!field) return;

      let isValid = true;
      let error = "";

      if (value === "") {
        isValid = false;
        error = FORM_CONSTANTS.VALIDATION_MESSAGES.required;
      } else if (validationSchema[name]) {
        const validationType = validationSchema[name];
        const pattern = FORM_CONSTANTS.PATTERNS[validationType];
        isValid = pattern.test(value);
        if (!isValid) {
          error = getErrorMessage(validationType, country);
        }
      }

      setFields(prev => ({
        ...prev,
        [name]: {
          ...field,
          value,
          error,
          isValid
        }
      }));

      return isValid;
    },
    [fields, validationSchema, country]
  );

  const handleChange = useCallback(
    (name: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      validateField(name, value);
    },
    [validateField]
  );

  const handleSubmit = useCallback(
    (onSubmit: (values: Record<string, string>) => Promise<void>) => async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmissionError("");

      // Validate all fields
      const isValid = Object.entries(fields).every(([name, field]) => {
        if (!field.isValid) {
          validateField(name, field.value);
        }
        return field.isValid;
      });

      if (!isValid) return;

      try {
        setIsSubmitting(true);
        await onSubmit(Object.fromEntries(
          Object.entries(fields).map(([name, field]) => [name, field.value])
        ));
      } catch (error) {
        console.error("Form submission error:", error);
        setSubmissionError("Une erreur est survenue lors de la soumission du formulaire");
      } finally {
        setIsSubmitting(false);
      }
    },
    [fields, validateField]
  );

  return {
    fields,
    handleChange,
    handleSubmit,
    isSubmitting,
    submissionError,
    validateField
  };
};

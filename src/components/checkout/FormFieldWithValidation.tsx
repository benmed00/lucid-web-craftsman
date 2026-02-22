import { useState, useCallback, useEffect } from 'react';
import { AlertCircle, Check, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface FormFieldWithValidationProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  helpText?: string;
  validate?: (value: string) => string | null;
  showSuccessState?: boolean;
  autoComplete?: string;
  maxLength?: number;
}

const FormFieldWithValidation = ({
  id,
  label,
  value,
  onChange,
  error: externalError,
  type = 'text',
  placeholder,
  required = false,
  helpText,
  validate,
  showSuccessState = true,
  autoComplete,
  maxLength,
}: FormFieldWithValidationProps) => {
  const { t } = useTranslation('checkout');
  const [touched, setTouched] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const displayError = externalError || localError;
  const isValid = touched && !displayError && value.length > 0;

  // Validate on blur
  const handleBlur = useCallback(() => {
    setTouched(true);
    if (validate && value) {
      const validationError = validate(value);
      setLocalError(validationError);
    } else if (required && !value.trim()) {
      setLocalError(t('form.required'));
    }
  }, [validate, value, required, t]);

  // Clear local error when typing
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
      if (localError) {
        setLocalError(null);
      }
    },
    [onChange, localError]
  );

  // Clear local error when external value changes and clears
  useEffect(() => {
    if (!externalError && touched && value) {
      if (validate) {
        const validationError = validate(value);
        setLocalError(validationError);
      } else {
        setLocalError(null);
      }
    }
  }, [value, externalError, validate, touched]);

  return (
    <div className="space-y-2">
      <Label
        htmlFor={id}
        className={cn(
          'flex items-center gap-1 transition-colors',
          displayError && 'text-destructive'
        )}
      >
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>

      <div className="relative">
        <Input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          required={required}
          autoComplete={autoComplete}
          maxLength={maxLength}
          aria-required={required}
          aria-invalid={!!displayError}
          aria-describedby={
            displayError ? `${id}-error` : helpText ? `${id}-help` : undefined
          }
          className={cn(
            'pr-10 transition-all',
            displayError && 'border-destructive focus-visible:ring-destructive',
            isValid &&
              showSuccessState &&
              'border-primary/50 focus-visible:ring-primary'
          )}
        />

        {/* Status icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {displayError && (
            <AlertCircle className="h-4 w-4 text-destructive animate-in fade-in duration-200" />
          )}
          {isValid && showSuccessState && (
            <Check className="h-4 w-4 text-primary animate-in fade-in zoom-in duration-200" />
          )}
        </div>
      </div>

      {/* Error message */}
      {displayError && (
        <p
          id={`${id}-error`}
          className="text-xs text-destructive flex items-center gap-1 animate-in slide-in-from-top-1 duration-200"
          role="alert"
        >
          <AlertCircle className="h-3 w-3 shrink-0" />
          {displayError}
        </p>
      )}

      {/* Help text */}
      {!displayError && helpText && (
        <p
          id={`${id}-help`}
          className="text-xs text-muted-foreground flex items-center gap-1"
        >
          <Info className="h-3 w-3 shrink-0" />
          {helpText}
        </p>
      )}
    </div>
  );
};

export default FormFieldWithValidation;

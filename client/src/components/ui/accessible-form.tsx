import * as React from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "../language-provider";
import { Label } from "./label";
import { Button } from "./button";
import { AlertTriangle, CheckCircle } from "lucide-react";

interface AccessibleFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  title: string;
  description?: string;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting?: boolean;
  errors?: Record<string, string>;
  successMessage?: string;
}

interface FormSectionProps {
  title: string;
  description?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

interface FormGroupProps {
  children: React.ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

interface FormActionsProps {
  children: React.ReactNode;
  className?: string;
  position?: 'left' | 'right' | 'center' | 'between';
}

// Main form component with accessibility features
export const AccessibleForm: React.FC<AccessibleFormProps> = ({
  title,
  description,
  children,
  onSubmit,
  isSubmitting = false,
  errors = {},
  successMessage,
  className,
  ...props
}) => {
  const { isRTL, t } = useLanguage();
  const formId = React.useId();
  const errorSummaryId = `${formId}-errors`;
  const successId = `${formId}-success`;

  const hasErrors = Object.keys(errors).length > 0;

  // Focus management
  const errorSummaryRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (hasErrors && errorSummaryRef.current) {
      errorSummaryRef.current.focus();
    }
  }, [hasErrors]);

  return (
    <div className={cn("accessible-form-container", className)} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Skip to content link for screen readers */}
      <a 
        href={`#${formId}-content`} 
        className="skip-to-content sr-only focus:not-sr-only"
      >
        {t('accessibility.skip_to_content')}
      </a>

      {/* Form header */}
      <div className="form-header mb-6">
        <h1 className="text-2xl font-bold text-foreground" id={`${formId}-title`}>
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-muted-foreground" id={`${formId}-description`}>
            {description}
          </p>
        )}
      </div>

      {/* Success message */}
      {successMessage && (
        <div
          id={successId}
          role="status"
          aria-live="polite"
          className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md text-green-800 flex items-center gap-2"
        >
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error summary */}
      {hasErrors && (
        <div
          ref={errorSummaryRef}
          id={errorSummaryId}
          role="alert"
          aria-labelledby={`${formId}-error-title`}
          tabIndex={-1}
          className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-md"
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h2 id={`${formId}-error-title`} className="font-semibold text-destructive">
              {t('error.form_errors_title')}
            </h2>
          </div>
          <ul className="list-disc list-inside space-y-1 text-sm text-destructive">
            {Object.entries(errors).map(([field, error]) => (
              <li key={field}>
                <a
                  href={`#${field}`}
                  className="underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2 rounded"
                  onClick={(e) => {
                    e.preventDefault();
                    const element = document.getElementById(field);
                    if (element) {
                      element.focus();
                    }
                  }}
                >
                  {error}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Form content */}
      <form
        id={formId}
        onSubmit={onSubmit}
        aria-labelledby={`${formId}-title`}
        aria-describedby={description ? `${formId}-description` : undefined}
        aria-invalid={hasErrors}
        noValidate
        className="space-y-6"
        {...props}
      >
        <div id={`${formId}-content`} className="space-y-6">
          {children}
        </div>
      </form>

      {/* Loading overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg shadow-lg flex items-center gap-3">
            <div className="loading-spinner w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
            <span>{t('common.processing')}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Form section with proper heading hierarchy
export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  required = false,
  children,
  className
}) => {
  const { t } = useLanguage();
  const sectionId = React.useId();

  return (
    <fieldset className={cn("form-section border-0 p-0", className)}>
      <legend className="text-lg font-semibold text-foreground mb-3">
        {title}
        {required && (
          <span className="text-destructive ml-1" aria-label={t('common.required')}>
            *
          </span>
        )}
      </legend>
      {description && (
        <p className="text-sm text-muted-foreground mb-4" id={`${sectionId}-desc`}>
          {description}
        </p>
      )}
      <div className="space-y-4" aria-describedby={description ? `${sectionId}-desc` : undefined}>
        {children}
      </div>
    </fieldset>
  );
};

// Form group for organizing related fields
export const FormGroup: React.FC<FormGroupProps> = ({
  children,
  className,
  orientation = 'vertical'
}) => {
  return (
    <div 
      className={cn(
        "form-group",
        orientation === 'horizontal' ? "flex gap-4 items-end" : "space-y-4",
        className
      )}
      role="group"
    >
      {children}
    </div>
  );
};

// Form actions with proper positioning
export const FormActions: React.FC<FormActionsProps> = ({
  children,
  className,
  position = 'right'
}) => {
  const positionClasses = {
    left: 'justify-start',
    right: 'justify-end',
    center: 'justify-center',
    between: 'justify-between'
  };

  return (
    <div 
      className={cn(
        "form-actions flex gap-3 pt-6 border-t border-border",
        positionClasses[position],
        className
      )}
    >
      {children}
    </div>
  );
};

// Accessible form button with loading state
interface FormButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const FormButton: React.FC<FormButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  className,
  ...props
}) => {
  const { t } = useLanguage();

  return (
    <Button
      variant={variant === 'primary' ? 'default' : variant}
      size={size}
      disabled={disabled || loading}
      className={cn(
        "relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        loading && "cursor-not-allowed",
        className
      )}
      aria-busy={loading}
      aria-describedby={loading ? 'loading-description' : undefined}
      {...props}
    >
      {loading ? (
        <>
          <div className="loading-spinner w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
          <span className="sr-only" id="loading-description">
            {t('common.loading')}
          </span>
          <span aria-hidden="true">{t('common.processing')}</span>
        </>
      ) : (
        <>
          {icon && <span className="mr-2" aria-hidden="true">{icon}</span>}
          {children}
        </>
      )}
    </Button>
  );
};

// Form field wrapper with enhanced accessibility
interface AccessibleFieldProps {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactElement;
  className?: string;
}

export const AccessibleField: React.FC<AccessibleFieldProps> = ({
  label,
  name,
  error,
  hint,
  required = false,
  children,
  className
}) => {
  const { t } = useLanguage();
  const fieldId = children.props.id || name;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;

  // Clone the child element to add accessibility props
  const childWithProps = React.cloneElement(children, {
    id: fieldId,
    'aria-invalid': error ? 'true' : 'false',
    'aria-describedby': [
      error ? errorId : null,
      hint ? hintId : null,
    ].filter(Boolean).join(' ') || undefined,
    'aria-required': required,
    ...children.props
  });

  return (
    <div className={cn("accessible-field space-y-2", className)}>
      <Label 
        htmlFor={fieldId}
        className={cn(
          "text-sm font-medium leading-none",
          error && "text-destructive"
        )}
      >
        {label}
        {required && (
          <span className="text-destructive ml-1" aria-label={t('common.required')}>
            *
          </span>
        )}
      </Label>

      {hint && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}

      {childWithProps}

      {error && (
        <div 
          id={errorId}
          role="alert"
          aria-live="polite"
          className="text-sm text-destructive flex items-center gap-1"
        >
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
};

// Hook for form accessibility
export const useFormAccessibility = (formRef: React.RefObject<HTMLFormElement>) => {
  const firstErrorField = React.useRef<HTMLElement | null>(null);

  const focusFirstError = React.useCallback(() => {
    if (formRef.current && firstErrorField.current) {
      firstErrorField.current.focus();
    }
  }, [formRef]);

  const setFirstErrorField = React.useCallback((element: HTMLElement | null) => {
    firstErrorField.current = element;
  }, []);

  return {
    focusFirstError,
    setFirstErrorField
  };
};
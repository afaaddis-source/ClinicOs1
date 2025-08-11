import * as React from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "../language-provider";
import { Label } from "./label";

export interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  labelFor?: string;
}

export interface TextareaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  labelFor?: string;
}

export interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  labelFor?: string;
  options: { value: string; label: string }[];
}

const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ className, label, error, helperText, required, labelFor, id, type, ...props }, ref) => {
    const { isRTL, t } = useLanguage();
    const fieldId = id || labelFor || `field-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="form-field-container space-y-2">
        <Label 
          htmlFor={fieldId}
          className={cn(
            "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
            error && "text-destructive",
            isRTL && "text-right"
          )}
        >
          {label}
          {required && (
            <span className="text-destructive ml-1" aria-label={t('auth.required')}>
              *
            </span>
          )}
        </Label>
        
        <input
          id={fieldId}
          ref={ref}
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
            "ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium",
            "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive form-field-error",
            isRTL && "text-right",
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined
          }
          {...props}
        />
        
        {error && (
          <div 
            id={`${fieldId}-error`}
            className="form-error text-sm text-destructive"
            role="alert"
          >
            {error}
          </div>
        )}
        
        {helperText && !error && (
          <div 
            id={`${fieldId}-helper`}
            className="text-sm text-muted-foreground"
          >
            {helperText}
          </div>
        )}
      </div>
    );
  }
);

FormField.displayName = "FormField";

const TextareaField = React.forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  ({ className, label, error, helperText, required, labelFor, id, ...props }, ref) => {
    const { isRTL, t } = useLanguage();
    const fieldId = id || labelFor || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="form-field-container space-y-2">
        <Label 
          htmlFor={fieldId}
          className={cn(
            "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
            error && "text-destructive",
            isRTL && "text-right"
          )}
        >
          {label}
          {required && (
            <span className="text-destructive ml-1" aria-label={t('auth.required')}>
              *
            </span>
          )}
        </Label>
        
        <textarea
          id={fieldId}
          ref={ref}
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
            "ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive form-field-error",
            isRTL && "text-right",
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined
          }
          {...props}
        />
        
        {error && (
          <div 
            id={`${fieldId}-error`}
            className="form-error text-sm text-destructive"
            role="alert"
          >
            {error}
          </div>
        )}
        
        {helperText && !error && (
          <div 
            id={`${fieldId}-helper`}
            className="text-sm text-muted-foreground"
          >
            {helperText}
          </div>
        )}
      </div>
    );
  }
);

TextareaField.displayName = "TextareaField";

const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ className, label, error, helperText, required, labelFor, id, options, ...props }, ref) => {
    const { isRTL, t } = useLanguage();
    const fieldId = id || labelFor || `select-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="form-field-container space-y-2">
        <Label 
          htmlFor={fieldId}
          className={cn(
            "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
            error && "text-destructive",
            isRTL && "text-right"
          )}
        >
          {label}
          {required && (
            <span className="text-destructive ml-1" aria-label={t('auth.required')}>
              *
            </span>
          )}
        </Label>
        
        <select
          id={fieldId}
          ref={ref}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
            "ring-offset-background focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive form-field-error",
            isRTL && "text-right",
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined
          }
          {...props}
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        
        {error && (
          <div 
            id={`${fieldId}-error`}
            className="form-error text-sm text-destructive"
            role="alert"
          >
            {error}
          </div>
        )}
        
        {helperText && !error && (
          <div 
            id={`${fieldId}-helper`}
            className="text-sm text-muted-foreground"
          >
            {helperText}
          </div>
        )}
      </div>
    );
  }
);

SelectField.displayName = "SelectField";

export { FormField, TextareaField, SelectField };
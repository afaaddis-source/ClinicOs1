import { createContext, useContext } from 'react';

// Translation types
export type TranslationKey = string;
export type Language = 'ar' | 'en';

export interface TranslationData {
  [key: string]: any;
}

// Language context
export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  isRTL: boolean;
}

export const LanguageContext = createContext<LanguageContextType>({
  language: 'ar',
  setLanguage: () => {},
  t: (key: string) => key,
  isRTL: true,
});

// Translation data store
let translations: Record<Language, TranslationData> = {
  ar: {},
  en: {}
};

// Load translations
export const loadTranslations = async () => {
  try {
    const [arData, enData] = await Promise.all([
      fetch('/locales/ar.json').then(r => r.json()),
      fetch('/locales/en.json').then(r => r.json())
    ]);
    
    translations.ar = arData;
    translations.en = enData;
  } catch (error) {
    console.error('Failed to load translations:', error);
    // Fallback translations
    translations = {
      ar: { 
        common: { loading: 'جارٍ التحميل...', error: 'خطأ' },
        nav: { dashboard: 'الرئيسية', patients: 'المرضى' }
      },
      en: { 
        common: { loading: 'Loading...', error: 'Error' },
        nav: { dashboard: 'Dashboard', patients: 'Patients' }
      }
    };
  }
};

// Get nested object value by dot notation
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
};

// Main translation function
export const createTranslation = (language: Language) => {
  return (key: string, params?: Record<string, string | number>): string => {
    let value = getNestedValue(translations[language], key);
    
    // Fallback to English if Arabic translation is missing
    if (value === null && language === 'ar') {
      value = getNestedValue(translations['en'], key);
    }
    
    // Fallback to key if no translation found
    if (value === null) {
      console.warn(`Translation missing for key: ${key}`);
      return key.split('.').pop() || key;
    }
    
    // Handle pluralization for numbers
    if (typeof value === 'object' && params && 'count' in params) {
      const count = Number(params.count);
      if (language === 'ar') {
        // Arabic pluralization rules
        if (count === 0) value = value.zero || value.other;
        else if (count === 1) value = value.one || value.other;
        else if (count === 2) value = value.two || value.other;
        else if (count >= 3 && count <= 10) value = value.few || value.other;
        else value = value.many || value.other;
      } else {
        // English pluralization rules
        value = count === 1 ? (value.one || value.other) : (value.other || value.one);
      }
    }
    
    // Replace parameters
    if (params && typeof value === 'string') {
      Object.entries(params).forEach(([param, val]) => {
        value = value.replace(new RegExp(`{${param}}`, 'g'), String(val));
      });
    }
    
    return String(value);
  };
};

// Format date/time for Kuwait timezone
export const formatDateTime = (
  date: Date | string, 
  language: Language, 
  options: Intl.DateTimeFormatOptions = {}
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const locale = language === 'ar' ? 'ar-KW' : 'en-KW';
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kuwait',
    ...options
  };
  
  return dateObj.toLocaleDateString(locale, defaultOptions);
};

// Format time specifically
export const formatTime = (
  date: Date | string, 
  language: Language,
  format: '12' | '24' = '12'
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const locale = language === 'ar' ? 'ar-KW' : 'en-KW';
  
  return dateObj.toLocaleTimeString(locale, {
    timeZone: 'Asia/Kuwait',
    hour: 'numeric',
    minute: '2-digit',
    hour12: format === '12'
  });
};

// Format currency (Kuwaiti Dinar)
export const formatCurrency = (
  amount: number,
  language: Language,
  showCurrency: boolean = true
): string => {
  const locale = language === 'ar' ? 'ar-KW' : 'en-KW';
  
  if (showCurrency) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'KWD',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(amount);
  }
  
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  }).format(amount);
};

// Format numbers
export const formatNumber = (
  number: number,
  language: Language
): string => {
  const locale = language === 'ar' ? 'ar-KW' : 'en-KW';
  return new Intl.NumberFormat(locale).format(number);
};

// Get relative time (e.g., "2 hours ago")
export const getRelativeTime = (
  date: Date | string,
  language: Language
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  if (language === 'ar') {
    if (diffInSeconds < 60) return 'منذ لحظات';
    if (diffInSeconds < 3600) return `منذ ${Math.floor(diffInSeconds / 60)} دقيقة`;
    if (diffInSeconds < 86400) return `منذ ${Math.floor(diffInSeconds / 3600)} ساعة`;
    if (diffInSeconds < 2592000) return `منذ ${Math.floor(diffInSeconds / 86400)} يوم`;
    return formatDateTime(dateObj, language, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } else {
    if (diffInSeconds < 60) return 'moments ago';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return formatDateTime(dateObj, language, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
};

// Direction utilities
export const getDirection = (language: Language): 'rtl' | 'ltr' => {
  return language === 'ar' ? 'rtl' : 'ltr';
};

export const isRTL = (language: Language): boolean => {
  return language === 'ar';
};

// CSS class helpers
export const getLanguageClasses = (language: Language): string => {
  return `lang-${language} ${isRTL(language) ? 'rtl' : 'ltr'}`;
};

// Validation message helpers
export const getValidationMessage = (
  error: string,
  field: string,
  language: Language,
  t: (key: string, params?: Record<string, string | number>) => string
): string => {
  const fieldName = t(`fields.${field}`, { fallback: field });
  
  switch (error) {
    case 'required':
      return t('validation.required_field', { field: fieldName });
    case 'invalid_email':
      return t('validation.invalid_email');
    case 'invalid_phone':
      return t('validation.invalid_phone');
    case 'min_length':
      return t('validation.min_length', { field: fieldName });
    case 'max_length':
      return t('validation.max_length', { field: fieldName });
    default:
      return t('validation.invalid_input');
  }
};

// CSRF and error message helpers
export const getFriendlyErrorMessage = (
  error: any,
  language: Language,
  t: (key: string) => string
): string => {
  if (error?.message?.includes('CSRF')) {
    return t('error.csrf_message');
  }
  
  if (error?.message?.includes('file')) {
    return t('error.file_upload_error');
  }
  
  if (error?.status === 403) {
    return t('error.access_denied_message');
  }
  
  if (error?.status === 404) {
    return t('error.not_found_message');
  }
  
  if (error?.status >= 500) {
    return t('error.server_message');
  }
  
  return error?.message || t('error.generic_error');
};

// PDF document language setup
export const getPDFLanguageConfig = (language: Language) => {
  return {
    language,
    direction: getDirection(language),
    font: language === 'ar' ? 'NotoSansArabic' : 'Roboto',
    fontSize: language === 'ar' ? 14 : 12,
    lineHeight: language === 'ar' ? 1.8 : 1.6
  };
};

// Accessibility helpers
export const getAccessibilityProps = (language: Language) => {
  return {
    lang: language,
    dir: getDirection(language),
    'aria-label': undefined // Will be set by component
  };
};
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Globe } from 'lucide-react';
import { 
  loadTranslations, 
  createTranslation, 
  LanguageContext,
  LanguageContextType,
  Language,
  getDirection,
  isRTL 
} from '../lib/i18n';

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // Check localStorage first, then default to Arabic
    const saved = localStorage.getItem('clinic-language');
    return (saved === 'en' || saved === 'ar') ? saved : 'ar';
  });
  
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize translations
  useEffect(() => {
    const initTranslations = async () => {
      try {
        await loadTranslations();
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to load translations:', error);
        setIsLoaded(true); // Continue with fallback
      }
    };

    initTranslations();
  }, []);

  // Update HTML attributes and localStorage when language changes
  useEffect(() => {
    const direction = getDirection(language);
    const htmlElement = document.documentElement;
    
    // Add transition class for smooth switching
    htmlElement.classList.add('lang-switching');
    
    // Update HTML attributes
    htmlElement.setAttribute('lang', language);
    htmlElement.setAttribute('dir', direction);
    
    // Update CSS class for styling
    htmlElement.className = htmlElement.className.replace(/lang-(ar|en)/g, '');
    htmlElement.classList.add(`lang-${language}`);
    
    // Save to localStorage
    localStorage.setItem('clinic-language', language);
    
    // Update body font-family directly for immediate effect
    document.body.style.fontFamily = language === 'ar' ? 'var(--font-arabic)' : 'var(--font-english)';
    
    // Remove transition class after animation
    setTimeout(() => {
      htmlElement.classList.remove('lang-switching');
    }, 300);

  }, [language, isLoaded]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = createTranslation(language);

  const contextValue: LanguageContextType = {
    language,
    setLanguage,
    t,
    isRTL: isRTL(language)
  };

  // Show loading state while translations are loading
  if (!isLoaded) {
    return (
      <div className="loading-container" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        {language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}
      </div>
    );
  }

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook for using language context
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Language Toggle Component
export const LanguageToggle: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  
  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  return (
    <button
      onClick={toggleLanguage}
      className="language-toggle-btn w-full"
      style={{
        padding: '0.5rem 1rem',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        color: 'rgba(255, 255, 255, 0.9)',
        background: 'rgba(255, 255, 255, 0.1)',
        fontSize: '0.875rem',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        justifyContent: 'center'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      aria-label={t('nav.language')}
    >
      <span style={{ fontSize: '1.1rem' }}>
        {language === 'ar' ? '🇺🇸' : '🇰🇼'}
      </span>
      <span>
        {language === 'ar' ? 'English' : 'العربية'}
      </span>
    </button>
  );
};

// Higher-order component for pages that need translations
export const withTranslation = <P extends object>(
  Component: React.ComponentType<P & { t: ReturnType<typeof createTranslation> }>
) => {
  return (props: P) => {
    const { t } = useLanguage();
    return <Component {...props} t={t} />;
  };
};
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Supported languages
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' }
];

// Configure i18next
i18n
  // Load translations from /public/locales
  .use(Backend)
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Init i18next
  .init({
    // Default language
    fallbackLng: 'en',
    // Debug in development
    debug: import.meta.env.DEV,
    // How long to cache translations
    load: 'languageOnly',
    
    // Options for language detection
    detection: {
      // Order of detectors
      order: ['localStorage', 'navigator'],
      // Local storage key
      lookupLocalStorage: 'aemos_language',
      // Cache language in local storage
      caches: ['localStorage'],
    },
    
    interpolation: {
      // React already safeguards against XSS
      escapeValue: false,
    },
    
    // Backend options
    backend: {
      // Path to translation files
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    
    // Namespace configuration
    ns: ['translation'],
    defaultNS: 'translation',
  });

export default i18n; 
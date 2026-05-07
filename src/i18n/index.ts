import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import vi from './locales/vi.json';
import en from './locales/en.json';

type Locale = 'vi' | 'en';

function getPersistedLocale(): Locale {
  try {
    const raw = localStorage.getItem('ui-storage');
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { locale?: string } };
      if (parsed?.state?.locale === 'en') return 'en';
    }
  } catch {
    // ignore — fall through to default
  }
  return 'vi';
}

i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    en: { translation: en },
  },
  lng: getPersistedLocale(),
  fallbackLng: 'vi',
  interpolation: {
    escapeValue: false, // React already escapes values
  },
});

export default i18n;

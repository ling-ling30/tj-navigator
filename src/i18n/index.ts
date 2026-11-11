import { create } from 'zustand';
import type { Locale, TranslationKey } from './types';
import { idDictionary } from './id';
import { enDictionary } from './en';

const STORAGE_KEY = 'tj_navigator_locale';

function getStoredLocale(): Locale {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'id' || saved === 'en') {
        return saved;
      }
    }
  } catch (err) {
    console.warn('Unable to access localStorage for locale:', err);
  }
  return 'id';
}

function persistLocale(locale: Locale): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, locale);
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  } catch (err) {
    console.warn('Unable to persist locale to localStorage:', err);
  }
}

interface I18nStoreState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

export const useI18nStore = create<I18nStoreState>((set, get) => ({
  locale: getStoredLocale(),
  setLocale: (locale: Locale) => {
    persistLocale(locale);
    set({ locale });
  },
  toggleLocale: () => {
    const nextLocale = get().locale === 'id' ? 'en' : 'id';
    persistLocale(nextLocale);
    set({ locale: nextLocale });
  }
}));

const dictionaries = {
  id: idDictionary,
  en: enDictionary
};

export function translate(
  key: TranslationKey,
  params?: Record<string, string | number>,
  locale: Locale = 'id'
): string {
  const dict = dictionaries[locale] || idDictionary;
  let text = dict[key] || idDictionary[key] || key;

  if (params) {
    for (const [paramKey, paramVal] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
    }
  }

  return text;
}

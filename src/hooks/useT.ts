import { useCallback } from 'react';
import { useI18nStore, translate } from '../i18n';
import type { TranslationKey, Locale } from '../i18n/types';

export function useT() {
  const { locale, setLocale, toggleLocale } = useI18nStore();

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      return translate(key, params, locale);
    },
    [locale]
  );

  return { t, locale, setLocale, toggleLocale };
}

export type { TranslationKey, Locale };

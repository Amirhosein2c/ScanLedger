'use client';

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { availableLocales, getActiveLocale, getTranslatorForLocale, setActiveLocale, type Locale, type Translator } from './core';

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translator;
  availableLocales: Locale[];
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>(getActiveLocale());

  const handleChangeLocale = useCallback((nextLocale: Locale) => {
    setActiveLocale(nextLocale);
    setLocaleState(nextLocale);
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const translator = getTranslatorForLocale(locale);
    return {
      locale,
      setLocale: handleChangeLocale,
      t: translator,
      availableLocales
    };
  }, [handleChangeLocale, locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return {
    locale: context.locale,
    setLocale: context.setLocale,
    t: context.t,
    availableLocales: context.availableLocales
  };
};

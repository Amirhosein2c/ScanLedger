import en from '../../locales/en.json';

export type Locale = 'en';

type TranslationValue = string | TranslationRecord;

interface TranslationRecord {
  [key: string]: TranslationValue;
}

interface TranslateOptions {
  locale?: Locale;
  defaultValue?: string;
  values?: Record<string, string | number>;
}

type Translator = (key: string, options?: Omit<TranslateOptions, 'locale'>) => string;

const resources: Record<Locale, TranslationRecord> = {
  en: en as TranslationRecord
};

const availableLocales = Object.keys(resources) as Locale[];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const lookupMessage = (dictionary: TranslationRecord, key: string): string | undefined => {
  const segments = key.split('.');
  let current: TranslationValue | undefined = dictionary;

  for (const segment of segments) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[segment];
    if (current == null) {
      return undefined;
    }
  }

  return typeof current === 'string' ? current : undefined;
};

const interpolate = (message: string, values: Record<string, string | number> | undefined): string => {
  if (!values) {
    return message;
  }

  return message.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, token: string) => {
    const trimmed = token.trim();
    if (Object.prototype.hasOwnProperty.call(values, trimmed)) {
      const value = values[trimmed];
      return value == null ? '' : String(value);
    }
    return match;
  });
};

const createTranslator = (locale: Locale): Translator => {
  const dictionary = resources[locale] ?? resources.en;

  return (key, options) => {
    const entry = lookupMessage(dictionary, key);
    const fallback = options?.defaultValue ?? key;
    const template = entry ?? fallback;
    return interpolate(template, options?.values);
  };
};

let activeLocale: Locale = 'en';
let activeTranslator: Translator = createTranslator(activeLocale);

export const setActiveLocale = (nextLocale: Locale) => {
  if (nextLocale === activeLocale) {
    return;
  }
  activeLocale = availableLocales.includes(nextLocale) ? nextLocale : 'en';
  activeTranslator = createTranslator(activeLocale);
};

export const getActiveLocale = (): Locale => activeLocale;

export const translate = (key: string, options?: Omit<TranslateOptions, 'locale'>): string =>
  activeTranslator(key, options);

export const getTranslatorForLocale = (locale: Locale): Translator => createTranslator(locale);

export { availableLocales };
export type { Translator, TranslateOptions };

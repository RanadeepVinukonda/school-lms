import { en } from './en';
import { te } from './te';
import { hi } from './hi';

export type Language = 'en' | 'te' | 'hi';

export const languages: { value: Language; label: string; nativeLabel: string }[] = [
  { value: 'en', label: 'English', nativeLabel: 'English' },
  { value: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
  { value: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
];

export const fallbackLang: Language = 'en';

const translations: Record<Language, Record<string, Record<string, string>>> = {
  en,
  te,
  hi,
};

export function getNestedTranslation(lang: Language, key: string): string {
  const keys = key.split('.');
  let result: unknown = translations[lang] || translations[fallbackLang];

  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = (result as Record<string, unknown>)[k];
    } else {
      result = undefined;
      break;
    }
  }

  if (typeof result === 'string') return result;

  let fallbackResult: unknown = translations[fallbackLang];
  for (const k of keys) {
    if (fallbackResult && typeof fallbackResult === 'object' && k in fallbackResult) {
      fallbackResult = (fallbackResult as Record<string, unknown>)[k];
    } else {
      fallbackResult = undefined;
      break;
    }
  }

  return typeof fallbackResult === 'string' ? fallbackResult : key;
}

export function detectLanguage(): Language {
  const stored = localStorage.getItem('lms-language') as Language | null;
  if (stored && languages.some((l) => l.value === stored)) return stored;

  const browserLang = navigator.language?.split('-')[0] as Language;
  if (languages.some((l) => l.value === browserLang)) return browserLang;

  return fallbackLang;
}

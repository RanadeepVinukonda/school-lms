import { en } from './en';
import { te } from './te';
import { hi } from './hi';
import { ta } from './ta';
import { kn } from './kn';

export const translations = {
  en,
  te,
  hi,
  ta,
  kn,
} as const;

export type LanguageCode = keyof typeof translations;
export type TranslationKeys = typeof en;

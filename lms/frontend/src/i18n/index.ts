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

export const languages: { value: LanguageCode; label: string; nativeLabel: string }[] = [
  { value: 'en', label: 'English', nativeLabel: 'English' },
  { value: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
  { value: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { value: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
  { value: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
];

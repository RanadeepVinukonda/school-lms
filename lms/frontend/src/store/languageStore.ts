import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LanguageCode } from '@/i18n';
import { translations } from '@/i18n';

const FALLBACK: LanguageCode = 'en';
function detect(): LanguageCode {
  const lang = navigator.language?.slice(0, 2);
  return (lang && lang in translations ? lang : FALLBACK) as LanguageCode;
}

interface LanguageStore {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      language: detect(),
      setLanguage: (language) => {
        document.documentElement.lang = language;
        set({ language });
      },
    }),
    {
      name: 'lms-language',
      partialize: (state) => ({ language: state.language }),
    },
  ),
);

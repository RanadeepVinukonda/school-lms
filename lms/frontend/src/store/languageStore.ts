import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language } from '@/i18n';
import { detectLanguage, fallbackLang } from '@/i18n';

interface LanguageStore {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      language: (() => { try { return detectLanguage(); } catch { return fallbackLang; } })(),
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

import { useSyncExternalStore, useCallback } from 'react';
import { useLanguageStore } from '@/store/languageStore';
import { getNestedTranslation } from '@/i18n';
import type { Language } from '@/i18n';

function subscribeToLanguage(callback: () => void) {
  const unsub = useLanguageStore.subscribe(callback);
  return unsub;
}

function getSnapshot() {
  return useLanguageStore.getState().language;
}

export function useTranslation() {
  const language = useSyncExternalStore(subscribeToLanguage, getSnapshot);

  const t = useCallback(
    (key: string): string => {
      return getNestedTranslation(language, key);
    },
    [language],
  );

  return { t, language };
}

export function getCurrentLanguage(): Language {
  return useLanguageStore.getState().language;
}

import { useSyncExternalStore } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';
import { translations, LanguageCode, TranslationKeys } from '@/i18n';

function getLang(): LanguageCode {
  const user = useAuthStore.getState().user;
  const storeLang = useLanguageStore.getState().language;
  const userLang = (user?.language as LanguageCode) || storeLang || 'en';
  return translations[userLang] ? userLang : 'en';
}

function subscribe(cb: () => void) {
  const unsub1 = useAuthStore.subscribe(cb);
  const unsub2 = useLanguageStore.subscribe(cb);
  return () => { unsub1(); unsub2(); };
}

export function useTranslation() {
  const lang = useSyncExternalStore(subscribe, getLang, getLang);
  const resource = translations[lang];

  function t<K extends keyof TranslationKeys>(key: K): TranslationKeys[K];
  function t<
    K1 extends keyof TranslationKeys,
    K2 extends keyof TranslationKeys[K1]
  >(key: `${K1}.${Extract<K2, string>}`): TranslationKeys[K1][K2];
  function t(path: string): any {
    const parts = path.split('.');
    let current: any = resource;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return path;
      }
    }
    return current;
  }

  const changeLanguage = async (newLang: LanguageCode) => {
    useLanguageStore.getState().setLanguage(newLang);
    const user = useAuthStore.getState().user;
    if (user) {
      const updatedUser = { ...user, language: newLang };
      useAuthStore.getState().setUser(updatedUser);
      const { supabase } = await import('@/supabase/config');
      await supabase.from('users').update({ language: newLang }).eq('id', user.id);
    }
  };

  return { t, lang, changeLanguage };
}
export default useTranslation;

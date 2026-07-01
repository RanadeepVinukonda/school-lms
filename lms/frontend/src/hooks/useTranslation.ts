import { useAuthStore } from '@/store/authStore';
import { translations, LanguageCode, TranslationKeys } from '@/i18n';

export function useTranslation() {
  const user = useAuthStore((state) => state.user);
  const userLang = (user?.language as LanguageCode) || 'en';
  
  // Safe fallback to 'en'
  const lang: LanguageCode = translations[userLang] ? userLang : 'en';
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
    const setUser = useAuthStore.getState().setUser;
    if (user) {
      const updatedUser = { ...user, language: newLang };
      setUser(updatedUser);
      
      const { supabase } = await import('@/supabase/config');
      await supabase.from('users').update({ language: newLang }).eq('id', user.id);
    }
  };

  return { t, lang, changeLanguage };
}
export default useTranslation;

import { useTranslation } from '@/hooks/useTranslation';
import { languages } from '@/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'compact';
}

export function LanguageSwitcher({ variant = 'dropdown' }: LanguageSwitcherProps) {
  const { t, lang, changeLanguage } = useTranslation();

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1">
        {languages.map((l) => (
          <button
            key={l.value}
            onClick={() => changeLanguage(l.value as any)}
            className={`px-2 py-1 text-xs rounded-md transition-colors ${
              lang === l.value
                ? 'bg-primary text-primary-foreground'
                : 'text-on-surface-variant hover:bg-surface-variant/50'
            }`}
          >
            {l.nativeLabel}
          </button>
        ))}
      </div>
    );
  }

  return (
    <Select value={lang} onValueChange={(v) => changeLanguage(v as any)}>
      <SelectTrigger className="w-40" aria-label={t('language.select')}>
        <SelectValue placeholder={t('language.select')} />
      </SelectTrigger>
      <SelectContent>
        {languages.map((l) => (
          <SelectItem key={l.value} value={l.value}>
            <span className="flex items-center gap-2">
              <span>{l.nativeLabel}</span>
              <span className="text-xs text-on-surface-variant">({l.label})</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useActiveAcademicYear } from '@/context/ActiveAcademicYearContext';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';

interface AcademicYearSelectProps {
  /** Optional override value (for uncontrolled usage inside forms). */
  value?: string;
  /** Called when the user picks a different year. */
  onChange?: (year: string) => void;
  /** When true, also includes the global switcher (sets context + calls onChange). Default false. */
  globalSwitcher?: boolean;
  className?: string;
  placeholder?: string;
}

/**
 * A dropdown that lists all available academic years.
 * Can be used in two modes:
 * 1. **Global switcher** (`globalSwitcher` + no `onChange`) — changes the active context year.
 * 2. **Form field** (`value` + `onChange`) — controlled via parent state.
 */
export function AcademicYearSelect({
  value,
  onChange,
  globalSwitcher = false,
  className,
  placeholder = 'Select academic year',
}: AcademicYearSelectProps) {
  const { activeYear, years, loading, setActiveYear } = useActiveAcademicYear();

  const selectedValue = value ?? activeYear;
  const options = years.length > 0 ? years : [new Date().getFullYear().toString()];

  const handleChange = (year: string) => {
    if (globalSwitcher) {
      setActiveYear(year);
    }
    onChange?.(year);
  };

  return (
    <Select value={selectedValue} onValueChange={handleChange} disabled={loading}>
      <SelectTrigger className={cn('min-w-[140px]', className)}>
        {loading ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Icon name="sync" size={14} className="animate-spin" />
            Loading...
          </span>
        ) : (
          <SelectValue placeholder={placeholder} />
        )}
      </SelectTrigger>
      <SelectContent>
        {options.map((year) => (
          <SelectItem key={year} value={year}>
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

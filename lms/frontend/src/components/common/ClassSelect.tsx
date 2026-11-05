import { useTranslation } from '@/hooks/useTranslation';
import { useClasses } from '@/hooks/useClasses';
import { formatClassName } from '@/services/classService';

interface ClassSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  showEmptyOption?: boolean;
}

/**
 * Centralized, role-aware class dropdown. Loads the classes visible to the
 * current user via useClasses() and renders the standard UI states:
 *  - Loading: "Loading classes..."
 *  - Empty:   "No classes available."
 *  - Error:   "Failed to load classes."
 */
export default function ClassSelect({
  id,
  value,
  onChange,
  placeholder = 'Select Class',
  className = 'h-10 px-3 rounded-lg border border-border/60 bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary',
  disabled = false,
  required = false,
  showEmptyOption = true,
}: ClassSelectProps) {
  const { _ } = useTranslation();
  const { data: classes = [], isLoading, isError } = useClasses();

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      disabled={disabled}
      required={required}
    >
      {showEmptyOption && <option value="">{_(placeholder)}</option>}
      {isLoading ? (
        <option value="" disabled>{_('Loading classes...')}</option>
      ) : isError ? (
        <option value="" disabled>{_('Failed to load classes.')}</option>
      ) : classes.length === 0 ? (
        <option value="" disabled>{_('No classes available.')}</option>
      ) : (
        classes.map((cls) => (
          <option key={cls.id} value={cls.id}>{formatClassName(cls)}</option>
        ))
      )}
    </select>
  );
}

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClassScope } from '@/contexts/ClassScopeContext';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { supabase } from '@/supabase/config';

interface ClassItem {
  id: string;
  name: string;
  code: string;
  grade?: string;
}

export function ClassSwitcher() {
  const { selectedClassId, setSelectedClassId } = useClassScope();
  const user = useAuthStore((s) => s.user);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClasses() {
      if (!user?.classIds || user.classIds.length === 0) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await supabase
          .from('classes')
          .select('id, name, code, grade')
          .in('id', user.classIds);
        setClasses((data || []) as ClassItem[]);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchClasses();
  }, [user?.classIds]);

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  if (loading || classes.length <= 1) return null;

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className="gap-2 h-8 text-xs font-medium"
      >
        <Icon name="school" size={14} />
        <span className="max-w-[120px] truncate">{selectedClass?.name || 'Select Class'}</span>
        <Icon name={open ? 'expand_less' : 'expand_more'} size={14} />
      </Button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute right-0 top-full mt-1 z-50 w-56 rounded-xl border border-border bg-surface shadow-elevation-3 overflow-hidden"
            >
              <div className="p-1.5">
                {classes.map((cls) => (
                  <button
                    key={cls.id}
                    onClick={() => {
                      setSelectedClassId(cls.id);
                      setOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors',
                      cls.id === selectedClassId
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-muted/50 text-foreground',
                    )}
                  >
                    <Icon name="school" size={16} className={cls.id === selectedClassId ? 'text-primary' : 'text-muted-foreground'} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{cls.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        Grade {cls.grade || '—'} · {cls.code}
                      </p>
                    </div>
                    {cls.id === selectedClassId && <Icon name="check" size={16} className="text-primary shrink-0" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

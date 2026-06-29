import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface ClassScopeContextValue {
  selectedClassId: string | null;
  setSelectedClassId: (classId: string | null) => void;
  clearSelection: () => void;
}

const ClassScopeContext = createContext<ClassScopeContextValue | null>(null);

const STORAGE_KEY = 'lms-selected-class';

export function ClassScopeProvider({ children }: { children: ReactNode }) {
  const [selectedClassId, setSelectedClassIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const setSelectedClassId = (classId: string | null) => {
    setSelectedClassIdState(classId);
    try {
      if (classId) {
        localStorage.setItem(STORAGE_KEY, classId);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // localStorage unavailable
    }
  };

  const clearSelection = () => setSelectedClassId(null);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setSelectedClassIdState(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <ClassScopeContext.Provider value={{ selectedClassId, setSelectedClassId, clearSelection }}>
      {children}
    </ClassScopeContext.Provider>
  );
}

export function useClassScope() {
  const ctx = useContext(ClassScopeContext);
  if (!ctx) throw new Error('useClassScope must be used within ClassScopeProvider');
  return ctx;
}

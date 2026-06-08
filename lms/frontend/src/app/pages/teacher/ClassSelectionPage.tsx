import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc, getDoc, addDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/constants';
import type { Class, UserRole } from '@/types';

export default function ClassSelectionPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetch() {
      try {
        const snap = await getDocs(collection(db, 'classes'));
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Class));
        setClasses(items);
      } catch {
        setError('Failed to load classes');
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  async function handleSelect(cls: Class) {
    if (!user || saving) return;
    setSaving(true);
    setError('');

    try {
      await updateDoc(doc(db, 'users', user.id), {
        classId: cls.id,
        tutorialSeen: false,
        updatedAt: new Date().toISOString(),
      });

      const snap = await getDoc(doc(db, 'users', user.id));
      if (snap.exists()) {
        const d = snap.data();
        setUser({
          id: snap.id,
          email: (d.email as string) || '',
          displayName: (d.displayName as string) || '',
          role: ((d.role as string) || 'teacher') as UserRole,
          isActive: (d.isActive as boolean) ?? true,
          classId: d.classId as string | undefined,
          createdAt: (d.createdAt as string) || '',
          updatedAt: (d.updatedAt as string) || '',
        });
      }

      await addDoc(collection(db, 'notifications'), {
        userId: user.id,
        type: 'welcome',
        title: 'Welcome to Genesis LMS!',
        body: `Hi ${user.displayName}! You're now assigned to ${cls.name}. Start creating content for your students.`,
        data: { role: 'teacher', classId: cls.id },
        priority: 'high',
        read: false,
        readAt: null,
        createdAt: new Date().toISOString(),
      });

      navigate(ROUTES.TEACHER_DASHBOARD, { replace: true });
    } catch {
      setError('Failed to save selection. Try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading classes…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <img src="/genesis_icon.png" alt="Genesis" className="mx-auto h-16 w-auto" />
          <h1 className="text-2xl font-bold">Welcome, {user?.displayName}</h1>
          <p className="text-muted-foreground">Select your class to get started</p>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive text-center">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {classes
            .filter((c) => c.isActive)
            .map((cls) => (
              <button
                key={cls.id}
                type="button"
                onClick={() => handleSelect(cls)}
                disabled={saving}
                className="rounded-xl border border-border bg-card p-6 text-left transition-colors hover:border-primary hover:bg-accent disabled:opacity-50"
              >
                <h3 className="text-lg font-semibold">{cls.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Grade {cls.grade} &middot; {cls.code}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {cls.studentCount} students &middot; {cls.teacherCount} teachers
                </p>
              </button>
            ))}
        </div>

        {classes.filter((c) => c.isActive).length === 0 && (
          <p className="text-center text-muted-foreground">
            No classes available yet. Ask an admin to create one.
          </p>
        )}
      </div>
    </div>
  );
}

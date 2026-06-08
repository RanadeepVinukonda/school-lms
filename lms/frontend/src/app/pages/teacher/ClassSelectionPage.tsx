import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc, getDoc, addDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ROUTES } from '@/lib/constants';
import type { Class, UserRole } from '@/types';

export default function ClassSelectionPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleSubmit() {
    if (!user || saving || selectedIds.size === 0) return;
    setSaving(true);
    setError('');

    try {
      const classIdArray = Array.from(selectedIds);
      await updateDoc(doc(db, 'users', user.id), {
        classIds: classIdArray,
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
          classIds: d.classIds as string[] | undefined,
          avatar: d.avatar as string | undefined,
          firstName: d.firstName as string | undefined,
          lastName: d.lastName as string | undefined,
          phone: d.phone as string | undefined,
          dateOfBirth: d.dateOfBirth as string | undefined,
          bio: d.bio as string | undefined,
          address: d.address as string | undefined,
          studentId: d.studentId as string | undefined,
          teacherId: d.teacherId as string | undefined,
          classId: d.classId as string | undefined,
          tutorialSeen: d.tutorialSeen as boolean | undefined,
          createdAt: (d.createdAt as string) || '',
          updatedAt: (d.updatedAt as string) || '',
        });
      }

      const selectedNames = classes
        .filter((c) => selectedIds.has(c.id))
        .map((c) => c.name)
        .join(', ');

      await addDoc(collection(db, 'notifications'), {
        userId: user.id,
        type: 'welcome',
        title: 'Welcome to Genesis LMS!',
        body: `Hi ${user.displayName}! You're now assigned to ${selectedNames}. Start creating content for your students.`,
        data: { role: 'teacher', classIds: classIdArray },
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

  const activeClasses = classes.filter((c) => c.isActive);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <img src="/genesis_icon.png" alt="Genesis" className="mx-auto h-16 w-auto" />
          <h1 className="text-2xl font-bold">Welcome, {user?.displayName}</h1>
          <p className="text-muted-foreground">Select the classes you teach</p>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive text-center">
            {error}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {activeClasses.map((cls) => {
            const checked = selectedIds.has(cls.id);
            return (
              <button
                key={cls.id}
                type="button"
                onClick={() => toggle(cls.id)}
                disabled={saving}
                className={`rounded-xl border p-4 text-left transition-colors disabled:opacity-50 ${
                  checked
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border bg-card hover:border-primary hover:bg-accent'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox checked={checked} onCheckedChange={() => toggle(cls.id)} />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold">{cls.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Grade {cls.grade}{cls.code ? ` · ${cls.code}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {cls.studentCount ?? 0} students
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {activeClasses.length === 0 && (
          <p className="text-center text-muted-foreground">
            No classes available yet. Ask an admin to create one.
          </p>
        )}

        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={saving || selectedIds.size === 0}
            loading={saving}
          >
            {selectedIds.size === 0
              ? 'Select at least one class'
              : `Continue with ${selectedIds.size} class${selectedIds.size > 1 ? 'es' : ''}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

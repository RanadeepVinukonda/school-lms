import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, getDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuthStore } from '@/store/authStore';
import { logAudit } from '@/services/auditService';
import type { UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ROUTES } from '@/lib/constants';

export default function RollNumberEntryPage() {
  const [rollNumber, setRollNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const cleaned = rollNumber.trim();
    if (!cleaned || !/^\d+$/.test(cleaned)) {
      setError('Enter a valid roll number (e.g., 501)');
      return;
    }

    if (!user) return;

    setLoading(true);
    try {
      const grade = cleaned.slice(0, -2) || cleaned[0];
      const roll = cleaned.slice(-2);

      const classesRef = collection(db, 'classes');
      const q = query(classesRef, where('grade', '==', grade), where('isActive', '==', true));
      const snap = await getDocs(q);

      let classId: string;
      if (snap.empty) {
        setError(`No class found for grade ${grade}. Contact your teacher.`);
        setLoading(false);
        return;
      }
      classId = snap.docs[0].id;

      const duplicateCheck = query(
        collection(db, 'users'),
        where('classId', '==', classId),
        where('studentId', '==', cleaned),
      );
      const duplicateSnap = await getDocs(duplicateCheck);
      if (!duplicateSnap.empty) {
        setError(`Roll number ${cleaned} is already taken in this class.`);
        setLoading(false);
        return;
      }

      await updateDoc(doc(db, 'users', user.id), {
        classId,
        studentId: cleaned,
        rollNumber: roll,
        tutorialSeen: false,
        updatedAt: new Date().toISOString(),
      });

      const updatedSnap = await getDoc(doc(db, 'users', user.id));
      if (updatedSnap.exists()) {
        const d = updatedSnap.data();
        setUser({
          id: updatedSnap.id,
          email: (d.email as string) || '',
          displayName: (d.displayName as string) || '',
          role: ((d.role as string) || 'student') as UserRole,
          isActive: (d.isActive as boolean) ?? true,
          classId: d.classId as string | undefined,
          studentId: d.studentId as string | undefined,
          createdAt: (d.createdAt as string) || '',
          updatedAt: (d.updatedAt as string) || '',
        });
      }

      logAudit({
        action: 'student.roll.assignment',
        targetId: user.id,
        targetType: 'user',
        targetName: user.displayName,
        summary: `Student "${user.displayName}" assigned roll number ${cleaned} in class ${classId}`,
        newValue: { studentId: cleaned, classId },
      });

      await addDoc(collection(db, 'notifications'), {
        userId: user.id,
        type: 'welcome',
        title: 'Welcome to Genesis LMS!',
        body: `Hi ${user.displayName}! You're now enrolled in class. Explore your subjects, tasks, and exams to get started.`,
        data: { role: 'student' },
        priority: 'high',
        read: false,
        readAt: null,
        createdAt: new Date().toISOString(),
      });

      navigate(ROUTES.STUDENT_DASHBOARD, { replace: true });
    } catch (err) {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <img src="/genesis_icon.png" alt="Genesis" className="mx-auto h-16 w-auto" />
          <h1 className="text-2xl font-bold">Welcome, {user?.displayName}</h1>
          <p className="text-muted-foreground">Enter your roll number to get started</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="roll">Roll Number</Label>
          <Input
            id="roll"
            placeholder="e.g. 501"
            value={rollNumber}
            onChange={(e) => setRollNumber(e.target.value)}
            disabled={loading}
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={loading} loading={loading}>
          Continue
        </Button>
      </form>
    </div>
  );
}

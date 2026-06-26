import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/firebase/config';
import { useAuthStore } from '@/store/authStore';
import { logAudit } from '@/services/auditService';
import type { UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ROUTES } from '@/lib/constants';
import { scrollReveal, staggerContainer, cardStackReveal } from '@/lib/motion';

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

      const { data: classRows } = await supabase.from('classes').select('*').eq('grade', grade).eq('isActive', true);

      if (!classRows || classRows.length === 0) {
        setError(`No class found for grade ${grade}. Contact your teacher.`);
        setLoading(false);
        return;
      }
      const classId = classRows[0].id;

      const { data: duplicates } = await supabase.from('users').select('id').eq('classId', classId).eq('studentId', cleaned);
      if (duplicates && duplicates.length > 0) {
        setError(`Roll number ${cleaned} is already taken in this class.`);
        setLoading(false);
        return;
      }

      await supabase.from('users').update({
        classId,
        studentId: cleaned,
        rollNumber: roll,
        tutorialSeen: false,
        updatedAt: new Date().toISOString(),
      }).eq('id', user.id);

      const { data: d } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();
      if (d) {
        setUser({
          id: d.id,
          email: d.email || '',
          displayName: d.display_name || '',
          role: (d.role as UserRole) || 'student',
          isActive: d.is_active ?? true,
          classId: d.class_id || undefined,
          studentId: d.student_id || undefined,
          createdAt: d.created_at || '',
          updatedAt: d.updated_at || '',
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

      await supabase.from('notifications').insert({
        userId: user.id,
        type: 'welcome',
        title: 'Welcome to Genesis LMS!',
        body: `Hi ${user.displayName}! Your student account is now active. Explore your subjects, tasks, and exams to get started.`,
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-screen items-center justify-center bg-background sm:px-6 px-4"
    >
      <motion.div variants={cardStackReveal} custom={0} className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="w-full space-y-6">
          <div className="text-center space-y-2">
            <img src="/genesis_icon.png" alt="Genesis" className="mx-auto h-16 w-auto" />
            <h1 className="text-headline-sm font-bold">Welcome, {user?.displayName}</h1>
            <p className="text-body-md text-muted-foreground">Enter your roll number to get started</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="roll" className="text-body-md">Roll Number</Label>
            <Input
              id="roll"
              placeholder="e.g. 501"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              disabled={loading}
              autoFocus
            />
            {error && <p className="text-body-md text-destructive">{error}</p>}
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading} loading={loading}>
            Continue
          </Button>
        </form>
      </motion.div>
    </motion.div>
  );
}

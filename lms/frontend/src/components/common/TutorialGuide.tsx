import { useState } from 'react';
import { supabase } from '@/supabase/config';
import { useAuthStore } from '@/store/authStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const steps: Record<string, { title: string; body: string }[]> = {
  student: [
    {
      title: 'Your Dashboard',
      body: 'Your home screen shows upcoming tasks, recent grades, and quick links to your subjects.',
    },
    {
      title: 'Subjects & Textbooks',
      body: 'Browse your subjects and access digital textbooks with interactive chapters and concepts.',
    },
    {
      title: 'Tasks & Exams',
      body: 'View and submit assignments, take quizzes, and track your exam schedule.',
    },
    {
      title: 'Notifications',
      body: 'Stay updated with notifications about new content, grades, and announcements.',
    },
  ],
  teacher: [
    {
      title: 'Your Dashboard',
      body: 'Your home screen shows an overview of your class activity and quick actions.',
    },
    {
      title: 'Students',
      body: 'View and manage your students, track their progress and performance.',
    },
    {
      title: 'Content Management',
      body: 'Upload textbooks, create exams, assignments, and quizzes for your class.',
    },
    {
      title: 'Notifications',
      body: 'Receive notifications when students submit work or when new features are available.',
    },
  ],
  admin: [
    {
      title: 'Admin Dashboard',
      body: 'Manage classes, users, subjects, and system settings from one place.',
    },
    {
      title: 'User Management',
      body: 'View and manage all students and teachers registered in the system.',
    },
    {
      title: 'Classes & Subjects',
      body: 'Create and manage classes and assign subjects.',
    },
  ],
};

interface TutorialGuideProps {
  open: boolean;
  onComplete: () => void;
}

export function TutorialGuide({ open, onComplete }: TutorialGuideProps) {
  const user = useAuthStore((s) => s.user);
  const [step, setStep] = useState(0);

  if (!user) return null;

  const roleSteps = steps[user.role] || steps.student;
  const current = roleSteps[step];

  function handleNext() {
    if (step < roleSteps.length - 1) {
      setStep((s) => s + 1);
    } else {
      handleFinish();
    }
  }

  function handleSkip() {
    handleFinish();
  }

  async function handleFinish() {
    if (!user) { onComplete(); return; }
    try {
      await supabase.rpc('set_tutorial_seen');
      useAuthStore.getState().setUser({ ...user, tutorialSeen: true });
    } catch (e) {
      console.error('Failed to save tutorial status:', e);
    }
    onComplete();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleSkip(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{current.title}</DialogTitle>
          <DialogDescription>{current.body}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center gap-1.5 py-2">
          {roleSteps.map((_, i) => (
            <span
              key={i}
              className={`block h-2 w-2 rounded-full ${
                i === step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            Skip
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            )}
            <Button size="sm" onClick={handleNext}>
              {step < roleSteps.length - 1 ? 'Next' : 'Done'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

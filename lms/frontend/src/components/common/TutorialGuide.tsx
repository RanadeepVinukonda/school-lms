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

const steps: Record<string, { title: string; body: string; target?: string }[]> = {
  student: [
    {
      title: 'Your Dashboard',
      body: 'Your home screen shows upcoming tasks, recent grades, and quick links to your subjects. Use the sidebar to navigate between sections.',
    },
    {
      title: 'Subjects & Textbooks',
      body: 'Browse your subjects and access digital textbooks with interactive chapters and concepts. Click any subject card to dive in.',
    },
    {
      title: 'Tasks & Exams',
      body: 'View and submit assignments, take quizzes, and track your exam schedule. Check the "Tasks & Assessments" tab for everything.',
    },
    {
      title: 'Notifications',
      body: 'Stay updated with notifications about new content, grades, and announcements. The bell icon in the top bar shows your latest alerts.',
    },
    {
      title: 'Report & Suggestion',
      body: 'Found an issue or have an idea? Use the Report & Suggestion form to share feedback directly with your school administration.',
      target: 'SIDEBAR_ITEM_Report & Suggestion',
    },
  ],
  teacher: [
    {
      title: 'Your Dashboard',
      body: 'Your home screen shows an overview of your class activity, recent submissions, and quick actions to manage your day.',
    },
    {
      title: 'Students',
      body: 'View and manage your students, track their progress and performance across subjects and assessments.',
    },
    {
      title: 'Content Management',
      body: 'Upload textbooks, create exams, assignments, and quizzes for your class. Use the "Manage Tests" page to organize assessments.',
    },
    {
      title: 'Coding Lab',
      body: 'The Coding tab lets you create and evaluate programming assignments in Java, C/C++, JavaScript, Python, and HTML.',
    },
    {
      title: 'Timetable',
      body: 'View your class schedule. Your timetable only shows the classes you are assigned to teach.',
    },
    {
      title: 'Notifications',
      body: 'Receive notifications when students submit work, when new features are available, or when admin sends announcements.',
    },
  ],
  admin: [
    {
      title: 'Admin Dashboard',
      body: 'Manage classes, users, subjects, and system settings from one central place. Use the sidebar to navigate between sections.',
    },
    {
      title: 'User Management',
      body: 'View and manage all students, teachers, and parents registered in the system. Create, edit, or deactivate accounts as needed.',
    },
    {
      title: 'Classes & Subjects',
      body: 'Create and manage classes, assign subjects, and set up academic years. Organize your school structure here.',
    },
    {
      title: 'Reports & Suggestions',
      body: 'Review user-submitted reports, feedback, and suggestions. Filter by status, category, or priority. Assign items to teachers and track resolution.',
      target: 'SIDEBAR_ITEM_Reports & Suggestions',
    },
    {
      title: 'Analytics & Attendance',
      body: 'Access school-wide analytics, attendance reports, and fee management dashboards to monitor school performance.',
    },
  ],
  parent: [
    {
      title: 'Your Dashboard',
      body: 'Your home screen shows summaries of your children\'s progress, recent grades, and upcoming events.',
    },
    {
      title: 'My Children',
      body: 'View each child\'s profile, academic performance, attendance, and teacher feedback in one place.',
    },
    {
      title: 'Reports',
      body: 'Access detailed academic reports and progress summaries for each of your children.',
    },
    {
      title: 'Notifications',
      body: 'Receive notifications about your children\'s grades, attendance, and school announcements.',
    },
    {
      title: 'Report & Suggestion',
      body: 'Share your feedback, suggestions, or concerns with the school administration through the Report & Suggestion form.',
      target: 'SIDEBAR_ITEM_Report & Suggestion',
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

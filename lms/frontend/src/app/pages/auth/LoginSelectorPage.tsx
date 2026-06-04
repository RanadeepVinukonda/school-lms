import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@/components/ui/Icon';
import { pageTransition, listContainer, listItem } from '@/lib/motion';

const roles = [
  {
    id: 'student' as const,
    title: 'Student',
    description: 'Access your courses, take exams, and track your progress.',
    icon: 'school',
    href: '/login/student',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    borderColor: 'border-blue-500/30',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
  },
  {
    id: 'teacher' as const,
    title: 'Teacher',
    description: 'Create exams, manage students, and view analytics.',
    icon: 'badge',
    href: '/login/teacher',
    gradient: 'from-emerald-500/20 to-teal-500/20',
    borderColor: 'border-emerald-500/30',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-500',
  },
  {
    id: 'admin' as const,
    title: 'Administrator',
    description: 'Manage users, classes, subjects, and system settings.',
    icon: 'manage_accounts',
    href: '/login/admin',
    gradient: 'from-purple-500/20 to-pink-500/20',
    borderColor: 'border-purple-500/30',
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-500',
  },
];

export default function LoginSelectorPage() {
  const navigate = useNavigate();

  return (
    <>
      <SEOHead
        title="Sign In"
        description="Choose your role to sign in to Genesis."
      />

      <motion.div
        className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-12"
        initial="initial"
        animate="animate"
        variants={pageTransition}
      >
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-4 inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 overflow-hidden">
            <img src="/genesis-icon.jpg" alt="" className="h-14 w-14 rounded-xl object-cover" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Welcome to Genesis
          </h1>
          <p className="mt-3 text-muted-foreground text-lg max-w-md mx-auto">
            Choose your role to sign in to your account.
          </p>
        </motion.div>

        <motion.div
          className="grid w-full max-w-2xl gap-5 sm:grid-cols-3"
          variants={listContainer}
          initial="hidden"
          animate="show"
        >
          {roles.map((role) => (
            <motion.div key={role.id} variants={listItem} className="cursor-pointer">
              <Card
                className={`relative overflow-hidden border-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${role.borderColor} h-full`}
                onClick={() => navigate(role.href)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(role.href);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Sign in as ${role.title}`}
              >
                <div
                  className={`absolute inset-0 rounded-lg bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${role.gradient}`}
                />
                <CardContent className="relative z-10 flex flex-col items-center text-center p-6">
                  <div
                    className={`mb-4 inline-flex h-16 w-16 items-center justify-center rounded-xl ${role.iconBg}`}
                  >
                    <Icon name={role.icon} size={32} className={role.iconColor} />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{role.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {role.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </>
  );
}

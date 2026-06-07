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
];

export default function LoginSelectorPage() {
  const navigate = useNavigate();

  return (
    <>
      <SEOHead
        title="Sign In"
        description="Choose your role to sign in to Genesis."
      />

      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-primary/5 to-background">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-tertiary/10 blur-3xl" />
        </div>

        <motion.div
          className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-16"
          initial="initial"
          animate="animate"
          variants={pageTransition}
        >
          <button
            onClick={() => navigate('/welcome')}
            className="absolute top-6 left-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon name="arrow_back" size={18} />
            Back to Home
          </button>

          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.05, 0, 0.133333, 0.06] }}
          >
            <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
              Welcome Back
            </h1>
            <p className="mt-2 text-sm font-medium tracking-widest text-tertiary uppercase">
              Learn &bull; Lead &bull; Achieve
            </p>
            <p className="mt-4 text-muted-foreground text-base max-w-md mx-auto">
              Sign in to your account to continue your learning journey.
            </p>
          </motion.div>

          <motion.div
            className="grid w-full max-w-lg gap-5 sm:grid-cols-2"
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
                    className={`absolute inset-0 rounded-lg bg-gradient-to-br opacity-0 transition-opacity duration-300 hover:opacity-100 ${role.gradient}`}
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

          <p className="mt-10 text-sm text-muted-foreground">
            Forgot your password?{' '}
            <button
              onClick={() => navigate('/forgot-password')}
              className="text-primary font-semibold hover:underline"
            >
              Reset it here
            </button>
          </p>
        </motion.div>
      </div>
    </>
  );
}

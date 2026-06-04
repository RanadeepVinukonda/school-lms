import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { SEOHead } from '@/components/common/SEOHead';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

const valueCards = [
  {
    title: 'For Students',
    icon: 'school',
    description:
      'Access courses, take exams, track your grades, and stay organized with your personalized learning dashboard.',
    color: 'from-blue-500/20 to-cyan-500/20',
    borderColor: 'border-blue-500/30',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
  },
  {
    title: 'For Teachers',
    icon: 'badge',
    description:
      'Create assignments, design quizzes, grade submissions, and monitor student progress with powerful analytics.',
    color: 'from-emerald-500/20 to-teal-500/20',
    borderColor: 'border-emerald-500/30',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-500',
  },
  {
    title: 'For Administrators',
    icon: 'manage_accounts',
    description:
      'Manage users, oversee classes, configure subjects, and access system-wide reports and settings.',
    color: 'from-purple-500/20 to-pink-500/20',
    borderColor: 'border-purple-500/30',
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-500',
  },
];

const roleLoginLinks = [
  { label: 'Student Login', href: '/login/student', icon: 'school' },
  { label: 'Teacher Login', href: '/login/teacher', icon: 'badge' },
  { label: 'Admin Login', href: '/login/admin', icon: 'manage_accounts' },
];

export default function WelcomePage() {
  const navigate = useNavigate();

  return (
    <>
      <SEOHead
        title="Welcome"
        description="Genesis Learning Management System - Empowering education for students, teachers, and administrators."
      />

      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-primary/5 to-background">
        {/* Geometric CSS shapes */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute top-1/3 left-1/4 h-64 w-64 rounded-full bg-purple-500/8 blur-3xl" />
          <div className="absolute top-1/2 right-1/4 h-48 w-48 rounded-full bg-cyan-500/8 blur-3xl" />

          <svg
            className="absolute top-20 left-10 h-32 w-32 text-primary/5"
            viewBox="0 0 100 100"
            fill="currentColor"
          >
            <polygon points="50,5 95,50 50,95 5,50" />
          </svg>
          <svg
            className="absolute bottom-40 right-16 h-24 w-24 text-emerald-500/5"
            viewBox="0 0 100 100"
            fill="currentColor"
          >
            <circle cx="50" cy="50" r="45" />
          </svg>
          <svg
            className="absolute top-1/3 right-1/3 h-20 w-20 rotate-45 text-purple-500/5"
            viewBox="0 0 100 100"
            fill="currentColor"
          >
            <rect x="10" y="10" width="80" height="80" rx="8" />
          </svg>
          <svg
            className="absolute bottom-1/4 left-1/6 h-16 w-16 text-cyan-500/5"
            viewBox="0 0 100 100"
            fill="currentColor"
          >
            <polygon points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35" />
          </svg>
          <svg
            className="absolute top-1/2 left-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 text-primary/3"
            viewBox="0 0 100 100"
            fill="currentColor"
          >
            <polygon points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35" />
          </svg>
        </div>

        {/* Hero Section */}
        <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-20">
          <motion.div
            className="mx-auto max-w-4xl text-center"
            initial="initial"
            animate="animate"
            variants={pageTransition}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.05, 0, 0.133333, 0.06] }}
              className="mb-6 inline-flex items-center gap-3 rounded-2xl bg-primary/10 px-6 py-3"
            >
              <img src="/genesis-icon.jpg" alt="" className="h-7 w-7 rounded-lg object-cover" />
              <span className="text-sm font-semibold text-primary">
                Learning Management System
              </span>
            </motion.div>

            <motion.h1
              className="mb-6 bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Genesis
            </motion.h1>

            <motion.p
              className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Empowering educators, inspiring students, and streamlining administration.
              The all-in-one platform for modern education.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Button
                size="xl"
                onClick={() => navigate('/login')}
                className="group relative overflow-hidden px-12 text-base font-semibold shadow-lg shadow-primary/25 transition-shadow hover:shadow-xl hover:shadow-primary/30"
              >
                <span className="relative z-10">Get Started</span>
                <motion.span
                  className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: 'spring', stiffness: 700, damping: 0.9 }}
                />
              </Button>
            </motion.div>
          </motion.div>

          {/* Value Proposition Cards */}
          <motion.div
            className="mx-auto mt-24 grid max-w-6xl gap-6 px-4 sm:grid-cols-2 lg:grid-cols-3"
            variants={listContainer}
            initial="hidden"
            animate="show"
          >
            {valueCards.map((card) => (
              <motion.div
                key={card.title}
                variants={listItem}
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 700, damping: 0.9 }}
              >
                <Card
                  className={cn(
                    'group relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl',
                    card.borderColor,
                  )}
                >
                  {/* Gradient overlay */}
                  <div
                    className={cn(
                      'absolute inset-0 rounded-lg bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100',
                      card.color,
                    )}
                  />
                  <CardContent className="relative z-10 p-6">
                    <div
                      className={cn(
                        'mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl',
                        card.iconBg,
                      )}
                    >
                      <Icon name={card.icon} size={28} className={card.iconColor} />
                    </div>
                    <h3 className="mb-3 text-xl font-bold">{card.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {card.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="relative z-10 border-t bg-background/80 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl px-4 py-8">
            <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
              <div className="flex items-center gap-2">
                <img src="/genesis-icon.jpg" alt="" className="h-6 w-6 rounded-md object-cover" />
                <span className="text-lg font-bold">Genesis</span>
              </div>

              <nav className="flex flex-wrap items-center justify-center gap-4" aria-label="Role login links">
                {roleLoginLinks.map((link) => (
                  <Button
                    key={link.href}
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(link.href)}
                    className="gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <Icon name={link.icon} size={18} />
                    {link.label}
                  </Button>
                ))}
              </nav>

              <p className="text-sm text-muted-foreground">
                &copy; {new Date().getFullYear()} Genesis. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

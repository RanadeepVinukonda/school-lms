import { useEffect, useState } from 'react';
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

export default function WelcomePage() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <>
      <SEOHead
        title="Welcome"
        description="Genesis Learning Management System - Empowering education for students, teachers, and administrators."
      />

      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-primary/[0.03] to-background">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-tertiary/10 blur-3xl" />
          <div className="absolute top-1/3 left-1/4 h-64 w-64 rounded-full bg-primary/[0.04] blur-3xl" />
          <div className="absolute top-1/2 right-1/4 h-48 w-48 rounded-full bg-tertiary/[0.04] blur-3xl" />
        </div>

        <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-20">
          <motion.div
            className="mx-auto max-w-4xl text-center"
            initial="initial"
            animate="animate"
            variants={pageTransition}
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.05, 0, 0.133333, 0.06] }}
              className="mb-8 inline-flex flex-col items-center"
            >
              <img
                src="/genesis_icon.png"
                alt="Genesis"
                className={cn(
                  'h-40 w-auto object-contain sm:h-48 transition-all duration-700',
                  mounted ? 'scale-100 opacity-100' : 'scale-90 opacity-0',
                )}
              />
            </motion.div>

            <motion.p
              className="mb-2 text-lg font-medium tracking-widest text-tertiary uppercase sm:text-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Learn &bull; Lead &bull; Achieve
            </motion.p>

            <motion.p
              className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
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
                <span className="relative z-10">Sign In</span>
              </Button>
            </motion.div>
          </motion.div>

          <motion.div
            className="mx-auto mt-24 grid max-w-6xl gap-6 px-4 sm:grid-cols-2 lg:grid-cols-2"
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

        <footer className="relative z-10 border-t bg-background/80 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl px-4 py-8">
            <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
              <div className="flex items-center gap-3">
                <img src="/genesis_icon.png" alt="" className="h-8 w-auto object-contain" />
                <div>
                  <p className="text-sm font-bold text-primary">Genesis</p>
                  <p className="text-label-sm text-on-surface-variant">Learn &bull; Lead &bull; Achieve</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <p>&copy; {new Date().getFullYear()} Genesis. All rights reserved.</p>
                <span aria-hidden="true">&middot;</span>
                <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
                <span aria-hidden="true">&middot;</span>
                <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

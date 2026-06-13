import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { SEOHead } from '@/components/common/SEOHead';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@/components/ui/Icon';
import { scrollReveal, staggerContainer, scaleFadeIn, cardStackReveal } from '@/lib/motion';

const features = [
  {
    title: 'Courses',
    description: 'Structured learning paths with interactive content, assessments, and real-time progress tracking.',
    icon: 'school',
    colSpan: 'lg:col-span-2 lg:row-span-1',
  },
  {
    title: 'Exams & Quizzes',
    description: 'Automated grading, instant feedback, and detailed performance analytics for every assessment.',
    icon: 'assignment',
    colSpan: 'lg:col-span-1 lg:row-span-1',
  },
  {
    title: 'Analytics',
    description: 'Comprehensive dashboards with actionable insights into student performance and class trends.',
    icon: 'analytics',
    colSpan: 'lg:col-span-1 lg:row-span-1',
  },
  {
    title: 'Collaboration',
    description: 'Real-time discussions, group assignments, and direct messaging between students and teachers.',
    icon: 'group',
    colSpan: 'lg:col-span-1 lg:row-span-1',
  },
  {
    title: 'Content Management',
    description: 'Upload, organize, and distribute textbooks, videos, and supplementary materials across all classes.',
    icon: 'menu_book',
    colSpan: 'lg:col-span-2 lg:row-span-1',
  },
];

const testimonials = [
  { name: 'Sarah Chen', role: 'Student', quote: 'The platform transformed how I approach my studies. The analytics help me focus on what matters.', avatar: 'https://picsum.photos/seed/sarah/200/200' },
  { name: 'James Rodriguez', role: 'Teacher', quote: 'Creating assessments and tracking student progress has never been more intuitive.', avatar: 'https://picsum.photos/seed/james/200/200' },
  { name: 'Dr. Emily Park', role: 'Administrator', quote: 'Managing curriculum across departments is seamless. The reporting tools are invaluable.', avatar: 'https://picsum.photos/seed/emily/200/200' },
];

const marqueeItems = [
  'Interactive Learning', 'Automated Grading', 'Real-time Analytics', 'Collaborative Tools',
  'Curriculum Management', 'Performance Tracking', 'Secure Platform', 'Cloud-based',
];

function MarqueeRow({ items, reverse }: { items: string[]; reverse?: boolean }) {
  return (
    <div className="flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <motion.div
        className="flex shrink-0 gap-16"
        animate={{ x: reverse ? ['0%', '-50%'] : ['-50%', '0%'] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      >
        {[...items, ...items].map((item, i) => (
          <span key={i} className="text-headline-sm font-bold text-muted-foreground/20 whitespace-nowrap uppercase tracking-wider">
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

function ScrollRevealSection({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={isInView ? 'show' : 'hidden'}
      variants={scrollReveal}
      className={className}
    >
      {children}
    </motion.section>
  );
}

function TestimonialCarousel() {
  const [active, setActive] = useState(0);
  const t = testimonials[active];

  return (
    <div className="relative flex flex-col items-center text-center max-w-xl mx-auto px-4">
      <div className="flex -space-x-3 mb-8">
        {testimonials.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`relative w-14 h-14 rounded-full overflow-hidden border-2 transition-all duration-300 ${
              i === active ? 'border-primary scale-110 z-10' : 'border-border scale-100 opacity-60'
            }`}
          >
            <img
              src={testimonials[i].avatar}
              alt=""
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
      <motion.div
        key={active}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="text-body-lg text-foreground/80 leading-relaxed italic mb-6">
          &ldquo;{t.quote}&rdquo;
        </p>
        <p className="text-title-sm font-bold">{t.name}</p>
        <p className="text-label-sm text-muted-foreground">{t.role}</p>
      </motion.div>
      <div className="flex gap-2 mt-8">
        {testimonials.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i === active ? 'bg-primary w-6' : 'bg-border'
            }`}
            aria-label={`Testimonial ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function WelcomePage() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => { setMounted(true); }, []);

  return (
    <>
      <SEOHead
        title="Genesis: Modern Learning Management"
        description="Empowering educators, inspiring students, and streamlining administration. The all-in-one platform for modern education."
      />

      <main className="overflow-x-hidden w-full max-w-full">

        <motion.nav
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.05, 0, 0.133333, 0.06], delay: 0.15 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between px-6 py-3 w-[calc(100%-2rem)] max-w-5xl rounded-2xl bg-surface/70 backdrop-blur-xl border border-border shadow-sm"
        >
          <div className="flex items-center gap-3">
            <img src="/genesis_icon.png" alt="" className="h-8 w-auto object-contain" />
            <span className="text-title-sm font-bold text-primary hidden sm:block">Genesis</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/login')}
            >
              Sign In
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/login')}
              className="shadow-lg shadow-primary/20"
            >
              Get Started
            </Button>
          </div>
        </motion.nav>

        <section
          ref={heroRef}
          className="relative min-h-screen flex items-center pt-24 pb-16 px-6 overflow-hidden"
        >
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute -top-48 -right-48 h-[36rem] w-[36rem] rounded-full bg-primary/8 blur-3xl" />
            <div className="absolute -bottom-48 -left-48 h-[30rem] w-[30rem] rounded-full bg-tertiary/6 blur-3xl" />
          </div>

          <motion.div
            style={{ scale: heroScale, opacity: heroOpacity }}
            className="mx-auto max-w-6xl w-full relative z-10"
          >
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div className="max-w-xl">
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={mounted ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="text-label-sm font-semibold text-tertiary uppercase tracking-[0.2em] mb-6"
                >
                  Learn &bull; Lead &bull; Achieve
                </motion.p>

                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={mounted ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.3, ease: [0.05, 0, 0.133333, 0.06] }}
                  className="text-display-sm md:text-display-md lg:text-display-lg font-bold tracking-tight text-foreground leading-[1.1]"
                >
                  Modern education
                  <span className="inline-block w-10 h-8 md:w-14 md:h-10 rounded-full align-middle bg-cover bg-center mx-3" style={{ backgroundImage: 'url(https://picsum.photos/seed/edu/200/200)' }}></span>
                  platform for every role
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={mounted ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.45 }}
                  className="text-body-lg text-muted-foreground mt-6 max-w-lg leading-relaxed"
                >
                  Empowering educators, inspiring students, and streamlining administration in one unified platform.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={mounted ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.55 }}
                  className="flex gap-4 mt-10"
                >
                  <Button
                    size="lg"
                    onClick={() => navigate('/login')}
                    className="px-10 text-base font-semibold shadow-xl shadow-primary/25"
                  >
                    Sign In
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => navigate('/login')}
                    className="px-8 text-base font-semibold"
                  >
                    <Icon name="arrow_forward" size={18} className="mr-2" />
                    Get Started
                  </Button>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={mounted ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.8, delay: 0.4, ease: [0.05, 0, 0.133333, 0.06] }}
                className="relative hidden lg:block"
              >
                <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                  <img
                    src="https://picsum.photos/seed/classroom/1200/900"
                    alt=""
                    className="w-full h-full object-cover grayscale contrast-125"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface/60 via-transparent to-transparent" />
                </div>
                <div className="absolute -bottom-6 -left-6 w-40 h-40 rounded-2xl overflow-hidden shadow-lg border-4 border-surface">
                  <img
                    src="https://picsum.photos/seed/learning/400/400"
                    alt=""
                    className="w-full h-full object-cover grayscale contrast-125"
                  />
                </div>
                <div className="absolute -top-4 -right-4 w-28 h-28 rounded-2xl overflow-hidden shadow-lg border-4 border-surface">
                  <img
                    src="https://picsum.photos/seed/books/300/300"
                    alt=""
                    className="w-full h-full object-cover grayscale contrast-125"
                  />
                </div>
              </motion.div>
            </div>
          </motion.div>
        </section>

        <div className="py-8">
          <MarqueeRow items={marqueeItems} />
        </div>

        <ScrollRevealSection className="py-32 md:py-48 px-6">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl mb-16">
              <p className="text-label-sm font-semibold text-tertiary uppercase tracking-[0.2em] mb-4">
                Platform Capabilities
              </p>
              <h2 className="text-headline-md md:text-headline-lg font-bold tracking-tight">
                Everything you need to manage learning at scale
              </h2>
            </div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 grid-flow-dense"
            >
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  variants={cardStackReveal}
                  custom={i}
                  className={`${f.colSpan}`}
                >
                  <Card className="h-full border-border/60 hover:border-primary/30 transition-colors duration-500">
                    <CardContent className="p-8">
                      <div className="h-12 w-12 rounded-xl bg-primary-container flex items-center justify-center mb-6">
                        <Icon name={f.icon} size={24} className="text-on-primary-container" />
                      </div>
                      <h3 className="text-title-md font-bold mb-3">{f.title}</h3>
                      <p className="text-body-md text-muted-foreground leading-relaxed">
                        {f.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </ScrollRevealSection>

        <ScrollRevealSection className="py-32 md:py-48 px-6 bg-muted/30">
          <div className="mx-auto max-w-6xl text-center">
            <p className="text-label-sm font-semibold text-tertiary uppercase tracking-[0.2em] mb-4">
              Voices
            </p>
            <h2 className="text-headline-md md:text-headline-lg font-bold tracking-tight mb-16">
              Trusted by educators and students
            </h2>
            <TestimonialCarousel />
          </div>
        </ScrollRevealSection>

        <ScrollRevealSection className="py-32 md:py-48 px-6">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-headline-md md:text-headline-lg font-bold tracking-tight mb-6">
              Ready to transform your learning experience?
            </h2>
            <p className="text-body-lg text-muted-foreground max-w-xl mx-auto mb-10">
              Join thousands of educators and students already using Genesis to achieve more.
            </p>
            <Button
              size="xl"
              onClick={() => navigate('/login')}
              className="px-16 text-base font-semibold shadow-2xl shadow-primary/30"
            >
              Get Started Free
            </Button>
          </div>
        </ScrollRevealSection>

        <footer className="border-t border-border bg-surface/80">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
              <div className="flex items-center gap-3">
                <img src="/genesis_icon.png" alt="" className="h-8 w-auto object-contain" />
                <div>
                  <p className="text-title-sm font-bold text-primary">Genesis</p>
                  <p className="text-label-sm text-muted-foreground">Learn &bull; Lead &bull; Achieve</p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-label-sm text-muted-foreground">
                <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
                <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
                <span>&copy; {new Date().getFullYear()} Genesis. All rights reserved.</span>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}

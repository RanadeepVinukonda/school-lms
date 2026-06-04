import { motion } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

const coreValues = [
  {
    title: 'Academic Excellence',
    icon: 'stars',
    description:
      'Rigorous curriculum that challenges students to achieve beyond expectations through critical thinking and inquiry-based learning.',
  },
  {
    title: 'Integrity & Leadership',
    icon: 'verified',
    description:
      'Building character through ethical decision-making, accountability, and opportunities to lead with purpose and compassion.',
  },
  {
    title: 'Innovation & Creativity',
    icon: 'lightbulb',
    description:
      'Fostering a culture of curiosity where students explore emerging technologies and creative problem-solving.',
  },
  {
    title: 'Global Citizenship',
    icon: 'public',
    description:
      'Preparing students to thrive in a diverse world with cultural awareness, empathy, and a commitment to sustainability.',
  },
  {
    title: 'Lifelong Learning',
    icon: 'auto_stories',
    description:
      'Instilling a passion for discovery that extends beyond the classroom and continues throughout life.',
  },
];

const schoolFacts = [
  { label: 'Established', value: '2020' },
  { label: 'Accreditation', value: 'International Baccalaureate (Candidate)' },
  { label: 'Campus', value: 'Lagos, Nigeria' },
  { label: 'Student Body', value: '500+ Students' },
  { label: 'Faculty', value: '50+ Dedicated Educators' },
  { label: 'Programs', value: 'Montessori (Pre-K–K), Elementary (1–5), Middle School (6–8), High School (9–12)' },
];

const academicPrograms = [
  {
    title: 'Montessori Early Years',
    icon: 'child_care',
    description:
      'A nurturing, child-centered environment for Pre-K through Kindergarten that fosters independence, curiosity, and foundational skills through hands-on Montessori materials.',
  },
  {
    title: 'Elementary Education',
    icon: 'menu_book',
    description:
      'Grades 1–5 where students build strong academic foundations through integrated STEM, literacy, arts, and character development programs.',
  },
  {
    title: 'Middle School',
    icon: 'diversity_3',
    description:
      'Grades 6–8 with a focus on critical thinking, collaborative projects, leadership development, and exploration of emerging technologies.',
  },
  {
    title: 'High School / STEM Academy',
    icon: 'biotech',
    description:
      'Grades 9–12 offering advanced coursework, college preparation, specialized STEM pathways, and research opportunities for future innovators.',
  },
];

export default function AboutSchoolPage() {
  return (
    <>
      <SEOHead
        title="About Our School"
        description="Learn about Genesis International Montessori & STEM School — our mission, vision, values, academic programs, and commitment to holistic education."
      />

      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-primary/5 to-background">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-tertiary/10 blur-3xl" />
          <div className="absolute top-1/3 left-1/4 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute top-1/2 right-1/4 h-48 w-48 rounded-full bg-tertiary/5 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:py-20 lg:py-24">
          {/* Hero Section */}
          <motion.section
            className="mb-20 text-center"
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
                src="/genesis_icon.svg"
                alt="Genesis School Crest"
                className="h-48 w-auto object-contain"
              />
            </motion.div>

            <motion.h1
              className="mb-4 text-4xl font-extrabold tracking-tight text-primary sm:text-5xl md:text-6xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Genesis International Montessori &amp; STEM School
            </motion.h1>

            <motion.p
              className="mb-6 text-base font-medium tracking-widest text-tertiary uppercase sm:text-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Learn &bull; Lead &bull; Achieve
            </motion.p>

            <motion.p
              className="mx-auto max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
            >
              At Genesis, we believe that every child possesses unique gifts waiting to be discovered.
              Our institution seamlessly blends the time-honored Montessori philosophy with cutting-edge
              STEM education, creating an environment where students don&apos;t just learn — they thrive,
              lead, and achieve their fullest potential.
            </motion.p>
          </motion.section>

          {/* Mission & Vision Section */}
          <motion.section
            className="mb-20 grid gap-6 md:grid-cols-2"
            variants={listContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
          >
            <motion.div variants={listItem}>
              <Card className="h-full rounded-2xl border border-primary/10 p-8">
                <CardContent className="p-0">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Icon name="visibility" size={24} className="text-primary" />
                  </div>
                  <h2 className="mb-3 text-2xl font-bold text-primary">Our Mission</h2>
                  <p className="text-base leading-relaxed text-muted-foreground">
                    To nurture lifelong learners who excel academically, lead with integrity,
                    and achieve their fullest potential in a globally connected world.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={listItem}>
              <Card className="h-full rounded-2xl border border-tertiary/10 p-8">
                <CardContent className="p-0">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-tertiary/10">
                    <Icon name="explore" size={24} className="text-tertiary" />
                  </div>
                  <h2 className="mb-3 text-2xl font-bold text-tertiary">Our Vision</h2>
                  <p className="text-base leading-relaxed text-muted-foreground">
                    To be a world-class institution that sets the standard for holistic education,
                    blending Montessori principles with STEM innovation.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.section>

          {/* Core Values Section */}
          <motion.section
            className="mb-20"
            variants={listContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
          >
            <motion.h2
              className="mb-12 text-center text-3xl font-bold text-primary sm:text-4xl"
              variants={listItem}
            >
              Our Core Values
            </motion.h2>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {coreValues.map((value) => (
                <motion.div key={value.title} variants={listItem}>
                  <Card
                    className={cn(
                      'group h-full rounded-2xl border border-border/50 p-6 text-center transition-all duration-300',
                    )}
                  >
                    <CardContent className="p-0">
                      <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 transition-colors duration-300 group-hover:bg-primary/20">
                        <Icon name={value.icon} size={28} className="text-primary" />
                      </div>
                      <h3 className="mb-2 text-lg font-bold">{value.title}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {value.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* School Information Section */}
          <motion.section
            className="mb-20"
            variants={listContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
          >
            <motion.h2
              className="mb-12 text-center text-3xl font-bold text-primary sm:text-4xl"
              variants={listItem}
            >
              School Information
            </motion.h2>

            <motion.div variants={listItem}>
              <Card className="mx-auto max-w-4xl rounded-3xl border border-border/50 p-8 sm:p-10">
                <CardContent className="p-0">
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {schoolFacts.map((fact) => (
                      <div
                        key={fact.label}
                        className="rounded-xl bg-secondary/5 p-4 transition-colors duration-200 hover:bg-secondary/10"
                      >
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {fact.label}
                        </p>
                        <p className="text-sm font-medium text-foreground sm:text-base">
                          {fact.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.section>

          {/* Academic Programs Section */}
          <motion.section
            className="mb-20"
            variants={listContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
          >
            <motion.h2
              className="mb-12 text-center text-3xl font-bold text-primary sm:text-4xl"
              variants={listItem}
            >
              Academic Programs
            </motion.h2>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {academicPrograms.map((program) => (
                <motion.div key={program.title} variants={listItem}>
                  <Card className="group h-full rounded-2xl border border-border/50 p-6 transition-all duration-300">
                    <CardContent className="p-0">
                      <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 transition-colors duration-300 group-hover:bg-primary/20">
                        <Icon name={program.icon} size={28} className="text-primary" />
                      </div>
                      <h3 className="mb-3 text-lg font-bold">{program.title}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {program.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* School Motto Section */}
          <motion.section
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.05, 0, 0.133333, 0.06] }}
          >
            <div className="mx-auto mb-6 h-px max-w-xs bg-gradient-to-r from-transparent via-tertiary/40 to-transparent" />
            <p className="mb-2 text-4xl font-extrabold tracking-widest text-tertiary sm:text-5xl">
              Learn &bull; Lead &bull; Achieve
            </p>
            <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              — School Motto —
            </p>
            <div className="mx-auto mt-6 h-px max-w-xs bg-gradient-to-r from-transparent via-tertiary/40 to-transparent" />
          </motion.section>
        </div>
      </div>
    </>
  );
}

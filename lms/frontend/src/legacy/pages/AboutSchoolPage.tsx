import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/5 p-4 transition-colors duration-200 hover:bg-secondary/10">
      <p className="text-label-xs uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </p>
      <p className="text-body-md font-medium text-foreground">
        {value}
      </p>
    </div>
  );
}

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

        <div



          className="relative z-10 sm:p-6 p-4 max-w-6xl mx-auto pb-32"
        >
          {/* Hero Section */}
          <div


            className="text-center mb-16"
          >
            <div



              className="mb-8 inline-flex flex-col items-center"
            >
              <img
                src="/genesis_icon.png"
                alt="Genesis School Crest"
                className="h-48 w-auto object-contain"
              />
            </div>

            <h1
              className="text-headline-md md:text-headline-lg font-bold tracking-tight text-primary mb-4"
            >
              Genesis International Montessori &amp; STEM School
            </h1>

            <p
              className="text-label-sm font-semibold text-tertiary uppercase tracking-[0.2em] mb-6"
            >
              Learn &bull; Lead &bull; Achieve
            </p>

            <p
              className="mx-auto max-w-3xl text-body-lg text-muted-foreground"
            >
              At Genesis, we believe that every child possesses unique gifts waiting to be discovered.
              Our institution seamlessly blends the time-honored Montessori philosophy with cutting-edge
              STEM education, creating an environment where students don&apos;t just learn — they thrive,
              lead, and achieve their fullest potential.
            </p>
          </div>

          {/* Mission & Vision Section */}
          <div


            className="mb-16"
          >
            <div




              className="grid grid-cols-1 gap-6 md:grid-cols-2"
            >
              <div>
                <Card className="h-full border-border/60 p-8">
                  <CardContent className="p-0">
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <Icon name="visibility" size={24} className="text-primary" />
                    </div>
                    <h2 className="text-title-md font-bold text-primary mb-3">Our Mission</h2>
                    <p className="text-body-md text-muted-foreground leading-relaxed">
                      To nurture lifelong learners who excel academically, lead with integrity,
                      and achieve their fullest potential in a globally connected world.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card className="h-full border-border/60 p-8">
                  <CardContent className="p-0">
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-tertiary/10">
                      <Icon name="explore" size={24} className="text-tertiary" />
                    </div>
                    <h2 className="text-title-md font-bold text-tertiary mb-3">Our Vision</h2>
                    <p className="text-body-md text-muted-foreground leading-relaxed">
                      To be a world-class institution that sets the standard for holistic education,
                      blending Montessori principles with STEM innovation.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Core Values Section */}
          <div


            className="mb-16"
          >
            <h2
              className="text-headline-sm md:text-headline-md font-bold text-primary text-center mb-12"
            >
              Our Core Values
            </h2>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-5">
              {coreValues.map((value, i) => (
                <div
                  key={value.title}
                >
                  <Card
                    className={cn(
                      'group h-full border-border/60 p-6 text-center transition-all duration-300',
                    )}
                  >
                    <CardContent className="p-0">
                      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors duration-300 group-hover:bg-primary/20 mx-auto">
                        <Icon name={value.icon} size={24} className="text-primary" />
                      </div>
                      <h3 className="text-title-sm font-bold mb-2">{value.title}</h3>
                      <p className="text-body-md text-muted-foreground leading-relaxed">
                        {value.description}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>

          {/* School Information Section */}
          <div


            className="mb-16"
          >
            <h2
              className="text-headline-sm md:text-headline-md font-bold text-primary text-center mb-12"
            >
              School Information
            </h2>

            <div





            >
              <Card className="mx-auto max-w-4xl border-border/60 p-8 sm:p-10">
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
                    {schoolFacts.map((fact) => (
                      <StatCard key={fact.label} label={fact.label} value={fact.value} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Academic Programs Section */}
          <div


            className="mb-16"
          >
            <h2
              className="text-headline-sm md:text-headline-md font-bold text-primary text-center mb-12"
            >
              Academic Programs
            </h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {academicPrograms.map((program, i) => (
                <div
                  key={program.title}
                >
                  <Card className="group h-full border-border/60 p-6 transition-all duration-300">
                    <CardContent className="p-0">
                      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors duration-300 group-hover:bg-primary/20">
                        <Icon name={program.icon} size={24} className="text-primary" />
                      </div>
                      <h3 className="text-title-sm font-bold mb-3">{program.title}</h3>
                      <p className="text-body-md text-muted-foreground leading-relaxed">
                        {program.description}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>

          {/* School Motto Section */}
          <div


          >
            <div className="text-center">
              <div className="mx-auto mb-6 h-px max-w-xs bg-gradient-to-r from-transparent via-tertiary/40 to-transparent" />
              <p className="text-display-xs md:text-display-sm font-extrabold tracking-widest text-tertiary">
                Learn &bull; Lead &bull; Achieve
              </p>
              <p className="text-label-sm font-medium uppercase tracking-widest text-muted-foreground">
                School Motto
              </p>
              <div className="mx-auto mt-6 h-px max-w-xs bg-gradient-to-r from-transparent via-tertiary/40 to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

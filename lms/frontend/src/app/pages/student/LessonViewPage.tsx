import { useParams, Link } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { scrollReveal, staggerContainer, cardStackReveal } from '@/lib/motion';
import { useQuery } from '@tanstack/react-query';
import { getLesson } from '@/services/dataService';
import { getQuiz, getSubject } from '@/services/dataService';
import { getTextbook, getChaptersForTextbook } from '@/services/textbookService';
import { getAssignment } from '@/services/dataService';
import { ROUTES } from '@/lib/constants';

type Entry = { c: string[]; s: string; e: [string, string][]; q: [string, string][] };

const DATA: [string, Entry][] = [
  ['linear equation', { c: ['Variables represent unknown values', 'Inverse operations maintain equality', 'Isolate the variable step by step', 'Verify by substituting back'], s: 'Linear equations are the foundation of algebra. By isolating the variable using inverse operations, you can solve for unknowns with confidence.', e: [['Solve 3x + 7 = 22', 'x = 5'], ['Solve 2(x - 4) = 12', 'x = 10'], ['Solve 5x + 3 = 2x + 15', 'x = 4']], q: [['Solve: 4x - 9 = 23', 'x = 8'], ['Solve: 7(x + 2) = 49', 'x = 5'], ['Solve: 6x + 5 = 2x + 21', 'x = 4'], ['If 3x + 7 = 22, find 2x - 1', 'x = 5, so 2(5) - 1 = 9']] }],
  ['graph', { c: ['Coordinate plane with x and y axes', 'Slope-intercept form y = mx + b', 'Slope m is rise over run', 'Y-intercept b where line crosses y-axis'], s: 'Graphing transforms equations into visual lines. The slope-intercept form y = mx + b reveals steepness and starting point, making it easy to draw linear relationships.', e: [['Find slope and y-intercept of y = 3x - 2', 'm = 3, b = -2'], ['Graph y = -2x + 4', 'Plot (0,4), slope -2/1, go down 2 right 1']], q: [['Slope of y = -4x + 7?', 'm = -4'], ['Where does y = 3x - 5 cross y-axis?', '(0, -5)'], ['Slope between (2,1) and (6,9)?', 'm = 2']] }],
  ['system', { c: ['Multiple equations with shared variables', 'Substitution: isolate then replace', 'Elimination: add to cancel terms', 'Solution satisfies all equations'], s: 'Systems of equations model situations with multiple constraints. Substitution and elimination are the two key methods for finding values that satisfy all equations at once.', e: [['Solve: y = 2x + 1, y = -x + 7', 'x = 2, y = 5'], ['Solve: 3x + y = 10, y = 2x', 'x = 2, y = 4']], q: [['Solve: x + y = 10, x - y = 4', 'x = 7, y = 3'], ['Solve: 2x + 3y = 13, x = 2', 'x = 2, y = 3'], ['Sum 25, diff 5 — find numbers', '15 and 10']] }],
  ['quadratic', { c: ['Standard form: ax² + bx + c = 0', 'Parabolic graph opens up or down', 'Vertex is highest/lowest point', 'Discriminant determines # of solutions'], s: 'Quadratics introduce nonlinear relationships through parabolic curves. The quadratic formula and discriminant analysis are essential tools for working with these functions.', e: [['Identify a, b, c in 3x² - 2x + 7', 'a = 3, b = -2, c = 7, opens up'], ['Evaluate f(2) for f(x) = x² + 3x - 5', 'f(2) = 5']], q: [['In 2x² + 5x - 3, what is c?', 'c = -3'], ['Does -3x² + 2x open up or down?', 'Down (a < 0)'], ['Evaluate f(3) for x² - 4x + 2', 'f(3) = -1']] }],
  ['formula', { c: ['x = (-b ± √(b² - 4ac)) / 2a', 'Discriminant D = b² - 4ac', 'D > 0: two real; D = 0: one; D < 0: complex', 'Works for all quadratic equations'], s: 'The quadratic formula is the universal method for solving quadratic equations. The discriminant tells you how many and what type of solutions to expect.', e: [['Solve x² + 5x + 6 = 0', 'x = -2, x = -3'], ['Discriminant of x² - 4x + 4 = 0?', 'D = 0, one repeated root']], q: [['Discriminant of 2x² + 3x - 5 = 0?', 'D = 49 > 0, two real'], ['Solve x² - 9 = 0', 'x = ±3'], ['Solutions for x² + x + 1 = 0?', 'None real (D = -3 < 0)']] }],
  ['polynomial', { c: ['Terms with non-negative integer exponents', 'Like terms share variable and exponent', 'Combine like terms when adding/subtracting', 'Use distributive property for multiplication'], s: 'Polynomial operations extend arithmetic to multi-term expressions. Mastering like-term combination and the distributive property builds skills for advanced algebra.', e: [['Simplify (3x²+2x-5)+(x²-4x+1)', '4x² - 2x - 4'], ['Multiply (x + 3)(x - 2)', 'x² + x - 6']], q: [['Simplify (4x²-3x+7)-(2x²+x-3)', '2x² - 4x + 10'], ['Expand (x+4)(x-4)', 'x² - 16'], ['Multiply 2x(3x²-x+5)', '6x³ - 2x² + 10x']] }],
  ['factor', { c: ['Factoring reverses multiplication into factors', 'Check for GCF first', 'Difference: a² - b² = (a+b)(a-b)', 'Find factors of c that sum to b for x²+bx+c'], s: 'Factoring breaks polynomials into simpler multiplicative parts. Recognizing patterns like difference of squares and mastering trinomial factoring unlocks equation solving.', e: [['Factor 6x² + 9x', '3x(2x + 3)'], ['Factor x² - 25', '(x+5)(x-5)']], q: [['Factor 4x² - 9', '(2x+3)(2x-3)'], ['Factor 12x² - 8x', '4x(3x-2)'], ['Factor x² + 7x + 12', '(x+3)(x+4)']] }],
  ['pythagor', { c: ['Right triangle: legs a, b and hypotenuse c', 'Theorem: a² + b² = c²', 'Find any missing side given two others', 'Widely used in construction and navigation'], s: 'The Pythagorean theorem beautifully connects algebra and geometry. The relationship a² + b² = c² has countless practical applications.', e: [['Legs 3 and 4, find hypotenuse', 'c = 5 (3-4-5 triangle)'], ['Ladder 10ft, base 6ft from wall, height?', 'h = 8 ft']], q: [['Legs 5 and 12, find hypotenuse', 'c = 13'], ['Hypotenuse 13, leg 5, find other leg', 'b = 12'], ['Sides 5, 12, 14 — right triangle?', 'No: 5²+12²=169, 14²=196']] }],
  ['congruent', { c: ['Same shape and size, all parts equal', 'SSS, SAS, ASA, AAS criteria', 'Corresponding sides and angles match', 'Prove by matching every corresponding part'], s: 'Congruent triangles are identical in shape and size. Proving congruence requires showing that corresponding sides and angles are equal.', e: [['Given sides 5, 6, 7 in two triangles', 'SSS: if all sides match, triangles are congruent'], ['Given SAS with same angle and two sides', 'SAS: if two sides and included angle match, congruent']], q: [['If two triangles share SSS, are they congruent?', 'Yes'], ['What does ASA stand for?', 'Angle-Side-Angle'], ['If only angles match, are triangles congruent?', 'No — they could be similar but different size']] }],
  ['similar', { c: ['Same shape, proportional size', 'Corresponding angles are equal', 'Corresponding sides are proportional', 'Scale factor relates side lengths'], s: 'Similar triangles share the same shape but differ in size. Their proportional sides make them powerful for indirect measurement and scaling problems.', e: [['Triangle with sides 3,4,5 scaled by 2', 'Sides become 6,8,10, angles unchanged'], ['Shadow problem: 6ft person casts 4ft shadow, tree casts 20ft', 'Tree height = (6×20)/4 = 30ft']], q: [['In similar triangles, angles are...', 'Equal'], ['Side ratio of 1:3 means scale factor?', '3'], ['Can congruent triangles be similar?', 'Yes — with scale factor 1']] }],
  ['sine', { c: ['SOH: Sine = Opposite / Hypotenuse', 'CAH: Cosine = Adjacent / Hypotenuse', 'TOA: Tangent = Opposite / Adjacent', 'Ratios connect angles to side lengths'], s: 'Trigonometric ratios connect angles to side ratios in right triangles. SOH CAH TOA is the essential mnemonic for sine, cosine, and tangent.', e: [['In a right triangle, opposite=3, hyp=5, sin(θ)=?', 'sin(θ) = 3/5'], ['Adjacent=4, opposite=3, tan(θ)=?', 'tan(θ) = 3/4']], q: [['sin(30°) = opposite/?', 'hypotenuse'], ['tan(θ) = ?/adjacent', 'opposite'], ['If sin(θ) = 0.5, cos(θ) = 0.866, tan(θ)=?', '≈ 0.577']] }],
  ['newton', { c: ['1st Law: objects maintain motion unless acted on', '2nd Law: F = ma', '3rd Law: every action has equal/opposite reaction', 'Forces always come in pairs'], s: "Newton's laws are the foundation of classical mechanics. They explain how forces affect motion from everyday objects to planetary orbits.", e: [['5kg mass accelerates at 3 m/s², force?', 'F = 15 N'], ['Push 20N, friction 5N, net force?', '15 N in direction of push']], q: [['10kg mass pushed with 30N, acceleration?', '3 m/s²'], ['Force for 2kg at 5 m/s²?', '10 N'], ['Wall push back force when you push 50N?', '50 N opposite (3rd Law)']] }],
  ['energy', { c: ['Kinetic energy KE = ½mv² (motion)', 'Potential energy PE = mgh (height)', 'Energy is conserved, never created/destroyed', 'Work-energy theorem: work = ΔKE'], s: 'Energy exists in kinetic and potential forms and is always conserved. Understanding energy transformations is fundamental across all sciences.', e: [['2kg mass at 3 m/s, KE?', 'KE = ½(2)(9) = 9 J'], ['5kg mass at height 10m, g=10, PE?', 'PE = 5×10×10 = 500 J']], q: [['KE formula is ½mv², name each term', 'm=mass(kg), v=velocity(m/s)'], ['If height doubles, PE does what?', 'Doubles (PE ∝ h)'], ['A falling object converts PE to?', 'Kinetic energy']] }],
  ['essay', { c: ['Clear thesis statement guides the essay', 'Each paragraph needs a topic sentence', 'Support claims with evidence and examples', 'Conclusion reinforces thesis without new ideas'], s: 'Strong essay writing follows a clear structure: introduction with thesis, body with evidence, and a conclusion that ties everything together.', e: [['Write a thesis for "social media effects"', '"Social media has reshaped communication by increasing connectivity while reducing face-to-face interaction."'], ['Outline three body paragraphs for that thesis', '1. Connectivity benefits 2. Reduced face-to-face 3. Balancing both']], q: [['What does a thesis statement do?', 'States the main argument of the essay'], ['How many paragraphs in a standard essay body?', '3-5, each with one main idea'], ['What belongs in a conclusion?', 'Restate thesis, summarize points, final thought']] }],
  ['poem', { c: ['Figurative language: metaphor, simile, personification', 'Meter creates rhythm through stressed/unstressed syllables', 'Rhyme schemes like ABAB give structure', 'Theme and tone reveal deeper meaning'], s: 'Poetry analysis combines literal comprehension with interpretation. Examining diction, imagery, meter, and rhyme uncovers the layers of meaning the poet crafted.', e: [['Find the metaphor in "The fog comes on little cat feet"', 'Fog is compared to a cat — quiet and subtle'], ['Identify rhyme scheme of ABAB CDCD', 'Alternating end rhymes, changing in second stanza']], q: [['Difference between metaphor and simile?', 'Simile uses like/as, metaphor does not'], ['What is iambic pentameter?', '5 pairs of unstressed/stressed syllables'], ['What does tone refer to?', "The author's attitude toward the subject"]], }],
];

function match<T>(title: string, extract: (e: Entry) => T): T {
  const t = title.toLowerCase();
  const found = DATA.find(([k]) => t.includes(k));
  return extract(found ? found[1] : DATA[0][1]);
}

export default function LessonViewPage() {
  const { id } = useParams<{ id: string }>();
  const [answersVisible, setAnswersVisible] = useState<Record<number, boolean>>({});

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['lesson', id],
    queryFn: async () => {
      if (!id) return null;
      const lesson = await getLesson(id);
      if (!lesson) return null;

      const [textbook, quiz, assignment] = await Promise.all([
        lesson.textbookId ? getTextbook(lesson.textbookId) : Promise.resolve(null),
        lesson.quizId ? getQuiz(lesson.quizId) : Promise.resolve(null),
        lesson.assignmentId ? getAssignment(lesson.assignmentId) : Promise.resolve(null),
      ]);

      const subject = textbook?.subjectId ? await getSubject(textbook.subjectId) : null;
      let chapter = null;
      if (textbook && lesson?.chapterId) {
        const chapters = await getChaptersForTextbook(textbook.id);
        chapter = chapters.find((ch) => ch.id === lesson.chapterId) ?? null;
      }

      return { lesson, textbook, subject, chapter, quiz, assignment };
    },
  });

  const concepts = useMemo(() => (data?.lesson ? match(data.lesson.title, (e) => e.c) : []), [data]);
  const summary = useMemo(() => (data?.lesson ? match(data.lesson.title, (e) => e.s) : ''), [data]);
  const examples = useMemo(() => (data?.lesson ? match(data.lesson.title, (e) => e.e) : []), [data]);
  const questions = useMemo(() => (data?.lesson ? match(data.lesson.title, (e) => e.q) : []), [data]);

  const nextLesson = null;

  const toggleAnswer = (i: number) => setAnswersVisible((p) => ({ ...p, [i]: !p[i] }));

  return (
    <>
      <SEOHead
        title={data?.lesson?.title ?? 'Lesson'}
        description={`${data?.subject?.name ?? ''}: ${data?.lesson?.title ?? ''} — ${data?.lesson?.contentType === 'video' ? 'Video lesson' : 'Article lesson'} from ${data?.textbook?.title ?? ''}`}
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-16"
      >
        <DataFetchWrapper
          data={data}
          isLoading={isLoading}
          error={isError ? error ?? new Error('Lesson not found') : null}
          loadingType="detail"
          emptyMessage="Lesson not found"
          emptyIcon={<Icon name="error" size={32} />}
          emptyAction={
            <Button asChild variant="outline">
              <Link to={ROUTES.STUDENT_SUBJECTS}>Back to Subjects</Link>
            </Button>
          }
          onRetry={() => refetch()}
          errorTitle="Failed to load lesson"
        >
          {(d) => (
            <>
              {/* 1. Lesson Header */}
              <motion.div variants={cardStackReveal} custom={0}>
                <section>
                  <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2">
                    <Link to={d.textbook ? ROUTES.STUDENT_TEXTBOOK(d.textbook.id) : ROUTES.STUDENT_SUBJECTS} className="gap-1.5">
                      <Icon name="arrow_back" size={16} />
                      {d.textbook?.title ?? 'Back'}
                    </Link>
                  </Button>
                  <div className="space-y-1">
                    <p className="text-body-md text-muted-foreground">
                      {d.subject?.name} &middot; {d.chapter?.title ?? 'Chapter'} &middot; Lesson {d.lesson.order}
                    </p>
                    <h1 className="text-headline-sm font-bold text-on-surface">{d.lesson.title}</h1>
                    <div className="flex items-center gap-4 text-body-md text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Icon name="schedule" size={16} />{d.lesson.duration} min
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon name={d.lesson.contentType === 'video' ? 'smart_display' : 'article'} size={16} />
                        {d.lesson.contentType === 'video' ? 'Video' : 'Article'}
                      </span>
                    </div>
                  </div>
                </section>
              </motion.div>

              {/* 2. Video / Article Content */}
              <motion.div variants={cardStackReveal} custom={0}>
                {d.lesson.contentType === 'video' && d.lesson.videoUrl ? (
                  <section>
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-surface-container-high shadow-elevation-2">
                      <iframe
                        src={d.lesson.videoUrl}
                        title={d.lesson.title}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </section>
                ) : d.lesson.contentType === 'article' && d.lesson.content ? (
                  <section>
                    <h2 className="text-title-sm font-semibold text-on-surface flex items-center gap-2 mb-3">
                      <Icon name="article" size={20} className="text-primary" />Lesson Content
                    </h2>
                    <div className="prose prose-neutral dark:prose-invert max-w-none bg-surface-container-high/50 rounded-xl p-5 text-body-md leading-relaxed whitespace-pre-wrap">
                      {d.lesson.content}
                    </div>
                  </section>
                ) : null}
              </motion.div>

              {/* 3. Key Concepts */}
              <motion.div variants={cardStackReveal} custom={0}>
                <section>
                  <h2 className="text-title-sm font-semibold text-on-surface flex items-center gap-2 mb-3">
                    <Icon name="lightbulb" size={20} className="text-primary" />Key Concepts
                  </h2>
                  <div className="bg-primary-container/30 rounded-xl p-4">
                    <ul className="space-y-2.5">
                      {concepts.map((c, i) => (
                        <li key={i} className="flex items-start gap-3 text-body-md">
                          <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-label-xs font-bold text-primary">
                            {i + 1}
                          </span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              </motion.div>

              {/* 4. Summary Notes */}
              <motion.div variants={cardStackReveal} custom={0}>
                <section>
                  <h2 className="text-title-sm font-semibold text-on-surface flex items-center gap-2 mb-3">
                    <Icon name="notes" size={20} className="text-primary" />Summary Notes
                  </h2>
                  <div className="bg-surface-variant/40 rounded-xl p-4 text-body-md leading-relaxed text-on-surface-variant">
                    {summary}
                  </div>
                </section>
              </motion.div>

              {/* 5. Interactive Examples */}
              {examples.length > 0 && (
                <motion.div variants={cardStackReveal} custom={0}>
                  <section>
                    <h2 className="text-title-sm font-semibold text-on-surface flex items-center gap-2 mb-3">
                      <Icon name="psychology" size={20} className="text-primary" />Interactive Examples
                    </h2>
                    <div className="space-y-3">
                      {examples.map(([problem, solution], i) => (
                        <div key={i} className="bg-surface-variant/50 rounded-xl p-4 border border-outline-variant/30">
                          <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center text-label-sm font-bold text-primary">
                              {i + 1}
                            </span>
                            <div className="space-y-2 min-w-0">
                              <p className="font-medium text-body-md text-on-surface">Problem:</p>
                              <p className="text-body-md text-on-surface-variant">{problem}</p>
                              <details className="group">
                                <summary className="cursor-pointer text-body-md font-medium text-primary hover:text-primary/80 transition-colors list-none flex items-center gap-1">
                                  <Icon name="expand_more" size={16} className="group-open:rotate-180 transition-transform" />
                                  Show Solution
                                </summary>
                                <div className="mt-2 p-3 rounded-lg bg-primary-container/25 text-body-md text-on-surface">
                                  {solution}
                                </div>
                              </details>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </motion.div>
              )}

              {/* 6. Practice Questions */}
              {questions.length > 0 && (
                <motion.div variants={cardStackReveal} custom={0}>
                  <section>
                    <h2 className="text-title-sm font-semibold text-on-surface flex items-center gap-2 mb-3">
                      <Icon name="quiz" size={20} className="text-primary" />Practice Questions
                    </h2>
                    <div className="space-y-3">
                      {questions.map(([question, answer], i) => (
                        <div key={i} className="bg-surface-container-high/40 rounded-xl border border-outline-variant/20 overflow-hidden">
                          <button
                            onClick={() => toggleAnswer(i)}
                            className="w-full flex items-center justify-between p-4 text-left hover:bg-surface-container-high/60 transition-colors"
                          >
                            <span className="flex items-center gap-3 text-body-md font-medium text-on-surface">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary-container/50 flex items-center justify-center text-label-xs font-bold text-on-secondary-container">
                                {i + 1}
                              </span>
                              {question}
                            </span>
                            <Icon name={answersVisible[i] ? 'expand_less' : 'expand_more'} size={20} className="text-muted-foreground flex-shrink-0" />
                          </button>
                          {answersVisible[i] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              className="px-4 pb-4"
                            >
                              <div className="p-3 rounded-lg bg-success-container/30 border border-success/20 text-body-md text-on-success-container flex items-start gap-2">
                                <Icon name="check_circle" size={18} className="text-success flex-shrink-0 mt-0.5" />
                                {answer}
                              </div>
                            </motion.div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                </motion.div>
              )}

              {/* 7. Mini Quiz */}
              {d.quiz && (
                <motion.div variants={cardStackReveal} custom={0}>
                  <section>
                    <h2 className="text-title-sm font-semibold text-on-surface flex items-center gap-2 mb-3">
                      <Icon name="assignment" size={20} className="text-success" />Mini Quiz
                    </h2>
                    <div className="bg-surface-container-high/50 rounded-xl p-5 border border-success/20 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-body-md font-medium text-on-surface">{d.quiz.title}</p>
                          <p className="text-body-md text-muted-foreground mt-0.5">{d.quiz.description}</p>
                        </div>
                        <div className="flex items-center gap-3 text-body-md text-muted-foreground flex-shrink-0">
                          <span className="flex items-center gap-1"><Icon name="schedule" size={14} />{d.quiz.timeLimit} min</span>
                          <span className="flex items-center gap-1"><Icon name="help" size={14} />{Array.isArray(d.quiz.questions) ? d.quiz.questions.length : 0} Qs</span>
                        </div>
                      </div>
                      <Button asChild className="w-full gap-2" variant="success">
                        <Link to={ROUTES.QUIZ_ATTEMPT(d.quiz.id)}>
                          <Icon name="play_arrow" size={18} />Take Quiz &rarr;
                        </Link>
                      </Button>
                    </div>
                  </section>
                </motion.div>
              )}

              {/* 8. Assignment */}
              {d.assignment && (
                <motion.div variants={cardStackReveal} custom={0}>
                  <section>
                    <h2 className="text-title-sm font-semibold text-on-surface flex items-center gap-2 mb-3">
                      <Icon name="description" size={20} className="text-warning" />Assignment
                    </h2>
                    <div className="bg-surface-container-high/50 rounded-xl p-5 border border-warning/20 space-y-3">
                      <div>
                        <p className="text-body-md font-medium text-on-surface">{d.assignment.title}</p>
                        <p className="text-body-md text-muted-foreground mt-0.5">{d.assignment.description}</p>
                      </div>
                      <div className="flex items-center gap-4 text-body-md text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><Icon name="event" size={14} />Due {d.assignment.dueDate ? new Date(d.assignment.dueDate).toLocaleDateString() : 'N/A'}</span>
                        <span className="flex items-center gap-1"><Icon name="score" size={14} />{d.assignment.points} pts</span>
                      </div>
                      <Button asChild className="w-full gap-2" variant={d.assignment.status === 'published' ? 'default' : 'secondary'}>
                        <Link to={ROUTES.ASSIGNMENT_DETAIL(d.assignment.id)}>
                          <Icon name="send" size={16} />
                          {d.assignment.status === 'published' ? 'Submit Assignment' : 'View Assignment'}
                        </Link>
                      </Button>
                    </div>
                  </section>
                </motion.div>
              )}
            </>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}

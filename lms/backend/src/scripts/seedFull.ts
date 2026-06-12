import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { initializeFirebase } from '../config/firebase';
import { getAdminAuth, getAdminFirestore, admin } from '../firebase/admin';
import { v4 as uuidv4 } from 'uuid';

initializeFirebase();
const auth = getAdminAuth();
const db = getAdminFirestore();

// ── Types ──
type Role = 'admin' | 'teacher' | 'student';
interface QDef { type: string; difficulty: string; category: string; text: string; options?: string[]; correctAnswer: string; explanation: string; points: number }
interface VideoDef { youtubeId: string; title: string; duration: string; channelName: string; description: string; relevance: number }
interface ConceptDef { title: string; summary: string; notes: string; learningObjectives: string[]; keywords: string[]; difficulty: string; estimatedMinutes: number; videos: VideoDef[]; questions: QDef[] }
interface ChapterDef { title: string; description: string; concepts: ConceptDef[] }

// ── Helpers ──
function uid() { return uuidv4().replace(/-/g, '').slice(0, 20); }

async function deleteCollection(name: string) {
  const snap = await db.collection(name).get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  console.log(`  Deleted ${snap.size} docs from ${name}`);
}

async function deleteSubcollections(ref: FirebaseFirestore.DocumentReference) {
  const subcollections = await ref.listCollections();
  for (const sub of subcollections) {
    const snap = await sub.get();
    if (!snap.empty) {
      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
}

async function createUser(email: string, password: string, displayName: string, role: Role, extra: Record<string, any> = {}) {
  let uid: string;
  try {
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;
    await auth.updateUser(uid, { displayName, password });
    console.log(`  Updated existing user: ${email} (${role})`);
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      const record = await auth.createUser({ email, password, displayName });
      uid = record.uid;
      console.log(`  Created user: ${email} (${role})`);
    } else {
      throw err;
    }
  }
  await auth.setCustomUserClaims(uid, { role });
  await db.collection('users').doc(uid).set({
    uid, email, displayName, role, isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...extra,
  }, { merge: true });
  return uid;
}

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function genMCQ(text: string, options: string[], correct: string, explanation: string, difficulty = 'easy', category = 'recall', points = 1): QDef {
  return { type: 'mcq', difficulty, category, text, options, correctAnswer: correct, explanation, points };
}
function genTF(text: string, correct: boolean, explanation: string, difficulty = 'easy'): QDef {
  return { type: 'true_false', difficulty, category: 'recall', text, options: ['True', 'False'], correctAnswer: correct ? 'True' : 'False', explanation, points: 1 };
}
function genShort(text: string, answer: string, explanation: string, difficulty = 'medium'): QDef {
  return { type: 'short_answer', difficulty, category: 'application', text, correctAnswer: answer, explanation, points: 2 };
}

// ── Real YouTube Video IDs ──
const VIDEO_IDS: Record<string, [string, string, string, string]> = {
  'math_Numbers & Counting':      ['pzmB0GoEKkA', 'Jack Hartmann', 'CRQdhS1TJdo', 'Jack Hartmann'],
  'math_Addition & Subtraction':   ['uRoJ5E-Xx9s', 'Jack Hartmann', '8hz0fAQV0ac', 'Numberock'],
  'math_Multiplication & Division':['9dYXfZZsbzc', 'Numberock',     'eAZ7UJweYZ8', 'Jack Hartmann'],
  'math_Shapes & Geometry':        ['a4FXl4zb3E4', 'Numberock',     'pzmB0GoEKkA', 'Jack Hartmann'],
  'math_Measurement':              ['a4FXl4zb3E4', 'Numberock',     'eAZ7UJweYZ8', 'Jack Hartmann'],
  'math_Fractions & Decimals':     ['SZaXtOHNh6s', 'Numberock',     'NnyzzkIVNSQ', 'Numberock'],
  'math_Geometry & Area':          ['a4FXl4zb3E4', 'Numberock',     'pzmB0GoEKkA', 'Jack Hartmann'],
  'english_Alphabet & Phonics':    ['M1S9y-xO7eQ', 'KidsTV123',     'ptk68qC1woI', 'Gracie\'s Corner'],
  'english_Grammar & Punctuation': ['c3yJhw7R3fI', 'Jack Hartmann', '_yarxGq1Ens', 'GrammarSongs'],
  'english_Reading Comprehension': ['3GMJmd4wCtY', 'Alphablocks',   'ZAZ74S0vPqs', 'Harry Kindergarten'],
  'english_Writing':               ['c3yJhw7R3fI', 'Jack Hartmann', 'vfnXDl4-bCw', 'Jack Hartmann'],
  'english_Vocabulary':            ['ptk68qC1woI', 'Gracie\'s Corner', 'M1S9y-xO7eQ', 'KidsTV123'],
  'science_Living Things':         ['Gy60BqCnTG4', 'SciShow Kids',  'BEz7RPvQCAI', 'Learning Time Fun'],
  'science_Plants':                ['qULkjDccCeY', 'FreeSchool',    '6a0dmntR0Dw', 'SciShow Kids'],
  'science_Animals':               ['-iO_LdNR_80', 'Periwinkle',    'SIbFuiCfkr8', 'Smile and Learn'],
  'science_Weather & Seasons':     ['Uo8lbeVVb4M', 'SciShow Kids',  'UQjT5uKp2hg', 'SciShow Kids'],
  'science_Earth & Space':         ['joq-IUFNkrw', 'SciShow Kids',  'PePymheJcbc', 'SciShow Kids'],
};

function videoIdsFor(subject: string, chapterTitle: string): [VideoDef, VideoDef] {
  const key = `${subject}_${chapterTitle}`;
  const pair = VIDEO_IDS[key];
  if (!pair) {
    const fallback = VIDEO_IDS[`${subject}_Living Things`] ?? VIDEO_IDS[`${subject}_Numbers & Counting`] ?? VIDEO_IDS['science_Living Things'];
    return [
      { youtubeId: fallback[0], title: `Introduction`, duration: '5:00', channelName: fallback[1], description: `Learn about ${chapterTitle}`, relevance: 0.95 },
      { youtubeId: fallback[2], title: `Practice`,       duration: '5:00', channelName: fallback[3], description: `Practice ${chapterTitle}`, relevance: 0.9 },
    ];
  }
  return [
    { youtubeId: pair[0], title: `Introduction to ${chapterTitle}`, duration: '5:00', channelName: pair[1], description: `Learn about ${chapterTitle}`, relevance: 0.95 },
    { youtubeId: pair[2], title: `${chapterTitle} - Practice`,       duration: '5:00', channelName: pair[3], description: `Practice ${chapterTitle} problems`, relevance: 0.9 },
  ];
}
// ── Chapter/Question Factories ──
function mathQuestions(grade: number, chapter: string): QDef[] {
  const g = grade;
  const basic: QDef[] = [];
  if (chapter === 'Numbers & Counting') {
    basic.push(genMCQ(`What is the next number after ${g === 1 ? '9' : '99'}?`, [g === 1 ? '8' : '98', g === 1 ? '10' : '100', g === 1 ? '11' : '101', g === 1 ? '0' : '1000'], g === 1 ? '10' : '100', `${g === 1 ? '9 comes before 10' : '99 comes before 100'}.`));
    basic.push(genMCQ(`Which number is ${g === 1 ? 'greater: 15 or 9' : 'greater: 245 or 254'}?`, g === 1 ? ['9', '15', 'Both', 'Neither'] : ['245', '254', 'Both', 'Neither'], g === 1 ? '15' : '254', `${g === 1 ? '15 is larger than 9' : '254 is larger than 245'}.`));
    basic.push(genTF(`${g === 1 ? '10' : '100'} is an even number.`, true, `${g === 1 ? '10' : '100'} is divisible by 2.`));
    basic.push(genShort(`Write the number ${g === 1 ? 'twenty-five' : 'three hundred forty-seven'} in digits.`, g === 1 ? '25' : '347', 'Write the digits as they appear in the number.'));
    basic.push(genMCQ(`What is the place value of ${g === 1 ? 'the digit 3 in 34' : 'the digit 7 in 7,245'}?`, g === 1 ? ['3', '30', '300', 'Ones'] : ['7', '70', '700', '7,000'], g === 1 ? '30' : '7,000', `${g === 1 ? '3 is in the tens place, so its value is 30' : '7 is in the thousands place'}.`));
    basic.push(genMCQ(`Which set is in order from smallest to largest?`, g === 1 ? ['5, 2, 8, 3', '2, 3, 5, 8', '8, 5, 3, 2', '3, 8, 2, 5'] : ['123, 231, 312', '312, 231, 123', '231, 123, 312', '123, 312, 231'], g === 1 ? '2, 3, 5, 8' : '123, 231, 312', 'Order from least to greatest.'));
  }
  if (chapter === 'Addition & Subtraction') {
    const a = g === 1 ? 3 : 45, b = g === 1 ? 5 : 37;
    basic.push(genMCQ(`What is ${a} + ${b}?`, [(a + b + 1).toString(), (a + b).toString(), (a + b - 1).toString(), (a + 2).toString()], (a + b).toString(), `Add ${a} and ${b} to get ${a + b}.`));
    basic.push(genMCQ(`What is ${a + b} - ${a}?`, [(b + 1).toString(), b.toString(), (b - 1).toString(), a.toString()], b.toString(), `Subtract ${a} from ${a + b} to get ${b}.`));
    basic.push(genTF(`${a + b} + 0 = ${a + b}`, true, 'Adding zero to any number gives the same number.'));
    basic.push(genShort(`What is ${g === 1 ? '12 - 7' : '100 - 37'}? Show your work.`, g === 1 ? '5' : '63', g === 1 ? '12 - 7 = 5' : '100 - 37 = 63'));
    basic.push(genMCQ(`Which number makes this true: ${a} + ___ = ${a + b}`, [b.toString(), (b + 1).toString(), (a).toString(), (a + b - 1).toString()], b.toString(), `The missing addend is ${b}.`));
    basic.push(genMCQ(`${a} + ${b} = ${b} + ___`, [a.toString(), (a + 1).toString(), b.toString(), '0'], a.toString(), 'Addition is commutative.'));
  }
  if (chapter === 'Multiplication & Division') {
    basic.push(genMCQ(`What is ${g === 1 ? '2 × 3' : '6 × 7'}?`, g === 1 ? ['5', '6', '8', '9'] : ['42', '48', '36', '49'], g === 1 ? '6' : '42', g === 1 ? '2 × 3 = 6' : '6 × 7 = 42'));
    basic.push(genMCQ(`What is ${g === 1 ? '6 ÷ 2' : '42 ÷ 7'}?`, g === 1 ? ['2', '3', '4', '6'] : ['6', '7', '5', '8'], g === 1 ? '3' : '6', g === 1 ? '6 ÷ 2 = 3' : '42 ÷ 7 = 6'));
    basic.push(genTF(`${g === 1 ? '3 × 4 = 14' : '8 × 9 = 72'}`, g === 1 ? false : true, g === 1 ? '3 × 4 = 12, not 14' : '8 × 9 = 72'));
    basic.push(genShort(`What is ${g === 1 ? '5 × 5' : '12 × 11'}?`, g === 1 ? '25' : '132', g === 1 ? '5 × 5 = 25' : '12 × 11 = 132', 'hard'));
    basic.push(genMCQ(`Which is the same as ${g === 1 ? '4 + 4 + 4' : '7 + 7 + 7 + 7'}?`, g === 1 ? ['3 × 4', '4 × 3', 'Both A and B', 'Neither'] : ['7 × 4', '4 × 7', 'Both A and B', 'Neither'], 'Both A and B', 'Repeated addition is multiplication.'));
  }
  if (chapter === 'Shapes & Geometry') {
    const shapes = g === 1 ? ['square', 'circle', 'triangle', 'rectangle'] : ['triangle', 'quadrilateral', 'pentagon', 'hexagon'];
    basic.push(genMCQ(`How many sides does a ${shapes[2]} have?`, g === 1 ? ['2', '3', '4', '5'] : ['4', '5', '6', '7'], g === 1 ? '3' : '5', `A ${shapes[2]} has ${g === 1 ? '3' : '5'} sides.`));
    basic.push(genMCQ(`Which shape has 4 equal sides?`, g === 1 ? ['Rectangle', 'Square', 'Triangle', 'Circle'] : ['Rectangle', 'Square', 'Rhombus', 'Trapezoid'], g === 1 ? 'Square' : 'Square', 'A square has 4 equal sides and 4 right angles.'));
    basic.push(genTF(`A circle has 3 sides.`, false, 'A circle has 0 sides.'));
    basic.push(genShort(`Name a shape with ${g === 1 ? '4 sides' : '6 vertices'}.`, g === 1 ? 'Square or Rectangle' : 'Hexagon', 'A hexagon has 6 vertices.'));
    basic.push(genMCQ(`What 3D shape is a soccer ball?`, ['Sphere', 'Cube', 'Cylinder', 'Cone'], 'Sphere', 'A sphere is round like a ball.'));
  }
  if (chapter === 'Fractions & Decimals') {
    basic.push(genMCQ(`What fraction is shaded if ${g === 1 ? '1 out of 4 parts' : '3 out of 4 parts'} are shaded?`, g === 1 ? ['1/4', '1/2', '3/4', '1'] : ['1/4', '1/2', '3/4', '1'], g === 1 ? '1/4' : '3/4', 'The numerator is the number of shaded parts, denominator is total parts.'));
    basic.push(genMCQ(`Which is larger: ${g === 1 ? '1/2 or 1/4' : '0.5 or 0.25'}?`, g === 1 ? ['1/2', '1/4', 'Equal', 'Cannot tell'] : ['0.5', '0.25', 'Equal', 'Cannot tell'], g === 1 ? '1/2' : '0.5', g === 1 ? '1/2 is greater than 1/4' : '0.5 is greater than 0.25'));
    basic.push(genTF(`${g === 1 ? '1/2 = 2/4' : '0.75 = 3/4'}`, true, 'These are equivalent.'));
    basic.push(genShort(`Write ${g === 1 ? '15 minutes' : '75 cents'} as a fraction of ${g === 1 ? 'an hour' : 'a dollar'}.`, g === 1 ? '1/4' : '3/4', g === 1 ? '15/60 = 1/4' : '75/100 = 3/4', 'medium'));
    basic.push(genMCQ(`What is ${g === 1 ? '1/2 + 1/2' : '0.3 + 0.4'}?`, g === 1 ? ['1', '2/2', 'Both A and B', '1/4'] : ['0.7', '0.07', '7', '0.1'], g === 1 ? 'Both A and B' : '0.7', g === 1 ? '1/2 + 1/2 = 1 = 2/2' : '0.3 + 0.4 = 0.7'));
  }
  return basic.slice(0, g === 1 ? 5 : 8);
}

function englishQuestions(grade: number, chapter: string): QDef[] {
  const g = grade;
  if (chapter === 'Alphabet & Phonics') {
    return [
      genMCQ(`Which letter comes after ${g === 1 ? 'C' : 'P'}?`, g === 1 ? ['A', 'B', 'D', 'E'] : ['O', 'Q', 'R', 'S'], g === 1 ? 'D' : 'Q', `The alphabet: ...${g === 1 ? 'C, D' : 'P, Q'}.`),
      genMCQ(`What sound does the letter "${g === 1 ? 'B' : 'Ch'}" make?`, g === 1 ? ['/b/', '/c/', '/d/', '/f/'] : ['/k/', '/sh/', '/ch/', '/th/'], g === 1 ? '/b/' : '/ch/', g === 1 ? 'B makes the /b/ sound' : 'Ch makes the /ch/ sound as in "chair"'),
      genTF(`The letter "${g === 1 ? 'A' : 'Q'}" is a vowel.`, g === 1 ? true : false, g === 1 ? 'A is a vowel' : 'Q is a consonant.'),
      genShort(`Write the ${g === 1 ? 'first letter of "Dog"' : 'last letter of "School"'}.`, g === 1 ? 'D' : 'L', g === 1 ? 'Dog starts with D' : 'School ends with L'),
      genMCQ(`Which word starts with the same sound as "${g === 1 ? 'Cat' : 'Phone'}"?`, g === 1 ? ['Dog', 'Car', 'Ball', 'Fish'] : ['Photo', 'Farm', 'Piano', 'Home'], g === 1 ? 'Car' : 'Photo', `${g === 1 ? 'Cat and Car both start with /k/' : 'Phone and Photo both start with /f/'}.`),
    ];
  }
  if (chapter === 'Grammar & Punctuation') {
    return [
      genMCQ(`Which is a ${g === 1 ? 'noun' : 'verb'}?`, g === 1 ? ['Run', 'Happy', 'Chair', 'Slowly'] : ['Run', 'Beautiful', 'Chair', 'Slowly'], g === 1 ? 'Chair' : 'Run', g === 1 ? 'A person, place, or thing' : 'A verb shows action.'),
      genMCQ(`Which sentence ends correctly?`, g === 1 ? ['I am happy.', 'I am happy', 'I am happy?', 'I am happy!'] : ['Where are you going.', 'Where are you going?', 'Where are you going', 'where are you going'], g === 1 ? 'I am happy.' : 'Where are you going?', 'A question needs a question mark at the end.'),
      genTF(`"The cat sat on the mat" is a complete sentence.`, true, 'It has a subject and a verb and expresses a complete thought.'),
      genShort(`Add the missing punctuation: "${g === 1 ? 'Where are you' : 'What a beautiful day'}"`, g === 1 ? '?' : '!', g === 1 ? 'Questions end with ?' : 'Excitement ends with !'),
      genMCQ(`Which word is ${g === 1 ? 'plural (more than one)' : 'the past tense'}?`, g === 1 ? ['Cat', 'Cats', 'Cat\'s', 'Cats\''] : ['Walk', 'Walking', 'Walked', 'Walks'], g === 1 ? 'Cats' : 'Walked', g === 1 ? 'Cats means more than one cat' : 'Walked means it happened in the past'),
    ];
  }
  if (chapter === 'Reading Comprehension') {
    return [
      genMCQ(`What do you call the person who writes a book?`, ['Author', 'Illustrator', 'Publisher', 'Reader'], 'Author', 'The author writes the book.'),
      genMCQ(`What should you do first when reading a new book?`, ['Read the last page', 'Look at the cover and title', 'Count the pages', 'Write your name'], 'Look at the cover and title', 'Start by reading the title and looking at the cover.'),
      genMCQ(`What does "setting" mean in a story?`, ['The characters', 'Where and when the story happens', 'The problem in the story', 'The ending'], 'Where and when the story happens', 'Setting is the time and place of a story.'),
      genTF(`The main idea is the most important point of a story.`, true, 'The main idea tells what the story is mostly about.'),
      genShort(`Name one character from a story you read.`, 'Any valid character name', 'Characters are people or animals in a story.'),
    ];
  }
  if (chapter === 'Writing') {
    return [
      genMCQ(`How should a sentence begin?`, ['With a capital letter', 'With a small letter', 'With a number', 'With a punctuation mark'], 'With a capital letter', 'Every sentence starts with a capital letter.'),
      genMCQ(`What is a paragraph?`, ['A single word', 'Several sentences about one idea', 'A chapter in a book', 'The title of a story'], 'Several sentences about one idea', 'A paragraph is a group of sentences about the same topic.'),
      genTF(`Every sentence needs a subject and a verb.`, true, 'A complete sentence needs both a subject and a verb.'),
      genShort(`Write a ${g === 1 ? 'sentence about your favorite animal' : 'short sentence about the weather today'}.`, 'Any valid sentence', 'A complete sentence has a capital letter, subject, verb, and punctuation.'),
    ];
  }
  if (chapter === 'Vocabulary') {
    return [
      genMCQ(`What is an antonym of "${g === 1 ? 'hot' : 'happy'}"?`, g === 1 ? ['Cold', 'Warm', 'Hotter', 'Warmth'] : ['Sad', 'Glad', 'Joyful', 'Excited'], g === 1 ? 'Cold' : 'Sad', g === 1 ? 'Hot and cold are opposites' : 'Happy and sad are opposites.'),
      genMCQ(`What is a synonym of "${g === 1 ? 'big' : 'begin'}"?`, g === 1 ? ['Small', 'Large', 'Tiny', 'Little'] : ['End', 'Start', 'Finish', 'Stop'], g === 1 ? 'Large' : 'Start', g === 1 ? 'Big and Large mean the same' : 'Begin and Start mean the same.'),
      genTF(`"Happy" and "joyful" are synonyms.`, true, 'They have similar meanings.'),
      genShort(`Use the word "${g === 1 ? 'beautiful' : 'courageous'}" in a sentence.`, 'Any valid sentence using the word', 'The sentence should use the word correctly.'),
      genMCQ(`What does the word "${g === 1 ? 'gigantic' : 'enormous'}" mean?`, g === 1 ? ['Tiny', 'Very big', 'Very fast', 'Very old'] : ['Very small', 'Very large', 'Very fast', 'Very old'], g === 1 ? 'Very big' : 'Very large', `${g === 1 ? 'Gigantic' : 'Enormous'} means extremely large.`),
    ];
  }
  return [];
}

function scienceQuestions(grade: number, chapter: string): QDef[] {
  const g = grade;
  if (chapter === 'Living Things') {
    return [
      genMCQ(`Which is a living thing?`, ['Rock', 'Dog', 'Chair', 'Water'], 'Dog', 'A dog breathes, eats, and grows.'),
      genMCQ(`What do all living things need to survive?`, ['TV', 'Food and Water', 'Toys', 'Books'], 'Food and Water', 'All living things need food and water to survive.'),
      genTF(`Plants are living things.`, true, 'Plants grow, need water, and reproduce.'),
      genShort(`Name one thing that all animals need to survive.`, 'Food, water, air, or shelter', 'Animals need food, water, air, and shelter to survive.'),
      genMCQ(`What is the difference between living and non-living things?`, ['Living things move by themselves', 'Non-living things can grow', 'Living things cannot breathe', 'There is no difference'], 'Living things move by themselves', 'Living things can grow, breathe, and move on their own.'),
    ];
  }
  if (chapter === 'Plants') {
    return [
      genMCQ(`What part of a plant takes in water?`, ['Leaves', 'Stem', 'Roots', 'Flower'], 'Roots', 'Roots absorb water from the soil.'),
      genMCQ(`What do plants need to make their own food?`, ['Sunlight', 'Darkness', 'Plastic', 'Sand'], 'Sunlight', 'Plants use sunlight for photosynthesis.'),
      genTF(`All plants need soil to grow.`, false, 'Some plants can grow in water or air.'),
      genShort(`Name one part of a plant that is above the ground.`, 'Stem, leaves, flower, or fruit', 'The stem, leaves, flowers, and fruits are above ground.'),
      genMCQ(`What is the process called when plants make their own food?`, ['Photosynthesis', 'Digestion', 'Breathing', 'Evaporation'], 'Photosynthesis', 'Photosynthesis is how plants make their own food using sunlight.'),
    ];
  }
  if (chapter === 'Animals') {
    return [
      genMCQ(`Which group does a ${g === 1 ? 'frog' : 'whale'} belong to?`, g === 1 ? ['Mammal', 'Amphibian', 'Reptile', 'Bird'] : ['Fish', 'Mammal', 'Reptile', 'Amphibian'], g === 1 ? 'Amphibian' : 'Mammal', g === 1 ? 'Frogs are amphibians' : 'Whales are mammals that live in water.'),
      genMCQ(`What covers the body of a ${g === 1 ? 'bird' : 'fish'}?`, g === 1 ? ['Fur', 'Feathers', 'Scales', 'Skin'] : ['Fur', 'Feathers', 'Scales', 'Smooth skin'], g === 1 ? 'Feathers' : 'Scales', g === 1 ? 'Birds have feathers' : 'Fish have scales.'),
      genTF(`All mammals lay eggs.`, false, 'Most mammals give birth to live young.'),
      genShort(`Name an animal that lives in water.`, 'Fish, whale, dolphin, etc.', 'Many animals live in water.'),
      genMCQ(`What do herbivores eat?`, ['Meat', 'Plants', 'Both', 'Only grass'], 'Plants', 'Herbivores eat only plants.'),
    ];
  }
  if (chapter === 'Weather & Seasons') {
    return [
      genMCQ(`How many seasons are there in a year?`, ['2', '3', '4', '6'], '4', 'The four seasons are spring, summer, fall, and winter.'),
      genMCQ(`What causes day and night?`, ['The Moon', 'The Earth rotating', 'The Sun moving', 'Clouds'], 'The Earth rotating', 'Day and night are caused by Earth spinning on its axis.'),
      genTF(`Summer is the hottest season.`, true, 'Summer has the warmest temperatures.'),
      genShort(`Name one type of extreme weather.`, 'Hurricane, tornado, blizzard, thunderstorm', 'Extreme weather includes hurricanes, tornadoes, blizzards, etc.'),
      genMCQ(`What tool measures temperature?`, ['Ruler', 'Thermometer', 'Clock', 'Scale'], 'Thermometer', 'A thermometer measures temperature.'),
    ];
  }
  if (chapter === 'Earth & Space') {
    return [
      genMCQ(`What shape is the Earth?`, ['Flat', 'Round/Sphere', 'Cube', 'Square'], 'Round/Sphere', 'The Earth is a sphere.'),
      genMCQ(`What is the closest star to Earth?`, ['The Moon', 'The Sun', 'Mars', 'Venus'], 'The Sun', 'The Sun is the closest star to Earth.'),
      genTF(`The Moon gives off its own light.`, false, 'The Moon reflects light from the Sun.'),
      genShort(`Name one planet in our solar system.`, 'Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, or Neptune', 'There are 8 planets in our solar system.'),
      genMCQ(`How long does it take Earth to orbit the Sun?`, ['One day', 'One month', 'One year', 'One hour'], 'One year', 'Earth takes 365 days (one year) to orbit the Sun.'),
    ];
  }
  return [];
}

function getChapterDefs(subject: string, grade: number): ChapterDef[] {
  const chapters: Record<string, { title: string; description: string; concepts: { title: string; summary: string; notes: string; objectives: string[]; keywords: string[]; difficulty: string; mins: number }[] }[]> = {
    math: [
      { title: 'Numbers & Counting', description: 'Understanding numbers and counting patterns.',
        concepts: [
          { title: 'Number Recognition', summary: `Learning to recognize numbers up to ${grade === 1 ? '100' : '1,000'}.`, notes: `Students learn to identify, read, and write numbers. Practice with place value helps build number sense.`, objectives: [`Read numbers up to ${grade === 1 ? '100' : '1,000'}`, 'Write numbers in digits and words', 'Compare numbers using >, <, =', 'Understand place value'], keywords: ['place value', 'digits', 'compare', 'order'], difficulty: 'beginner', mins: 30 },
          { title: 'Counting Patterns', summary: 'Skip counting and number patterns.', notes: 'Skip counting by 2s, 5s, and 10s helps build multiplication readiness. Number patterns develop algebraic thinking.', objectives: ['Count by 2s, 5s, and 10s', 'Identify number patterns', 'Complete sequences', 'Use a number line'], keywords: ['skip counting', 'patterns', 'sequence', 'number line'], difficulty: 'beginner', mins: 30 },
        ]},
      { title: 'Addition & Subtraction', description: 'Fundamental operations with numbers.',
        concepts: [
          { title: 'Basic Addition', summary: `Adding numbers up to ${grade === 1 ? '20' : '100'}.`, notes: 'Students learn addition strategies including counting on, making ten, and using number bonds.', objectives: ['Add within 20', 'Use addition strategies', 'Solve word problems', 'Understand commutative property'], keywords: ['addition', 'sum', 'total', 'addend'], difficulty: 'beginner', mins: 30 },
          { title: 'Basic Subtraction', summary: `Subtracting numbers up to ${grade === 1 ? '20' : '100'}.`, notes: 'Subtraction as taking away and finding the difference. Relate addition and subtraction as inverse operations.', objectives: ['Subtract within 20', 'Use subtraction strategies', 'Relate addition and subtraction', 'Solve word problems'], keywords: ['subtraction', 'difference', 'minus', 'take away'], difficulty: 'beginner', mins: 30 },
        ]},
      { title: 'Multiplication & Division', description: 'Introduction to multiplication and division.', concepts: grade === 1 ? [
        { title: 'Equal Groups', summary: 'Understanding multiplication as equal groups.', notes: 'Students learn to recognize and create equal groups as a foundation for multiplication.', objectives: ['Make equal groups', 'Count by groups', 'Understand repeated addition', 'Share equally'], keywords: ['equal groups', 'repeated addition', 'share', 'rows'], difficulty: 'beginner', mins: 25 },
        { title: 'Sharing Equally', summary: 'Division as sharing equally.', notes: 'Students share objects equally among groups to understand division as fair sharing.', objectives: ['Share objects equally', 'Find how many in each group', 'Understand fair sharing', 'Connect to multiplication'], keywords: ['share', 'equal', 'group', 'fair'], difficulty: 'beginner', mins: 25 },
      ] : [
        { title: 'Multiplication Facts', summary: 'Multiplication tables 1-12.', notes: 'Memorizing multiplication facts builds fluency. Students learn strategies like doubling and skip counting.', objectives: ['Multiply numbers 1-12', 'Use fact strategies', 'Solve word problems', 'Apply commutative property'], keywords: ['times', 'product', 'factor', 'multiply'], difficulty: 'beginner', mins: 30 },
        { title: 'Division Facts', summary: 'Division as inverse of multiplication.', notes: 'Understanding division as sharing and grouping. Relate division to multiplication facts.', objectives: ['Divide numbers 1-144', 'Relate division to multiplication', 'Solve word problems', 'Identify remainders'], keywords: ['divide', 'quotient', 'remainder', 'inverse'], difficulty: 'medium', mins: 30 },
      ]},
      { title: grade === 1 ? 'Shapes & Geometry' : 'Fractions & Decimals', description: grade === 1 ? 'Basic shapes and spatial reasoning.' : 'Understanding fractions and decimal numbers.',
        concepts: grade === 1 ? [
          { title: '2D Shapes', summary: 'Identifying and describing 2D shapes.', notes: 'Students learn to identify circles, squares, triangles, rectangles by their properties.', objectives: ['Identify basic shapes', 'Count sides and corners', 'Sort shapes by attributes', 'Draw shapes'], keywords: ['circle', 'square', 'triangle', 'rectangle'], difficulty: 'beginner', mins: 25 },
          { title: '3D Shapes', summary: 'Identifying 3D shapes in the real world.', notes: 'Students explore spheres, cubes, cones, and cylinders by connecting to everyday objects.', objectives: ['Identify 3D shapes', 'Describe shape attributes', 'Find shapes in the environment', 'Compare 2D and 3D'], keywords: ['sphere', 'cube', 'cone', 'cylinder'], difficulty: 'beginner', mins: 25 },
        ] : [
          { title: 'Understanding Fractions', summary: 'Fractions as parts of a whole.', notes: 'Students learn to represent fractions using area models, number lines, and set models.', objectives: ['Identify fractions', 'Compare fractions', 'Find equivalent fractions', 'Add and subtract fractions'], keywords: ['numerator', 'denominator', 'equivalent', 'fraction'], difficulty: 'medium', mins: 35 },
          { title: 'Decimals', summary: 'Decimal numbers and place value.', notes: 'Tenths and hundredths. Converting between fractions and decimals.', objectives: ['Read and write decimals', 'Compare decimals', 'Add and subtract decimals', 'Convert fractions to decimals'], keywords: ['decimal', 'tenths', 'hundredths', 'place value'], difficulty: 'medium', mins: 35 },
        ]},
      { title: grade === 1 ? 'Measurement' : 'Geometry & Area', description: grade === 1 ? 'Measuring length, weight, and capacity.' : 'Perimeter, area, and geometric properties.',
        concepts: grade === 1 ? [
          { title: 'Measuring Length', summary: 'Using non-standard and standard units.', notes: 'Students measure using cubes, paper clips, and rulers. Compare lengths and heights.', objectives: ['Measure with non-standard units', 'Use a ruler', 'Compare lengths', 'Estimate measurements'], keywords: ['length', 'height', 'measure', 'compare'], difficulty: 'beginner', mins: 25 },
          { title: 'Weight & Capacity', summary: 'Comparing weight and capacity.', notes: 'Students explore heavy/light and full/empty concepts through hands-on activities.', objectives: ['Compare weights', 'Compare capacities', 'Use balance scales', 'Estimate'], keywords: ['weight', 'capacity', 'heavy', 'light'], difficulty: 'beginner', mins: 25 },
        ] : [
          { title: 'Perimeter', summary: 'Measuring the distance around shapes.', notes: 'Students calculate perimeter by adding side lengths. Real-world applications of perimeter.', objectives: ['Calculate perimeter', 'Find missing side lengths', 'Solve word problems', 'Differentiate perimeter from area'], keywords: ['perimeter', 'boundary', 'distance', 'side length'], difficulty: 'medium', mins: 30 },
          { title: 'Area', summary: 'Measuring the space inside shapes.', notes: 'Area as square units. Multiply length by width for rectangles. Compare areas.', objectives: ['Calculate area', 'Use square units', 'Find area of rectangles', 'Solve real-world problems'], keywords: ['area', 'square units', 'length', 'width'], difficulty: 'medium', mins: 30 },
        ]},
    ],
    english: [
      { title: 'Alphabet & Phonics', description: 'Letters, sounds, and phonics patterns.',
        concepts: [
          { title: 'Letter Recognition', summary: `Identifying letters and their sounds.`, notes: `Students practice letter recognition, phonics, and sound blending.`, objectives: ['Recognize letters', 'Identify letter sounds', 'Blend sounds', 'Read simple words'], keywords: ['alphabet', 'phonics', 'sounds', 'blending'], difficulty: 'beginner', mins: 25 },
          { title: 'Word Families', summary: 'Common word families and rhyming patterns.', notes: 'Word families help students recognize patterns in spelling and reading.', objectives: ['Identify word families (-at, -an)', 'Read rhyming words', 'Spell words in families', 'Build reading fluency'], keywords: ['word family', 'rhyme', 'pattern', 'fluency'], difficulty: 'beginner', mins: 25 },
        ]},
      { title: 'Grammar & Punctuation', description: 'Parts of speech and writing mechanics.',
        concepts: [
          { title: 'Parts of Speech', summary: `Nouns, verbs, and ${grade === 3 ? 'adjectives, adverbs' : 'adjectives'}.`, notes: `Students ${grade === 1 ? 'learn basic nouns and verbs' : 'identify nouns, verbs, adjectives, and adverbs in sentences'}.`, objectives: ['Identify nouns', 'Identify verbs', 'Use describing words', 'Build sentences'], keywords: ['noun', 'verb', 'adjective', 'sentence'], difficulty: 'beginner', mins: 30 },
          { title: 'Sentence Structure', summary: 'Writing complete sentences.', notes: `Students learn about capital letters, punctuation, and sentence formation.`, objectives: ['Capitalize correctly', 'Use end punctuation', 'Write complete sentences', 'Identify fragments'], keywords: ['capital', 'period', 'question', 'sentence'], difficulty: 'beginner', mins: 30 },
        ]},
      { title: 'Reading Comprehension', description: 'Understanding and analyzing texts.',
        concepts: [
          { title: 'Story Elements', summary: 'Characters, setting, and plot.', notes: 'Students identify key elements in stories including main characters, setting, problem, and solution.', objectives: ['Identify characters', 'Describe setting', 'Identify problem/solution', 'Retell a story'], keywords: ['character', 'setting', 'plot', 'problem'], difficulty: 'medium', mins: 35 },
          { title: 'Main Idea', summary: 'Finding the main idea and details.', notes: 'Students learn to distinguish the main idea from supporting details in short passages.', objectives: ['Find the main idea', 'Identify details', 'Summarize', 'Answer questions'], keywords: ['main idea', 'details', 'summary', 'comprehension'], difficulty: 'medium', mins: 35 },
        ]},
      { title: 'Writing', description: 'Writing sentences and short compositions.',
        concepts: [
          { title: 'Sentence Writing', summary: 'Writing clear and complete sentences.', notes: 'Students practice writing sentences with correct grammar, spelling, and punctuation.', objectives: ['Write complete sentences', 'Use descriptive words', 'Check for errors', 'Write with purpose'], keywords: ['sentence', 'describe', 'revise', 'publish'], difficulty: 'medium', mins: 30 },
          { title: 'Creative Writing', summary: 'Writing stories and expressing ideas.', notes: 'Students use their imagination to write short stories, descriptions, and personal narratives.', objectives: ['Brainstorm ideas', 'Write a short story', 'Add details', 'Organize thoughts'], keywords: ['story', 'imagination', 'details', 'organize'], difficulty: 'medium', mins: 30 },
        ]},
      { title: 'Vocabulary', description: 'Building word knowledge and usage.',
        concepts: [
          { title: 'Word Meanings', summary: 'Learning new words and their meanings.', notes: `Students learn synonyms, antonyms, and context clues to ${grade === 1 ? 'build vocabulary' : 'expand vocabulary'}.`, objectives: ['Learn new words', 'Use context clues', 'Identify word relationships', 'Apply new vocabulary'], keywords: ['vocabulary', 'synonyms', 'antonyms', 'context'], difficulty: 'medium', mins: 25 },
          { title: 'Word Usage', summary: 'Using words correctly in context.', notes: `Students practice using new words in sentences and paragraphs.`, objectives: ['Use words correctly', 'Build descriptive language', 'Understand multiple meanings', 'Apply in writing'], keywords: ['usage', 'sentence', 'describe', 'meaning'], difficulty: 'medium', mins: 25 },
        ]},
    ],
    science: [
      { title: 'Living Things', description: 'Characteristics of living organisms.',
        concepts: [
          { title: 'What is Alive?', summary: 'Characteristics of living things.', notes: 'Living things breathe, eat, grow, reproduce, and respond to their environment.', objectives: ['Identify living things', 'List life processes', 'Compare living and non-living', 'Observe nature'], keywords: ['alive', 'grow', 'breathe', 'reproduce'], difficulty: 'beginner', mins: 25 },
          { title: 'Habitats', summary: 'Where animals and plants live.', notes: 'Different habitats provide food, water, and shelter for different organisms.', objectives: ['Identify habitats', 'Match animals to habitats', 'Describe habitat features', 'Understand adaptation'], keywords: ['habitat', 'forest', 'ocean', 'desert'], difficulty: 'beginner', mins: 25 },
        ]},
      { title: 'Plants', description: 'Plant parts, needs, and life cycles.',
        concepts: [
          { title: 'Plant Parts', summary: 'Roots, stems, leaves, and flowers.', notes: 'Each part of a plant has a special job. Roots take in water, leaves make food, flowers make seeds.', objectives: ['Identify plant parts', 'Describe each part\'s function', 'Label a plant diagram', 'Grow a plant'], keywords: ['root', 'stem', 'leaf', 'flower'], difficulty: 'beginner', mins: 25 },
          { title: 'Plant Growth', summary: 'What plants need to grow.', notes: 'Plants need sunlight, water, air, and nutrients from soil to grow healthy.', objectives: ['List plant needs', 'Observe plant growth', 'Explain photosynthesis basics', 'Conduct a plant experiment'], keywords: ['sunlight', 'water', 'grow', 'soil'], difficulty: 'beginner', mins: 25 },
        ]},
      { title: 'Animals', description: 'Animal groups, traits, and behaviors.',
        concepts: [
          { title: 'Animal Groups', summary: 'Mammals, birds, fish, reptiles, amphibians.', notes: `Animals are grouped by shared characteristics. ${grade === 3 ? 'Each group has unique features.' : 'Learn the main groups.'}`, objectives: ['Identify animal groups', 'Describe group traits', 'Give examples', 'Compare animals'], keywords: ['mammal', 'bird', 'reptile', 'amphibian'], difficulty: 'beginner', mins: 30 },
          { title: 'Animal Adaptations', summary: 'How animals survive in their environments.', notes: 'Animals have body parts and behaviors that help them find food, avoid predators, and survive.', objectives: ['Identify adaptations', 'Explain how adaptations help', 'Give examples', 'Connect habitat to adaptation'], keywords: ['adaptation', 'camouflage', 'survive', 'environment'], difficulty: 'medium', mins: 30 },
        ]},
      { title: 'Weather & Seasons', description: 'Weather patterns and seasonal changes.',
        concepts: [
          { title: 'Weather', summary: 'Types of weather and how to measure it.', notes: 'Weather includes temperature, precipitation, wind, and clouds. Meteorologists study weather patterns.', objectives: ['Describe weather types', 'Use weather tools', 'Read a thermometer', 'Record weather data'], keywords: ['weather', 'temperature', 'rain', 'wind'], difficulty: 'beginner', mins: 25 },
          { title: 'Seasons', summary: 'The four seasons and their characteristics.', notes: `Earth's tilt causes seasons. Each season has unique weather, daylight, and plant/animal changes.`, objectives: ['Name the four seasons', 'Describe seasonal changes', 'Connect seasons to weather', 'Observe seasonal patterns'], keywords: ['spring', 'summer', 'fall', 'winter'], difficulty: 'beginner', mins: 25 },
        ]},
      { title: 'Earth & Space', description: 'Basic astronomy and Earth science.',
        concepts: [
          { title: 'The Solar System', summary: 'Sun, planets, and the Moon.', notes: `Our solar system has ${grade === 3 ? '8' : 'many'} planets orbiting the Sun. The Moon orbits Earth.`, objectives: ['Name the Sun', 'Identify planets', 'Describe Earth', 'Understand orbits'], keywords: ['Sun', 'planet', 'Moon', 'orbit'], difficulty: 'medium', mins: 30 },
          { title: 'Earth\'s Surface', summary: 'Landforms, water, and rocks.', notes: 'Earth has mountains, valleys, oceans, and rivers. Rocks and soil make up the land.', objectives: ['Identify landforms', 'Find water sources', 'Describe soil', 'Understand Earth changes'], keywords: ['mountain', 'ocean', 'river', 'soil'], difficulty: 'medium', mins: 30 },
        ]},
    ],
  };
  const key = subject as keyof typeof chapters;
  return (chapters[key] || []).map((ch) => ({
    title: ch.title,
    description: ch.description,
    concepts: ch.concepts.map((c) => {
      const qf = subject === 'math' ? mathQuestions : subject === 'english' ? englishQuestions : scienceQuestions;
      return {
        title: c.title,
        summary: c.summary,
        notes: c.notes,
        learningObjectives: c.objectives,
        keywords: c.keywords,
        difficulty: c.difficulty,
        estimatedMinutes: c.mins,
        videos: videoIdsFor(subject, ch.title).map((v, vi) => ({
          ...v,
          title: vi === 0 ? `Introduction to ${c.title}` : `${c.title} - Practice`,
          duration: `${c.mins}:00`,
          description: vi === 0 ? `Learn about ${c.title}` : `Practice ${c.title} problems`,
        })),
        questions: qf(grade, ch.title).length > 0 ? qf(grade, ch.title) : [
          genMCQ(`Which best describes ${c.title}?`, ['Definition A', 'Definition B', 'Definition C', 'Definition D'], 'Definition B', `${c.title} is best described by Definition B.`),
          genTF(`This is a true statement about ${c.title}.`, true, `This concept is fundamental to ${ch.title}.`),
          genShort(`Explain ${c.title} in your own words.`, `${c.title} involves understanding key concepts in this topic.`, 'This demonstrates comprehension of the topic.'),
          genMCQ(`What is the main idea of ${c.title}?`, ['Option 1', 'Option 2', 'Option 3', 'Option 4'], 'Option 1', 'Option 1 best captures the main idea.'),
          genTF(`All concepts in ${ch.title} are equally important.`, false, 'Some concepts are foundational while others build upon them.'),
        ],
      };
    }),
  }));
}

// ── MAIN ──
async function main() {
  console.log('\n=== GENESIS LMS — FULL DATABASE SEED ===\n');

  // Step 1: Clean existing data
  console.log('Cleaning existing data...');
  const cleanCollections = [
    'classes', 'subjects', 'teacherClassSubject', 'teacherVideos', 'grade',
    'quizV2', 'quizAttemptV2', 'assignmentV2', 'assignmentSubmissionV2',
    'examV2', 'examAttemptV2', 'enrollment', 'grades', 'courses', 'lessons',
    'questionBank', 'questionPapers', 'testTemplates', 'testSchedule', 'whiteboards', 'timetable',
    'activityLogs', 'auditLogs',
  ];
  for (const name of cleanCollections) {
    await deleteCollection(name);
  }
  // Clean textbooks and subcollections
  const tbSnap = await db.collection('textbooks').get();
  for (const doc of tbSnap.docs) {
    await deleteSubcollections(doc.ref);
  }
  await deleteCollection('textbooks');

  // Clean users except keep current admin if exists
  const userSnap = await db.collection('users').get();
  for (const doc of userSnap.docs) {
    await doc.ref.delete();
    try { await auth.deleteUser(doc.id); } catch {}
  }
  console.log('  All existing users removed.\n');

  // Step 2: Create Classes
  console.log('Creating classes...');
  const classes = [
    { name: 'Class 1', code: 'GR1-2025', grade: '1', section: 'A', academicYear: '2025-2026' },
    { name: 'Class 3', code: 'GR3-2025', grade: '3', section: 'A', academicYear: '2025-2026' },
  ];
  const classRefs: { [key: string]: string } = {};
  for (const cls of classes) {
    const id = uid();
    await db.collection('classes').doc(id).set({
      id, name: cls.name, code: cls.code, grade: cls.grade, section: cls.section,
      academicYear: cls.academicYear, studentCount: 0, subjectIds: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    classRefs[cls.grade] = id;
    console.log(`  Created ${cls.name} (${id})`);
  }

  // Step 3: Create Subjects (3 per class)
  console.log('\nCreating subjects...');
  const subjectData: { name: string; code: string; category: string; icon: string; color: string }[] = [
    { name: 'Mathematics', code: 'MATH', category: 'STEM', icon: 'calculate', color: '#6366f1' },
    { name: 'English', code: 'ENG', category: 'Languages', icon: 'book', color: '#22c55e' },
    { name: 'Science', code: 'SCI', category: 'STEM', icon: 'science', color: '#f59e0b' },
  ];
  const subjectRefs: { [key: string]: { id: string; name: string } } = {};
  for (const g of ['1', '3']) {
    for (const sub of subjectData) {
      const id = uid();
      await db.collection('subjects').doc(id).set({
        id, name: sub.name, code: `${sub.code}-GR${g}`, classId: classRefs[g],
        category: sub.category, icon: sub.icon, color: sub.color, isActive: true,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
      const key = `${g}_${sub.name.toLowerCase()}`;
      subjectRefs[key] = { id, name: sub.name };
      // Update class subjectIds
      await db.collection('classes').doc(classRefs[g]).update({
        subjectIds: admin.firestore.FieldValue.arrayUnion(id),
      });
      console.log(`  Created ${sub.name} for Grade ${g} (${id})`);
    }
  }

  // Step 4: Create Users
  console.log('\nCreating users...');
  const adminId = await createUser('admin@genesis.edu', 'admin123', 'Admin User', 'admin');
  console.log(`  Admin: admin@genesis.edu / admin123`);

  const teachers = [
    { email: 'teacher1@genesis.edu', displayName: 'Sarah Johnson', classId: classRefs['1'] },
    { email: 'teacher2@genesis.edu', displayName: 'Michael Chen', classId: classRefs['3'] },
  ];
  const teacherIds: string[] = [];
  for (const t of teachers) {
    const id = await createUser(t.email, 'teacher123', t.displayName, 'teacher', { classIds: [t.classId] });
    teacherIds.push(id);
    console.log(`  Teacher: ${t.email} / teacher123`);
  }

  const studentData = [
    { email: 'student1@genesis.edu', displayName: 'Alice Wonder', classId: classRefs['1'], studentId: 'STU001' },
    { email: 'student2@genesis.edu', displayName: 'Bob Builder', classId: classRefs['1'], studentId: 'STU002' },
    { email: 'student3@genesis.edu', displayName: 'Charlie Brown', classId: classRefs['1'], studentId: 'STU003' },
    { email: 'student4@genesis.edu', displayName: 'Diana Prince', classId: classRefs['3'], studentId: 'STU004' },
    { email: 'student5@genesis.edu', displayName: 'Evan Wright', classId: classRefs['3'], studentId: 'STU005' },
  ];
  const studentIds: string[] = [];
  for (const s of studentData) {
    const id = await createUser(s.email, 'student123', s.displayName, 'student', { classId: s.classId, studentId: s.studentId, classIds: [s.classId] });
    studentIds.push(id);
    console.log(`  Student: ${s.email} / student123`);
  }

  // Step 5: Assign teachers to subjects
  console.log('\nAssigning teachers to subjects...');
  const assignments: { teacherId: string; classId: string; subjectId: string }[] = [];
  // Teacher 1 teaches all 3 subjects for Grade 1
  for (const sub of subjectData) {
    const key = `1_${sub.name.toLowerCase()}`;
    assignments.push({
      teacherId: teacherIds[0],
      classId: classRefs['1'],
      subjectId: subjectRefs[key].id,
    });
  }
  // Teacher 2 teaches all 3 subjects for Grade 3
  for (const sub of subjectData) {
    const key = `3_${sub.name.toLowerCase()}`;
    assignments.push({
      teacherId: teacherIds[1],
      classId: classRefs['3'],
      subjectId: subjectRefs[key].id,
    });
  }
  for (const a of assignments) {
    const docId = uid();
    await db.collection('teacherClassSubject').doc(docId).set({
      teacherId: a.teacherId, classId: a.classId, subjectId: a.subjectId,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
  }
  console.log(`  Created ${assignments.length} teacher-subject-class assignments`);

  // Step 6: Enroll students in courses via enrollment collection
  console.log('\nEnrolling students...');
  for (let i = 0; i < studentData.length; i++) {
    const s = studentData[i];
    const sid = studentIds[i];
    // Enroll in each subject for their class
    for (const sub of subjectData) {
      const key = `${s.classId === classRefs['1'] ? '1' : '3'}_${sub.name.toLowerCase()}`;
      const courseId = subjectRefs[key].id;
      const enrollId = `${courseId}_${sid}`;
      await db.collection('enrollment').doc(enrollId).set({
        courseId, studentId: sid, status: 'active', progress: 0,
        enrolledAt: new Date().toISOString(),
      });
    }
  }
  // Update student counts on classes
  for (const [grade, ref] of Object.entries(classRefs)) {
    const count = studentData.filter((s) => s.classId === ref).length;
    await db.collection('classes').doc(ref).update({ studentCount: count });
  }
  console.log(`  Enrolled students in their class subjects`);

  // Step 7: Create Textbooks with Chapters & Concepts
  console.log('\nCreating textbooks, chapters, concepts, and questions...');
  const subjectMap: { subject: string; grade: string; subId: string; classId: string; teacherId: string }[] = [];
  const subjectKeyMap: Record<string, string> = { 'mathematics': 'math', 'english': 'english', 'science': 'science' };
  for (const sub of subjectData) {
    for (const g of ['1', '3']) {
      const key = `${g}_${sub.name.toLowerCase()}`;
      subjectMap.push({
        subject: subjectKeyMap[sub.name.toLowerCase()] || sub.name.toLowerCase(),
        grade: g,
        subId: subjectRefs[key].id,
        classId: classRefs[g],
        teacherId: g === '1' ? teacherIds[0] : teacherIds[1],
      });
    }
  }

  let totalQuestions = 0;
  for (const sm of subjectMap) {
    const tbId: string = uid();
    const chapters = getChapterDefs(sm.subject, parseInt(sm.grade));

    // Create textbook doc
    await db.collection('textbooks').doc(tbId).set({
      id: tbId, title: `${sm.subject.charAt(0).toUpperCase() + sm.subject.slice(1)} - Grade ${sm.grade}`,
      subjectId: sm.subId, classId: sm.classId, teacherId: sm.teacherId,
      description: `Complete Grade ${sm.grade} ${sm.subject} curriculum`,
      status: 'ready', chapterCount: chapters.length,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });

    // Link textbook to teacher-class-subject
    const tcsQuery = await db.collection('teacherClassSubject')
      .where('teacherId', '==', sm.teacherId)
      .where('classId', '==', sm.classId)
      .where('subjectId', '==', sm.subId)
      .get();
    if (!tcsQuery.empty) {
      await tcsQuery.docs[0].ref.update({ textbookId: tbId });
    }

    // Create chapters
    for (let ci = 0; ci < chapters.length; ci++) {
      const ch = chapters[ci];
      const chId = uid();

      // Create concept docs first so we can count them
      const conceptIds: string[] = [];
      for (let coi = 0; coi < ch.concepts.length; coi++) {
        const c = ch.concepts[coi];
        const conceptId = uid();
        conceptIds.push(conceptId);

        const questionBank = c.questions.map((q, qi) => ({
          id: `${conceptId}_q${qi}`,
          ...q,
        }));
        totalQuestions += questionBank.length;

        const videos = c.videos.map((v, vi) => ({
          id: `${conceptId}_v${vi}`,
          ...v,
          thumbnail: '',
          embedUrl: `https://www.youtube.com/embed/${v.youtubeId}`,
        }));

        await db.collection('textbooks').doc(tbId)
          .collection('chapters').doc(chId)
          .collection('concepts').doc(conceptId).set({
            id: conceptId, chapterId: chId, textbookId: tbId,
            title: c.title, summary: c.summary, notes: c.notes,
            learningObjectives: c.learningObjectives,
            keywords: c.keywords, difficulty: c.difficulty,
            prerequisites: [], estimatedMinutes: c.estimatedMinutes,
            order: coi, videos, questionBank: [], assignments: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

        const questionsColl = db.collection('textbooks').doc(tbId)
          .collection('chapters').doc(chId)
          .collection('concepts').doc(conceptId)
          .collection('questions');
        for (const q of questionBank) {
          await questionsColl.doc(q.id).set(q);
        }
      }

      // Create chapter doc
      await db.collection('textbooks').doc(tbId)
        .collection('chapters').doc(chId).set({
          id: chId, textbookId: tbId,
          title: ch.title, description: ch.description,
          order: ci, chapterCount: ch.concepts.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
    }
    console.log(`  ${sm.subject.charAt(0).toUpperCase() + sm.subject.slice(1)} Gr.${sm.grade}: ${chapters.length} chapters`);
  }

  console.log(`\n=== SEED COMPLETE ===`);
  console.log(`Total questions generated: ~${totalQuestions}`);
  console.log(`\nLogin Credentials:`);
  console.log(`  Admin:    admin@genesis.edu / admin123`);
  console.log(`  Teacher 1 (Grade 1): teacher1@genesis.edu / teacher123`);
  console.log(`  Teacher 2 (Grade 3): teacher2@genesis.edu / teacher123`);
  console.log(`  Students: student1@genesis.edu through student5@genesis.edu / student123`);
  console.log(`\nData Created:`);
  console.log(`  ${classes.length} classes (Grade 1 & 3)`);
  console.log(`  ${subjectData.length * 2} subjects (3 per class)`);
  console.log(`  ${assignments.length} teacher-class-subject assignments`);
  console.log(`  1 admin, 2 teachers, 5 students`);
  console.log(`  6 textbooks (one per subject per class)`);
  console.log(`  5 chapters per textbook = 30 chapters`);
  console.log(`  2 concepts per chapter = 60 concepts`);
  console.log(`  ~${totalQuestions} questions across all question banks`);
  console.log('');

  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

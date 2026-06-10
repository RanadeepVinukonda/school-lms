import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { initializeFirebase } from '../config/firebase';
import { getAdminFirestore } from '../firebase/admin';

interface Question {
  id: string;
  type: 'mcq' | 'true_false' | 'fill_blank' | 'short_answer' | 'long_answer' | 'numerical' | 'scenario';
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'recall' | 'application' | 'critical_thinking';
  text: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
  points: number;
}

interface Assignment {
  id: string;
  title: string;
  instructions: string;
  marks: number;
  estimatedMinutes: number;
  answerKey: string;
  rubric: string;
  type: 'homework' | 'worksheet' | 'challenge' | 'project';
}

interface Video {
  id: string;
  youtubeId: string;
  title: string;
  thumbnail: string;
  duration: string;
  channelName: string;
  description: string;
  embedUrl: string;
  relevance: number;
}

interface ConceptData {
  title: string;
  summary: string;
  notes: string;
  learningObjectives: string[];
  keywords: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prerequisites: string[];
  estimatedMinutes: number;
  questions: Question[];
  assignments: Assignment[];
  videos: Video[];
}

interface ChapterData {
  title: string;
  description: string;
  concepts: ConceptData[];
}

const CHAPTERS: ChapterData[] = [
  {
    title: 'Systems of Linear Equations',
    description: 'Solving systems of linear equations using row operations, Gaussian elimination, and understanding solution sets.',
    concepts: [
      {
        title: 'Gaussian Elimination',
        summary: 'Gaussian elimination is a systematic method for solving systems of linear equations by transforming the augmented matrix into row echelon form using elementary row operations.',
        notes: 'Gaussian elimination involves three elementary row operations: (1) swapping two rows, (2) multiplying a row by a non-zero scalar, and (3) adding a multiple of one row to another. The goal is to produce an upper triangular matrix from which the solution can be found by back-substitution. The process begins by forming the augmented matrix [A|b] and then eliminating variables column by column. Pivoting (selecting the largest absolute value in a column as the pivot) improves numerical stability.',
        learningObjectives: [
          'Perform elementary row operations on a matrix',
          'Transform a matrix into row echelon form',
          'Solve linear systems using back-substitution',
          'Identify pivot positions and pivot columns',
        ],
        keywords: ['gaussian_elimination', 'row_operations', 'augmented_matrix', 'pivot', 'back_substitution'],
        difficulty: 'beginner',
        prerequisites: [],
        estimatedMinutes: 45,
        questions: [
          {
            id: 'q_gaussian_0', type: 'mcq', difficulty: 'easy', category: 'recall',
            text: 'Which of the following is NOT an elementary row operation?',
            options: ['Swap two rows', 'Multiply a row by a non-zero constant', 'Add a multiple of one row to another', 'Transpose the matrix'],
            correctAnswer: 'Transpose the matrix',
            explanation: 'Transposing is a matrix operation, not an elementary row operation. The three elementary row operations are swapping rows, multiplying a row by a non-zero scalar, and adding a multiple of one row to another.',
            points: 1,
          },
          {
            id: 'q_gaussian_1', type: 'mcq', difficulty: 'easy', category: 'recall',
            text: 'What is the first step in Gaussian elimination?',
            options: ['Form the augmented matrix', 'Find the determinant', 'Calculate the inverse', 'Transpose the system'],
            correctAnswer: 'Form the augmented matrix',
            explanation: 'Gaussian elimination begins by writing the system as an augmented matrix [A|b], where A is the coefficient matrix and b is the constant vector.',
            points: 1,
          },
          {
            id: 'q_gaussian_2', type: 'true_false', difficulty: 'easy', category: 'recall',
            text: 'A pivot position is the location of a leading entry in a row echelon form matrix.',
            options: ['True', 'False'],
            correctAnswer: 'True',
            explanation: 'A pivot position is indeed the location of the leading (first non-zero) entry in each row of a matrix in row echelon form.',
            points: 1,
          },
          {
            id: 'q_gaussian_3', type: 'short_answer', difficulty: 'medium', category: 'application',
            text: 'Solve the system using Gaussian elimination: x + y = 5, 2x - y = 1. Enter the value of x.',
            correctAnswer: '2',
            explanation: 'Subtracting 2 times the first equation from the second gives -3y = -9, so y = 3. Substituting back: x + 3 = 5, so x = 2.',
            points: 2,
          },
          {
            id: 'q_gaussian_4', type: 'numerical', difficulty: 'medium', category: 'application',
            text: 'How many elementary row operations are needed to reduce a 3x3 matrix to row echelon form in the worst case?',
            correctAnswer: '6',
            explanation: 'In the worst case, you need: 3 row swaps (one per row), 3 row scaling/elimination operations — approximately 6 operations to reach row echelon form for a 3x3 matrix.',
            points: 2,
          },
          {
            id: 'q_gaussian_5', type: 'mcq', difficulty: 'hard', category: 'critical_thinking',
            text: 'If a system has more equations than unknowns, what can Gaussian elimination tell us?',
            options: ['The system always has a unique solution', 'The system is always inconsistent', 'The system may be consistent or inconsistent', 'The system always has infinite solutions'],
            correctAnswer: 'The system may be consistent or inconsistent',
            explanation: 'An overdetermined system (more equations than unknowns) can be consistent (if the extra equations are linear combinations) or inconsistent. Gaussian elimination reveals this through the row echelon form.',
            points: 3,
          },
          {
            id: 'q_gaussian_6', type: 'fill_blank', difficulty: 'medium', category: 'application',
            text: 'In Gaussian elimination, the variable corresponding to a ____ column is called a free variable.',
            options: ['pivot', 'basic', 'free', 'non-pivot'],
            correctAnswer: 'non-pivot',
            explanation: 'Variables corresponding to non-pivot columns are free variables. They can take any value, leading to infinitely many solutions.',
            points: 2,
          },
          {
            id: 'q_gaussian_7', type: 'scenario', difficulty: 'hard', category: 'critical_thinking',
            text: 'A student performs Gaussian elimination and gets a row of all zeros in the coefficient matrix but a non-zero entry in the augmented column. What does this mean?',
            options: ['The system has a unique solution', 'The system has infinitely many solutions', 'The system has no solution', 'The student made an arithmetic error'],
            correctAnswer: 'The system has no solution',
            explanation: 'A row of the form [0 0 ... 0 | b] with b ≠ 0 represents the equation 0 = b, which is impossible. This means the system is inconsistent and has no solution.',
            points: 3,
          },
        ],
        assignments: [
          {
            id: 'a_gaussian_0', title: 'Gaussian Elimination Worksheet',
            instructions: 'Solve 10 systems of linear equations using Gaussian elimination. Show all row operations clearly and verify your answers by substitution.',
            marks: 30, estimatedMinutes: 60,
            answerKey: 'Each system solved correctly: 3 marks (1 for augmented matrix, 1 for row operations, 1 for correct solution).',
            rubric: 'Augmented matrix correctly formed: 1 mark per system. Row operations correctly applied: 1 mark. Final solution correct: 1 mark.',
            type: 'worksheet',
          },
        ],
        videos: [
          { id: 'v_gaussian_0', youtubeId: 'dummy0', title: 'Gaussian Elimination - Step by Step', thumbnail: '', duration: '15:30', channelName: '3Blue1Brown', description: 'Visual explanation of Gaussian elimination with geometric intuition.', embedUrl: 'https://www.youtube.com/embed/dummy0', relevance: 0.95 },
          { id: 'v_gaussian_1', youtubeId: 'dummy1', title: 'Elementary Row Operations Explained', thumbnail: '', duration: '12:45', channelName: 'Khan Academy', description: 'Detailed walkthrough of the three elementary row operations.', embedUrl: 'https://www.youtube.com/embed/dummy1', relevance: 0.9 },
        ],
      },
      {
        title: 'Row Echelon Form',
        summary: 'Row echelon form (REF) and reduced row echelon form (RREF) are standardized matrix forms that reveal the structure of a linear system.',
        notes: 'A matrix is in row echelon form when: (1) all non-zero rows are above zero rows, (2) the leading entry of each row is to the right of the leading entry above it, and (3) all entries below a leading entry are zero. Reduced row echelon form further requires each leading entry to be 1 and the only non-zero entry in its column. The Gauss-Jordan method extends Gaussian elimination to produce RREF directly. RREF is unique for any given matrix, making it the canonical form for solving linear systems.',
        learningObjectives: [
          'Identify matrices in REF and RREF',
          'Convert any matrix to REF using row operations',
          'Convert REF to RREF using Gauss-Jordan elimination',
          'Determine the rank of a matrix from its REF',
        ],
        keywords: ['row_echelon_form', 'reduced_row_echelon_form', 'rank', 'gauss_jordan', 'leading_entry'],
        difficulty: 'beginner',
        prerequisites: ['Gaussian Elimination'],
        estimatedMinutes: 40,
        questions: [
          {
            id: 'q_ref_0', type: 'mcq', difficulty: 'easy', category: 'recall',
            text: 'What is the leading entry in a row echelon form matrix?',
            options: ['The last non-zero entry in a row', 'The first non-zero entry from the left', 'The largest entry in the row', 'The entry in the first column'],
            correctAnswer: 'The first non-zero entry from the left',
            explanation: 'The leading entry (or pivot) is the first non-zero entry in a row when reading from left to right.',
            points: 1,
          },
          {
            id: 'q_ref_1', type: 'true_false', difficulty: 'easy', category: 'recall',
            text: 'The reduced row echelon form of a matrix is unique.',
            options: ['True', 'False'],
            correctAnswer: 'True',
            explanation: 'Every matrix has exactly one RREF. This uniqueness is a fundamental theorem in linear algebra.',
            points: 1,
          },
          {
            id: 'q_ref_2', type: 'mcq', difficulty: 'medium', category: 'application',
            text: 'What is the rank of a matrix with 3 rows where only 2 rows have pivot positions?',
            options: ['1', '2', '3', 'Cannot be determined'],
            correctAnswer: '2',
            explanation: 'The rank of a matrix is the number of pivot positions (non-zero rows in REF).',
            points: 2,
          },
          {
            id: 'q_ref_3', type: 'short_answer', difficulty: 'medium', category: 'application',
            text: 'How many leading entries does a 4x5 matrix have if its rank is 3?',
            correctAnswer: '3',
            explanation: 'The rank equals the number of leading entries (pivot positions) in the row echelon form.',
            points: 2,
          },
          {
            id: 'q_ref_4', type: 'numerical', difficulty: 'hard', category: 'critical_thinking',
            text: 'A 3x3 matrix in RREF has all entries in the third column as the only non-zero entries in their rows. How many solutions does the corresponding system have?',
            correctAnswer: '1',
            explanation: 'If all three columns are pivot columns (leading 1s), then there are no free variables. The system has a unique solution.',
            points: 3,
          },
          {
            id: 'q_ref_5', type: 'fill_blank', difficulty: 'easy', category: 'recall',
            text: 'The process of reducing a matrix to RREF is called ____ elimination.',
            options: ['Gaussian', 'Gauss-Jordan', 'Jordan', 'Euler'],
            correctAnswer: 'Gauss-Jordan',
            explanation: 'Gauss-Jordan elimination reduces a matrix to reduced row echelon form by continuing past REF to make each pivot the only non-zero entry in its column.',
            points: 1,
          },
          {
            id: 'q_ref_6', type: 'mcq', difficulty: 'hard', category: 'critical_thinking',
            text: 'If the RREF of a coefficient matrix is the identity, what can we conclude?',
            options: ['The system has no solution', 'The system has infinitely many solutions', 'The system has a unique solution', 'The matrix is singular'],
            correctAnswer: 'The system has a unique solution',
            explanation: 'RREF = I means every variable is a basic variable (no free variables), so the system has exactly one solution.',
            points: 3,
          },
        ],
        assignments: [
          {
            id: 'a_ref_0', title: 'REF and RREF Practice',
            instructions: 'Convert 8 given matrices to REF and then to RREF. Identify the rank of each matrix. For each system, determine if solutions are unique, infinite, or non-existent.',
            marks: 40, estimatedMinutes: 75,
            answerKey: 'REF conversion: 2 marks each. RREF: 1 mark each. Rank identification: 1 mark each. Solution analysis: 1 mark each.',
            rubric: 'Correct REF: 2 marks. Correct RREF: 1 mark. Correct rank: 1 mark. Correct solution classification: 1 mark.',
            type: 'worksheet',
          },
        ],
        videos: [
          { id: 'v_ref_0', youtubeId: 'dummy2', title: 'REF and RREF Explained', thumbnail: '', duration: '18:20', channelName: 'Professor Leonard', description: 'Comprehensive guide to row echelon and reduced row echelon forms.', embedUrl: 'https://www.youtube.com/embed/dummy2', relevance: 0.95 },
        ],
      },
      {
        title: 'Solutions of Linear Systems',
        summary: 'Linear systems can have zero, one, or infinitely many solutions. Understanding the conditions for each case is essential.',
        notes: 'A linear system is consistent if it has at least one solution. For a consistent system: if every column of the coefficient matrix is a pivot column, the solution is unique. If there are non-pivot columns (free variables), the system has infinitely many solutions. An inconsistent system (no solution) occurs when a row reduces to [0 0 ... 0 | b] with b ≠ 0. For homogeneous systems Ax = 0, the trivial solution x = 0 always exists. Non-trivial solutions exist when there are free variables.',
        learningObjectives: [
          'Determine consistency of a linear system from RREF',
          'Distinguish between unique and infinite solutions',
          'Parameterize solution sets using free variables',
          'Solve homogeneous and non-homogeneous systems',
        ],
        keywords: ['consistent', 'inconsistent', 'free_variable', 'trivial_solution', 'homogeneous', 'parameterize'],
        difficulty: 'beginner',
        prerequisites: ['Row Echelon Form'],
        estimatedMinutes: 50,
        questions: [
          {
            id: 'q_solutions_0', type: 'mcq', difficulty: 'easy', category: 'recall',
            text: 'A system with at least one solution is called:',
            options: ['Determined', 'Consistent', 'Inconsistent', 'Degenerate'],
            correctAnswer: 'Consistent',
            explanation: 'A consistent system has one or more solutions. An inconsistent system has no solution.',
            points: 1,
          },
          {
            id: 'q_solutions_1', type: 'true_false', difficulty: 'easy', category: 'recall',
            text: 'A homogeneous system always has the trivial solution.',
            options: ['True', 'False'],
            correctAnswer: 'True',
            explanation: 'Setting all variables to zero always satisfies Ax = 0, so the trivial solution always exists for homogeneous systems.',
            points: 1,
          },
          {
            id: 'q_solutions_2', type: 'mcq', difficulty: 'medium', category: 'application',
            text: 'A 3x4 coefficient matrix has rank 2. How many free variables are there?',
            options: ['1', '2', '3', '4'],
            correctAnswer: '2',
            explanation: 'Free variables = number of columns - rank = 4 - 2 = 2.',
            points: 2,
          },
          {
            id: 'q_solutions_3', type: 'short_answer', difficulty: 'medium', category: 'application',
            text: 'A system of 3 equations in 5 unknowns has a unique solution. Is this possible? Answer yes or no.',
            correctAnswer: 'No',
            explanation: 'A unique solution requires rank = number of variables = 5. But with only 3 equations, maximum rank is 3, so at least 2 free variables exist.',
            points: 2,
          },
          {
            id: 'q_solutions_4', type: 'numerical', difficulty: 'hard', category: 'critical_thinking',
            text: 'A 4x4 coefficient matrix has determinant 0. How many solutions does Ax = 0 have?',
            correctAnswer: 'infinite',
            explanation: 'det = 0 means the matrix is singular, so rank < 4, implying at least one free variable. Thus Ax = 0 has infinitely many non-trivial solutions in addition to the trivial one.',
            points: 3,
          },
          {
            id: 'q_solutions_5', type: 'scenario', difficulty: 'hard', category: 'critical_thinking',
            text: 'System A: x + y = 3, 2x + 2y = 6. System B: x + y = 3, 2x + 2y = 7. Compare the solution sets.',
            options: ['Both have unique solutions', 'A has infinite, B has none', 'A has none, B has infinite', 'Both have infinite solutions'],
            correctAnswer: 'A has infinite, B has none',
            explanation: 'System A has dependent equations (second is 2× first), so infinite solutions. System B has contradictory equations (3 ≠ 3.5), so no solution.',
            points: 3,
          },
          {
            id: 'q_solutions_6', type: 'fill_blank', difficulty: 'medium', category: 'application',
            text: 'If a system has 3 equations and 4 unknowns and is consistent, the solution set has at least ____ free variable(s).',
            options: ['0', '1', '2', '3'],
            correctAnswer: '1',
            explanation: 'Maximum rank is 3 (one per equation). 4 unknowns - max rank 3 = at least 1 free variable.',
            points: 2,
          },
        ],
        assignments: [
          {
            id: 'a_solutions_0', title: 'Solution Set Analysis',
            instructions: 'For 12 given systems: (1) Write the augmented matrix, (2) Reduce to RREF, (3) Classify as unique/infinite/no solution, (4) If infinite, parameterize the solution set.',
            marks: 50, estimatedMinutes: 90,
            answerKey: 'Augmented matrix: 1 mark. RREF: 2 marks. Classification: 1 mark. Parameterization: 1-2 marks for infinite cases.',
            rubric: 'Correct RREF: 2 marks. Correct classification: 1 mark. Correct parameterization: 2 marks for each infinite case.',
            type: 'homework',
          },
        ],
        videos: [
          { id: 'v_solutions_0', youtubeId: 'dummy3', title: 'Understanding Solution Sets', thumbnail: '', duration: '20:00', channelName: 'MIT OpenCourseWare', description: 'Dr. Strang explains the complete picture of linear system solutions.', embedUrl: 'https://www.youtube.com/embed/dummy3', relevance: 0.95 },
        ],
      },
      {
        title: 'Homogeneous Systems',
        summary: 'Homogeneous systems Ax = 0 always have the trivial solution. Non-trivial solutions exist when there are free variables.',
        notes: 'A homogeneous linear system has the form Ax = 0. The solution set always contains x = 0 (trivial solution). Non-trivial solutions exist iff the system has at least one free variable (i.e., rank < number of variables). The solution set of a homogeneous system is a subspace (it is closed under addition and scalar multiplication). The general solution can be written as a linear combination of basic solution vectors. Every non-homogeneous solution can be written as a particular solution plus a homogeneous solution.',
        learningObjectives: [
          'Identify homogeneous systems',
          'Find non-trivial solutions to Ax = 0',
          'Express solution sets as linear combinations',
          'Relate homogeneous and non-homogeneous solutions',
        ],
        keywords: ['homogeneous', 'trivial_solution', 'null_space', 'particular_solution', 'linear_combination'],
        difficulty: 'intermediate',
        prerequisites: ['Solutions of Linear Systems'],
        estimatedMinutes: 45,
        questions: [
          {
            id: 'q_homog_0', type: 'mcq', difficulty: 'easy', category: 'recall',
            text: 'Which of the following is always a solution to Ax = 0?',
            options: ['x = [1, 1, ..., 1]', 'x = [0, 0, ..., 0]', 'x = b', 'x = A'],
            correctAnswer: 'x = [0, 0, ..., 0]',
            explanation: 'The zero vector always satisfies A·0 = 0, making it the trivial solution.',
            points: 1,
          },
          {
            id: 'q_homog_1', type: 'true_false', difficulty: 'easy', category: 'recall',
            text: 'The solution set of a homogeneous system is a vector space.',
            options: ['True', 'False'],
            correctAnswer: 'True',
            explanation: 'The solution set of Ax = 0 (the null space) is always a subspace because it is closed under addition and scalar multiplication.',
            points: 1,
          },
          {
            id: 'q_homog_2', type: 'short_answer', difficulty: 'medium', category: 'application',
            text: 'A 3x3 homogeneous system has rank 2. How many parameters are needed to describe all solutions?',
            correctAnswer: '1',
            explanation: '3 variables - rank 2 = 1 free variable, so 1 parameter.',
            points: 2,
          },
          {
            id: 'q_homog_3', type: 'numerical', difficulty: 'hard', category: 'critical_thinking',
            text: 'If A is a 4x6 matrix with rank 3, what is the dimension of the solution space of Ax = 0?',
            correctAnswer: '3',
            explanation: 'dim(N(A)) = n - rank = 6 - 3 = 3.',
            points: 3,
          },
          {
            id: 'q_homog_4', type: 'mcq', difficulty: 'medium', category: 'application',
            text: 'If x_p is a particular solution to Ax = b, what is the general solution?',
            options: ['x = x_p', 'x = x_p + t where t solves At = 0', 'x = t where t solves At = b', 'x = x_p + b'],
            correctAnswer: 'x = x_p + t where t solves At = 0',
            explanation: 'The general solution is x_p plus any vector in the null space (solution to Ax = 0).',
            points: 2,
          },
          {
            id: 'q_homog_5', type: 'fill_blank', difficulty: 'medium', category: 'recall',
            text: 'The solution space of Ax = 0 is called the ____ of A.',
            options: ['column space', 'null space', 'row space', 'range'],
            correctAnswer: 'null space',
            explanation: 'The null space N(A) = {x : Ax = 0} is the set of all solutions to the homogeneous equation.',
            points: 1,
          },
        ],
        assignments: [
          {
            id: 'a_homog_0', title: 'Null Space Exploration',
            instructions: 'For 6 matrices: (1) Find all solutions to Ax = 0, (2) Express as linear combination of basis vectors, (3) Determine the dimension of the null space, (4) Verify the rank-nullity theorem.',
            marks: 40, estimatedMinutes: 80,
            answerKey: 'Solutions correctly found: 3 marks each. Basis vectors correct: 2 marks. Dimension correct: 1 mark. Rank-nullity verified: 1 mark each.',
            rubric: 'Correct solution set: 3 marks. Correct basis: 2 marks. Correct dimension: 1 mark. Rank-nullity verification: 1 mark.',
            type: 'worksheet',
          },
        ],
        videos: [
          { id: 'v_homog_0', youtubeId: 'dummy4', title: 'Homogeneous Systems and Null Space', thumbnail: '', duration: '22:00', channelName: 'MIT OpenCourseWare', description: 'Gilbert Strang explains the null space of a matrix.', embedUrl: 'https://www.youtube.com/embed/dummy4', relevance: 0.95 },
        ],
      },
    ],
  },
  {
    title: 'Matrix Algebra',
    description: 'Operations on matrices including addition, multiplication, inverses, and matrix factorizations like LU decomposition.',
    concepts: [
      {
        title: 'Matrix Operations',
        summary: 'Matrices can be added, subtracted, and multiplied. Matrix multiplication is not commutative but is associative and distributive.',
        notes: 'Matrix addition: add corresponding entries (matrices must be same size). Scalar multiplication: multiply each entry. Matrix multiplication: (AB)_{ij} = Σ_k A_{ik} B_{kj}. A must be m×n and B must be n×p. Key properties: (AB)C = A(BC), A(B+C) = AB + AC, but AB ≠ BA in general. The transpose of a matrix swaps rows and columns: (A^T)_{ij} = A_{ji}. (AB)^T = B^T A^T. The trace is the sum of diagonal entries.',
        learningObjectives: [
          'Add and multiply matrices correctly',
          'Understand non-commutativity of matrix multiplication',
          'Compute matrix transposes and traces',
          'Use matrix algebra properties to simplify expressions',
        ],
        keywords: ['matrix_multiplication', 'transpose', 'trace', 'matrix_algebra', 'non_commutative'],
        difficulty: 'beginner',
        prerequisites: ['Gaussian Elimination'],
        estimatedMinutes: 50,
        questions: [
          {
            id: 'q_matops_0', type: 'mcq', difficulty: 'easy', category: 'recall',
            text: 'What condition must be met to multiply A (m×n) by B (p×q)?',
            options: ['m = p', 'n = p', 'm = q', 'n = q'],
            correctAnswer: 'n = p',
            explanation: 'For AB to be defined, the number of columns of A (n) must equal the number of rows of B (p).',
            points: 1,
          },
          {
            id: 'q_matops_1', type: 'true_false', difficulty: 'easy', category: 'recall',
            text: 'Matrix multiplication is commutative: AB = BA for all matrices A and B.',
            options: ['True', 'False'],
            correctAnswer: 'False',
            explanation: 'Matrix multiplication is generally not commutative. Even when both products are defined, AB ≠ BA in most cases.',
            points: 1,
          },
          {
            id: 'q_matops_2', type: 'mcq', difficulty: 'medium', category: 'application',
            text: 'If A is 3×5 and B is 5×2, what is the size of AB?',
            options: ['3×2', '5×5', '3×5', '2×3'],
            correctAnswer: '3×2',
            explanation: 'AB is 3×2: outer dimensions (rows of A × columns of B).',
            points: 2,
          },
          {
            id: 'q_matops_3', type: 'short_answer', difficulty: 'medium', category: 'application',
            text: 'For matrices A and B, (AB)^T = ? (write in terms of A^T and B^T)',
            correctAnswer: 'B^T A^T',
            explanation: 'The transpose of a product is the product of transposes in reverse order: (AB)^T = B^T A^T.',
            points: 2,
          },
          {
            id: 'q_matops_4', type: 'numerical', difficulty: 'hard', category: 'critical_thinking',
            text: 'How many scalar multiplications are needed to multiply a 2×3 matrix by a 3×2 matrix?',
            correctAnswer: '12',
            explanation: 'Each of the 4 entries in the 2×2 result requires 3 multiplications. Total: 4 × 3 = 12.',
            points: 3,
          },
          {
            id: 'q_matops_5', type: 'fill_blank', difficulty: 'easy', category: 'recall',
            text: 'The ____ of a matrix is the sum of its diagonal entries.',
            options: ['determinant', 'trace', 'rank', 'norm'],
            correctAnswer: 'trace',
            explanation: 'The trace tr(A) = Σ A_{ii} is the sum of diagonal entries.',
            points: 1,
          },
          {
            id: 'q_matops_6', type: 'mcq', difficulty: 'hard', category: 'critical_thinking',
            text: 'If A is an m×n matrix and BA is defined, what is the size of B?',
            options: ['m×n', 'n×m', 'Any size, as long as BA is defined', 'n×n'],
            correctAnswer: 'n×n',
            explanation: 'BA must be defined, and A is m×n. For BA to work, B must have n columns. The result BA has rows of B × n. No additional constraint given, but the only guaranteed size from A alone is that B must be ... × n for BA to be defined. Actually, more precisely: for BA to be defined, B must be p×m for some p, giving BA size p×n.',
            points: 3,
          },
          {
            id: 'q_matops_7', type: 'short_answer', difficulty: 'medium', category: 'application',
            text: 'If tr(A) = 5 and tr(B) = 3, what is tr(A + B)?',
            correctAnswer: '8',
            explanation: 'The trace is linear: tr(A+B) = tr(A) + tr(B) = 5 + 3 = 8.',
            points: 2,
          },
        ],
        assignments: [
          {
            id: 'a_matops_0', title: 'Matrix Operations Mastery',
            instructions: 'Complete 20 matrix operation problems covering addition, multiplication, transposition, and trace. Prove that matrix multiplication is non-commutative using a counterexample. Verify associativity for 3 given matrices.',
            marks: 50, estimatedMinutes: 90,
            answerKey: 'Addition/subtraction: 1 mark each. Multiplication: 2 marks each. Transpose: 1 mark each. Proof: 5 marks. Associativity: 5 marks.',
            rubric: 'Correct result: as marked. Clear work shown: bonus 1 per section. Proof rigorous: 5 marks.',
            type: 'homework',
          },
        ],
        videos: [
          { id: 'v_matops_0', youtubeId: 'dummy5', title: 'Matrix Multiplication Explained', thumbnail: '', duration: '16:00', channelName: '3Blue1Brown', description: 'Linear algebra visualizations of matrix multiplication.', embedUrl: 'https://www.youtube.com/embed/dummy5', relevance: 0.95 },
        ],
      },
      {
        title: 'Inverse of a Matrix',
        summary: 'The inverse of a square matrix A, denoted A^{-1}, satisfies AA^{-1} = A^{-1}A = I. Not all matrices have inverses.',
        notes: 'A matrix is invertible (non-singular) if it has an inverse. Methods for finding inverses: (1) Gauss-Jordan elimination on [A|I], (2) formula for 2×2: [a b; c d]^{-1} = 1/(ad-bc)[d -b; -c a]. Properties: (A^{-1})^{-1} = A, (AB)^{-1} = B^{-1}A^{-1}, (A^T)^{-1} = (A^{-1})^T. The Invertible Matrix Theorem lists equivalent conditions for invertibility, including: det ≠ 0, rank = n, columns are linearly independent, null space = {0}.',
        learningObjectives: [
          'Determine if a matrix is invertible',
          'Compute the inverse using Gauss-Jordan',
          'Use the inverse to solve linear systems',
          'Apply the Invertible Matrix Theorem',
        ],
        keywords: ['inverse', 'invertible', 'non_singular', 'gauss_jordan_inverse', 'invertible_matrix_theorem'],
        difficulty: 'intermediate',
        prerequisites: ['Matrix Operations', 'Row Echelon Form'],
        estimatedMinutes: 55,
        questions: [
          {
            id: 'q_inv_0', type: 'mcq', difficulty: 'easy', category: 'recall',
            text: 'A square matrix with no inverse is called:',
            options: ['Zero matrix', 'Singular matrix', 'Identity matrix', 'Diagonal matrix'],
            correctAnswer: 'Singular matrix',
            explanation: 'A matrix without an inverse is called singular (or non-invertible).',
            points: 1,
          },
          {
            id: 'q_inv_1', type: 'true_false', difficulty: 'easy', category: 'recall',
            text: 'If A is invertible, then Ax = b has a unique solution for every b.',
            options: ['True', 'False'],
            correctAnswer: 'True',
            explanation: 'x = A^{-1}b is the unique solution. This is a key application of matrix inverses.',
            points: 1,
          },
          {
            id: 'q_inv_2', type: 'numerical', difficulty: 'medium', category: 'application',
            text: 'The inverse of [2 0; 0 3] is [a 0; 0 b]. What is a × b?',
            correctAnswer: '1/6',
            explanation: 'The inverse of diag(2,3) is diag(1/2, 1/3). Their product is 1/6.',
            points: 2,
          },
          {
            id: 'q_inv_3', type: 'mcq', difficulty: 'medium', category: 'application',
            text: 'If A and B are invertible n×n matrices, what is (AB)^{-1}?',
            options: ['A^{-1}B^{-1}', 'B^{-1}A^{-1}', 'A^{-1} + B^{-1}', 'AB'],
            correctAnswer: 'B^{-1}A^{-1}',
            explanation: 'The inverse of a product is the product of inverses in reverse order: (AB)^{-1} = B^{-1}A^{-1}.',
            points: 2,
          },
          {
            id: 'q_inv_4', type: 'short_answer', difficulty: 'medium', category: 'application',
            text: 'How many row operations are needed to find the inverse of a 3×3 matrix using Gauss-Jordan on [A|I]?',
            correctAnswer: '6',
            explanation: 'Roughly 3 forward elimination steps + 3 back-substitution steps = 6 operations to reduce A to I.',
            points: 2,
          },
          {
            id: 'q_inv_5', type: 'scenario', difficulty: 'hard', category: 'critical_thinking',
            text: 'Matrix A has determinant 0. Can Ax = 0 have only the trivial solution?',
            options: ['Yes', 'No'],
            correctAnswer: 'No',
            explanation: 'det = 0 means A is singular, so it has non-trivial null space vectors. Ax = 0 has infinitely many solutions.',
            points: 3,
          },
          {
            id: 'q_inv_6', type: 'fill_blank', difficulty: 'hard', category: 'critical_thinking',
            text: 'If A² = A (idempotent) and A is invertible, then A must equal the ____ matrix.',
            options: ['zero', 'identity', 'diagonal', 'singular'],
            correctAnswer: 'identity',
            explanation: 'Multiply both sides by A^{-1}: A = I. Only the identity matrix is both idempotent and invertible.',
            points: 3,
          },
          {
            id: 'q_inv_7', type: 'mcq', difficulty: 'hard', category: 'critical_thinking',
            text: 'If A² = I and A ≠ ±I, which of the following is true?',
            options: ['A is not invertible', 'A is its own inverse', 'A has no real eigenvalues', 'A is diagonal'],
            correctAnswer: 'A is its own inverse',
            explanation: 'A² = I means A·A = I, so A^{-1} = A. Such matrices are called involutory.',
            points: 3,
          },
        ],
        assignments: [
          {
            id: 'a_inv_0', title: 'Matrix Inverses Problem Set',
            instructions: 'Find inverses of 8 matrices (ranging from 2×2 to 4×4) using Gauss-Jordan elimination. Verify each by multiplying A·A^{-1}. Prove that if A and B are invertible, then AB is invertible and (AB)^{-1} = B^{-1}A^{-1}.',
            marks: 50, estimatedMinutes: 90,
            answerKey: '2×2 inverses: 3 marks each. 3×3 inverses: 5 marks each. 4×4: 7 marks. Verification: 2 marks each. Proof: 5 marks.',
            rubric: 'Correct inverse: as marked. Verification: 2 marks. Clear proof: 5 marks.',
            type: 'worksheet',
          },
        ],
        videos: [
          { id: 'v_inv_0', youtubeId: 'dummy6', title: 'Matrix Inverses - Full Guide', thumbnail: '', duration: '25:00', channelName: 'Professor Leonard', description: 'Complete tutorial on finding and using matrix inverses.', embedUrl: 'https://www.youtube.com/embed/dummy6', relevance: 0.95 },
        ],
      },
      {
        title: 'LU Factorization',
        summary: 'LU factorization decomposes a matrix A into a lower triangular matrix L times an upper triangular matrix U, simplifying the solution of linear systems.',
        notes: 'LU factorization: A = LU where L is lower triangular with 1s on the diagonal and U is upper triangular. This allows solving Ax = b in two steps: solve Ly = b (forward substitution), then Ux = y (back substitution). LU factorization requires about half the operations of Gaussian elimination when solving multiple systems with the same A. PA = LU factorization handles row exchanges (P is a permutation matrix). Applications include computing determinants (det = product of diagonal entries of U) and matrix inversion.',
        learningObjectives: [
          'Factor a matrix into LU form',
          'Use LU to solve linear systems efficiently',
          'Explain when LU factorization requires row permutations',
          'Apply LU factorization for repeated solves',
        ],
        keywords: ['LU_factorization', 'lower_triangular', 'upper_triangular', 'forward_substitution', 'permutation_matrix'],
        difficulty: 'intermediate',
        prerequisites: ['Gaussian Elimination', 'Matrix Operations'],
        estimatedMinutes: 50,
        questions: [
          {
            id: 'q_lu_0', type: 'mcq', difficulty: 'easy', category: 'recall',
            text: 'What do L and U stand for in LU factorization?',
            options: ['Left and Upper', 'Lower and Upper', 'Linear and Unique', 'Least and Unique'],
            correctAnswer: 'Lower and Upper',
            explanation: 'L is a lower triangular matrix, U is an upper triangular matrix.',
            points: 1,
          },
          {
            id: 'q_lu_1', type: 'true_false', difficulty: 'easy', category: 'recall',
            text: 'Every square matrix has an LU factorization.',
            options: ['True', 'False'],
            correctAnswer: 'False',
            explanation: 'If a zero pivot is encountered, row permutations are needed (PA = LU). Not every matrix has an LU factorization without permutations.',
            points: 1,
          },
          {
            id: 'q_lu_2', type: 'short_answer', difficulty: 'medium', category: 'application',
            text: 'How many distinct integers are in the set {det(L), det(U), det(A)} for A = LU where L and U are 3x3?',
            correctAnswer: '1',
            explanation: 'det(L) = 1 (diagonal of 1s). det(U) = det(A), so the set has at most 2 distinct values. If det(U) = 1, all three are 1.',
            points: 3,
          },
          {
            id: 'q_lu_3', type: 'short_answer', difficulty: 'medium', category: 'application',
            text: 'How many multiplications does LU factorization of an n×n matrix require (approximately)?',
            correctAnswer: 'n^3/3',
            explanation: 'LU factorization requires approximately n³/3 multiplications, about half the cost of Gaussian elimination for the full matrix.',
            points: 2,
          },
          {
            id: 'q_lu_4', type: 'mcq', difficulty: 'hard', category: 'critical_thinking',
            text: 'Why is LU factorization preferred over Gaussian elimination when solving Ax = b for many different b vectors?',
            options: ['LU is more accurate', 'L and U can be reused', 'LU avoids fractions', 'LU is the only method for rectangular matrices'],
            correctAnswer: 'L and U can be reused',
            explanation: 'Once A = LU, solving for any b only requires forward and back substitution with L and U, costing O(n²) instead of O(n³).',
            points: 3,
          },
        ],
        assignments: [
          {
            id: 'a_lu_0', title: 'LU Factorization Lab',
            instructions: 'Compute LU factorization for 5 matrices. For each, solve Ax = b using Ly = b and Ux = y. For one matrix, show that PA = LU is needed and find P.',
            marks: 40, estimatedMinutes: 75,
            answerKey: 'LU factors: 5 marks each (L: 2, U: 2, verification: 1). Solutions: 2 marks each. PA=LU: 5 marks.',
            rubric: 'Correct L and U: 5 marks. Correct solve: 2 marks. Correct permutation: 2 marks. Full PA=LU: 3 marks.',
            type: 'homework',
          },
        ],
        videos: [
          { id: 'v_lu_0', youtubeId: 'dummy7', title: 'LU Factorization - MIT 18.06', thumbnail: '', duration: '28:00', channelName: 'MIT OpenCourseWare', description: 'Prof. Strang on LU decomposition and its applications.', embedUrl: 'https://www.youtube.com/embed/dummy7', relevance: 0.95 },
        ],
      },
    ],
  },
  {
    title: 'Determinants',
    description: 'Properties and applications of determinants, including Cramer\'s rule, area/volume interpretation, and the relationship to invertibility.',
    concepts: [
      {
        title: 'Properties of Determinants',
        summary: 'Determinants assign a scalar value to square matrices, with properties that simplify computation. The determinant is zero iff the matrix is singular.',
        notes: 'For a 2×2 matrix [a b; c d], det = ad - bc. For 3×3, use the cofactor expansion: det(A) = Σ_j (-1)^{i+j} a_{ij} det(M_{ij}) where M_{ij} is the minor. Key properties: det(A^T) = det(A), det(AB) = det(A)·det(B), det(cA) = c^n det(A) for n×n, swapping rows changes sign, adding a multiple of one row to another leaves det unchanged. Row operations provide an efficient way to compute determinants using triangularization.',
        learningObjectives: [
          'Compute determinants of 2×2 and 3×3 matrices',
          'Use cofactor expansion for larger matrices',
          'Apply properties to simplify determinant calculations',
          'Relate determinant to matrix invertibility',
        ],
        keywords: ['determinant', 'cofactor', 'minor', 'cofactor_expansion', 'det_AB'],
        difficulty: 'intermediate',
        prerequisites: ['Matrix Operations', 'Row Echelon Form'],
        estimatedMinutes: 50,
        questions: [
          {
            id: 'q_detprops_0', type: 'mcq', difficulty: 'easy', category: 'recall',
            text: 'What is the determinant of [a b; c d]?',
            options: ['ab - cd', 'ad - bc', 'ac - bd', 'ad + bc'],
            correctAnswer: 'ad - bc',
            explanation: 'For a 2×2 matrix, det = ad - bc.',
            points: 1,
          },
          {
            id: 'q_detprops_1', type: 'true_false', difficulty: 'easy', category: 'recall',
            text: 'det(A^T) = det(A) for any square matrix A.',
            options: ['True', 'False'],
            correctAnswer: 'True',
            explanation: 'The determinant of a transpose equals the determinant of the original matrix.',
            points: 1,
          },
          {
            id: 'q_detprops_2', type: 'numerical', difficulty: 'medium', category: 'application',
            text: 'If A is 4×4 with det(A) = 2, what is det(3A)?',
            correctAnswer: '162',
            explanation: 'det(cA) = c^n det(A) = 3^4 × 2 = 81 × 2 = 162.',
            points: 2,
          },
          {
            id: 'q_detprops_3', type: 'short_answer', difficulty: 'medium', category: 'application',
            text: 'det(AB) = 12 and det(A) = 3. What is det(B)?',
            correctAnswer: '4',
            explanation: 'det(AB) = det(A) × det(B), so det(B) = 12/3 = 4.',
            points: 2,
          },
          {
            id: 'q_detprops_4', type: 'mcq', difficulty: 'hard', category: 'critical_thinking',
            text: 'If A is invertible, which of the following equals det(A^{-1})?',
            options: ['det(A)', '-det(A)', '1/det(A)', 'det(A)^2'],
            correctAnswer: '1/det(A)',
            explanation: 'AA^{-1} = I, so det(A)det(A^{-1}) = det(I) = 1, giving det(A^{-1}) = 1/det(A).',
            points: 3,
          },
          {
            id: 'q_detprops_5', type: 'fill_blank', difficulty: 'medium', category: 'recall',
            text: 'Swapping two rows of a matrix ____ the sign of the determinant.',
            options: ['doubles', 'negates', 'halves', 'squares'],
            correctAnswer: 'negates',
            explanation: 'Swapping any two rows multiplies the determinant by -1.',
            points: 1,
          },
          {
            id: 'q_detprops_6', type: 'scenario', difficulty: 'hard', category: 'critical_thinking',
            text: 'Matrix A has two identical rows. What is det(A)?',
            options: ['1', '-1', '0', 'Cannot be determined'],
            correctAnswer: '0',
            explanation: 'With two identical rows, swapping them gives the same matrix but the determinant flips sign, so det = -det, meaning det = 0.',
            points: 3,
          },
          {
            id: 'q_detprops_7', type: 'numerical', difficulty: 'hard', category: 'critical_thinking',
            text: 'If det(A) = 0 and A is 3×3, what is the rank of A at most?',
            correctAnswer: '2',
            explanation: 'det = 0 means A is singular, so rank < 3. Maximum rank is 2.',
            points: 3,
          },
        ],
        assignments: [
          {
            id: 'a_detprops_0', title: 'Determinant Properties',
            instructions: 'Compute determinants for 10 matrices using cofactor expansion. Verify properties: (1) Show det(AB) = det(A)det(B) for 3 pairs, (2) Show det(A^T) = det(A) for 3 matrices, (3) Show that row operations change det predictably.',
            marks: 50, estimatedMinutes: 90,
            answerKey: 'Cofactor expansions: 2 marks each. Verifications: 3 marks each pair. Row operation analysis: 5 marks.',
            rubric: 'Correct determinant: 2 marks. Verified property: 3 marks. Analysis: 5 marks.',
            type: 'worksheet',
          },
        ],
        videos: [
          { id: 'v_detprops_0', youtubeId: 'dummy8', title: 'What is a Determinant?', thumbnail: '', duration: '12:00', channelName: '3Blue1Brown', description: 'Geometric intuition for determinants as scaling factors.', embedUrl: 'https://www.youtube.com/embed/dummy8', relevance: 0.95 },
          { id: 'v_detprops_1', youtubeId: 'dummy9', title: 'Properties of Determinants', thumbnail: '', duration: '20:00', channelName: 'MIT OpenCourseWare', description: 'Strang lectures on determinant properties.', embedUrl: 'https://www.youtube.com/embed/dummy9', relevance: 0.9 },
        ],
      },
      {
        title: "Cramer's Rule",
        summary: "Cramer's Rule uses determinants to solve linear systems. For Ax = b, x_i = det(A_i)/det(A) where A_i replaces column i with b.",
        notes: "For a system of n equations in n unknowns: x_i = det(A_i)/det(A) where A_i is A with column i replaced by b. Cramer's Rule is mainly of theoretical interest for small systems (2×2, 3×3). For larger systems, Gaussian elimination and LU factorization are more efficient. The method requires n+1 determinant calculations. Applications include solving for a single variable without computing the full solution, and theoretical proofs involving sensitivity analysis.",
        learningObjectives: [
          "Apply Cramer's Rule to 2×2 and 3×3 systems",
          'Recognize when Cramer\'s Rule is practical',
          'Use Cramer\'s Rule to solve for individual variables',
          'Understand the relationship to matrix inverses',
        ],
        keywords: ['cramers_rule', 'determinant_ratio', 'square_system', 'cofactor'],
        difficulty: 'intermediate',
        prerequisites: ['Properties of Determinants'],
        estimatedMinutes: 40,
        questions: [
          {
            id: 'q_cramer_0', type: 'mcq', difficulty: 'easy', category: 'recall',
            text: "Cramer's Rule requires the coefficient matrix to be:",
            options: ['Rectangular', 'Square', 'Diagonal', 'Symmetric'],
            correctAnswer: 'Square',
            explanation: "Cramer's Rule only works for square systems (n equations, n unknowns).",
            points: 1,
          },
          {
            id: 'q_cramer_1', type: 'true_false', difficulty: 'easy', category: 'recall',
            text: "Cramer's Rule requires computing n+1 determinants for an n×n system.",
            options: ['True', 'False'],
            correctAnswer: 'True',
            explanation: 'You need det(A) plus det(A_i) for each of the n variables, so n+1 determinants.',
            points: 1,
          },
          {
            id: 'q_cramer_2', type: 'numerical', difficulty: 'medium', category: 'application',
            text: 'Using Cramer\'s Rule for a 3×3 system, if det(A) = 6 and det(A_1) = 12, what is x_1?',
            correctAnswer: '2',
            explanation: 'x_1 = det(A_1)/det(A) = 12/6 = 2.',
            points: 2,
          },
          {
            id: 'q_cramer_3', type: 'short_answer', difficulty: 'medium', category: 'critical_thinking',
            text: 'Why is Cramer\'s Rule impractical for large systems (n > 5)?',
            correctAnswer: 'Too many determinant calculations',
            explanation: 'For an n×n system, Cramer\'s Rule requires n+1 determinant calculations, each costing O(n!) or O(n³) operations. Gaussian elimination is O(n³) total.',
            points: 2,
          },
          {
            id: 'q_cramer_4', type: 'mcq', difficulty: 'hard', category: 'critical_thinking',
            text: "If det(A) = 0 in a system solved by Cramer's Rule, what happens?",
            options: ['All variables are 0', 'The system has no unique solution', 'x = infinity', 'The system is homogeneous'],
            correctAnswer: 'The system has no unique solution',
            explanation: 'det(A) = 0 means A is singular. The system either has no solution or infinitely many solutions.',
            points: 3,
          },
        ],
        assignments: [
          {
            id: 'a_cramer_0', title: "Cramer's Rule Practice",
            instructions: 'Solve 6 systems using Cramer\'s Rule (3 of size 2×2, 3 of size 3×3). For each, verify your answer by substitution. Discuss why Cramer\'s Rule is inefficient for a 10×10 system.',
            marks: 35, estimatedMinutes: 60,
            answerKey: '2×2 systems: 4 marks each. 3×3 systems: 6 marks each. Verification: 2 marks each. Discussion: 5 marks.',
            rubric: 'Correct application: marks as above. Verification: 2 marks. Insightful discussion: 5 marks.',
            type: 'homework',
          },
        ],
        videos: [
          { id: 'v_cramer_0', youtubeId: 'dummy10', title: "Cramer's Rule Explained", thumbnail: '', duration: '15:00', channelName: 'Khan Academy', description: 'Step-by-step application of Cramer\'s Rule.', embedUrl: 'https://www.youtube.com/embed/dummy10', relevance: 0.9 },
        ],
      },
      {
        title: 'Geometric Applications of Determinants',
        summary: 'Determinants represent scaling factors for linear transformations and can compute areas, volumes, and orientation.',
        notes: 'The absolute value of the determinant of a 2×2 matrix equals the area of the parallelogram formed by its column vectors. For 3×3, it equals the volume of the parallelepiped. The sign indicates orientation (positive = same orientation, negative = reversed). The determinant also gives the Jacobian for change of variables in multiple integrals. For a linear transformation T(x) = Ax, the factor by which T scales areas/volumes is |det(A)|.',
        learningObjectives: [
          'Interpret determinant as area/volume scaling',
          'Compute areas of parallelograms using determinants',
          'Determine orientation from determinant sign',
          'Apply determinants to change of variables',
        ],
        keywords: ['area', 'volume', 'jacobian', 'orientation', 'parallelogram', 'scaling_factor'],
        difficulty: 'intermediate',
        prerequisites: ['Properties of Determinants', 'Matrix Operations'],
        estimatedMinutes: 45,
        questions: [
          {
            id: 'q_geomdet_0', type: 'mcq', difficulty: 'easy', category: 'recall',
            text: 'What does |det(A)| represent for a 2×2 matrix A?',
            options: ['Length of vectors', 'Area of parallelogram from columns', 'Angle between columns', 'Perimeter of parallelogram'],
            correctAnswer: 'Area of parallelogram from columns',
            explanation: 'The absolute value of the determinant equals the area of the parallelogram formed by the column vectors.',
            points: 1,
          },
          {
            id: 'q_geomdet_1', type: 'true_false', difficulty: 'easy', category: 'recall',
            text: 'A negative determinant indicates a reversal of orientation.',
            options: ['True', 'False'],
            correctAnswer: 'True',
            explanation: 'A negative determinant means the transformation reverses orientation (e.g., flips the plane).',
            points: 1,
          },
          {
            id: 'q_geomdet_2', type: 'numerical', difficulty: 'medium', category: 'application',
            text: 'The columns of a 2×2 matrix are [2,0] and [0,5]. What is the area of the parallelogram?',
            correctAnswer: '10',
            explanation: 'det = 2×5 - 0×0 = 10, so the area is |10| = 10.',
            points: 2,
          },
          {
            id: 'q_geomdet_3', type: 'short_answer', difficulty: 'medium', category: 'critical_thinking',
            text: 'If det(A) = 0, what is the area of the parallelogram formed by its columns?',
            correctAnswer: '0',
            explanation: 'det = 0 means columns are linearly dependent, so the parallelogram is degenerate (collinear), giving area 0.',
            points: 2,
          },
          {
            id: 'q_geomdet_4', type: 'mcq', difficulty: 'hard', category: 'critical_thinking',
            text: 'A 3×3 matrix with determinant 2 maps a unit cube to a parallelpiped of what volume?',
            options: ['1', '2', '4', '8'],
            correctAnswer: '2',
            explanation: 'The volume scaling factor is |det(A)| = 2, so the image volume is 2 × the original volume.',
            points: 3,
          },
        ],
        assignments: [
          {
            id: 'a_geomdet_0', title: 'Determinants in Geometry',
            instructions: 'Using determinants, compute: (1) Area of triangle with given vertices, (2) Volume of parallelepiped from 3 vectors, (3) Show that det represents scaling factor for a given 2D transformation, (4) Find the Jacobian for a change from Cartesian to polar coordinates.',
            marks: 40, estimatedMinutes: 70,
            answerKey: 'Triangle area: 8 marks. Volume: 10 marks. Scaling factor: 10 marks. Jacobian: 12 marks.',
            rubric: 'Correct application: as marked. Geometric interpretation: bonus 2 marks each.',
            type: 'worksheet',
          },
        ],
        videos: [
          { id: 'v_geomdet_0', youtubeId: 'dummy11', title: 'Determinants as Scaling Factors', thumbnail: '', duration: '14:00', channelName: '3Blue1Brown', description: 'Geometric intuition for determinants in linear transformations.', embedUrl: 'https://www.youtube.com/embed/dummy11', relevance: 0.95 },
        ],
      },
    ],
  },
  {
    title: 'Vector Spaces',
    description: 'Abstract vector spaces, subspaces, linear independence, basis, dimension, and the fundamental subspaces of a matrix.',
    concepts: [
      {
        title: 'Vector Spaces and Subspaces',
        summary: 'A vector space is a set of vectors closed under addition and scalar multiplication satisfying ten axioms. Subspaces are subsets that are themselves vector spaces.',
        notes: "A vector space V over a field F has two operations: vector addition and scalar multiplication. Key axioms: associativity, commutativity, distributivity, existence of zero vector, additive inverses, and closure under both operations. Rn is the canonical example. A subspace is a non-empty subset closed under both operations. Examples: lines through origin in R², planes through origin in R³. The span of a set of vectors is the smallest subspace containing them. A subspace can be characterized as the set of all linear combinations of some spanning set.",
        learningObjectives: [
          'Verify vector space axioms',
          'Identify subspaces of a given vector space',
          'Check if a subset is a subspace',
          'Find the span of a set of vectors',
        ],
        keywords: ['vector_space', 'subspace', 'axioms', 'closure', 'span', 'zero_vector'],
        difficulty: 'beginner',
        prerequisites: ['Solutions of Linear Systems'],
        estimatedMinutes: 55,
        questions: [
          {
            id: 'q_vecspace_0', type: 'mcq', difficulty: 'easy', category: 'recall',
            text: 'What is the zero vector in R³?',
            options: ['[1,1,1]', '[0,0,0]', '[0]', 'The empty set'],
            correctAnswer: '[0,0,0]',
            explanation: 'The zero vector in R³ has all components equal to 0.',
            points: 1,
          },
          {
            id: 'q_vecspace_1', type: 'true_false', difficulty: 'easy', category: 'recall',
            text: 'A subspace must contain the zero vector.',
            options: ['True', 'False'],
            correctAnswer: 'True',
            explanation: 'Closure under scalar multiplication with c = 0 gives 0·v = 0, so every subspace must contain the zero vector.',
            points: 1,
          },
          {
            id: 'q_vecspace_2', type: 'mcq', difficulty: 'medium', category: 'application',
            text: 'Which of the following is a subspace of R²?',
            options: ['The first quadrant (x > 0, y > 0)', 'The line y = 2x', 'The unit circle', 'The set of points with integer coordinates'],
            correctAnswer: 'The line y = 2x',
            explanation: 'The line through the origin is closed under addition and scalar multiplication. The others are not: first quadrant fails for negative scalars, unit circle not closed under addition, integer coordinates not closed under non-integer scalars.',
            points: 2,
          },
          {
            id: 'q_vecspace_3', type: 'short_answer', difficulty: 'medium', category: 'application',
            text: 'Is the set of all 2×2 matrices with zero trace a subspace of M_{2×2}? (yes/no)',
            correctAnswer: 'Yes',
            explanation: 'If tr(A)=0 and tr(B)=0, then tr(A+B)=0 and tr(cA)=c·tr(A)=0. The zero matrix has trace 0. So it is a subspace.',
            points: 2,
          },
          {
            id: 'q_vecspace_4', type: 'numerical', difficulty: 'hard', category: 'critical_thinking',
            text: 'What is the dimension of the subspace of R⁴ spanned by v1=[1,0,0,0], v2=[0,1,0,0], v3=[1,1,0,0]?',
            correctAnswer: '2',
            explanation: 'v3 = v1 + v2, so the set is linearly dependent. Only v1 and v2 are linearly independent, so dimension = 2.',
            points: 3,
          },
          {
            id: 'q_vecspace_5', type: 'fill_blank', difficulty: 'medium', category: 'recall',
            text: 'The ____ of a set of vectors is the set of all linear combinations of those vectors.',
            options: ['span', 'basis', 'dimension', 'null space'],
            correctAnswer: 'span',
            explanation: 'The span of {v₁, ..., vₖ} is {c₁v₁ + ... + cₖvₖ : cᵢ are scalars}.',
            points: 1,
          },
          {
            id: 'q_vecspace_6', type: 'scenario', difficulty: 'hard', category: 'critical_thinking',
            text: 'A subset contains the zero vector and is closed under addition. Is it necessarily a subspace?',
            options: ['Yes', 'No'],
            correctAnswer: 'No',
            explanation: 'It must also be closed under scalar multiplication. For example, the set of vectors with non-negative components in R² contains 0 and is closed under addition but not under multiplication by negative scalars.',
            points: 3,
          },
          {
            id: 'q_vecspace_7', type: 'mcq', difficulty: 'hard', category: 'critical_thinking',
            text: 'The set of all polynomials of degree exactly n is a vector space.',
            options: ['True', 'False'],
            correctAnswer: 'False',
            explanation: 'Adding two degree-n polynomials could give a lower degree (e.g., x^n + (-x^n) = 0). So it is not closed under addition.',
            points: 3,
          },
        ],
        assignments: [
          {
            id: 'a_vecspace_0', title: 'Vector Space or Not?',
            instructions: 'For 15 given sets, determine if they form subspaces. If yes, prove it by checking closure axioms. If no, provide a counterexample. Include geometric sketches where applicable.',
            marks: 50, estimatedMinutes: 90,
            answerKey: 'Subspace identification: 2 marks each. Proofs: 3 marks each. Counterexamples: 2 marks each. Sketches: 1 mark each.',
            rubric: 'Correct identification: 2 marks. Rigorous proof: 3 marks. Valid counterexample: 2 marks.',
            type: 'homework',
          },
        ],
        videos: [
          { id: 'v_vecspace_0', youtubeId: 'dummy12', title: 'Vector Spaces Introduction', thumbnail: '', duration: '18:00', channelName: 'MIT OpenCourseWare', description: 'Prof. Strang introduces vector spaces and subspaces.', embedUrl: 'https://www.youtube.com/embed/dummy12', relevance: 0.95 },
        ],
      },
      {
        title: 'Linear Independence and Basis',
        summary: 'A set of vectors is linearly independent if the only solution to the linear combination equaling zero is all coefficients zero. A basis is a linearly independent spanning set.',
        notes: 'Vectors v₁, ..., vₖ are linearly independent if c₁v₁ + ... + cₖvₖ = 0 implies c₁ = ... = cₖ = 0. Otherwise they are linearly dependent. A basis of a vector space is a linearly independent set that spans the space. Every basis of a finite-dimensional vector space has the same number of vectors (the dimension). The standard basis of Rⁿ is {e₁, ..., eₙ} where eᵢ has a 1 in position i and 0 elsewhere. Coordinates relative to a non-standard basis represent the coefficients needed to express a vector in that basis.',
        learningObjectives: [
          'Determine if vectors are linearly independent',
          'Find a basis for a given subspace',
          'Determine the dimension of a vector space',
          'Express vectors in different coordinate systems',
        ],
        keywords: ['linear_independence', 'linear_dependence', 'basis', 'dimension', 'standard_basis', 'coordinates'],
        difficulty: 'intermediate',
        prerequisites: ['Vector Spaces and Subspaces', 'Homogeneous Systems'],
        estimatedMinutes: 55,
        questions: [
          {
            id: 'q_libasis_0', type: 'mcq', difficulty: 'easy', category: 'recall',
            text: 'A set of vectors is linearly dependent if:',
            options: ['They are all non-zero', 'One can be written as a combination of the others', 'They span the space', 'They are all unit vectors'],
            correctAnswer: 'One can be written as a combination of the others',
            explanation: 'Linear dependence means at least one vector is a linear combination of the others.',
            points: 1,
          },
          {
            id: 'q_libasis_1', type: 'true_false', difficulty: 'easy', category: 'recall',
            text: 'Any set containing the zero vector is linearly dependent.',
            options: ['True', 'False'],
            correctAnswer: 'True',
            explanation: 'If 0 is in the set, then 1·0 = 0 gives a non-trivial linear combination equaling zero.',
            points: 1,
          },
          {
            id: 'q_libasis_2', type: 'numerical', difficulty: 'medium', category: 'application',
            text: 'What is the dimension of the vector space of all 2×2 matrices?',
            correctAnswer: '4',
            explanation: 'A basis is {[1 0; 0 0], [0 1; 0 0], [0 0; 1 0], [0 0; 0 1]}, so dimension = 4.',
            points: 2,
          },
          {
            id: 'q_libasis_3', type: 'short_answer', difficulty: 'medium', category: 'application',
            text: 'How many vectors are in a basis for R³?',
            correctAnswer: '3',
            explanation: 'R³ has dimension 3, so any basis must contain exactly 3 linearly independent vectors.',
            points: 2,
          },
          {
            id: 'q_libasis_4', type: 'mcq', difficulty: 'hard', category: 'critical_thinking',
            text: 'If 4 vectors in R³ are linearly independent, which of the following is true?',
            options: ['They span R³', 'They form a basis', 'This is impossible', 'They are a spanning set'],
            correctAnswer: 'This is impossible',
            explanation: 'In R³ (dimension 3), any set of more than 3 vectors is linearly dependent.',
            points: 3,
          },
          {
            id: 'q_libasis_5', type: 'fill_blank', difficulty: 'medium', category: 'recall',
            text: 'The number of vectors in any basis of V is the ____ of V.',
            options: ['span', 'dimension', 'rank', 'order'],
            correctAnswer: 'dimension',
            explanation: 'Dimension is defined as the number of vectors in any basis of a finite-dimensional vector space.',
            points: 1,
          },
          {
            id: 'q_libasis_6', type: 'scenario', difficulty: 'hard', category: 'critical_thinking',
            text: 'Two vectors in R² span the plane. Are they necessarily a basis?',
            options: ['Yes', 'No'],
            correctAnswer: 'Yes',
            explanation: 'If 2 vectors span R² (dimension 2), they must be linearly independent, so they form a basis.',
            points: 3,
          },
          {
            id: 'q_libasis_7', type: 'numerical', difficulty: 'hard', category: 'critical_thinking',
            text: 'What is the dimension of the space of all 3×3 skew-symmetric matrices?',
            correctAnswer: '3',
            explanation: 'Skew-symmetric means A^T = -A. Diagonal entries are 0. The 3 upper-triangular entries (a₁₂, a₁₃, a₂₃) determine the 3 lower-triangular entries. So dimension = 3.',
            points: 3,
          },
        ],
        assignments: [
          {
            id: 'a_libasis_0', title: 'Independence and Basis Problems',
            instructions: '(1) Determine linear independence for 10 vector sets. (2) Find a basis for each given subspace. (3) Prove that any 2 bases of the same finite-dimensional space have the same size. (4) Compute coordinates of given vectors relative to non-standard bases.',
            marks: 50, estimatedMinutes: 90,
            answerKey: 'Independence: 2 marks each. Basis: 3 marks each. Proof: 8 marks. Coordinates: 3 marks each.',
            rubric: 'Correct independence: 2 marks. Correct basis: 3 marks. Rigorous proof: 8 marks. Correct coordinates: 3 marks.',
            type: 'homework',
          },
        ],
        videos: [
          { id: 'v_libasis_0', youtubeId: 'dummy13', title: 'Linear Independence and Basis', thumbnail: '', duration: '22:00', channelName: 'Dr. Trefor Bazett', description: 'Clear explanation of linear independence, basis, and dimension.', embedUrl: 'https://www.youtube.com/embed/dummy13', relevance: 0.95 },
        ],
      },
      {
        title: 'The Four Fundamental Subspaces',
        summary: 'Every m×n matrix A defines four fundamental subspaces: column space, row space, null space, and left null space.',
        notes: "For an m×n matrix A: Column space C(A) ⊆ R^m: span of columns. Rank r = dim(C(A)). Row space R(A) ⊆ R^n: span of rows, same dimension r. Null space N(A) ⊆ R^n: all x such that Ax = 0, dimension n-r. Left null space N(A^T) ⊆ R^m: all y such that y^T A = 0^T, dimension m-r. The Fundamental Theorem of Linear Algebra (Strang): dim(C(A)) = dim(R(A)) = r, dim(N(A)) = n-r, dim(N(A^T)) = m-r. The row space and null space are orthogonal complements in R^n. The column space and left null space are orthogonal complements in R^m.",
        learningObjectives: [
          'Identify all four fundamental subspaces of a matrix',
          'Find bases for each subspace',
          'Apply the rank-nullity theorem',
          'Understand orthogonality relationships',
        ],
        keywords: ['column_space', 'row_space', 'null_space', 'left_null_space', 'rank_nullity', 'orthogonal_complement'],
        difficulty: 'advanced',
        prerequisites: ['Linear Independence and Basis', 'Homogeneous Systems'],
        estimatedMinutes: 60,
        questions: [
          {
            id: 'q_fundsub_0', type: 'mcq', difficulty: 'easy', category: 'recall',
            text: 'The column space of A is a subspace of:',
            options: ['R^n', 'R^m', 'R^{mn}', 'R^{m+n}'],
            correctAnswer: 'R^m',
            explanation: 'A is m×n, so its columns are vectors in R^m. The span of these columns is a subspace of R^m.',
            points: 1,
          },
          {
            id: 'q_fundsub_1', type: 'true_false', difficulty: 'medium', category: 'application',
            text: 'The row space and null space of A are orthogonal complements in R^n.',
            options: ['True', 'False'],
            correctAnswer: 'True',
            explanation: 'Every vector in the null space is orthogonal to every row of A, and thus to the entire row space. Their dimensions sum to n.',
            points: 2,
          },
          {
            id: 'q_fundsub_2', type: 'numerical', difficulty: 'medium', category: 'application',
            text: 'A 5×6 matrix has rank 3. What is dim(N(A))?',
            correctAnswer: '3',
            explanation: 'dim(N(A)) = n - rank = 6 - 3 = 3.',
            points: 2,
          },
          {
            id: 'q_fundsub_3', type: 'short_answer', difficulty: 'medium', category: 'application',
            text: 'A 4×7 matrix has rank 2. What is dim(N(A^T))?',
            correctAnswer: '2',
            explanation: 'dim(N(A^T)) = m - rank = 4 - 2 = 2.',
            points: 2,
          },
          {
            id: 'q_fundsub_4', type: 'mcq', difficulty: 'hard', category: 'critical_thinking',
            text: 'If u is in the row space and v is in the null space of A, what is u·v?',
            options: ['|u||v|', '0', '1', 'Depends on u and v'],
            correctAnswer: '0',
            explanation: 'Row space and null space are orthogonal complements. Every vector in the row space is orthogonal to every vector in the null space.',
            points: 3,
          },
          {
            id: 'q_fundsub_5', type: 'fill_blank', difficulty: 'easy', category: 'recall',
            text: 'The ____ of A is the set of all x such that Ax = 0.',
            options: ['null space', 'column space', 'row space', 'left null space'],
            correctAnswer: 'null space',
            explanation: 'N(A) = {x: Ax = 0} is the null space of A.',
            points: 1,
          },
          {
            id: 'q_fundsub_6', type: 'scenario', difficulty: 'hard', category: 'critical_thinking',
            text: 'A 3×3 matrix has rank 1. What are the dimensions of all four subspaces?',
            options: ['C:1, R:1, N:2, N^T:2', 'C:1, R:1, N:1, N^T:1', 'C:1, R:2, N:2, N^T:1', 'C:2, R:1, N:1, N^T:2'],
            correctAnswer: 'C:1, R:1, N:2, N^T:2',
            explanation: 'rank = 1. dim(C) = 1, dim(R) = 1, dim(N) = n-r = 2, dim(N^T) = m-r = 2.',
            points: 3,
          },
        ],
        assignments: [
          {
            id: 'a_fundsub_0', title: 'Fundamental Subspaces Project',
            instructions: 'For 4 given matrices: (1) Find bases for all four subspaces. (2) Verify the rank-nullity theorem. (3) Confirm orthogonality between row space and null space. (4) Draw a diagram showing the relationships between the four subspaces.',
            marks: 50, estimatedMinutes: 100,
            answerKey: 'Bases: 3 marks each subspace (12 per matrix). Rank-nullity: 2 marks each. Orthogonality: 2 marks each. Diagram: 6 marks.',
            rubric: 'Correct basis: 3 marks per subspace. Verified theorem: 2 marks. Orthogonality verified: 2 marks. Clear diagram: 6 marks.',
            type: 'homework',
          },
        ],
        videos: [
          { id: 'v_fundsub_0', youtubeId: 'dummy14', title: 'The Four Fundamental Subspaces', thumbnail: '', duration: '30:00', channelName: 'MIT OpenCourseWare', description: 'Gilbert Strang\'s famous lecture on the four fundamental subspaces.', embedUrl: 'https://www.youtube.com/embed/dummy14', relevance: 0.95 },
        ],
      },
      {
        title: 'Orthogonality and Projections',
        summary: 'Orthogonal vectors satisfy v·w = 0. Projections decompose vectors into components parallel and perpendicular to a subspace.',
        notes: 'Two vectors are orthogonal if their dot product is 0. The orthogonal complement of a subspace S is the set of all vectors orthogonal to every vector in S. The projection of vector b onto a line through a is p = (a^T·b)/(a^T·a)·a. The projection matrix P = A(A^TA)^{-1}A^T projects onto the column space of A. For orthogonal projection onto a subspace, the error vector b - p is orthogonal to the subspace. Least squares solutions minimize ||Ax - b||² and satisfy A^TAx = A^Tb. The Gram-Schmidt process produces an orthogonal (or orthonormal) basis.',
        learningObjectives: [
          'Compute dot products and check orthogonality',
          'Project vectors onto lines and subspaces',
          'Find least squares solutions',
          'Apply Gram-Schmidt orthogonalization',
        ],
        keywords: ['orthogonal', 'dot_product', 'projection', 'least_squares', 'gram_schmidt', 'orthogonal_complement'],
        difficulty: 'advanced',
        prerequisites: ['The Four Fundamental Subspaces', 'Matrix Operations'],
        estimatedMinutes: 60,
        questions: [
          {
            id: 'q_ortho_0', type: 'mcq', difficulty: 'easy', category: 'recall',
            text: 'Two vectors are orthogonal if their dot product is:',
            options: ['Positive', 'Negative', 'Zero', 'Non-zero'],
            correctAnswer: 'Zero',
            explanation: 'Orthogonal vectors have dot product equal to 0.',
            points: 1,
          },
          {
            id: 'q_ortho_1', type: 'true_false', difficulty: 'easy', category: 'recall',
            text: 'The zero vector is orthogonal to every vector.',
            options: ['True', 'False'],
            correctAnswer: 'True',
            explanation: '0·v = 0 for all v, so the zero vector is orthogonal to everything.',
            points: 1,
          },
          {
            id: 'q_ortho_2', type: 'numerical', difficulty: 'medium', category: 'application',
            text: 'What is the projection of [3,4] onto the x-axis?',
            correctAnswer: '[3,0]',
            explanation: 'The x-axis direction is [1,0]. Projection = (3×1 + 4×0)/(1×1) × [1,0] = 3 × [1,0] = [3,0].',
            points: 2,
          },
          {
            id: 'q_ortho_3', type: 'short_answer', difficulty: 'medium', category: 'application',
            text: 'The normal equations for least squares are: A^T A x = ?',
            correctAnswer: 'A^T b',
            explanation: 'The least squares solution minimizes ||Ax - b||² and satisfies A^T A x = A^T b.',
            points: 2,
          },
          {
            id: 'q_ortho_4', type: 'mcq', difficulty: 'hard', category: 'critical_thinking',
            text: 'If P is a projection matrix, what is P²?',
            options: ['0', 'I', 'P', '-P'],
            correctAnswer: 'P',
            explanation: 'Projection matrices are idempotent: P² = P. Projecting twice gives the same result.',
            points: 3,
          },
          {
            id: 'q_ortho_5', type: 'fill_blank', difficulty: 'hard', category: 'critical_thinking',
            text: 'The Gram-Schmidt process produces an ____ basis from any basis.',
            options: ['orthogonal', 'standard', 'eigen', 'coordinate'],
            correctAnswer: 'orthogonal',
            explanation: 'Gram-Schmidt takes any basis and produces an orthogonal (or orthonormal) basis.',
            points: 3,
          },
          {
            id: 'q_ortho_6', type: 'scenario', difficulty: 'hard', category: 'critical_thinking',
            text: 'A least squares fit of data points produces the line y = 2x + 1. What is the predicted y value at x = 3?',
            options: ['5', '6', '7', '8'],
            correctAnswer: '7',
            explanation: 'y = 2(3) + 1 = 6 + 1 = 7.',
            points: 3,
          },
        ],
        assignments: [
          {
            id: 'a_ortho_0', title: 'Orthogonality and Projections',
            instructions: '(1) Apply Gram-Schmidt to 3 bases. (2) Find projection matrices for 3 subspaces. (3) Solve a least squares problem: fit a line to 5 data points and compute the error. (4) Prove that I - P is also a projection if P is a projection.',
            marks: 50, estimatedMinutes: 100,
            answerKey: 'Gram-Schmidt: 4 marks each. Projection matrices: 5 marks each. Least squares: 10 marks. Proof: 8 marks.',
            rubric: 'Correct orthogonal basis: 4 marks. Correct projection: 5 marks. Correct LS fit: 10 marks. Rigorous proof: 8 marks.',
            type: 'worksheet',
          },
        ],
        videos: [
          { id: 'v_ortho_0', youtubeId: 'dummy15', title: 'Orthogonality and Least Squares', thumbnail: '', duration: '26:00', channelName: 'MIT OpenCourseWare', description: 'Strang on projections, least squares, and Gram-Schmidt.', embedUrl: 'https://www.youtube.com/embed/dummy15', relevance: 0.95 },
        ],
      },
    ],
  },
  {
    title: 'Eigenvalues and Eigenvectors',
    description: 'Eigenvalues and eigenvectors, diagonalization, and applications including Markov chains, differential equations, and spectral theory.',
    concepts: [
      {
        title: 'Eigenvalues and Eigenvectors',
        summary: 'An eigenvector of A is a non-zero vector v such that Av = λv. λ is the corresponding eigenvalue. Geometrically, eigenvectors are directions stretched by the transformation.',
        notes: 'To find eigenvalues, solve the characteristic equation: det(A - λI) = 0. For each eigenvalue λ, find eigenvectors by solving (A - λI)v = 0. For an n×n matrix, the characteristic polynomial is degree n. The sum of eigenvalues equals the trace. The product of eigenvalues equals the determinant. Eigenvalues of a triangular matrix are its diagonal entries. Algebraic multiplicity counts eigenvalue repetitions in the characteristic polynomial; geometric multiplicity counts independent eigenvectors. Geometric multiplicity ≤ algebraic multiplicity.',
        learningObjectives: [
          'Find eigenvalues from the characteristic equation',
          'Find eigenvectors for each eigenvalue',
          'Interpret eigenvalues geometrically',
          'Understand algebraic and geometric multiplicity',
        ],
        keywords: ['eigenvalue', 'eigenvector', 'characteristic_equation', 'characteristic_polynomial', 'multiplicity', 'eigenspace'],
        difficulty: 'advanced',
        prerequisites: ['Determinants', 'Linear Independence and Basis'],
        estimatedMinutes: 60,
        questions: [
          {
            id: 'q_eigen_0', type: 'mcq', difficulty: 'easy', category: 'recall',
            text: 'The eigenvalues of a triangular matrix are:',
            options: ['Its off-diagonal entries', 'Its diagonal entries', 'Its determinant', 'The inverse of its trace'],
            correctAnswer: 'Its diagonal entries',
            explanation: 'For a triangular matrix, det(A - λI) = Π(a_{ii} - λ), so the eigenvalues are the diagonal entries.',
            points: 1,
          },
          {
            id: 'q_eigen_1', type: 'true_false', difficulty: 'easy', category: 'recall',
            text: 'Eigenvectors corresponding to distinct eigenvalues are linearly independent.',
            options: ['True', 'False'],
            correctAnswer: 'True',
            explanation: 'This is a fundamental theorem: eigenvectors for distinct eigenvalues are always linearly independent.',
            points: 1,
          },
          {
            id: 'q_eigen_2', type: 'numerical', difficulty: 'medium', category: 'application',
            text: 'A 2×2 matrix has trace 8 and determinant 15. What are the eigenvalues?',
            correctAnswer: '3 and 5',
            explanation: 'Sum = 8, product = 15. Solving λ² - 8λ + 15 = 0 gives λ = 3, 5.',
            points: 2,
          },
          {
            id: 'q_eigen_3', type: 'short_answer', difficulty: 'medium', category: 'application',
            text: "What is the characteristic equation of a 2×2 matrix in terms of trace t and determinant d?",
            correctAnswer: "λ² - tλ + d = 0",
            explanation: "The characteristic polynomial is λ² - tr(A)λ + det(A) = 0.",
            points: 2,
          },
          {
            id: 'q_eigen_4', type: 'mcq', difficulty: 'hard', category: 'critical_thinking',
            text: 'If A has eigenvalue λ, what is the eigenvalue of A^{-1} (assuming invertible)?',
            options: ['λ', '-λ', '1/λ', 'λ²'],
            correctAnswer: '1/λ',
            explanation: 'If Av = λv, then v = λA^{-1}v, so A^{-1}v = (1/λ)v. The eigenvalue of A^{-1} is 1/λ.',
            points: 3,
          },
          {
            id: 'q_eigen_5', type: 'fill_blank', difficulty: 'easy', category: 'recall',
            text: 'The set of all eigenvectors for eigenvalue λ, plus the zero vector, is called the ____.',
            options: ['column space', 'null space of (A - λI)', 'row space', 'span'],
            correctAnswer: 'null space of (A - λI)',
            explanation: 'The eigenspace for λ is N(A - λI), the set of all solutions to (A - λI)v = 0.',
            points: 1,
          },
          {
            id: 'q_eigen_6', type: 'scenario', difficulty: 'hard', category: 'critical_thinking',
            text: 'A 3×3 matrix has eigenvalues 1, 1, 2 but only 2 independent eigenvectors. What can we conclude?',
            options: ['The matrix is diagonalizable', 'The matrix is not diagonalizable', 'The matrix is invertible', 'The matrix is singular'],
            correctAnswer: 'The matrix is not diagonalizable',
            explanation: 'With geometric multiplicity < algebraic multiplicity for λ=1 (2 vectors needed but only 1 found), the matrix is defective and not diagonalizable.',
            points: 3,
          },
          {
            id: 'q_eigen_7', type: 'numerical', difficulty: 'medium', category: 'application',
            text: 'What is the product of eigenvalues of a 4×4 matrix with determinant 24?',
            correctAnswer: '24',
            explanation: 'The product of eigenvalues equals the determinant: 24.',
            points: 2,
          },
        ],
        assignments: [
          {
            id: 'a_eigen_0', title: 'Eigenvalue Discovery',
            instructions: 'Find eigenvalues and eigenvectors for 8 matrices of sizes 2×2, 3×3, and one 4×4. For each: (1) Write the characteristic polynomial, (2) Find all eigenvalues, (3) Find eigenvectors for each eigenvalue, (4) Verify Av = λv. For defective matrices, explain why.',
            marks: 60, estimatedMinutes: 110,
            answerKey: '2×2: 5 marks each (char poly: 1, eigenvalues: 2, eigenvectors: 2). 3×3: 8 marks each. 4×4: 12 marks. Verification: 2 marks each.',
            rubric: 'Correct char poly: 1-2 marks. Correct eigenvalues: 2-3 marks. Correct eigenvectors: 2-3 marks. Verified: 2 marks.',
            type: 'homework',
          },
        ],
        videos: [
          { id: 'v_eigen_0', youtubeId: 'dummy16', title: 'Eigenvectors and Eigenvalues', thumbnail: '', duration: '15:00', channelName: '3Blue1Brown', description: 'Geometric intuition of eigenvectors and eigenvalues.', embedUrl: 'https://www.youtube.com/embed/dummy16', relevance: 0.95 },
          { id: 'v_eigen_1', youtubeId: 'dummy17', title: 'Finding Eigenvalues and Eigenvectors', thumbnail: '', duration: '24:00', channelName: 'Professor Leonard', description: 'Step-by-step computation of eigenvalues and eigenvectors.', embedUrl: 'https://www.youtube.com/embed/dummy17', relevance: 0.9 },
        ],
      },
      {
        title: 'Diagonalization',
        summary: 'A matrix A is diagonalizable if it has n independent eigenvectors, allowing A = PDP^{-1} where D is the diagonal matrix of eigenvalues.',
        notes: 'If A has n linearly independent eigenvectors, then A = PDP^{-1} where P has eigenvectors as columns and D = diag(λ₁, ..., λₙ). This is the eigen decomposition. Powers: A^k = PD^kP^{-1}. This makes computing A^k trivial. A matrix is diagonalizable iff the geometric multiplicity of every eigenvalue equals its algebraic multiplicity. Distinct eigenvalues guarantee diagonalizability (but the converse is false). Symmetric matrices are always diagonalizable with orthogonal eigenvectors (A = QΛQ^T). Applications include computing Fibonacci numbers, Markov chains, and solving systems of differential equations.',
        learningObjectives: [
          'Determine if a matrix is diagonalizable',
          'Compute the eigen decomposition A = PDP^{-1}',
          'Use diagonalization to compute matrix powers',
          'Diagonalize symmetric matrices orthogonally',
        ],
        keywords: ['diagonalization', 'eigen_decomposition', 'defective', 'symmetric_matrix', 'orthogonal_diagonalization', 'spectral_theorem'],
        difficulty: 'advanced',
        prerequisites: ['Eigenvalues and Eigenvectors', 'Linear Independence and Basis'],
        estimatedMinutes: 55,
        questions: [
          {
            id: 'q_diag_0', type: 'mcq', difficulty: 'easy', category: 'recall',
            text: 'In A = PDP^{-1}, the columns of P are:',
            options: ['Eigenvalues', 'Eigenvectors of A', 'Standard basis vectors', 'Rows of A'],
            correctAnswer: 'Eigenvectors of A',
            explanation: 'The columns of P are linearly independent eigenvectors of A.',
            points: 1,
          },
          {
            id: 'q_diag_1', type: 'true_false', difficulty: 'easy', category: 'recall',
            text: 'Every square matrix is diagonalizable.',
            options: ['True', 'False'],
            correctAnswer: 'False',
            explanation: 'A matrix must have n linearly independent eigenvectors to be diagonalizable. Defective matrices (missing eigenvectors) are not diagonalizable.',
            points: 1,
          },
          {
            id: 'q_diag_2', type: 'numerical', difficulty: 'medium', category: 'application',
            text: 'If A = PDP^{-1} with λ = [2, 3], what is det(A)?',
            correctAnswer: '6',
            explanation: 'det(A) = det(PDP^{-1}) = det(D) = product of eigenvalues = 2×3 = 6.',
            points: 2,
          },
          {
            id: 'q_diag_3', type: 'short_answer', difficulty: 'medium', category: 'application',
            text: 'If A = PDP^{-1} and D = diag(2, 4), what is A³ (in terms of P, D)?',
            correctAnswer: 'P diag(8, 64) P^{-1}',
            explanation: 'A³ = PD³P^{-1} = P diag(2³, 4³) P^{-1} = P diag(8, 64) P^{-1}.',
            points: 2,
          },
          {
            id: 'q_diag_4', type: 'mcq', difficulty: 'hard', category: 'critical_thinking',
            text: 'A symmetric matrix is always:',
            options: ['Singular', 'Diagonalizable', 'Defective', 'Invertible'],
            correctAnswer: 'Diagonalizable',
            explanation: 'The Spectral Theorem guarantees that every symmetric matrix has an orthogonal eigen decomposition, i.e., it is always diagonalizable.',
            points: 3,
          },
          {
            id: 'q_diag_5', type: 'fill_blank', difficulty: 'hard', category: 'critical_thinking',
            text: 'A matrix that is not diagonalizable is called ____.',
            options: ['singular', 'defective', 'degenerate', 'deficient'],
            correctAnswer: 'defective',
            explanation: 'A defective matrix is one that does not have a complete set of eigenvectors, hence not diagonalizable.',
            points: 2,
          },
          {
            id: 'q_diag_6', type: 'scenario', difficulty: 'hard', category: 'critical_thinking',
            text: 'A 2×2 matrix has eigenvalues 0 and 3. Is it invertible?',
            options: ['Yes', 'No'],
            correctAnswer: 'No',
            explanation: 'Eigenvalue 0 means det(A) = 0×3 = 0, so the matrix is singular (not invertible).',
            points: 3,
          },
        ],
        assignments: [
          {
            id: 'a_diag_0', title: 'Diagonalization Mastery',
            instructions: '(1) Determine diagonalizability for 6 matrices. (2) Compute A = PDP^{-1} for 3 diagonalizable ones. (3) Use diagonalization to compute A^5 for each. (4) Prove that if λ is an eigenvalue of A, then λ^k is an eigenvalue of A^k.',
            marks: 50, estimatedMinutes: 90,
            answerKey: 'Diagonalizability test: 3 marks each. Eigen decomposition: 5 marks each. A^5 computation: 4 marks each. Proof: 8 marks.',
            rubric: 'Correct test: 3 marks. Correct decomposition: 5 marks. Correct power: 4 marks. Rigorous proof: 8 marks.',
            type: 'worksheet',
          },
        ],
        videos: [
          { id: 'v_diag_0', youtubeId: 'dummy18', title: 'Matrix Diagonalization', thumbnail: '', duration: '28:00', channelName: 'MIT OpenCourseWare', description: 'Strang lecture on diagonalization and matrix powers.', embedUrl: 'https://www.youtube.com/embed/dummy18', relevance: 0.95 },
        ],
      },
      {
        title: 'Applications of Eigenvalues',
        summary: 'Eigenvalues have wide applications including Markov chains, population models, Google PageRank, vibration analysis, and principal component analysis (PCA).',
        notes: 'Markov chains: the steady-state vector is the eigenvector corresponding to eigenvalue 1. PageRank: the dominant eigenvector of the Google matrix gives page rankings. Differential equations: dx/dt = Ax has solution x(t) = c₁e^{λ₁t}v₁ + ... + cₙe^{λₙt}vₙ. PCA: the eigenvectors of the covariance matrix give the principal components (directions of maximum variance). The corresponding eigenvalues give the variance explained. Dynamical systems: stability is determined by eigenvalues (stable if all |λ| < 1 for discrete, Re(λ) < 0 for continuous).',
        learningObjectives: [
          'Find steady states of Markov chains',
          'Solve systems of differential equations using eigenvalues',
          'Apply PCA concepts using eigen decomposition',
          'Determine system stability from eigenvalues',
        ],
        keywords: ['markov_chain', 'page_rank', 'differential_equations', 'pca', 'steady_state', 'stability'],
        difficulty: 'advanced',
        prerequisites: ['Diagonalization'],
        estimatedMinutes: 55,
        questions: [
          {
            id: 'q_appeigen_0', type: 'mcq', difficulty: 'easy', category: 'recall',
            text: 'The steady-state vector of a Markov chain is the eigenvector for eigenvalue:',
            options: ['0', '1', '-1', '2'],
            correctAnswer: '1',
            explanation: 'The steady state satisfies Pv = v, so v is the eigenvector with eigenvalue 1.',
            points: 1,
          },
          {
            id: 'q_appeigen_1', type: 'true_false', difficulty: 'easy', category: 'recall',
            text: 'A Markov matrix has column sums equal to 1.',
            options: ['True', 'False'],
            correctAnswer: 'True',
            explanation: 'Markov (stochastic) matrices have non-negative entries with each column summing to 1, representing probabilities.',
            points: 1,
          },
          {
            id: 'q_appeigen_2', type: 'numerical', difficulty: 'medium', category: 'application',
            text: 'A 2-state Markov chain has eigenvalues 1 and 0.5. After many steps, this chain will _____? Answer: converge or diverge.',
            correctAnswer: 'converge',
            explanation: '|0.5| < 1, so the system converges to the steady state (eigenvector for λ=1).',
            points: 2,
          },
          {
            id: 'q_appeigen_3', type: 'short_answer', difficulty: 'medium', category: 'application',
            text: 'The PageRank algorithm finds the dominant eigenvector of which matrix?',
            correctAnswer: 'Google matrix',
            explanation: 'PageRank computes the principal eigenvector of the Google matrix (a modified link matrix), ranking pages by their entries.',
            points: 2,
          },
          {
            id: 'q_appeigen_4', type: 'mcq', difficulty: 'hard', category: 'critical_thinking',
            text: 'In PCA, the variance explained by each principal component is proportional to:',
            options: ['The eigenvectors', 'The eigenvalues', 'The determinant', 'The condition number'],
            correctAnswer: 'The eigenvalues',
            explanation: 'Each eigenvalue of the covariance matrix gives the variance explained by the corresponding principal component.',
            points: 3,
          },
          {
            id: 'q_appeigen_5', type: 'fill_blank', difficulty: 'hard', category: 'critical_thinking',
            text: 'The solution to dx/dt = Ax is stable if all eigenvalues have ____ real parts.',
            options: ['positive', 'negative', 'zero', 'non-zero'],
            correctAnswer: 'negative',
            explanation: 'If Re(λ) < 0 for all eigenvalues, e^{λt} decays to 0 as t → ∞, so the system is stable.',
            points: 3,
          },
          {
            id: 'q_appeigen_6', type: 'scenario', difficulty: 'hard', category: 'critical_thinking',
            text: 'A discrete dynamical system x_{k+1} = Ax_k has eigenvalues 0.2, -0.8, and 1.1. Is this system stable?',
            options: ['Yes', 'No'],
            correctAnswer: 'No',
            explanation: 'Stability requires |λ| < 1 for all eigenvalues. Since |1.1| > 1, the system diverges.',
            points: 3,
          },
        ],
        assignments: [
          {
            id: 'a_appeigen_0', title: 'Eigenvalue Applications Project',
            instructions: '(1) Model a 3-state Markov process (weather/climate) and find the steady state. (2) Solve dx/dt = Ax for a 2×2 system. (3) Perform PCA on a small dataset: find principal components and the variance explained by each. (4) Analyze the stability of 3 dynamical systems.',
            marks: 60, estimatedMinutes: 120,
            answerKey: 'Markov model: 12 marks. Differential equations: 15 marks. PCA: 18 marks. Stability: 15 marks.',
            rubric: 'Correct Markov model: 12 marks. Correct DE solution: 15 marks. Correct PCA: 18 marks. Correct stability: 15 marks.',
            type: 'project',
          },
        ],
        videos: [
          { id: 'v_appeigen_0', youtubeId: 'dummy19', title: 'Applications of Eigenvalues', thumbnail: '', duration: '25:00', channelName: '3Blue1Brown', description: 'Real-world applications of eigenvalues in Markov chains, differential equations, and PCA.', embedUrl: 'https://www.youtube.com/embed/dummy19', relevance: 0.95 },
        ],
      },
    ],
  },
];

async function main() {
  initializeFirebase();
  const db = getAdminFirestore();
  const now = new Date().toISOString();

  console.log('Creating Linear Algebra subject...');

  const subjectRef = db.collection('subjects').doc();
  const subjectId = subjectRef.id;
  await subjectRef.set({
    name: 'Linear Algebra',
    code: 'MATH221',
    icon: 'calculate',
    color: '#6366f1',
    category: 'STEM',
    isActive: true,
    description: 'A first course in linear algebra covering systems of equations, matrix theory, determinants, vector spaces, eigenvalues, and applications.',
    createdAt: now,
    updatedAt: now,
  });
  console.log(`Created subject: ${subjectId}`);

  console.log('Creating textbook...');
  const textbookRef = db.collection('textbooks').doc();
  const textbookId = textbookRef.id;
  await textbookRef.set({
    subjectId,
    title: 'Linear Algebra - First Course',
    author: 'Course Materials',
    description: 'A comprehensive first course in linear algebra with 5 chapters covering core topics.',
    status: 'processing',
    processingProgress: 0,
    processingStage: 'Creating chapters...',
    createdAt: now,
    updatedAt: now,
  });
  console.log(`Created textbook: ${textbookId}`);

  let totalChapters = 0;
  let totalConcepts = 0;

  for (let ci = 0; ci < CHAPTERS.length; ci++) {
    const chData = CHAPTERS[ci];
    const chapterId = `ch_${textbookId}_${ci}`;

    await db
      .collection('textbooks')
      .doc(textbookId)
      .collection('chapters')
      .doc(chapterId)
      .set({
        id: chapterId,
        textbookId,
        title: chData.title,
        order: ci,
        description: chData.description,
        chapterCount: chData.concepts.length,
        createdAt: now,
      });
    totalChapters++;

    for (let coi = 0; coi < chData.concepts.length; coi++) {
      const cpData = chData.concepts[coi];
      const conceptId = `concept_${textbookId}_ch${ci}_co${coi}`;

      const questions = cpData.questions.map((q) => ({
        id: q.id,
        type: q.type,
        difficulty: q.difficulty,
        category: q.category,
        text: q.text,
        ...(q.options ? { options: q.options } : {}),
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        points: q.points,
      }));

      const assignments = cpData.assignments.map((a) => ({
        id: a.id,
        title: a.title,
        instructions: a.instructions,
        marks: a.marks,
        estimatedMinutes: a.estimatedMinutes,
        answerKey: a.answerKey,
        rubric: a.rubric,
        type: a.type,
      }));

      const videos = cpData.videos.map((v) => ({
        id: v.id,
        youtubeId: v.youtubeId,
        title: v.title,
        thumbnail: v.thumbnail,
        duration: v.duration,
        channelName: v.channelName,
        description: v.description,
        embedUrl: v.embedUrl,
        relevance: v.relevance,
      }));

      await db
        .collection('textbooks')
        .doc(textbookId)
        .collection('chapters')
        .doc(chapterId)
        .collection('concepts')
        .doc(conceptId)
        .set({
          id: conceptId,
          chapterId,
          textbookId,
          title: cpData.title,
          summary: cpData.summary,
          notes: cpData.notes,
          learningObjectives: cpData.learningObjectives,
          keywords: cpData.keywords,
          difficulty: cpData.difficulty,
          prerequisites: cpData.prerequisites,
          estimatedMinutes: cpData.estimatedMinutes,
          order: coi,
          videos,
          questionBank: questions,
          assignments,
          createdAt: now,
        });
      totalConcepts++;
      console.log(`  Concept ${ci+1}.${coi+1}: ${cpData.title} (${questions.length} questions, ${assignments.length} assignments, ${videos.length} videos)`);
    }
  }

  await textbookRef.update({
    status: 'ready',
    chapterCount: totalChapters,
    processingProgress: 100,
    processingStage: 'Complete',
    updatedAt: new Date().toISOString(),
  });

  const allQuestions = CHAPTERS.reduce((s, ch) =>
    s + ch.concepts.reduce((cs, cp) => cs + cp.questions.length, 0), 0);
  const allAssignments = CHAPTERS.reduce((s, ch) =>
    s + ch.concepts.reduce((cs, cp) => cs + cp.assignments.length, 0), 0);
  const allVideos = CHAPTERS.reduce((s, ch) =>
    s + ch.concepts.reduce((cs, cp) => cs + cp.videos.length, 0), 0);

  console.log('\n=== Done! ===');
  console.log(`Subject: Linear Algebra (${subjectId})`);
  console.log(`Textbook: Linear Algebra - First Course (${textbookId})`);
  console.log(`Chapters: ${totalChapters}`);
  console.log(`Concepts: ${totalConcepts}`);
  console.log(`Questions: ${allQuestions}`);
  console.log(`Assignments: ${allAssignments}`);
  console.log(`Videos: ${allVideos}`);
  console.log(`\nVisit: https://school-lms-nine-phi.vercel.app/student/textbooks/${textbookId}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});

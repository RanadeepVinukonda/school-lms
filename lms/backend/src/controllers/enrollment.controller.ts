import type { Request, Response } from 'express';
import { getEnrollmentsByStudent } from '../services/course.service';
import { getTextbooksBySubject } from '../services/textbook.service';
import { getAllConceptReleases } from '../services/textbook.service';
import { collections } from '../firebase/firestore';

/**
 * Get current student's enrollments and a consolidated list of concept release statuses 
 * for all textbooks they have access to.
 */
export async function getMyEnrollments(req: Request, res: Response) {
  const studentId = req.user.id;
  const studentClassId = req.user.classId;
  const classId = studentClassId;

  // Fetch user enrollments
  const enrollments = await getEnrollmentsByStudent(studentId);

  // Extract course IDs from enrollments
  const courseIds = enrollments.map((e) => e.courseId);

  // Fetch class document to get subjectIds
  const classDoc = classId ? await collections.classes().doc(classId).get() : null;
  const subjectIds = classDoc?.data()?.subjectIds || [];

  // Fetch textbooks for all subjects
  const textbooks = [];
  for (const subjectId of subjectIds) {
    const subjectTextbooks = await getTextbooksBySubject(subjectId);
    textbooks.push(...subjectTextbooks);
  }

  // Fetch concept release status for all textbooks
  const releasePromises = textbooks.map((tb) => getAllConceptReleases(tb.id));
  const releaseArrays = await Promise.all(releasePromises);
  const conceptReleases = releaseArrays.flat();

  res.json({
    success: true,
    data: {
      enrollments,       // Course enrollments
      conceptReleases,   // All concept release statuses (textbookId, conceptId, questionBankReleased, etc)
    }
  });
}
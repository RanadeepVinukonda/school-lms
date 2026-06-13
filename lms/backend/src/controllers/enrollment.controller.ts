import type { Request, Response } from 'express';
import { collections, getCollection } from '../firebase/firestore';

/**
 * Get current student's enrollments and a consolidated list of concept release statuses 
 * for all textbooks they have access to.
 */
export async function getMyEnrollments(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const studentId = req.user.uid;
  
  // Fetch student user doc to get classId
  const userDoc = await collections.users().doc(studentId).get();
  const studentClassId = userDoc.exists ? (userDoc.data()?.classId as string | undefined) : undefined;

  // Fetch student enrollments
  const enrollmentsSnap = await collections.enrollment()
    .where('studentId', '==', studentId)
    .where('status', '==', 'active')
    .get();
  const enrollments = enrollmentsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  // Fetch textbooks for the student's class
  const textbooks: any[] = [];
  if (studentClassId) {
    const textbooksSnap = await collections.textbooks()
      .where('classId', '==', studentClassId)
      .get();
    textbooks.push(...textbooksSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  }

  // Fetch concept release statuses for all textbooks
  const conceptReleases: any[] = [];
  if (studentClassId && textbooks.length > 0) {
    for (const tb of textbooks) {
      const releasesSnap = await getCollection('conceptReleases')
        .where('textbookId', '==', tb.id)
        .where('classId', '==', studentClassId)
        .get();
      conceptReleases.push(...releasesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }
  }

  res.json({
    success: true,
    data: {
      enrollments,       // Course enrollments
      conceptReleases,   // All concept release statuses (textbookId, conceptId, questionBankReleased, etc)
    }
  });
}
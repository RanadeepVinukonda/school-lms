import { Router } from 'express';
import schoolsRoutes from '../schools.routes';
import classRoutes from '../class.routes';
import subjectRoutes from '../subject.routes';
import classroomRoutes from '../classroom.routes';
import academicYearRoutes from '../academic-year.routes';
import enrollmentRoutes from '../enrollment.routes';
import teacherClassSubjectRoutes from '../teacher-class-subject.routes';
import teacherVideoRoutes from '../teacher-video.routes';

const router = Router();

router.use('/schools', schoolsRoutes);
router.use('/classes', classRoutes);
router.use('/subjects', subjectRoutes);
router.use('/classroom', classroomRoutes);
router.use('/academic-years', academicYearRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/teacher-class-subject', teacherClassSubjectRoutes);
router.use('/teacher-videos', teacherVideoRoutes);

export default router;

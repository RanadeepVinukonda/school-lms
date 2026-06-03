export interface Class {
  id: string;
  name: string;
  code: string;
  description?: string;
  academicYear: string;
  grade: string;
  sectionCount: number;
  studentCount: number;
  teacherCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Section {
  id: string;
  classId: string;
  name: string;
  code: string;
  roomNumber?: string;
  capacity: number;
  enrolledCount: number;
  teacherId?: string;
  teacherName?: string;
  schedule: Schedule[];
  isActive: boolean;
}

export interface Schedule {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
  startTime: string;
  endTime: string;
  subjectId?: string;
  room?: string;
}

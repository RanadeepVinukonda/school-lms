export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  activeCourses: number;
  totalEnrollments: number;
  averageGrade: number;
  passRate: number;
  completionRate: number;
}

export interface PerformanceData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
}

export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

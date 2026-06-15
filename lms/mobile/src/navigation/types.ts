export type AuthStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
};

export type StudentStackParamList = {
  StudentDashboard: undefined;
  StudentTasks: undefined;
  StudentExams: undefined;
};

export type TeacherStackParamList = {
  TeacherDashboard: undefined;
};

export type AdminStackParamList = {
  AdminDashboard: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Student: undefined;
  Teacher: undefined;
  Admin: undefined;
  NotFound: undefined;
};

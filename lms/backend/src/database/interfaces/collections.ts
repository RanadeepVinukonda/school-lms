export interface Collection<T> {
  get(id: string): Promise<T | null>;
  set(id: string, data: T): Promise<void>;
  update(id: string, data: Partial<T>): Promise<void>;
  delete(id: string): Promise<void>;
  list(query?: any): Promise<T[]>;
}

export interface UserCollection extends Collection<any> {}
export interface GradeCollection extends Collection<any> {}
export interface NotificationCollection extends Collection<any> {}
export interface AssignmentCollection extends Collection<any> {}
export interface AttendanceCollection extends Collection<any> {}
export interface ConceptCollection extends Collection<any> {}
export interface TextbookCollection extends Collection<any> {}
export interface ChapterCollection extends Collection<any> {}
export interface ClassCollection extends Collection<any> {}
export interface SubjectCollection extends Collection<any> {}

// ponytail: in-memory-collections deleted — all exports removed
// Re-import helpers when supabase test mock is written
export const users: any = { clear() {} };
export const grades: any = { clear() {} };
export const assignments: any = { clear() {} };
export const attendance: any = { clear() {} };
export const concepts: any = { clear() {} };
export const textbooks: any = { clear() {} };
export const chapters: any = { clear() {} };
export const classes: any = { clear() {} };
export const subjects: any = { clear() {} };

export function wireCollections() {}

export function clearCollections() {
  users.clear();
  grades.clear();
  assignments.clear();
  attendance.clear();
  concepts.clear();
  textbooks.clear();
  chapters.clear();
  classes.clear();
  subjects.clear();
}

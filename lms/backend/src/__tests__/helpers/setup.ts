import {
  InMemoryUserCollection,
  InMemoryGradeCollection,
  InMemoryNotificationCollection,
  InMemoryAssignmentCollection,
  InMemoryAttendanceCollection,
  InMemoryConceptCollection,
  InMemoryTextbookCollection,
  InMemoryChapterCollection,
  InMemoryClassCollection,
  InMemorySubjectCollection,
} from '../../database/in-memory-collections';
import { setUserCollection } from '../../services/user.service';
import { setGradeCollection } from '../../services/grade.service';
import { setNotificationCollection } from '../../services/notification.service';
import { setAssignmentCollection } from '../../services/assignment.service';
import { setAttendanceCollection } from '../../services/attendance.service';

export const users = new InMemoryUserCollection();
export const grades = new InMemoryGradeCollection();
export const notifications = new InMemoryNotificationCollection();
export const assignments = new InMemoryAssignmentCollection();
export const attendance = new InMemoryAttendanceCollection();
export const concepts = new InMemoryConceptCollection();
export const textbooks = new InMemoryTextbookCollection();
export const chapters = new InMemoryChapterCollection();
export const classes = new InMemoryClassCollection();
export const subjects = new InMemorySubjectCollection();

export function wireCollections() {
  setUserCollection(users);
  setGradeCollection(grades);
  setNotificationCollection(notifications);
  setAssignmentCollection(assignments);
  setAttendanceCollection(attendance);
}

export function clearCollections() {
  users.clear();
  grades.clear();
  notifications.clear();
  assignments.clear();
  attendance.clear();
  concepts.clear();
  textbooks.clear();
  chapters.clear();
  classes.clear();
  subjects.clear();
}

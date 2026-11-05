/**
 * Generates a Student ID in the format required by Requirement 5.2:
 *   [AcademicYear]_[ClassCode]_[RollNo]
 *
 * RollNo is zero-padded to two digits.
 *
 * @example
 *   generateStudentId("2026-2027", "10A", 5)  → "2026-2027_10A_05"
 *   generateStudentId("2026-2027", "10A", 12) → "2026-2027_10A_12"
 */
export function generateStudentId(
  academicYear: string,
  classCode: string,
  rollNo: number
): string {
  const paddedRoll = String(rollNo).padStart(2, '0');
  const cleanYear = academicYear.match(/\d{4}/)?.[0] || academicYear.replace(/[^0-9]/g, '');
  const cleanClass = classCode.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${cleanClass}${paddedRoll}${cleanYear}`;
}

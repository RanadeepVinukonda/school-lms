export function buildOutstandingReport(
  structures: Array<Record<string, unknown>>,
  payments: Array<Record<string, unknown>>,
  students: Array<Record<string, unknown>>,
  classMap: Record<string, string>
) {
  const structuresByClass = new Map<string | null, Array<Record<string, unknown>>>();
  for (const f of structures) {
    const classId = (f.class_id as string) || null;
    const arr = structuresByClass.get(classId) ?? [];
    arr.push(f);
    structuresByClass.set(classId, arr);
  }

  const paymentsByStudent = new Map<string, Array<Record<string, unknown>>>();
  for (const p of payments) {
    const sid = p.student_id as string;
    const arr = paymentsByStudent.get(sid) ?? [];
    arr.push(p);
    paymentsByStudent.set(sid, arr);
  }

  const report = students.map((s) => {
    const studentClassId = (s.class_id as string) || (Array.isArray(s.class_ids) ? (s.class_ids as string[])[0] : null);
    const classStructures = [
      ...(structuresByClass.get(studentClassId) ?? []),
      ...(structuresByClass.get(null) ?? []),
    ];
    const totalDue = classStructures.reduce((sum, f) => sum + Number(f.amount), 0);
    const studentPays = paymentsByStudent.get(s.id as string) ?? [];
    const totalPaid = studentPays.reduce((sum, p) => sum + Number(p.amount), 0);

    const paymentsByStructure = new Map<string, Array<Record<string, unknown>>>();
    for (const p of studentPays) {
      const fid = p.fee_structure_id as string;
      const arr = paymentsByStructure.get(fid) ?? [];
      arr.push(p);
      paymentsByStructure.set(fid, arr);
    }

    const schedules = classStructures.map((f) => {
      const paid = paymentsByStructure.get(f.id as string) ?? [];
      return {
        scheduleId: f.id,
        name: f.name,
        amount: Number(f.amount),
        paid: paid.reduce((acc, p) => acc + Number(p.amount), 0),
        dueDate: f.due_date || f.dueDate,
      };
    });
    return {
      studentId: s.id,
      studentName: (s.display_name as string) || (s.id as string),
      className: classMap[studentClassId as string] || '-',
      totalDue,
      totalPaid,
      balance: totalDue - totalPaid,
      schedules,
    };
  });
  return report.filter((r) => r.totalDue > 0 || r.totalPaid > 0);
}

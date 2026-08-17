import { db } from '../database/store';
import { generateBatchesForClass, solveTimetable } from '../scheduler/solver';
import {
  Classroom,
  Lab,
  StudentClass,
  Teacher,
  Subject,
  ClassSubject,
  TimingConfig
} from '../../src/types';

export async function seedDatabase(): Promise<void> {
  // Clear existing
  await db.clearAll();

  // 1. Classrooms
  const classrooms: Classroom[] = [
    {
      id: 'room_101',
      name: 'Room 101',
      roomNumber: '101',
      capacity: 80,
      building: 'Main Building',
      floor: 1,
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      availablePeriods: [1, 2, 3, 4, 5, 6],
    },
    {
      id: 'room_102',
      name: 'Room 102',
      roomNumber: '102',
      capacity: 70,
      building: 'Main Building',
      floor: 1,
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      availablePeriods: [1, 2, 3, 4, 5, 6],
    },
    {
      id: 'room_103',
      name: 'Room 103',
      roomNumber: '103',
      capacity: 65,
      building: 'Science Block',
      floor: 2,
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      availablePeriods: [1, 2, 3, 4, 5, 6],
    },
  ];

  for (const c of classrooms) await db.saveClassroom(c);

  // 2. Labs
  const labs: Lab[] = [
    {
      id: 'lab_html',
      name: 'HTML Lab',
      labCode: 'LAB-HTML',
      labType: 'Web Technologies',
      benchCapacity: 35,
      building: 'Tech Wing',
      floor: 1,
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      availablePeriods: [1, 2, 3, 4, 5, 6],
    },
    {
      id: 'lab_java',
      name: 'Java Lab',
      labCode: 'LAB-JAVA',
      labType: 'Software Systems',
      benchCapacity: 35,
      building: 'Tech Wing',
      floor: 1,
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      availablePeriods: [1, 2, 3, 4, 5, 6],
    },
    {
      id: 'lab_python',
      name: 'Python Lab',
      labCode: 'LAB-PY',
      labType: 'Data Science & AI',
      benchCapacity: 40,
      building: 'Tech Wing',
      floor: 2,
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      availablePeriods: [1, 2, 3, 4, 5, 6],
    },
    {
      id: 'lab_dbms',
      name: 'DBMS Lab',
      labCode: 'LAB-DBMS',
      labType: 'Database Systems',
      benchCapacity: 30,
      building: 'Tech Wing',
      floor: 2,
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      availablePeriods: [1, 2, 3, 4, 5, 6],
    },
  ];

  for (const l of labs) await db.saveLab(l);

  // 3. Student Classes & Automatic Batches
  const rawClasses = [
    { id: 'class_tyit1', name: 'TYIT1', department: 'Information Technology', academicYear: 'Third Year', division: '1', studentCount: 70 },
    { id: 'class_tyit2', name: 'TYIT2', department: 'Information Technology', academicYear: 'Third Year', division: '2', studentCount: 65 },
    { id: 'class_tycs1', name: 'TYCS1', department: 'Computer Science', academicYear: 'Third Year', division: '1', studentCount: 60 },
  ];

  const studentClasses: StudentClass[] = rawClasses.map(rc => {
    const batches = generateBatchesForClass(rc, 35);
    return { ...rc, batches };
  });

  for (const sc of studentClasses) await db.saveClass(sc);

  // 4. Teachers
  const teachers: Teacher[] = [
    { id: 't_sharma', name: 'Prof. Sharma', employeeId: 'EMP101', department: 'Information Technology', email: 'sharma@college.edu', phone: '+91 9876543210', maxHoursPerDay: 6 },
    { id: 't_patel', name: 'Prof. Patel', employeeId: 'EMP102', department: 'Computer Science', email: 'patel@college.edu', phone: '+91 9876543211', maxHoursPerDay: 6 },
    { id: 't_khan', name: 'Prof. Khan', employeeId: 'EMP103', department: 'Information Technology', email: 'khan@college.edu', phone: '+91 9876543212', maxHoursPerDay: 6 },
    { id: 't_mehta', name: 'Prof. Mehta', employeeId: 'EMP104', department: 'Computer Science', email: 'mehta@college.edu', phone: '+91 9876543213', maxHoursPerDay: 6 },
  ];

  for (const t of teachers) await db.saveTeacher(t);

  // 5. Subjects Master (Common reusable subjects)
  const subjects: Subject[] = [
    { id: 'subj_math', name: 'Mathematics', code: 'MATH101', type: 'THEORY' },
    { id: 'subj_java', name: 'Java Programming', code: 'CS102', type: 'BOTH' },
    { id: 'subj_web', name: 'Web Programming', code: 'WP101', type: 'BOTH' },
    { id: 'subj_dbms', name: 'Database Systems', code: 'IT201', type: 'BOTH' },
    { id: 'subj_ai', name: 'Artificial Intelligence', code: 'CS301', type: 'BOTH' },
    { id: 'subj_python', name: 'Python Programming', code: 'CS202', type: 'BOTH' },
    { id: 'subj_cloud', name: 'Cloud Computing', code: 'CS302', type: 'THEORY' },
    { id: 'subj_cyber', name: 'Cyber Security', code: 'CS303', type: 'THEORY' },
  ];

  for (const s of subjects) await db.saveSubject(s);

  // 6. Class Subject Assignments (Explicit Class-Specific Scheduling Rules)
  const classSubjects: ClassSubject[] = [
    // TYIT1 Assignments
    { id: 'cs_tyit1_math', classId: 'class_tyit1', subjectId: 'subj_math', teacherId: 't_mehta', weeklyTheoryHours: 4, weeklyPracticalHours: 0, labId: null, requiresBatches: false },
    { id: 'cs_tyit1_java', classId: 'class_tyit1', subjectId: 'subj_java', teacherId: 't_patel', weeklyTheoryHours: 3, weeklyPracticalHours: 2, labId: 'lab_java', requiresBatches: true },
    { id: 'cs_tyit1_web', classId: 'class_tyit1', subjectId: 'subj_web', teacherId: 't_sharma', weeklyTheoryHours: 3, weeklyPracticalHours: 2, labId: 'lab_html', requiresBatches: true },
    { id: 'cs_tyit1_dbms', classId: 'class_tyit1', subjectId: 'subj_dbms', teacherId: 't_khan', weeklyTheoryHours: 4, weeklyPracticalHours: 2, labId: 'lab_dbms', requiresBatches: true },
    { id: 'cs_tyit1_ai', classId: 'class_tyit1', subjectId: 'subj_ai', teacherId: 't_patel', weeklyTheoryHours: 3, weeklyPracticalHours: 0, labId: null, requiresBatches: false },

    // TYIT2 Assignments
    { id: 'cs_tyit2_math', classId: 'class_tyit2', subjectId: 'subj_math', teacherId: 't_mehta', weeklyTheoryHours: 3, weeklyPracticalHours: 0, labId: null, requiresBatches: false },
    { id: 'cs_tyit2_python', classId: 'class_tyit2', subjectId: 'subj_python', teacherId: 't_patel', weeklyTheoryHours: 4, weeklyPracticalHours: 1, labId: 'lab_python', requiresBatches: true },
    { id: 'cs_tyit2_cloud', classId: 'class_tyit2', subjectId: 'subj_cloud', teacherId: 't_mehta', weeklyTheoryHours: 3, weeklyPracticalHours: 0, labId: null, requiresBatches: false },
    { id: 'cs_tyit2_dbms', classId: 'class_tyit2', subjectId: 'subj_dbms', teacherId: 't_khan', weeklyTheoryHours: 3, weeklyPracticalHours: 2, labId: 'lab_dbms', requiresBatches: true },
    { id: 'cs_tyit2_cyber', classId: 'class_tyit2', subjectId: 'subj_cyber', teacherId: 't_khan', weeklyTheoryHours: 3, weeklyPracticalHours: 0, labId: null, requiresBatches: false },

    // TYCS1 Assignments
    { id: 'cs_tycs1_web', classId: 'class_tycs1', subjectId: 'subj_web', teacherId: 't_patel', weeklyTheoryHours: 2, weeklyPracticalHours: 2, labId: 'lab_html', requiresBatches: true },
    { id: 'cs_tycs1_python', classId: 'class_tycs1', subjectId: 'subj_python', teacherId: 't_sharma', weeklyTheoryHours: 3, weeklyPracticalHours: 2, labId: 'lab_python', requiresBatches: true },
    { id: 'cs_tycs1_java', classId: 'class_tycs1', subjectId: 'subj_java', teacherId: 't_sharma', weeklyTheoryHours: 3, weeklyPracticalHours: 2, labId: 'lab_java', requiresBatches: true },
  ];

  for (const cs of classSubjects) await db.saveClassSubject(cs);

  // 7. Timing Config
  const timingConfig: TimingConfig = {
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    startTime: '09:00',
    endTime: '16:00',
    periodDurationMinutes: 60,
    breaks: [
      {
        name: 'Lunch Break',
        startTime: '13:00',
        endTime: '14:00',
      },
    ],
  };

  await db.saveTimingConfig(timingConfig);

  // 8. Generate initial timetable using solver
  const solverResult = solveTimetable(
    classrooms,
    labs,
    studentClasses,
    teachers,
    subjects,
    classSubjects,
    timingConfig,
    []
  );

  await db.saveTimetableEntries(solverResult.entries);
  await db.saveGenerationRun(solverResult.run);

  console.log(`Demo seed completed successfully. Created ${solverResult.entries.length} scheduled slots.`);
}

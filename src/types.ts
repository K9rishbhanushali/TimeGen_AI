export type ResourceType = 'classroom' | 'lab';
export type SubjectType = 'THEORY' | 'PRACTICAL' | 'BOTH';

export interface Classroom {
  id: string;
  name: string;
  roomNumber: string;
  capacity: number;
  building: string;
  floor: number;
  availableDays: string[];
  availablePeriods: number[];
  createdAt?: string;
}

export interface Lab {
  id: string;
  name: string;
  labCode: string;
  labType: string;
  benchCapacity: number;
  building: string;
  floor: number;
  availableDays: string[];
  availablePeriods: number[];
  assignedTeacherIds?: string[];
  createdAt?: string;
}

export interface Batch {
  id: string;
  classId: string;
  name: string; // e.g. "TYIT1-A"
  studentCount: number;
}

export interface StudentClass {
  id: string;
  name: string; // e.g. "TYIT1"
  department: string;
  academicYear: string;
  division: string;
  studentCount: number;
  batches?: Batch[];
  createdAt?: string;
}

export interface Teacher {
  id: string;
  name: string;
  employeeId: string;
  department: string;
  email: string;
  phone: string;
  maxHoursPerDay: number;
  preferredStartTime?: string;
  preferredEndTime?: string;
  createdAt?: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  type: SubjectType;
  description?: string;
  createdAt?: string;
}

export interface ClassSubject {
  id: string;
  class_id?: string;
  classId: string;
  subject_id?: string;
  subjectId: string;
  teacher_id?: string;
  teacherId: string;
  /** Teachers qualified to teach this class-subject assignment. `teacherId` remains the primary/default teacher. */
  teacherIds?: string[];
  weekly_theory_hours?: number;
  weeklyTheoryHours: number;
  weekly_practical_hours?: number;
  weeklyPracticalHours: number;
  requires_lab?: boolean;
  requiresLab?: boolean;
  lab_id?: string | null;
  labId?: string | null;
  requires_batches?: boolean;
  requiresBatches: boolean;
  /** Optional practical overrides keyed by batch ID. */
  batchTeacherIds?: Record<string, string>;
  batchLabIds?: Record<string, string>;
  createdAt?: string;

  // Populated fields for UI convenience
  subject?: Subject;
  teacher?: Teacher;
  lab?: Lab;
  studentClass?: StudentClass;
}

export type ClassSubjectAssignment = ClassSubject;

export interface TimingBreak {
  id?: string;
  name: string;
  periodIndex?: number;
  durationMinutes?: number;
  startTime?: string;
  endTime?: string;
}

export interface TimingConfig {
  workingDays: string[]; // ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  startTime: string; // "08:00"
  endTime: string; // "16:00"
  periodDurationMinutes: number; // 50
  breakDurationMinutes?: number;
  periodsPerDay?: number;
  breaks: TimingBreak[];
}

export interface TimeSlot {
  id: string;
  label?: string;
  day?: string; // "Monday"
  periodIndex: number; // 1, 2, 3...
  startTime: string; // "08:00"
  endTime: string; // "08:50"
  durationMinutes?: number;
  isBreak: boolean;
  breakName?: string;
}

export interface AvailabilityRule {
  id: string;
  targetType?: 'teacher' | 'classroom' | 'lab' | 'class';
  targetId?: string;
  entityType?: 'teacher' | 'classroom' | 'lab' | 'class';
  entityId?: string;
  day: string;
  periodIndex: number;
  isAvailable?: boolean;
  available?: boolean;
  reason?: string;
}

export interface TimetableEntry {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  periodIndex: number;
  /** Number of consecutive timetable periods occupied by this session. */
  durationPeriods?: number;
  classId: string;
  batchId?: string | null; // null for theory (whole class), batchId for lab practical
  batchName?: string;
  subjectId: string;
  teacherId: string;
  resourceType: ResourceType;
  resourceId: string;
  sessionType?: 'THEORY' | 'PRACTICAL';
  isLocked: boolean;
  notes?: string;
}

export interface GenerationRun {
  id: string;
  createdAt: string;
  classIds: string[];
  qualityScore: number;
  status: 'SUCCESS' | 'FAILED' | 'WARNINGS';
  solverTimeMs: number;
  scheduledHours: number;
  totalRequiredHours: number;
  warnings: string[];
  conflicts: string[];
}

export interface ConflictInfo {
  id: string;
  type: string;
  description: string;
  day: string;
  periodIndex: number;
  involvedIds?: string[];
}

export interface ValidationReport {
  isValid: boolean;
  conflicts: ConflictInfo[];
  warnings: { id: string; description: string }[];
  qualityScore: number;
}

export interface ConflictReport {
  valid: boolean;
  conflicts: string[];
  warnings: string[];
  qualityScore: number;
}

export interface AIChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  proposedAction?: {
    type: 'MOVE_ENTRY' | 'LOCK_ENTRY' | 'GENERATE_TIMETABLE';
    payload: Record<string, unknown>;
  };
}

export interface DashboardStats {
  totalClasses: number;
  totalStudents: number;
  totalClassrooms: number;
  totalLabs: number;
  totalTeachers: number;
  totalMasterSubjects: number;
  totalSubjects: number;
  totalAssignments: number;
  timetableQuality: number;
  scheduledHours: number;
  conflictsCount: number;
  resourceUtilization: number;
}

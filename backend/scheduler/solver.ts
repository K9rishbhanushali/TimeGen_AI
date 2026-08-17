import {
  TimetableEntry,
  Classroom,
  Lab,
  StudentClass,
  Batch,
  Teacher,
  Subject,
  ClassSubject,
  TimingConfig,
  TimeSlot,
  AvailabilityRule,
  GenerationRun
} from '../../src/types';
import { validateTimetable } from './validator';

export function generateTimeSlots(config: TimingConfig): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const days = config.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const toMinutes = (value: string, fallback: number) => {
    const [hour, minute] = value.split(':').map(Number);
    return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : fallback;
  };
  const startMinute = toMinutes(config.startTime, 9 * 60);
  const endMinute = toMinutes(config.endTime, 16 * 60);
  const duration = config.periodDurationMinutes || 60;

  for (const day of days) {
    let currentMin = startMinute;
    const endMin = endMinute;
    let periodIndex = 1;

    while (currentMin + duration <= endMin) {
      const slotStartH = Math.floor(currentMin / 60);
      const slotStartM = currentMin % 60;
      const slotEndMin = currentMin + duration;
      const slotEndH = Math.floor(slotEndMin / 60);
      const slotEndM = slotEndMin % 60;

      const formatTime = (h: number, m: number) =>
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

      const startTimeStr = formatTime(slotStartH, slotStartM);
      const endTimeStr = formatTime(slotEndH, slotEndM);

      // Check if this falls in a break
      const matchedBreak = config.breaks?.find(b =>
        b.startTime && b.endTime && startTimeStr >= b.startTime && startTimeStr < b.endTime
      );

      const isBreak = !!matchedBreak;

      slots.push({
        id: `${day}_p${periodIndex}`,
        day,
        periodIndex,
        startTime: startTimeStr,
        endTime: endTimeStr,
        isBreak,
        breakName: matchedBreak?.name,
      });

      currentMin = slotEndMin;
      periodIndex++;
    }
  }

  return slots;
}

export function generateBatchesForClass(studentClass: StudentClass, benchCapacity: number): Batch[] {
  if (!studentClass.studentCount || studentClass.studentCount <= 0) return [];
  const cap = benchCapacity > 0 ? benchCapacity : 35;
  const numBatches = Math.ceil(studentClass.studentCount / cap);
  const batches: Batch[] = [];

  let remaining = studentClass.studentCount;
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

  for (let i = 0; i < numBatches; i++) {
    const count = Math.min(cap, remaining);
    batches.push({
      id: `${studentClass.id}-batch-${letters[i] || i + 1}`,
      classId: studentClass.id,
      name: `${studentClass.name}-${letters[i] || i + 1}`,
      studentCount: count,
    });
    remaining -= count;
  }

  return batches;
}

interface ActivityToSchedule {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  batchId: string | null; // null for theory, batchId for practical
  type: 'THEORY' | 'PRACTICAL';
  requiredHours: number;
  durationPeriods: number;
  labId?: string;
}

export function solveTimetable(
  classrooms: Classroom[],
  labs: Lab[],
  classes: StudentClass[],
  teachers: Teacher[],
  subjects: Subject[],
  classSubjects: ClassSubject[],
  timingConfig: TimingConfig,
  availabilityRules: AvailabilityRule[],
  existingEntries: TimetableEntry[] = []
): { entries: TimetableEntry[]; run: GenerationRun } {
  const startTimeMs = Date.now();
  const timeSlots = generateTimeSlots(timingConfig);

  // Preserve locked entries
  const lockedEntries = existingEntries.filter(e => e.isLocked);
  const scheduledEntries: TimetableEntry[] = [...lockedEntries];

  // Helper maps
  const classroomMap = new Map(classrooms.map(c => [c.id, c]));
  const labMap = new Map(labs.map(l => [l.id, l]));
  const classMap = new Map(classes.map(c => [c.id, c]));
  const teacherMap = new Map(teachers.map(t => [t.id, t]));

  // Ensure all classes have calculated batches
  const activeClasses = classes.map(c => {
    if (!c.batches || c.batches.length === 0) {
      // Find default lab bench capacity if available
      const defaultBenchCap = labs.length > 0 ? labs[0].benchCapacity : 35;
      const generated = generateBatchesForClass(c, defaultBenchCap);
      return { ...c, batches: generated };
    }
    return c;
  });

  // Build activity list from ClassSubjects
  const activities: ActivityToSchedule[] = [];

  for (const cs of classSubjects) {
    const targetClass = activeClasses.find(c => c.id === cs.classId);
    if (!targetClass) continue;

    // Theory sessions
    if (cs.weeklyTheoryHours > 0) {
      for (let h = 0; h < cs.weeklyTheoryHours; h++) {
        activities.push({
          id: `theory_${cs.id}_${h}`,
          classId: cs.classId,
          subjectId: cs.subjectId,
          teacherId: cs.teacherIds?.[h % cs.teacherIds.length] || cs.teacherId,
          batchId: null,
          type: 'THEORY',
          requiredHours: 1,
          durationPeriods: 1,
        });
      }
    }

    // Practical sessions
    if (cs.weeklyPracticalHours > 0) {
      // Labs always run as one 2-period practical block. Treat a configured
      // positive value as the requested lab time rounded up to a full block:
      // 1 or 2 hours = one block, 3 or 4 hours = two blocks, etc. This avoids
      // silently omitting an assignment when an administrator enters "1".
      const practicalHours = Math.max(0, Math.floor(Number(cs.weeklyPracticalHours) || 0));
      const practicalSessions = Math.ceil(practicalHours / 2);
      if (cs.requiresBatches && targetClass.batches && targetClass.batches.length > 0) {
        // Schedule for each batch
        for (const b of targetClass.batches) {
          for (let h = 0; h < practicalSessions; h++) {
            activities.push({
              id: `practical_${cs.id}_${b.id}_${h}`,
              classId: cs.classId,
              subjectId: cs.subjectId,
              teacherId: cs.batchTeacherIds?.[b.id] || cs.teacherIds?.[targetClass.batches.indexOf(b) % cs.teacherIds.length] || cs.teacherId,
              batchId: b.id,
              type: 'PRACTICAL',
              requiredHours: 2,
              durationPeriods: 2,
              labId: cs.batchLabIds?.[b.id] || cs.labId,
            });
          }
        }
      } else {
        // Whole class practical
        for (let h = 0; h < practicalSessions; h++) {
          activities.push({
            id: `practical_${cs.id}_whole_${h}`,
            classId: cs.classId,
            subjectId: cs.subjectId,
            teacherId: cs.teacherIds?.[h % cs.teacherIds.length] || cs.teacherId,
            batchId: null,
            type: 'PRACTICAL',
            requiredHours: 2,
            durationPeriods: 2,
            labId: cs.labId,
          });
        }
      }
    }
  }

  // Helper check for availability
  const isUnavailable = (entityType: string, entityId: string, day: string, periodIndex: number) => {
    return availabilityRules.some(
      r => r.entityType === entityType && r.entityId === entityId && r.day === day && r.periodIndex === periodIndex && !r.available
    );
  };

  // Helper check if a slot is occupied
  const isSlotOccupied = (
    day: string,
    periodIndex: number,
    teacherId: string,
    classId: string,
    batchId: string | null,
    resourceType: 'classroom' | 'lab',
    resourceId: string,
    currentEntries: TimetableEntry[]
  ) => {
    for (const e of currentEntries) {
      const occupiedUntil = e.periodIndex + (e.durationPeriods || 1) - 1;
      if (e.day === day && periodIndex >= e.periodIndex && periodIndex <= occupiedUntil) {
        // Teacher conflict
        if (e.teacherId === teacherId) return true;
        // Room conflict
        if (e.resourceType === resourceType && e.resourceId === resourceId) return true;
        // Class & Batch conflicts
        if (e.classId === classId) {
          // If e is theory or candidate is theory, whole class conflict
          if (!e.batchId || !batchId) return true;
          // If candidate is for same batch, batch conflict
          if (e.batchId === batchId) return true;
        }
      }
    }
    return false;
  };

  const scheduledHoursForTeacherOnDay = (teacherId: string, day: string) =>
    scheduledEntries
      .filter(entry => entry.teacherId === teacherId && entry.day === day)
      .reduce((total, entry) => total + (entry.durationPeriods || 1), 0);

  const canAssignTeacherOnDay = (activity: ActivityToSchedule, day: string) => {
    const teacher = teacherMap.get(activity.teacherId);
    if (!teacher) return false;
    return scheduledHoursForTeacherOnDay(activity.teacherId, day) + activity.durationPeriods <= teacher.maxHoursPerDay;
  };

  // Group activities to allow parallel batch scheduling
  // For parallel batch scheduling: if Class TYIT1 has Batch A and Batch B, try to schedule Batch A in Lab 1 and Batch B in Lab 2 in same time slot!
  const nonBreakSlots = timeSlots.filter(s => !s.isBreak);

  let successCount = 0;
  const warnings: string[] = [];

  // Place the longest, most constrained work first so it cannot be squeezed
  // out by short theory sessions. A stable secondary order keeps generations
  // repeatable for the same input.
  activities.sort((a, b) =>
    b.durationPeriods - a.durationPeriods ||
    Number(Boolean(b.labId)) - Number(Boolean(a.labId)) ||
    a.classId.localeCompare(b.classId) ||
    a.subjectId.localeCompare(b.subjectId) ||
    a.id.localeCompare(b.id)
  );

  for (const activity of activities) {
    let assigned = false;

    // Find candidate slots
    // Balance each class across the week first, then prefer a neighbouring
    // period on that day to avoid gaps. The old order only preferred early
    // periods, which caused repeated subjects and crowded days.
    const candidateSlots = [...nonBreakSlots].sort((a, b) => {
      const dayMetrics = (slot: TimeSlot) => {
        const classEntries = scheduledEntries.filter(entry => entry.classId === activity.classId && entry.day === slot.day);
        const classHours = classEntries.reduce((total, entry) => total + (entry.durationPeriods || 1), 0);
        const sameSubjectToday = classEntries.some(entry =>
          entry.subjectId === activity.subjectId && entry.batchId === activity.batchId
        ) ? 1 : 0;
        const nearestDistance = classEntries.length === 0
          ? 0
          : Math.min(...classEntries.map(entry => Math.abs(slot.periodIndex - entry.periodIndex)));
        const teacherHours = scheduledHoursForTeacherOnDay(activity.teacherId, slot.day);
        return { classHours, sameSubjectToday, nearestDistance, teacherHours };
      };
      const aMetrics = dayMetrics(a);
      const bMetrics = dayMetrics(b);
      if (aMetrics.classHours !== bMetrics.classHours) return aMetrics.classHours - bMetrics.classHours;
      if (aMetrics.sameSubjectToday !== bMetrics.sameSubjectToday) return aMetrics.sameSubjectToday - bMetrics.sameSubjectToday;
      if (aMetrics.teacherHours !== bMetrics.teacherHours) return aMetrics.teacherHours - bMetrics.teacherHours;
      if (aMetrics.nearestDistance !== bMetrics.nearestDistance) return aMetrics.nearestDistance - bMetrics.nearestDistance;
      return a.periodIndex - b.periodIndex;
    });

    for (const slot of candidateSlots) {
      const sessionSlots = Array.from({ length: activity.durationPeriods }, (_, index) =>
        nonBreakSlots.find(candidate => candidate.day === slot.day && candidate.periodIndex === slot.periodIndex + index)
      );
      if (sessionSlots.some(candidate => !candidate)) continue;
      if (!canAssignTeacherOnDay(activity, slot.day)) continue;
      // Keep each 2-hour lab as one block on a day; the same batch/subject will not
      // receive a second lab block on that day.
      if (activity.type === 'PRACTICAL' && scheduledEntries.some(entry =>
        entry.day === slot.day && entry.classId === activity.classId && entry.batchId === activity.batchId &&
        entry.subjectId === activity.subjectId && entry.sessionType === 'PRACTICAL'
      )) continue;
      // Check teacher availability
      if (sessionSlots.some(candidate => isUnavailable('teacher', activity.teacherId, slot.day, candidate!.periodIndex))) continue;

      if (activity.type === 'THEORY') {
        // Find suitable classroom
        const targetClassObj = classMap.get(activity.classId);
        const reqCapacity = targetClassObj?.studentCount || 0;

        const suitableRooms = classrooms
          .filter(r => r.capacity >= reqCapacity)
          .filter(r => !isUnavailable('classroom', r.id, slot.day, slot.periodIndex));

        for (const room of suitableRooms) {
          if (sessionSlots.every(candidate => !isSlotOccupied(slot.day, candidate!.periodIndex, activity.teacherId, activity.classId, null, 'classroom', room.id, scheduledEntries))) {
            scheduledEntries.push({
              id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              day: slot.day,
              startTime: slot.startTime,
              endTime: slot.endTime,
              periodIndex: slot.periodIndex,
              durationPeriods: activity.durationPeriods,
              classId: activity.classId,
              batchId: null,
              subjectId: activity.subjectId,
              teacherId: activity.teacherId,
              resourceType: 'classroom',
              resourceId: room.id,
              sessionType: 'THEORY',
              isLocked: false,
            });
            assigned = true;
            successCount++;
            break;
          }
        }
      } else {
        // Practical session
        const suitableLabs = labs.filter(l => {
          if (activity.labId && l.id !== activity.labId) return false;
          const batch = activity.batchId
            ? classMap.get(activity.classId)?.batches?.find(item => item.id === activity.batchId)
            : classMap.get(activity.classId);
          const requiredCapacity = batch ? batch.studentCount : (classMap.get(activity.classId)?.studentCount || 0);
          if (l.benchCapacity < requiredCapacity) return false;
          if (sessionSlots.some(candidate => isUnavailable('lab', l.id, slot.day, candidate!.periodIndex))) return false;
          return true;
        });

        for (const lab of suitableLabs) {
          if (sessionSlots.every(candidate => !isSlotOccupied(slot.day, candidate!.periodIndex, activity.teacherId, activity.classId, activity.batchId, 'lab', lab.id, scheduledEntries))) {
            scheduledEntries.push({
              id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              day: slot.day,
              startTime: slot.startTime,
              endTime: sessionSlots[sessionSlots.length - 1]!.endTime,
              periodIndex: slot.periodIndex,
              durationPeriods: activity.durationPeriods,
              classId: activity.classId,
              batchId: activity.batchId,
              subjectId: activity.subjectId,
              teacherId: activity.teacherId,
              resourceType: 'lab',
              resourceId: lab.id,
              sessionType: 'PRACTICAL',
              isLocked: false,
            });
            assigned = true;
            successCount++;
            break;
          }
        }
      }

      if (assigned) break;
    }

    if (!assigned) {
      const subj = subjects.find(s => s.id === activity.subjectId);
      const teacher = teacherMap.get(activity.teacherId);
      warnings.push(`Could not schedule ${activity.type.toLowerCase()} slot for ${subj?.name || 'Subject'} (${teacher?.name || 'Teacher'}). Lack of available slots/rooms.`);
    }
  }

  const solverTimeMs = Date.now() - startTimeMs;
  const validation = validateTimetable(
    scheduledEntries,
    classrooms,
    labs,
    activeClasses,
    teachers,
    subjects,
    classSubjects,
    timingConfig,
    availabilityRules
  );

  const run: GenerationRun = {
    id: `run_${Date.now()}`,
    createdAt: new Date().toISOString(),
    classIds: activeClasses.map(c => c.id),
    qualityScore: validation.qualityScore,
    status: validation.conflicts.length === 0 ? 'SUCCESS' : 'WARNINGS',
    solverTimeMs,
    scheduledHours: scheduledEntries.reduce((total, entry) => total + (entry.durationPeriods || 1), 0),
    totalRequiredHours: activities.reduce((total, activity) => total + activity.requiredHours, 0),
    warnings: [...warnings, ...validation.warnings],
    conflicts: validation.conflicts,
  };

  return { entries: scheduledEntries, run };
}

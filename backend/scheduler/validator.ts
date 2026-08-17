import {
  TimetableEntry,
  Classroom,
  Lab,
  StudentClass,
  Teacher,
  Subject,
  ClassSubject,
  TimingConfig,
  AvailabilityRule,
  ConflictReport
} from '../../src/types';

export function validateTimetable(
  entries: TimetableEntry[],
  classrooms: Classroom[],
  labs: Lab[],
  classes: StudentClass[],
  teachers: Teacher[],
  subjects: Subject[],
  classSubjects: ClassSubject[],
  timingConfig: TimingConfig,
  availabilityRules: AvailabilityRule[]
): ConflictReport {
  const conflicts: string[] = [];
  const warnings: string[] = [];

  const classroomMap = new Map(classrooms.map(c => [c.id, c]));
  const labMap = new Map(labs.map(l => [l.id, l]));
  const classMap = new Map(classes.map(c => [c.id, c]));
  const teacherMap = new Map(teachers.map(t => [t.id, t]));
  const subjectMap = new Map(subjects.map(s => [s.id, s]));

  // Build slot keys: `${day}_${periodIndex}`
  // 1. Teacher conflicts (same teacher in two places at once)
  const teacherSlots = new Map<string, TimetableEntry[]>();
  // 2. Class / Batch conflicts
  const classSlots = new Map<string, TimetableEntry[]>();
  const batchSlots = new Map<string, TimetableEntry[]>();
  // 3. Room conflicts
  const roomSlots = new Map<string, TimetableEntry[]>();

  // 4. Daily teacher workload
  const teacherDailyHours = new Map<string, number>();

  // Helper for availability
  const isUnavailable = (entityType: string, entityId: string, day: string, periodIndex: number) => {
    return availabilityRules.some(
      r => r.entityType === entityType && r.entityId === entityId && r.day === day && r.periodIndex === periodIndex && !r.available
    );
  };

  for (const entry of entries) {
    const teacherObj = teacherMap.get(entry.teacherId);
    const classObj = classMap.get(entry.classId);
    const subjectObj = subjectMap.get(entry.subjectId);

    const teacherName = teacherObj?.name || 'Unknown Teacher';
    const className = classObj?.name || 'Unknown Class';
    const subjectName = subjectObj?.name || 'Unknown Subject';

    // A practical may occupy two or more consecutive periods. Register and
    // validate every occupied period, not just the entry's start period.
    const occupiedPeriods = Array.from(
      { length: entry.durationPeriods || 1 },
      (_, index) => entry.periodIndex + index
    );
    for (const periodIndex of occupiedPeriods) {
      const slotKey = `${entry.day}_${periodIndex}`;
      const teacherKey = `${entry.teacherId}_${slotKey}`;
      const roomKey = `${entry.resourceType}_${entry.resourceId}_${slotKey}`;
      const classKey = `${entry.classId}_${slotKey}`;

      if (!teacherSlots.has(teacherKey)) teacherSlots.set(teacherKey, []);
      teacherSlots.get(teacherKey)!.push(entry);

      if (!roomSlots.has(roomKey)) roomSlots.set(roomKey, []);
      roomSlots.get(roomKey)!.push(entry);

      if (!classSlots.has(classKey)) classSlots.set(classKey, []);
      classSlots.get(classKey)!.push(entry);

      if (entry.batchId) {
        const batchKey = `${entry.batchId}_${slotKey}`;
        if (!batchSlots.has(batchKey)) batchSlots.set(batchKey, []);
        batchSlots.get(batchKey)!.push(entry);
      }

      if (isUnavailable('teacher', entry.teacherId, entry.day, periodIndex)) {
        conflicts.push(`${teacherName} is marked unavailable on ${entry.day} period ${periodIndex}.`);
      }

      if (isUnavailable(entry.resourceType, entry.resourceId, entry.day, periodIndex)) {
        const rName = entry.resourceType === 'classroom'
          ? classroomMap.get(entry.resourceId)?.name
          : labMap.get(entry.resourceId)?.name;
        conflicts.push(`${rName || 'Room'} is marked unavailable on ${entry.day} period ${periodIndex}.`);
      }
    }

    // Check Capacity
    if (entry.resourceType === 'classroom') {
      const room = classroomMap.get(entry.resourceId);
      if (room && classObj && classObj.studentCount > room.capacity) {
        conflicts.push(`Room ${room.name} (Capacity: ${room.capacity}) is too small for ${className} (${classObj.studentCount} students).`);
      }
    } else if (entry.resourceType === 'lab' && entry.batchId) {
      const lab = labMap.get(entry.resourceId);
      // find batch
      const batch = classObj?.batches?.find(b => b.id === entry.batchId);
      if (lab && batch && batch.studentCount > lab.benchCapacity) {
        conflicts.push(`Lab ${lab.name} (Bench capacity: ${lab.benchCapacity}) is too small for batch ${batch.name} (${batch.studentCount} students).`);
      }
    }

    // Workload tracking
    const teacherDayKey = `${entry.teacherId}_${entry.day}`;
    teacherDailyHours.set(
      teacherDayKey,
      (teacherDailyHours.get(teacherDayKey) || 0) + occupiedPeriods.length
    );
  }

  // Evaluate Teacher Double Bookings
  for (const [key, list] of teacherSlots.entries()) {
    if (list.length > 1) {
      const teacherName = teacherMap.get(list[0].teacherId)?.name || 'Teacher';
      const day = list[0].day;
      const time = `${list[0].startTime} - ${list[0].endTime}`;
      conflicts.push(`Teacher Conflict: ${teacherName} is scheduled for multiple sessions at ${day} ${time}.`);
    }
  }

  // Evaluate Room Double Bookings
  for (const [key, list] of roomSlots.entries()) {
    if (list.length > 1) {
      const rName = list[0].resourceType === 'classroom'
        ? classroomMap.get(list[0].resourceId)?.name
        : labMap.get(list[0].resourceId)?.name;
      const day = list[0].day;
      const time = `${list[0].startTime} - ${list[0].endTime}`;
      conflicts.push(`Resource Conflict: ${rName || 'Resource'} is occupied by multiple classes/batches at ${day} ${time}.`);
    }
  }

  // Evaluate Batch Double Bookings
  for (const [key, list] of batchSlots.entries()) {
    if (list.length > 1) {
      const batchName = list[0].batchId;
      const day = list[0].day;
      const time = `${list[0].startTime} - ${list[0].endTime}`;
      conflicts.push(`Batch Conflict: Batch ${batchName} is scheduled for multiple sessions at ${day} ${time}.`);
    }
  }

  // Evaluate Class Conflicts (Whole class theory at same time as batch lab OR two whole class theory)
  for (const [key, list] of classSlots.entries()) {
    const theoryEntries = list.filter(e => !e.batchId);
    if (theoryEntries.length > 1) {
      const className = classMap.get(list[0].classId)?.name || 'Class';
      conflicts.push(`Class Conflict: ${className} has multiple theory sessions scheduled at ${list[0].day} ${list[0].startTime}.`);
    } else if (theoryEntries.length === 1 && list.some(e => !!e.batchId)) {
      const className = classMap.get(list[0].classId)?.name || 'Class';
      conflicts.push(`Class Conflict: ${className} has both a whole-class theory session and a batch lab scheduled simultaneously at ${list[0].day} ${list[0].startTime}.`);
    }
  }

  // Check Teacher Workload Warnings
  for (const [key, hours] of teacherDailyHours.entries()) {
    const [tId, day] = key.split('_');
    const tObj = teacherMap.get(tId);
    if (tObj && hours > tObj.maxHoursPerDay) {
      warnings.push(`Workload Warning: ${tObj.name} is scheduled for ${hours} hours on ${day} (Max limit: ${tObj.maxHoursPerDay} hrs).`);
    }
  }

  // Calculate Quality Score
  let qualityScore = 100;
  if (conflicts.length > 0) {
    qualityScore = Math.max(0, 100 - conflicts.length * 20 - warnings.length * 5);
  } else {
    qualityScore = Math.max(70, 100 - warnings.length * 3);
  }

  return {
    valid: conflicts.length === 0,
    conflicts,
    warnings,
    qualityScore,
  };
}

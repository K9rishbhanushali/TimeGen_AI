import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initDatabase, db, isMongoDBConnected } from './backend/database/store';
import { solveTimetable, generateTimeSlots, generateBatchesForClass } from './backend/scheduler/solver';
import { validateTimetable } from './backend/scheduler/validator';
import { seedDatabase } from './backend/seed/demoData';
import { processAIChat, explainConflictAI } from './backend/ai/assistant';
import { Classroom, Lab, StudentClass, Teacher, Subject, ClassSubject, AvailabilityRule, TimetableEntry } from './src/types';

// Creates the shared Express application. It is used by the local Node server
// and by Vercel's serverless API entrypoint.
export async function createApp() {
  const app = express();

  app.use(express.json());

  // Initialize DB
  await initDatabase();

  // If DB has no classrooms or classes, run initial seed so application is pre-populated with realistic demo data!
  const existingClasses = await db.getClasses();
  if (existingClasses.length === 0) {
    console.log('Database empty; seeding default college timetable dataset...');
    await seedDatabase().catch(err => console.error('Initial seeding error:', err));
  }

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: isMongoDBConnected() ? 'MongoDB Atlas' : 'Local JSON', time: new Date().toISOString() });
  });

  app.get('/api/db-status', (req, res) => {
    res.json({ isMongoDB: isMongoDBConnected() });
  });

  // --- CLASSROOMS ---
  app.get('/api/classrooms', async (req, res) => {
    const list = await db.getClassrooms();
    res.json(list);
  });

  app.get('/api/classrooms/:id', async (req, res) => {
    const list = await db.getClassrooms();
    const item = list.find(c => c.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Classroom not found' });
    res.json(item);
  });

  app.post('/api/classrooms', async (req, res) => {
    const item: Classroom = {
      id: `room_${Date.now()}`,
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      availablePeriods: [1, 2, 3, 4, 5, 6],
      ...req.body,
    };
    await db.saveClassroom(item);
    res.json(item);
  });

  app.put('/api/classrooms/:id', async (req, res) => {
    const list = await db.getClassrooms();
    const existing = list.find(c => c.id === req.params.id);
    if (!existing) return res.status(404).json({ error: 'Classroom not found' });
    const updated = { ...existing, ...req.body, id: req.params.id };
    await db.saveClassroom(updated);
    res.json(updated);
  });

  app.delete('/api/classrooms/:id', async (req, res) => {
    const success = await db.deleteClassroom(req.params.id);
    res.json({ success });
  });

  // --- LABS ---
  app.get('/api/labs', async (req, res) => {
    const list = await db.getLabs();
    res.json(list);
  });

  app.get('/api/labs/:id', async (req, res) => {
    const list = await db.getLabs();
    const item = list.find(l => l.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Lab not found' });
    res.json(item);
  });

  app.post('/api/labs', async (req, res) => {
    const item: Lab = {
      id: `lab_${Date.now()}`,
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      availablePeriods: [1, 2, 3, 4, 5, 6],
      ...req.body,
    };
    await db.saveLab(item);
    res.json(item);
  });

  app.put('/api/labs/:id', async (req, res) => {
    const list = await db.getLabs();
    const existing = list.find(l => l.id === req.params.id);
    if (!existing) return res.status(404).json({ error: 'Lab not found' });
    const updated = { ...existing, ...req.body, id: req.params.id };
    await db.saveLab(updated);
    res.json(updated);
  });

  app.delete('/api/labs/:id', async (req, res) => {
    const success = await db.deleteLab(req.params.id);
    res.json({ success });
  });

  // --- STUDENT CLASSES & BATCHES ---
  app.get('/api/classes', async (req, res) => {
    const list = await db.getClasses();
    res.json(list);
  });

  app.get('/api/classes/:id', async (req, res) => {
    const list = await db.getClasses();
    const item = list.find(c => c.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Class not found' });
    res.json(item);
  });

  app.post('/api/classes', async (req, res) => {
    const newClass: StudentClass = {
      id: `class_${Date.now()}`,
      ...req.body,
    };
    // Auto-calculate batches
    newClass.batches = generateBatchesForClass(newClass, 35);
    await db.saveClass(newClass);
    res.json(newClass);
  });

  app.put('/api/classes/:id', async (req, res) => {
    const list = await db.getClasses();
    const existing = list.find(c => c.id === req.params.id);
    if (!existing) return res.status(404).json({ error: 'Class not found' });
    const updated: StudentClass = { ...existing, ...req.body, id: req.params.id };
    if (!updated.batches || updated.studentCount !== existing.studentCount) {
      updated.batches = generateBatchesForClass(updated, 35);
    }
    await db.saveClass(updated);
    res.json(updated);
  });

  app.delete('/api/classes/:id', async (req, res) => {
    const success = await db.deleteClass(req.params.id);
    res.json({ success });
  });

  app.post('/api/classes/:id/calculate-batches', async (req, res) => {
    const list = await db.getClasses();
    const item = list.find(c => c.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Class not found' });
    const cap = req.body?.benchCapacity || 35;
    const batches = generateBatchesForClass(item, cap);
    item.batches = batches;
    await db.saveClass(item);
    res.json({ batches });
  });

  // --- TEACHERS ---
  app.get('/api/teachers', async (req, res) => {
    const list = await db.getTeachers();
    res.json(list);
  });

  app.get('/api/teachers/:id', async (req, res) => {
    const list = await db.getTeachers();
    const item = list.find(t => t.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Teacher not found' });
    res.json(item);
  });

  app.post('/api/teachers', async (req, res) => {
    const item: Teacher = {
      id: `t_${Date.now()}`,
      maxHoursPerDay: 6,
      ...req.body,
    };
    await db.saveTeacher(item);
    res.json(item);
  });

  app.put('/api/teachers/:id', async (req, res) => {
    const list = await db.getTeachers();
    const existing = list.find(t => t.id === req.params.id);
    if (!existing) return res.status(404).json({ error: 'Teacher not found' });
    const updated = { ...existing, ...req.body, id: req.params.id };
    await db.saveTeacher(updated);
    res.json(updated);
  });

  app.delete('/api/teachers/:id', async (req, res) => {
    const success = await db.deleteTeacher(req.params.id);
    res.json({ success });
  });

  // --- SUBJECTS MASTER ---
  app.get('/api/subjects', async (req, res) => {
    const list = await db.getSubjects();
    res.json(list);
  });

  app.get('/api/subjects/:id', async (req, res) => {
    const list = await db.getSubjects();
    const item = list.find(s => s.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Subject not found' });
    res.json(item);
  });

  app.post('/api/subjects', async (req, res) => {
    const item: Subject = {
      id: `subj_${Date.now()}`,
      name: req.body.name || 'New Subject',
      code: req.body.code || `SUBJ${Date.now().toString().slice(-4)}`,
      type: req.body.type || 'BOTH',
      description: req.body.description || '',
    };
    await db.saveSubject(item);
    res.json(item);
  });

  app.put('/api/subjects/:id', async (req, res) => {
    const list = await db.getSubjects();
    const existing = list.find(s => s.id === req.params.id);
    if (!existing) return res.status(404).json({ error: 'Subject not found' });
    const updated: Subject = {
      ...existing,
      name: req.body.name ?? existing.name,
      code: req.body.code ?? existing.code,
      type: req.body.type ?? existing.type,
      description: req.body.description ?? existing.description,
      id: req.params.id,
    };
    await db.saveSubject(updated);
    res.json(updated);
  });

  app.delete('/api/subjects/:id', async (req, res) => {
    const success = await db.deleteSubject(req.params.id);
    res.json({ success });
  });

  // Helper function to normalize & populate ClassSubject assignment
  const normalizeAssignment = (body: any, existingId?: string): ClassSubject => {
    const classId = body.classId || body.class_id || '';
    const subjectId = body.subjectId || body.subject_id || '';
    const teacherId = body.teacherId || body.teacher_id || '';
    const submittedTeacherIds = Array.isArray(body.teacherIds) ? body.teacherIds.filter((id: unknown) => typeof id === 'string' && id) : [];
    const teacherIds = submittedTeacherIds.length > 0 ? submittedTeacherIds : (teacherId ? [teacherId] : []);
    const primaryTeacherId = teacherIds[0] || teacherId;
    const weeklyTheoryHours = body.weeklyTheoryHours ?? body.weekly_theory_hours ?? 2;
    const weeklyPracticalHours = body.weeklyPracticalHours ?? body.weekly_practical_hours ?? 2;
    if (Number(weeklyPracticalHours) < 0 || Number(weeklyPracticalHours) % 2 !== 0) {
      throw new Error('Practical hours must be 0 or a multiple of 2 (2, 4, 6, ...).');
    }
    const labId = body.labId !== undefined ? body.labId : (body.lab_id !== undefined ? body.lab_id : null);
    const requiresBatches = body.requiresBatches ?? body.requires_batches ?? (weeklyPracticalHours > 0);
    const batchTeacherIds = body.batchTeacherIds && typeof body.batchTeacherIds === 'object'
      ? body.batchTeacherIds : {};
    const batchLabIds = body.batchLabIds && typeof body.batchLabIds === 'object'
      ? body.batchLabIds : {};

    return {
      id: existingId || body.id || `cs_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      classId,
      class_id: classId,
      subjectId,
      subject_id: subjectId,
      teacherId: primaryTeacherId,
      teacher_id: primaryTeacherId,
      teacherIds,
      weeklyTheoryHours: Number(weeklyTheoryHours),
      weekly_theory_hours: Number(weeklyTheoryHours),
      weeklyPracticalHours: Number(weeklyPracticalHours),
      weekly_practical_hours: Number(weeklyPracticalHours),
      labId,
      lab_id: labId,
      requiresLab: !!labId,
      requires_lab: !!labId,
      requiresBatches: !!requiresBatches,
      requires_batches: !!requiresBatches,
      batchTeacherIds,
      batchLabIds,
    };
  };

  const populateAssignment = async (item: ClassSubject): Promise<ClassSubject> => {
    const [subjects, teachers, labs, classes] = await Promise.all([
      db.getSubjects(),
      db.getTeachers(),
      db.getLabs(),
      db.getClasses(),
    ]);
    return {
      ...item,
      subject: subjects.find(s => s.id === item.subjectId),
      teacher: teachers.find(t => t.id === item.teacherId),
      lab: labs.find(l => l.id === item.labId),
      studentClass: classes.find(c => c.id === item.classId),
    };
  };

  // --- ASSIGNMENTS (CLASS-SUBJECTS & CLASS-SUBJECT-ASSIGNMENTS) ---
  const handleGetAssignments = async (req: express.Request, res: express.Response) => {
    const list = await db.getClassSubjects();
    const populated = await Promise.all(list.map(populateAssignment));
    res.json(populated);
  };

  const handleCreateAssignment = async (req: express.Request, res: express.Response) => {
    const item = normalizeAssignment(req.body);
    await db.saveClassSubject(item);
    const populated = await populateAssignment(item);
    res.json(populated);
  };

  const handleUpdateAssignment = async (req: express.Request, res: express.Response) => {
    const list = await db.getClassSubjects();
    const existing = list.find(cs => cs.id === req.params.id);
    if (!existing) return res.status(404).json({ error: 'Assignment not found' });
    const updated = normalizeAssignment({ ...existing, ...req.body }, req.params.id);
    await db.saveClassSubject(updated);
    const populated = await populateAssignment(updated);
    res.json(populated);
  };

  const handleDeleteAssignment = async (req: express.Request, res: express.Response) => {
    const success = await db.deleteClassSubject(req.params.id);
    res.json({ success });
  };

  app.get('/api/class-subjects', handleGetAssignments);
  app.get('/api/class-subject-assignments', handleGetAssignments);

  app.post('/api/class-subjects', handleCreateAssignment);
  app.post('/api/class-subject-assignments', handleCreateAssignment);

  app.put('/api/class-subjects/:id', handleUpdateAssignment);
  app.put('/api/class-subject-assignments/:id', handleUpdateAssignment);

  app.delete('/api/class-subjects/:id', handleDeleteAssignment);
  app.delete('/api/class-subject-assignments/:id', handleDeleteAssignment);

  // Endpoint for class-specific subjects: GET /api/classes/:classId/subjects
  app.get(['/api/classes/:classId/subjects', '/api/classes/:classId/assignments'], async (req, res) => {
    const classId = req.params.classId;
    const list = await db.getClassSubjects();
    const classAssignments = list.filter(cs => cs.classId === classId || cs.class_id === classId);
    const populated = await Promise.all(classAssignments.map(populateAssignment));
    res.json(populated);
  });

  // --- TIMINGS & TIME SLOTS ---
  app.get('/api/timings', async (req, res) => {
    const config = await db.getTimingConfig();
    res.json(config);
  });

  app.post('/api/timings', async (req, res) => {
    const config = await db.saveTimingConfig(req.body);
    res.json(config);
  });

  app.get('/api/timings/slots', async (req, res) => {
    const config = await db.getTimingConfig();
    const slots = generateTimeSlots(config);
    res.json(slots);
  });

  // --- AVAILABILITY ---
  app.get('/api/availability', async (req, res) => {
    const rules = await db.getAvailabilityRules();
    res.json(rules);
  });

  app.post('/api/availability', async (req, res) => {
    const rules: AvailabilityRule[] = req.body?.rules || [];
    await db.saveAvailabilityRules(rules);
    res.json({ success: true });
  });

  // --- TIMETABLE GENERATION & MANAGEMENT ---
  app.get('/api/timetable', async (req, res) => {
    const entries = await db.getTimetableEntries();
    res.json(entries);
  });

  app.get('/api/timetable/class/:id', async (req, res) => {
    const entries = await db.getTimetableEntries();
    res.json(entries.filter(e => e.classId === req.params.id));
  });

  app.get('/api/timetable/teacher/:id', async (req, res) => {
    const entries = await db.getTimetableEntries();
    res.json(entries.filter(e => e.teacherId === req.params.id));
  });

  app.get('/api/timetable/room/:id', async (req, res) => {
    const entries = await db.getTimetableEntries();
    res.json(entries.filter(e => e.resourceType === 'classroom' && e.resourceId === req.params.id));
  });

  app.get('/api/timetable/lab/:id', async (req, res) => {
    const entries = await db.getTimetableEntries();
    res.json(entries.filter(e => e.resourceType === 'lab' && e.resourceId === req.params.id));
  });

  app.post('/api/timetable/generate', async (req, res) => {
    try {
      const [classrooms, labs, classes, teachers, subjects, classSubjects, timingConfig, availabilityRules, existingEntries] = await Promise.all([
        db.getClassrooms(),
        db.getLabs(),
        db.getClasses(),
        db.getTeachers(),
        db.getSubjects(),
        db.getClassSubjects(),
        db.getTimingConfig(),
        db.getAvailabilityRules(),
        db.getTimetableEntries(),
      ]);

      const result = solveTimetable(
        classrooms,
        labs,
        classes,
        teachers,
        subjects,
        classSubjects,
        timingConfig,
        availabilityRules,
        req.body?.startFresh ? [] : existingEntries
      );

      await db.saveTimetableEntries(result.entries);
      await db.saveGenerationRun(result.run);

      res.json(result);
    } catch (err) {
      console.error('Error generating timetable:', err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/timetable/validate', async (req, res) => {
    const targetEntries = req.body?.entries || await db.getTimetableEntries();
    const [classrooms, labs, classes, teachers, subjects, classSubjects, timingConfig, availabilityRules] = await Promise.all([
      db.getClassrooms(),
      db.getLabs(),
      db.getClasses(),
      db.getTeachers(),
      db.getSubjects(),
      db.getClassSubjects(),
      db.getTimingConfig(),
      db.getAvailabilityRules(),
    ]);

    const report = validateTimetable(
      targetEntries,
      classrooms,
      labs,
      classes,
      teachers,
      subjects,
      classSubjects,
      timingConfig,
      availabilityRules
    );

    res.json(report);
  });

  app.put('/api/timetable/:id', async (req, res) => {
    const updated = await db.updateTimetableEntry(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Timetable entry not found' });
    res.json(updated);
  });

  app.delete('/api/timetable/:id', async (req, res) => {
    const entries = await db.getTimetableEntries();
    const filtered = entries.filter(e => e.id !== req.params.id);
    await db.saveTimetableEntries(filtered);
    res.json({ success: true });
  });

  app.post('/api/timetable/:id/lock', async (req, res) => {
    const isLocked = !!req.body?.isLocked;
    const updated = await db.updateTimetableEntry(req.params.id, { isLocked });
    if (!updated) return res.status(404).json({ error: 'Timetable entry not found' });
    res.json(updated);
  });

  app.get('/api/timetable/runs', async (req, res) => {
    const runs = await db.getGenerationRuns();
    res.json(runs);
  });

  // --- DASHBOARD STATS ---
  app.get('/api/dashboard/stats', async (req, res) => {
    const [classes, classrooms, labs, teachers, subjects, classSubjects, entries, runs] = await Promise.all([
      db.getClasses(),
      db.getClassrooms(),
      db.getLabs(),
      db.getTeachers(),
      db.getSubjects(),
      db.getClassSubjects(),
      db.getTimetableEntries(),
      db.getGenerationRuns(),
    ]);

    const totalStudents = classes.reduce((sum, c) => sum + (c.studentCount || 0), 0);
    const latestRun = runs[0];

    const stats = {
      totalClasses: classes.length,
      totalStudents,
      totalClassrooms: classrooms.length,
      totalLabs: labs.length,
      totalTeachers: teachers.length,
      totalMasterSubjects: subjects.length,
      totalSubjects: subjects.length,
      totalAssignments: classSubjects.length,
      timetableQuality: latestRun?.qualityScore || (entries.length > 0 ? 92 : 0),
      scheduledHours: entries.length,
      conflictsCount: latestRun?.conflicts?.length || 0,
      resourceUtilization: classrooms.length + labs.length > 0
        ? Math.round((entries.length / ((classrooms.length + labs.length) * 30)) * 100)
        : 0,
    };

    res.json(stats);
  });

  // --- DEMO SEED & RESET ---
  app.post('/api/seed', async (req, res) => {
    try {
      await seedDatabase();
      res.json({ success: true, message: 'Successfully seeded demo database!' });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/clear', async (req, res) => {
    await db.clearAll();
    res.json({ success: true, message: 'Successfully cleared database.' });
  });

  // --- AI ASSISTANT ---
  app.post('/api/ai/chat', async (req, res) => {
    const { message, history } = req.body || {};
    if (!message) return res.status(400).json({ error: 'Message is required' });
    const result = await processAIChat(message, history || []);
    res.json(result);
  });

  app.post('/api/ai/explain-conflict', async (req, res) => {
    const { conflictInfo } = req.body || {};
    if (!conflictInfo) return res.status(400).json({ error: 'conflictInfo is required' });
    const result = await explainConflictAI(conflictInfo);
    res.json(result);
  });

  // Vite middleware for dev or static server for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

export async function startServer() {
  const app = await createApp();
  // Render provides the public port through PORT; fall back to 3000 locally.
  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

// Vercel imports createApp from api/index.ts. Starting a listener there would
// leave API routes unavailable, so only start one outside the Vercel runtime.
if (process.env.VERCEL !== '1') {
  void startServer();
}

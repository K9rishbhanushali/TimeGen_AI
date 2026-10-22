import 'dotenv/config';
import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { initDatabase, db, isMongoDBConnected } from './backend/database/store';
import { solveTimetable, generateTimeSlots, generateBatchesForClass } from './backend/scheduler/solver';
import { validateTimetable } from './backend/scheduler/validator';
import { seedDatabase } from './backend/seed/demoData';
import { processAIChat, explainConflictAI } from './backend/ai/assistant';
import { Classroom, Lab, StudentClass, Teacher, Subject, ClassSubject, AvailabilityRule, TimetableEntry, AppUser, UserRole } from './src/types';

// ---- Simple auth helpers (no extra deps) ----
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

function sanitizeUser(u: AppUser): Omit<AppUser, 'password'> {
  const { password: _pw, ...rest } = u;
  return rest;
}

function makeToken(user: AppUser): string {
  return Buffer.from(`${user.id}:${user.role}:${Date.now()}`).toString('base64');
}

const DEFAULT_ADMIN_EMAIL = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@timegen.ai').toLowerCase();
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';

async function ensureDefaultAdmin() {
  const users = await db.getUsers();
  const hasAdmin = users.some(u => u.role === 'admin');
  if (!hasAdmin) {
    const admin: AppUser = {
      id: `user_admin_${Date.now()}`,
      name: 'Administrator',
      email: DEFAULT_ADMIN_EMAIL,
      password: hashPassword(DEFAULT_ADMIN_PASSWORD),
      role: 'admin',
      createdAt: new Date().toISOString(),
    };
    await db.saveUser(admin);
    console.log(`Seeded default admin login: ${DEFAULT_ADMIN_EMAIL} / ${DEFAULT_ADMIN_PASSWORD}`);
  }
}

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

  // Always ensure at least one admin login exists.
  await ensureDefaultAdmin().catch(err => console.error('Admin seed error:', err));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: isMongoDBConnected() ? 'MongoDB Atlas' : 'Local JSON', time: new Date().toISOString() });
  });

  app.get('/api/db-status', (req, res) => {
    res.json({ isMongoDB: isMongoDBConnected() });
  });

  // --- AUTH (admin / teacher / student) ---
  // Login: only users created by admin can login. Role tab must match account role.
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password, role } = req.body || {};
      if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
      const users = await db.getUsers();
      const found = users.find(u => u.email.toLowerCase() === String(email).toLowerCase());
      if (!found) return res.status(401).json({ error: 'Invalid email or password' });
      if (found.password !== hashPassword(String(password))) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      if (role && found.role !== role) {
        return res.status(403).json({ error: `This account is a "${found.role}" account. Please use the ${found.role} login tab.` });
      }
      res.json({ token: makeToken(found), user: sanitizeUser(found) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // List users (passwords stripped). Used by admin panel.
  app.get('/api/users', async (req, res) => {
    const users = await db.getUsers();
    res.json(users.map(sanitizeUser));
  });

  // Admin creates teacher / student logins (and also admin if needed).
  // For role=teacher: auto-creates a Teacher profile when teacherId is not supplied,
  // so the new teacher immediately appears in timetables/assignments.
  app.post('/api/users', async (req, res) => {
    try {
      const { name, email, password, role, teacherId, classId, employeeId, rollNo, department, phone } = req.body || {};
      if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'name, email, password and role are required' });
      }
      const cleanRole = String(role) as UserRole;
      if (!['admin', 'teacher', 'student'].includes(cleanRole)) {
        return res.status(400).json({ error: 'role must be admin, teacher or student' });
      }
      const users = await db.getUsers();
      if (users.some(u => u.email.toLowerCase() === String(email).toLowerCase())) {
        return res.status(409).json({ error: 'This email is already registered' });
      }

      let linkedTeacherId: string | null = teacherId || null;
      let linkedClassId: string | null = classId || null;

      if (cleanRole === 'teacher') {
        const teachers = await db.getTeachers();
        const emailLower = String(email).toLowerCase();
        if (linkedTeacherId) {
          const profile = teachers.find(t => t.id === linkedTeacherId);
          if (!profile) {
            return res.status(400).json({ error: 'Linked teacher profile not found' });
          }
          // One faculty profile -> one login. Keep them the same entity.
          const alreadyLinked = users.find(u => u.role === 'teacher' && u.teacherId === linkedTeacherId);
          if (alreadyLinked) {
            return res.status(409).json({ error: `This faculty profile already has a login (${alreadyLinked.email})` });
          }
          // Sync profile to the login details so both stay identical
          await db.saveTeacher({
            ...profile,
            name: String(name),
            email: emailLower,
            employeeId: employeeId ? String(employeeId) : profile.employeeId,
            department: department ? String(department) : profile.department,
            phone: phone ? String(phone) : profile.phone,
          });
        } else {
          // Reuse existing faculty profile with the same email instead of duplicating
          const existingProfile = teachers.find(t => (t.email || '').toLowerCase() === emailLower);
          if (existingProfile) {
            const alreadyLinked = users.find(u => u.role === 'teacher' && u.teacherId === existingProfile.id);
            if (alreadyLinked) {
              return res.status(409).json({ error: `This teacher already has a login (${alreadyLinked.email})` });
            }
            await db.saveTeacher({
              ...existingProfile,
              name: String(name),
              employeeId: employeeId ? String(employeeId) : existingProfile.employeeId,
              department: department ? String(department) : existingProfile.department,
              phone: phone ? String(phone) : existingProfile.phone,
            });
            linkedTeacherId = existingProfile.id;
          } else {
            // Auto-create faculty profile for timetable linkage
            const newTeacher: Teacher = {
              id: `t_${Date.now()}`,
              name: String(name),
              employeeId: String(employeeId || `EMP${100 + users.length + 1}`),
              department: String(department || 'Information Technology'),
              email: emailLower,
              phone: String(phone || '+91 9876543210'),
              maxHoursPerDay: 6,
            };
            await db.saveTeacher(newTeacher);
            linkedTeacherId = newTeacher.id;
          }
        }
      }

      if (cleanRole === 'student') {
        if (!linkedClassId) return res.status(400).json({ error: 'classId is required for student accounts' });
        const classes = await db.getClasses();
        if (!classes.some(c => c.id === linkedClassId)) {
          return res.status(400).json({ error: 'Selected class not found' });
        }
      }

      const item: AppUser = {
        id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: String(name),
        email: String(email).toLowerCase(),
        password: hashPassword(String(password)),
        role: cleanRole,
        teacherId: linkedTeacherId,
        classId: linkedClassId,
        employeeId: employeeId ? String(employeeId) : undefined,
        rollNo: rollNo ? String(rollNo) : undefined,
        department: department ? String(department) : undefined,
        createdAt: new Date().toISOString(),
      };
      await db.saveUser(item);
      res.json(sanitizeUser(item));
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.put('/api/users/:id', async (req, res) => {
    try {
      const users = await db.getUsers();
      const existing = users.find(u => u.id === req.params.id);
      if (!existing) return res.status(404).json({ error: 'User not found' });
      const { name, email, password, teacherId, classId, employeeId, rollNo, department } = req.body || {};
      if (email && users.some(u => u.id !== existing.id && u.email.toLowerCase() === String(email).toLowerCase())) {
        return res.status(409).json({ error: 'This email is already registered' });
      }
      const updated: AppUser = {
        ...existing,
        name: name ?? existing.name,
        email: email ? String(email).toLowerCase() : existing.email,
        teacherId: teacherId !== undefined ? teacherId : existing.teacherId,
        classId: classId !== undefined ? classId : existing.classId,
        employeeId: employeeId !== undefined ? employeeId : existing.employeeId,
        rollNo: rollNo !== undefined ? rollNo : existing.rollNo,
        department: department !== undefined ? department : existing.department,
      };
      if (password) updated.password = hashPassword(String(password));
      if (updated.teacherId && (teacherId !== undefined || name !== undefined || department !== undefined || employeeId !== undefined)) {
        // A teacher login that points at a different profile — keep 1:1 mapping
        if (teacherId !== undefined && teacherId !== existing.teacherId) {
          const allUsers = await db.getUsers();
          const clash = allUsers.find(u => u.id !== updated.id && u.role === 'teacher' && u.teacherId === teacherId);
          if (clash) return res.status(409).json({ error: `This faculty profile already has a login (${clash.email})` });
          const profiles = await db.getTeachers();
          if (teacherId && !profiles.some(t => t.id === teacherId)) {
            return res.status(400).json({ error: 'Linked teacher profile not found' });
          }
        }
      }
      await db.saveUser(updated);
      // Keep the linked faculty profile identical to the login
      if (updated.role === 'teacher' && updated.teacherId) {
        const profiles = await db.getTeachers();
        const profile = profiles.find(t => t.id === updated.teacherId);
        if (profile) {
          await db.saveTeacher({
            ...profile,
            name: updated.name,
            employeeId: updated.employeeId || profile.employeeId,
            department: updated.department || profile.department,
          });
        }
      }
      res.json(sanitizeUser(updated));
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    const users = await db.getUsers();
    const existing = users.find(u => u.id === req.params.id);
    if (!existing) return res.status(404).json({ error: 'User not found' });
    if (existing.role === 'admin' && users.filter(u => u.role === 'admin').length <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last admin account' });
    }
    await db.deleteUser(req.params.id);
    // NOTE: linked Teacher profile is kept so timetable history stays intact.
    res.json({ success: true });
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
    // Same entity both ways: if a teacher login with this email exists
    // but has no linked profile yet, link it to the new profile.
    try {
      const emailLower = (item.email || '').toLowerCase();
      if (emailLower) {
        const users = await db.getUsers();
        const match = users.find(u => u.role === 'teacher' && (u.email || '').toLowerCase() === emailLower && !u.teacherId);
        if (match) {
          await db.saveUser({ ...match, teacherId: item.id, name: match.name || item.name, department: match.department || item.department });
        }
      }
    } catch (err) {
      console.error('Teacher-login auto-link error:', err);
    }
    res.json(item);
  });

  app.put('/api/teachers/:id', async (req, res) => {
    const list = await db.getTeachers();
    const existing = list.find(t => t.id === req.params.id);
    if (!existing) return res.status(404).json({ error: 'Teacher not found' });
    const updated = { ...existing, ...req.body, id: req.params.id };
    await db.saveTeacher(updated);
    // Keep linked teacher login identical to the faculty profile
    try {
      const users = await db.getUsers();
      const linked = users.filter(u => u.role === 'teacher' && u.teacherId === req.params.id);
      for (const u of linked) {
        await db.saveUser({
          ...u,
          name: updated.name,
          employeeId: updated.employeeId,
          department: updated.department,
        });
      }
    } catch (err) {
      console.error('Teacher-login sync error:', err);
    }
    res.json(updated);
  });

  app.delete('/api/teachers/:id', async (req, res) => {
    const success = await db.deleteTeacher(req.params.id);
    // Unlink logins pointing at the removed profile so they don't dangle
    try {
      const users = await db.getUsers();
      const linked = users.filter(u => u.teacherId === req.params.id);
      for (const u of linked) {
        await db.saveUser({ ...u, teacherId: null });
      }
    } catch (err) {
      console.error('Teacher-login unlink error:', err);
    }
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
    try {
      const item = normalizeAssignment(req.body);
      await db.saveClassSubject(item);
      const populated = await populateAssignment(item);
      res.json(populated);
    } catch (err) {
      // Validation errors (e.g. odd practical hours) must return 400, never crash the server
      res.status(400).json({ error: (err as Error).message });
    }
  };

  const handleUpdateAssignment = async (req: express.Request, res: express.Response) => {
    try {
      const list = await db.getClassSubjects();
      const existing = list.find(cs => cs.id === req.params.id);
      if (!existing) return res.status(404).json({ error: 'Assignment not found' });
      const updated = normalizeAssignment({ ...existing, ...req.body }, req.params.id);
      await db.saveClassSubject(updated);
      const populated = await populateAssignment(updated);
      res.json(populated);
    } catch (err) {
      // Validation errors (e.g. odd practical hours) must return 400, never crash the server
      res.status(400).json({ error: (err as Error).message });
    }
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

  // --- LEAVE & COVER WORKFLOW ---
  // A teacher releases their lecture (absent) -> status OPEN.
  // Any other teacher free in that slot may claim it (subject need not match).
  const entryStatus = (e: TimetableEntry): 'SCHEDULED' | 'OPEN' | 'COVERED' => e.status || 'SCHEDULED';

  const teacherBusyAt = (entries: TimetableEntry[], teacherId: string, day: string, periodIndex: number, excludeId?: string) =>
    entries.filter(e =>
      e.id !== excludeId &&
      e.day === day &&
      e.periodIndex === periodIndex &&
      ((e.teacherId === teacherId && entryStatus(e) !== 'OPEN') || e.coverTeacherId === teacherId)
    );

  // Release my lecture (mark absent) -> OPEN for others to take
  app.post('/api/timetable/:id/release', async (req, res) => {
    try {
      const { teacherId } = req.body || {};
      const entries = await db.getTimetableEntries();
      const target = entries.find(e => e.id === req.params.id);
      if (!target) return res.status(404).json({ error: 'Lecture not found' });
      if (!teacherId || target.teacherId !== teacherId) {
        return res.status(403).json({ error: 'Only the assigned teacher can release this lecture' });
      }
      target.status = 'OPEN';
      target.coverTeacherId = null;
      await db.saveTimetableEntries(entries);
      res.json(target);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Undo my release -> back to SCHEDULED (only while nobody covers it)
  app.post('/api/timetable/:id/cancel-release', async (req, res) => {
    try {
      const { teacherId } = req.body || {};
      const entries = await db.getTimetableEntries();
      const target = entries.find(e => e.id === req.params.id);
      if (!target) return res.status(404).json({ error: 'Lecture not found' });
      if (target.teacherId !== teacherId) {
        return res.status(403).json({ error: 'Only the assigned teacher can undo this release' });
      }
      if (entryStatus(target) !== 'OPEN') {
        return res.status(400).json({ error: 'This lecture is not released' });
      }
      target.status = 'SCHEDULED';
      target.coverTeacherId = null;
      await db.saveTimetableEntries(entries);
      res.json(target);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Claim an OPEN lecture. Anyone free in that slot can take it.
  // If the claimant has their own class at that time, the server refuses
  // (409 + conflict details) unless force=true with releaseOwnEntryId —
  // then the claimant's own lecture is freed for others (swap).
  app.post('/api/timetable/:id/claim', async (req, res) => {
    try {
      const { teacherId, force, releaseOwnEntryId } = req.body || {};
      if (!teacherId) return res.status(400).json({ error: 'teacherId is required' });
      const entries = await db.getTimetableEntries();
      const target = entries.find(e => e.id === req.params.id);
      if (!target) return res.status(404).json({ error: 'Lecture not found' });
      if (entryStatus(target) !== 'OPEN') {
        return res.status(400).json({ error: 'This lecture is no longer open' });
      }
      if (target.teacherId === teacherId) {
        return res.status(400).json({ error: 'This is your own lecture — use Undo release instead' });
      }

      const busy = teacherBusyAt(entries, String(teacherId), target.day, target.periodIndex, target.id);
      if (busy.length > 0 && !force) {
        const c = busy[0];
        const [subjects, classes] = await Promise.all([db.getSubjects(), db.getClasses()]);
        const subj = subjects.find(s => s.id === c.subjectId);
        const cls = classes.find(cl => cl.id === c.classId);
        return res.status(409).json({
          error: 'You already have a class at this time',
          conflict: {
            entryId: c.id,
            subjectName: subj?.name || 'Your class',
            className: cls?.name || '',
            day: c.day,
            periodIndex: c.periodIndex,
            startTime: c.startTime,
            endTime: c.endTime,
          },
        });
      }

      if (busy.length > 0) {
        if (!releaseOwnEntryId) {
          return res.status(400).json({ error: 'Choose which of your lectures to free for others' });
        }
        const own = entries.find(e => e.id === releaseOwnEntryId);
        if (!own) return res.status(400).json({ error: 'Selected lecture to free was not found' });
        const isMyScheduled = own.teacherId === teacherId && entryStatus(own) !== 'OPEN';
        const isMyCover = own.coverTeacherId === teacherId;
        if (!isMyScheduled && !isMyCover) {
          return res.status(400).json({ error: 'You can only free your own lecture' });
        }
        // Free it for others: own scheduled lecture -> OPEN, held cover -> released
        own.status = 'OPEN';
        own.coverTeacherId = null;
      }

      target.status = 'COVERED';
      target.coverTeacherId = String(teacherId);
      await db.saveTimetableEntries(entries);
      res.json(target);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Give up a lecture I claimed -> back to OPEN
  app.post('/api/timetable/:id/unclaim', async (req, res) => {
    try {
      const { teacherId } = req.body || {};
      const entries = await db.getTimetableEntries();
      const target = entries.find(e => e.id === req.params.id);
      if (!target) return res.status(404).json({ error: 'Lecture not found' });
      if (target.coverTeacherId !== teacherId) {
        return res.status(403).json({ error: 'Only the covering teacher can give up this lecture' });
      }
      target.status = 'OPEN';
      target.coverTeacherId = null;
      await db.saveTimetableEntries(entries);
      res.json(target);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Mark full-day leave: release all my scheduled lectures on a day
  app.post('/api/timetable/leave', async (req, res) => {
    try {
      const { teacherId, day } = req.body || {};
      if (!teacherId || !day) return res.status(400).json({ error: 'teacherId and day are required' });
      const entries = await db.getTimetableEntries();
      let count = 0;
      for (const e of entries) {
        if (e.teacherId === teacherId && e.day === day && entryStatus(e) === 'SCHEDULED') {
          e.status = 'OPEN';
          e.coverTeacherId = null;
          count++;
        }
      }
      await db.saveTimetableEntries(entries);
      res.json({ success: true, released: count });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Notices feed for students (and teachers): absent -> covered-by / free
  app.get('/api/notices', async (req, res) => {
    try {
      const [entries, teachers, classes, subjects] = await Promise.all([
        db.getTimetableEntries(),
        db.getTeachers(),
        db.getClasses(),
        db.getSubjects(),
      ]);
      const nameOf = (id?: string | null) => teachers.find(t => t.id === id)?.name || 'Unknown teacher';
      const notices = entries
        .filter(e => entryStatus(e) === 'OPEN' || entryStatus(e) === 'COVERED')
        .map(e => {
          const status = entryStatus(e) as 'OPEN' | 'COVERED';
          const cls = classes.find(c => c.id === e.classId);
          const subj = subjects.find(s => s.id === e.subjectId);
          const absentName = nameOf(e.teacherId);
          const coverName = e.coverTeacherId ? nameOf(e.coverTeacherId) : null;
          return {
            id: `notice_${e.id}`,
            day: e.day,
            periodIndex: e.periodIndex,
            startTime: e.startTime,
            endTime: e.endTime,
            classId: e.classId,
            className: cls?.name || 'Class',
            subjectId: e.subjectId,
            subjectName: subj?.name || 'Lecture',
            absentTeacherId: e.teacherId,
            absentTeacherName: absentName,
            status,
            coverTeacherId: e.coverTeacherId || null,
            coverTeacherName: coverName,
            message:
              status === 'COVERED'
                ? `${absentName} is absent — Period ${e.periodIndex} (${subj?.name || 'Lecture'}, ${cls?.name || 'class'}) will be taken by ${coverName}.`
                : `${absentName} is absent — Period ${e.periodIndex} (${subj?.name || 'Lecture'}, ${cls?.name || 'class'}) is FREE, no teacher assigned yet.`,
          };
        })
        .sort((a, b) => a.day.localeCompare(b.day) || a.periodIndex - b.periodIndex);
      res.json({ notices });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
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
    const { createServer: createViteServer } = await import('vite');
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

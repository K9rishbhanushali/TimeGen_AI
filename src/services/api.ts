import {
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
  TimetableEntry,
  GenerationRun,
  ValidationReport,
  DashboardStats,
  AIChatMessage,
  ConflictInfo
} from '../types';

const BASE_URL = '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(errorData.error || errorData.message || `Request failed with status ${res.status}`);
  }

  return res.json();
}

// Classroom API
export const classroomService = {
  getAll: () => request<Classroom[]>('/classrooms'),
  getById: (id: string) => request<Classroom>(`/classrooms/${id}`),
  create: (data: Omit<Classroom, 'id'>) => request<Classroom>('/classrooms', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Classroom>) => request<Classroom>(`/classrooms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<{ success: boolean }>(`/classrooms/${id}`, { method: 'DELETE' }),
};

// Lab API
export const labService = {
  getAll: () => request<Lab[]>('/labs'),
  getById: (id: string) => request<Lab>(`/labs/${id}`),
  create: (data: Omit<Lab, 'id'>) => request<Lab>('/labs', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Lab>) => request<Lab>(`/labs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<{ success: boolean }>(`/labs/${id}`, { method: 'DELETE' }),
};

// Student Class API
export const classService = {
  getAll: () => request<StudentClass[]>('/classes'),
  getById: (id: string) => request<StudentClass>(`/classes/${id}`),
  create: (data: Omit<StudentClass, 'id'>) => request<StudentClass>('/classes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<StudentClass>) => request<StudentClass>(`/classes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<{ success: boolean }>(`/classes/${id}`, { method: 'DELETE' }),
  getSubjects: (classId: string) => request<ClassSubject[]>(`/classes/${classId}/subjects`),
  calculateBatches: (classId: string, benchCapacity?: number) =>
    request<{ batches: Batch[] }>(`/classes/${classId}/calculate-batches`, {
      method: 'POST',
      body: JSON.stringify({ benchCapacity }),
    }),
};

// Teacher API
export const teacherService = {
  getAll: () => request<Teacher[]>('/teachers'),
  getById: (id: string) => request<Teacher>(`/teachers/${id}`),
  create: (data: Omit<Teacher, 'id'>) => request<Teacher>('/teachers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Teacher>) => request<Teacher>(`/teachers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<{ success: boolean }>(`/teachers/${id}`, { method: 'DELETE' }),
};

// Subject Master API
export const subjectService = {
  getAll: () => request<Subject[]>('/subjects'),
  getById: (id: string) => request<Subject>(`/subjects/${id}`),
  create: (data: Partial<Subject>) => request<Subject>('/subjects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Subject>) => request<Subject>(`/subjects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<{ success: boolean }>(`/subjects/${id}`, { method: 'DELETE' }),
};

// Assignment API (Class-Subject)
export const assignmentService = {
  getAll: () => request<ClassSubject[]>('/class-subject-assignments'),
  getByClass: (classId: string) => request<ClassSubject[]>(`/classes/${classId}/subjects`),
  create: (data: Partial<ClassSubject>) => request<ClassSubject>('/class-subject-assignments', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<ClassSubject>) => request<ClassSubject>(`/class-subject-assignments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<{ success: boolean }>(`/class-subject-assignments/${id}`, { method: 'DELETE' }),
};

// Timings API
export const timingService = {
  get: () => request<TimingConfig>('/timings'),
  getConfig: () => request<TimingConfig>('/timings'),
  update: (data: TimingConfig) => request<TimingConfig>('/timings', { method: 'POST', body: JSON.stringify(data) }),
  saveConfig: (data: TimingConfig) => request<TimingConfig>('/timings', { method: 'POST', body: JSON.stringify(data) }),
  getTimeSlots: () => request<TimeSlot[]>('/timings/slots'),
  getSlots: () => request<TimeSlot[]>('/timings/slots'),
};

// Availability API
export const availabilityService = {
  getAll: () => request<AvailabilityRule[]>('/availability'),
  getRules: () => request<AvailabilityRule[]>('/availability'),
  save: (rules: AvailabilityRule[]) => request<{ success: boolean }>('/availability', { method: 'POST', body: JSON.stringify({ rules }) }),
  saveRules: (rules: AvailabilityRule[]) => request<{ success: boolean }>('/availability', { method: 'POST', body: JSON.stringify({ rules }) }),
};

// Timetable API
export const timetableService = {
  getAll: () => request<TimetableEntry[]>('/timetable'),
  getByClass: (classId: string) => request<TimetableEntry[]>(`/timetable/class/${classId}`),
  getByTeacher: (teacherId: string) => request<TimetableEntry[]>(`/timetable/teacher/${teacherId}`),
  getByRoom: (roomId: string) => request<TimetableEntry[]>(`/timetable/room/${roomId}`),
  getByLab: (labId: string) => request<TimetableEntry[]>(`/timetable/lab/${labId}`),
  generate: (options?: { classIds?: string[]; startFresh?: boolean }) =>
    request<{ entries: TimetableEntry[]; run: GenerationRun; qualityScore?: number; solverTimeMs?: number; conflicts?: string[] }>('/timetable/generate', {
      method: 'POST',
      body: JSON.stringify(options || {}),
    }),
  validate: (entries?: TimetableEntry[]) => request<ValidationReport>('/timetable/validate', { method: 'POST', body: JSON.stringify({ entries }) }),
  update: (id: string, entry: Partial<TimetableEntry>) => request<TimetableEntry>(`/timetable/${id}`, { method: 'PUT', body: JSON.stringify(entry) }),
  delete: (id: string) => request<{ success: boolean }>(`/timetable/${id}`, { method: 'DELETE' }),
  toggleLock: (id: string, isLocked: boolean) => request<TimetableEntry>(`/timetable/${id}/lock`, { method: 'POST', body: JSON.stringify({ isLocked }) }),
  getRuns: () => request<GenerationRun[]>('/timetable/runs'),
};

// Dashboard Stats API
export const dashboardService = {
  getStats: () => request<DashboardStats>('/dashboard/stats'),
  seedDemoData: () => request<{ success: boolean; message: string }>('/seed', { method: 'POST' }),
  clearAllData: () => request<{ success: boolean; message: string }>('/clear', { method: 'POST' }),
};

// Database API
export const databaseService = {
  seed: () => request<{ success: boolean; message: string }>('/seed', { method: 'POST' }),
  clearAll: () => request<{ success: boolean; message: string }>('/clear', { method: 'POST' }),
};

// AI Assistant API
export const aiService = {
  chat: (message: string, history?: AIChatMessage[]) =>
    request<{ reply: string; proposedAction?: AIChatMessage['proposedAction'] }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    }),
  explainConflict: (conflictInfo: ConflictInfo | string) =>
    request<{ explanation: string; suggestions: string[] }>('/ai/explain-conflict', {
      method: 'POST',
      body: JSON.stringify({ conflictInfo }),
    }),
};

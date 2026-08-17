import { MongoClient, Db } from 'mongodb';
import fs from 'fs';
import path from 'path';
import {
  Classroom,
  Lab,
  StudentClass,
  Batch,
  Teacher,
  Subject,
  ClassSubject,
  TimingConfig,
  AvailabilityRule,
  TimetableEntry,
  GenerationRun
} from '../../src/types';

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.DATABASE_NAME || 'timegen_ai';
// Vercel's filesystem is ephemeral, so a local JSON file is not a safe
// database there. Set REQUIRE_MONGODB=true to enforce the same rule elsewhere.
const REQUIRE_MONGODB = process.env.VERCEL === '1' || process.env.REQUIRE_MONGODB === 'true';

let dbInstance: Db | null = null;
let mongoClient: MongoClient | null = null;
let connectionPromise: Promise<Db> | null = null;

// Local fallback store file path
const STORAGE_FILE = path.join(process.cwd(), 'timegen_local_db.json');

interface LocalDBData {
  classrooms: Classroom[];
  labs: Lab[];
  classes: StudentClass[];
  teachers: Teacher[];
  subjects: Subject[];
  classSubjects: ClassSubject[];
  timingConfig: TimingConfig;
  availabilityRules: AvailabilityRule[];
  timetableEntries: TimetableEntry[];
  generationRuns: GenerationRun[];
}

const defaultTimingConfig: TimingConfig = {
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

function loadLocalDB(): LocalDBData {
  if (fs.existsSync(STORAGE_FILE)) {
    try {
      const data = fs.readFileSync(STORAGE_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      console.error('Error reading local JSON database, re-initializing.');
    }
  }
  return {
    classrooms: [],
    labs: [],
    classes: [],
    teachers: [],
    subjects: [],
    classSubjects: [],
    timingConfig: defaultTimingConfig,
    availabilityRules: [],
    timetableEntries: [],
    generationRuns: [],
  };
}

function saveLocalDB(data: LocalDBData) {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Failed to save local DB:', err);
  }
}

export async function initDatabase(): Promise<{ isMongoDB: boolean }> {
  if (dbInstance) return { isMongoDB: true };

  if (connectionPromise) {
    await connectionPromise;
    return { isMongoDB: true };
  }

  if (MONGODB_URI) {
    try {
      console.log(`Connecting to MongoDB...`);
      // Atlas connection strings already include their TLS settings. Do not
      // disable certificate verification for non-SRV URLs.
      mongoClient = new MongoClient(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });
      connectionPromise = mongoClient.connect().then(client => {
        const database = client.db(DB_NAME);
        dbInstance = database;
        return database;
      });
      await connectionPromise;
      console.log(`Successfully connected to MongoDB database: ${DB_NAME}`);
      return { isMongoDB: true };
    } catch (error) {
      console.warn('MongoDB connection failed:', (error as Error).message);
      if (mongoClient) {
        try {
          await mongoClient.close();
        } catch {
          // ignore close error
        }
        mongoClient = null;
      }
      dbInstance = null;
      connectionPromise = null;
      if (REQUIRE_MONGODB) {
        throw new Error('MongoDB Atlas is required in this environment. Set a valid MONGODB_URI and allow database network access.');
      }
    }
  } else {
    if (REQUIRE_MONGODB) {
      throw new Error('MONGODB_URI is required in this environment. Local JSON storage cannot be used on Vercel.');
    }
    console.log('No MONGODB_URI set; using local persistent document engine for local development.');
  }
  return { isMongoDB: false };
}

export function isMongoDBConnected(): boolean {
  return dbInstance !== null;
}

// Database helper functions
export const db = {
  // Classrooms
  getClassrooms: async (): Promise<Classroom[]> => {
    if (dbInstance) {
      const docs = await dbInstance.collection<Classroom>('classrooms').find().toArray();
      return docs.map(d => ({ ...d, id: d.id || (d as unknown as { _id: string })._id?.toString() }));
    }
    return loadLocalDB().classrooms;
  },
  saveClassroom: async (item: Classroom): Promise<Classroom> => {
    if (dbInstance) {
      await dbInstance.collection('classrooms').updateOne({ id: item.id }, { $set: item }, { upsert: true });
      return item;
    }
    const local = loadLocalDB();
    const idx = local.classrooms.findIndex(c => c.id === item.id);
    if (idx >= 0) local.classrooms[idx] = item;
    else local.classrooms.push(item);
    saveLocalDB(local);
    return item;
  },
  deleteClassroom: async (id: string): Promise<boolean> => {
    if (dbInstance) {
      const res = await dbInstance.collection('classrooms').deleteOne({ id });
      return res.deletedCount > 0;
    }
    const local = loadLocalDB();
    local.classrooms = local.classrooms.filter(c => c.id !== id);
    saveLocalDB(local);
    return true;
  },

  // Labs
  getLabs: async (): Promise<Lab[]> => {
    if (dbInstance) {
      const docs = await dbInstance.collection<Lab>('labs').find().toArray();
      return docs.map(d => ({ ...d, id: d.id || (d as unknown as { _id: string })._id?.toString() }));
    }
    return loadLocalDB().labs;
  },
  saveLab: async (item: Lab): Promise<Lab> => {
    if (dbInstance) {
      await dbInstance.collection('labs').updateOne({ id: item.id }, { $set: item }, { upsert: true });
      return item;
    }
    const local = loadLocalDB();
    const idx = local.labs.findIndex(l => l.id === item.id);
    if (idx >= 0) local.labs[idx] = item;
    else local.labs.push(item);
    saveLocalDB(local);
    return item;
  },
  deleteLab: async (id: string): Promise<boolean> => {
    if (dbInstance) {
      const res = await dbInstance.collection('labs').deleteOne({ id });
      return res.deletedCount > 0;
    }
    const local = loadLocalDB();
    local.labs = local.labs.filter(l => l.id !== id);
    saveLocalDB(local);
    return true;
  },

  // Student Classes
  getClasses: async (): Promise<StudentClass[]> => {
    if (dbInstance) {
      const docs = await dbInstance.collection<StudentClass>('student_classes').find().toArray();
      return docs.map(d => ({ ...d, id: d.id || (d as unknown as { _id: string })._id?.toString() }));
    }
    return loadLocalDB().classes;
  },
  saveClass: async (item: StudentClass): Promise<StudentClass> => {
    if (dbInstance) {
      await dbInstance.collection('student_classes').updateOne({ id: item.id }, { $set: item }, { upsert: true });
      return item;
    }
    const local = loadLocalDB();
    const idx = local.classes.findIndex(c => c.id === item.id);
    if (idx >= 0) local.classes[idx] = item;
    else local.classes.push(item);
    saveLocalDB(local);
    return item;
  },
  deleteClass: async (id: string): Promise<boolean> => {
    if (dbInstance) {
      const res = await dbInstance.collection('student_classes').deleteOne({ id });
      return res.deletedCount > 0;
    }
    const local = loadLocalDB();
    local.classes = local.classes.filter(c => c.id !== id);
    saveLocalDB(local);
    return true;
  },

  // Teachers
  getTeachers: async (): Promise<Teacher[]> => {
    if (dbInstance) {
      const docs = await dbInstance.collection<Teacher>('teachers').find().toArray();
      return docs.map(d => ({ ...d, id: d.id || (d as unknown as { _id: string })._id?.toString() }));
    }
    return loadLocalDB().teachers;
  },
  saveTeacher: async (item: Teacher): Promise<Teacher> => {
    if (dbInstance) {
      await dbInstance.collection('teachers').updateOne({ id: item.id }, { $set: item }, { upsert: true });
      return item;
    }
    const local = loadLocalDB();
    const idx = local.teachers.findIndex(t => t.id === item.id);
    if (idx >= 0) local.teachers[idx] = item;
    else local.teachers.push(item);
    saveLocalDB(local);
    return item;
  },
  deleteTeacher: async (id: string): Promise<boolean> => {
    if (dbInstance) {
      const res = await dbInstance.collection('teachers').deleteOne({ id });
      return res.deletedCount > 0;
    }
    const local = loadLocalDB();
    local.teachers = local.teachers.filter(t => t.id !== id);
    saveLocalDB(local);
    return true;
  },

  // Subjects
  getSubjects: async (): Promise<Subject[]> => {
    if (dbInstance) {
      const docs = await dbInstance.collection<Subject>('subjects').find().toArray();
      return docs.map(d => ({ ...d, id: d.id || (d as unknown as { _id: string })._id?.toString() }));
    }
    return loadLocalDB().subjects;
  },
  saveSubject: async (item: Subject): Promise<Subject> => {
    if (dbInstance) {
      await dbInstance.collection('subjects').updateOne({ id: item.id }, { $set: item }, { upsert: true });
      return item;
    }
    const local = loadLocalDB();
    const idx = local.subjects.findIndex(s => s.id === item.id);
    if (idx >= 0) local.subjects[idx] = item;
    else local.subjects.push(item);
    saveLocalDB(local);
    return item;
  },
  deleteSubject: async (id: string): Promise<boolean> => {
    if (dbInstance) {
      const res = await dbInstance.collection('subjects').deleteOne({ id });
      return res.deletedCount > 0;
    }
    const local = loadLocalDB();
    local.subjects = local.subjects.filter(s => s.id !== id);
    saveLocalDB(local);
    return true;
  },

  // Class-Subjects (Assignments)
  getClassSubjects: async (): Promise<ClassSubject[]> => {
    if (dbInstance) {
      const docs = await dbInstance.collection<ClassSubject>('class_subjects').find().toArray();
      return docs.map(d => ({ ...d, id: d.id || (d as unknown as { _id: string })._id?.toString() }));
    }
    return loadLocalDB().classSubjects;
  },
  saveClassSubject: async (item: ClassSubject): Promise<ClassSubject> => {
    if (dbInstance) {
      await dbInstance.collection('class_subjects').updateOne({ id: item.id }, { $set: item }, { upsert: true });
      return item;
    }
    const local = loadLocalDB();
    const idx = local.classSubjects.findIndex(cs => cs.id === item.id);
    if (idx >= 0) local.classSubjects[idx] = item;
    else local.classSubjects.push(item);
    saveLocalDB(local);
    return item;
  },
  deleteClassSubject: async (id: string): Promise<boolean> => {
    if (dbInstance) {
      const res = await dbInstance.collection('class_subjects').deleteOne({ id });
      return res.deletedCount > 0;
    }
    const local = loadLocalDB();
    local.classSubjects = local.classSubjects.filter(cs => cs.id !== id);
    saveLocalDB(local);
    return true;
  },

  // Timing Config
  getTimingConfig: async (): Promise<TimingConfig> => {
    if (dbInstance) {
      const doc = await dbInstance.collection<TimingConfig>('time_slots').findOne({ _id: 'config' as any });
      if (doc) return doc;
    }
    return loadLocalDB().timingConfig || defaultTimingConfig;
  },
  saveTimingConfig: async (config: TimingConfig): Promise<TimingConfig> => {
    if (dbInstance) {
      await dbInstance.collection('time_slots').updateOne({ _id: 'config' as any }, { $set: config }, { upsert: true });
      return config;
    }
    const local = loadLocalDB();
    local.timingConfig = config;
    saveLocalDB(local);
    return config;
  },

  // Availability
  getAvailabilityRules: async (): Promise<AvailabilityRule[]> => {
    if (dbInstance) {
      const docs = await dbInstance.collection<AvailabilityRule>('resource_availability').find().toArray();
      return docs;
    }
    return loadLocalDB().availabilityRules;
  },
  saveAvailabilityRules: async (rules: AvailabilityRule[]): Promise<boolean> => {
    if (dbInstance) {
      await dbInstance.collection('resource_availability').deleteMany({});
      if (rules.length > 0) {
        await dbInstance.collection('resource_availability').insertMany(rules);
      }
      return true;
    }
    const local = loadLocalDB();
    local.availabilityRules = rules;
    saveLocalDB(local);
    return true;
  },

  // Timetable Entries
  getTimetableEntries: async (): Promise<TimetableEntry[]> => {
    if (dbInstance) {
      const docs = await dbInstance.collection<TimetableEntry>('timetable_entries').find().toArray();
      return docs.map(d => ({ ...d, id: d.id || (d as unknown as { _id: string })._id?.toString() }));
    }
    return loadLocalDB().timetableEntries;
  },
  saveTimetableEntries: async (entries: TimetableEntry[]): Promise<boolean> => {
    if (dbInstance) {
      await dbInstance.collection('timetable_entries').deleteMany({});
      if (entries.length > 0) {
        await dbInstance.collection('timetable_entries').insertMany(entries);
      }
      return true;
    }
    const local = loadLocalDB();
    local.timetableEntries = entries;
    saveLocalDB(local);
    return true;
  },
  updateTimetableEntry: async (id: string, entryData: Partial<TimetableEntry>): Promise<TimetableEntry | null> => {
    const entries = await db.getTimetableEntries();
    const idx = entries.findIndex(e => e.id === id);
    if (idx === -1) return null;
    const updated = { ...entries[idx], ...entryData };
    entries[idx] = updated;
    await db.saveTimetableEntries(entries);
    return updated;
  },

  // Generation Runs
  getGenerationRuns: async (): Promise<GenerationRun[]> => {
    if (dbInstance) {
      const docs = await dbInstance.collection<GenerationRun>('generation_runs').find().toArray();
      return docs;
    }
    return loadLocalDB().generationRuns;
  },
  saveGenerationRun: async (run: GenerationRun): Promise<GenerationRun> => {
    if (dbInstance) {
      await dbInstance.collection('generation_runs').updateOne({ id: run.id }, { $set: run }, { upsert: true });
      return run;
    }
    const local = loadLocalDB();
    local.generationRuns.unshift(run);
    saveLocalDB(local);
    return run;
  },

  // Reset / Clear
  clearAll: async (): Promise<boolean> => {
    if (dbInstance) {
      await Promise.all([
        dbInstance.collection('classrooms').deleteMany({}),
        dbInstance.collection('labs').deleteMany({}),
        dbInstance.collection('student_classes').deleteMany({}),
        dbInstance.collection('teachers').deleteMany({}),
        dbInstance.collection('subjects').deleteMany({}),
        dbInstance.collection('class_subjects').deleteMany({}),
        dbInstance.collection('resource_availability').deleteMany({}),
        dbInstance.collection('timetable_entries').deleteMany({}),
        dbInstance.collection('generation_runs').deleteMany({}),
      ]);
      return true;
    }
    saveLocalDB({
      classrooms: [],
      labs: [],
      classes: [],
      teachers: [],
      subjects: [],
      classSubjects: [],
      timingConfig: defaultTimingConfig,
      availabilityRules: [],
      timetableEntries: [],
      generationRuns: [],
    });
    return true;
  },
};

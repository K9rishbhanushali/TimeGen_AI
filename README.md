# TimeGen AI - Automatic College Timetable Generator

**TimeGen AI** is an intelligent, full-stack college timetable generation system powered by Express, React, TypeScript, Tailwind CSS, and Gemini AI.

---

## 📋 System Requirements & Prerequisites

- **Node.js**: Version `18.x` or higher (`node -v`)
- **Package Manager**: `npm` (v9+) or `bun`
- **Database**: MongoDB Atlas for every Vercel deployment. Local development may use the JSON fallback (`timegen_local_db.json`) when MongoDB is not configured.

---

## 📦 Requirements File (`package.json`)

The project uses `package.json` for dependency management:

### **Core Dependencies**
- `react` & `react-dom` (`^19.0.1`): UI Framework
- `@google/genai` (`^2.4.0`): Gemini AI SDK for assistant intelligence
- `express` (`^4.21.2`): Backend REST API server
- `mongodb` (`^7.5.0`): MongoDB database client driver
- `lucide-react` (`^0.546.0`): Icon library
- `recharts` (`^3.10.1`): Analytics dashboard charts
- `motion` (`^12.23.24`): UI animation framework
- `dotenv` (`^17.2.3`): Environment variable management

### **Dev Dependencies**
- `vite` (`^6.2.3`): Frontend bundler and dev server
- `tsx` (`^4.21.0`): TypeScript execution engine for Node.js
- `typescript` (`~5.8.2`): Static type checker
- `esbuild` (`^0.25.0`): High-speed bundler for backend production build

---

## ⚙️ Environment Configuration (`.env.local`)

Copy `.env.example` to `.env.local` or create a `.env` file in the root directory:

```env
# Required for AI Assistant & Conflict Explainer
GEMINI_API_KEY="your-gemini-api-key-here"

# Required on Vercel: MongoDB Atlas connection string
MONGODB_URI="mongodb+srv://<username>:<password>@<cluster-url>/timegen_ai?retryWrites=true&w=majority"
DATABASE_NAME="timegen_ai"

# Optional: Server Host URL
APP_URL="http://localhost:3000"
```

---

## 🚀 How to Run the Application

### 1. Install Dependencies
Open your terminal in the project directory and run:
```bash
npm install
```

### 2. Start Development Server
Run the combined Express backend and Vite dev server:
```bash
npm run dev
```
Access the application in your browser at:
👉 **[http://localhost:3000](http://localhost:3000)**

### 3. Production Build & Run (Optional)
To create a production build and run the compiled CJS server:
```bash
# Build frontend assets & backend bundle
npm run build

# Start production server
npm run start
```

### 4. Deploy Frontend and API on Vercel

This project deploys as one Vercel project: Vite serves the React frontend and
`api/index.ts` serves the Express API as a serverless function. Before
deploying, add these environment variables in **Vercel → Project Settings →
Environment Variables**:

```env
MONGODB_URI="mongodb+srv://<username>:<password>@<cluster-url>/timegen_ai?retryWrites=true&w=majority"
DATABASE_NAME="timegen_ai"
GEMINI_API_KEY="your-gemini-api-key"
```

Then import the GitHub repository in Vercel and deploy. `vercel.json` routes
all `/api/*` requests to the Express serverless function and routes frontend
paths to the React application. MongoDB Atlas is required on Vercel; the local
JSON development store is intentionally unavailable there.

### 5. Deploy on Render

Use **New → Blueprint** in Render and select this repository. The included
`render.yaml` runs `npm ci --include=dev && npm run build`, starts the compiled Express
server, and checks `/api/health`. Add `MONGODB_URI`, `DATABASE_NAME`, and
`GEMINI_API_KEY` as secret environment variables before deploying. Set
`REQUIRE_MONGODB=true` so a database configuration problem fails clearly
instead of falling back to temporary local storage.

---

## 💡 Quick Tips
- **Demo Data**: On first launch, if the database is empty, the application auto-seeds demo data (Room 101-103, HTML/Java/Python Labs, TYIT1/FYCS classes, faculty members).
- **Manual Reset**: Navigate to **Settings** -> **Seed Demo Data** or **Wipe Database Clean** anytime.

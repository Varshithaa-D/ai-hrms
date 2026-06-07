# AI-HRMS — AI-Powered Human Resource Management System

> Theme: Build the Future of HR Management with AI-Powered Solutions

## 🚀 Live Demo
- **Frontend:** Run `cd frontend && pnpm dev` → http://localhost:3000
- **Backend:** Run `cd backend && pnpm dev` → http://localhost:5000
- **AI Service:** Run `cd ai-service && uvicorn main:app --port 8000`

## 🔑 Demo Accounts
| Role | Email | Password |
|------|-------|----------|
| Management Admin | admin@hrms.com | password123 |
| Senior Manager | manager@hrms.com | password123 |
| HR Recruiter | hr@hrms.com | password123 |
| Employee | emp@hrms.com | password123 |

## ✅ Features Implemented

### Core HRMS
- Employee data management (5,000+ employees)
- Attendance tracking with clock in/out
- Leave management with approval workflow
- Payroll generation with Indian tax (PF, ESI, TDS)
- Performance reviews with OKR tracking

### AI Features
- **AI Resume Screening** — zero human intervention, Gemini LLM evaluation with strengths/weaknesses
- **AI Voice Interview** — adaptive questions via Groq, speech recognition, auto scorecard
- **AI Proctored Interview** — camera monitoring, face detection, tab-lock, fullscreen enforcement
- **AI Co-pilot** — context-aware HR assistant powered by Gemini
- **Employee Experience Score (EXS)** — unique AI-computed wellness metric
- **AI JD Generator** — full job description from 3 inputs

### Multi-Role System
- Management Admin — full access, company-wide analytics
- Senior Manager — team view, leave approvals, performance
- HR Recruiter — recruitment, screening, interviews
- Employee — self-service, leave, payslips, performance

### Scalability
- 5,000+ employee records in MongoDB
- Paginated APIs with <50ms response time
- Real-time WebSocket connections
- Live scalability metrics dashboard

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, TailwindCSS, Zustand, React Query |
| Backend | Node.js, Express, MongoDB, Socket.io |
| AI Service | FastAPI, Gemini 2.0 Flash, Groq Llama 3.3, Groq Whisper |
| Database | MongoDB with Mongoose |
| Auth | JWT with role-based access control |

## ⚙️ Setup Instructions

### Prerequisites
- Node.js 18+, Python 3.9+, MongoDB, pnpm

### Installation

```bash
# 1. Backend
cd backend
pnpm install
cp .env.example .env  # Add your keys
pnpm exec ts-node -r dotenv/config src/scripts/seed.ts
pnpm exec ts-node -r dotenv/config src/scripts/seed5000.ts
pnpm dev

# 2. Frontend
cd frontend
pnpm install
pnpm dev

# 3. AI Service
cd ai-service
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements_lite.txt
uvicorn main_lite:app --port 8000 --reload
```

### Environment Variables

**backend/.env**
MONGO_URI=mongodb://localhost:27017/ai_hrms
JWT_SECRET=your_secret
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key

**ai-service/.env**
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key

## 📁 Project Structure
ai-hrms/
├── frontend/          # Next.js UI
│   ├── app/           # Pages (dashboard, interview, login)
│   ├── components/    # Reusable UI components
│   └── lib/           # API client, stores, hooks
├── backend/           # Node.js API
│   ├── src/
│   │   ├── models/    # MongoDB schemas
│   │   ├── routes/    # API endpoints
│   │   └── middleware/# Auth, RBAC
└── ai-service/        # Python FastAPI
└── main_lite.py   # All AI endpoints

## 🎯 Unique Differentiators
1. **Proctored Interview System** — camera CV, tab detection, keyboard blocking
2. **Shareable Interview Links** — candidates take interviews in locked environment
3. **Employee Experience Score** — AI-computed engagement health metric
4. **AI Co-pilot Sidebar** — context-aware insights on every page
5. **Zero-intervention Resume Screening** — end-to-end AI pipeline

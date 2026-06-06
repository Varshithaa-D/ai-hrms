from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv
import os, re, json, numpy as np
import time
import io

load_dotenv()

app = FastAPI(title="AI-HRMS", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── AI clients ──────────────────────────────────────────────────────────────
from google import genai as google_genai
from groq import Groq

GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
GROQ_KEY   = os.getenv("GROQ_API_KEY", "")

if not GEMINI_KEY:
    print("WARNING: GEMINI_API_KEY not set")
if not GROQ_KEY:
    print("WARNING: GROQ_API_KEY not set")

gemini = google_genai.Client(api_key=GEMINI_KEY)
groq   = Groq(api_key=GROQ_KEY)

GEMINI_MODEL = "gemini-2.0-flash"
GROQ_MODEL   = "llama-3.3-70b-versatile"
GROQ_WHISPER = "whisper-large-v3-turbo"

# ── Local AI models ──────────────────────────────────────────────────────────
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import spacy

print("Loading sentence-transformers...")
embedder = SentenceTransformer("all-MiniLM-L6-v2")
print("Loading spacy...")
nlp = spacy.load("en_core_web_sm")
print("Models loaded.")

# ── Helper ───────────────────────────────────────────────────────────────────
def call_gemini(prompt: str) -> str:
    """Call Gemini with retry + fallback to Groq on quota errors."""
    for attempt in range(3):
        try:
            r = gemini.models.generate_content(model=GEMINI_MODEL, contents=prompt)
            return r.text.strip()
        except Exception as e:
            err_str = str(e)
            if '429' in err_str or 'RESOURCE_EXHAUSTED' in err_str:
                if attempt < 2:
                    wait = (attempt + 1) * 5
                    print(f"Gemini quota hit, waiting {wait}s then retrying...")
                    time.sleep(wait)
                else:
                    print("Gemini quota exhausted — falling back to Groq")
                    return call_groq_fallback(prompt)
            else:
                print(f"Gemini error: {e}")
                raise HTTPException(status_code=500, detail=f"Gemini API error: {str(e)}")
    return call_groq_fallback(prompt)

def call_groq_fallback(prompt: str) -> str:
    """Fallback LLM when Gemini quota is hit."""
    try:
        r = groq.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000,
            temperature=0.7
        )
        return r.choices[0].message.content.strip()
    except Exception as e:
        print(f"Groq fallback error: {e}")
        raise HTTPException(status_code=500, detail="Both Gemini and Groq unavailable. Check your API keys.")

def parse_json(text: str) -> dict:
    text = re.sub(r'```json|```', '', text).strip()
    # Find first complete JSON object
    depth = 0
    start = -1
    for i, c in enumerate(text):
        if c == '{':
            if depth == 0: start = i
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0 and start != -1:
                try:
                    return json.loads(text[start:i+1])
                except:
                    pass
    raise ValueError(f"No valid JSON in: {text[:200]}")

# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "gemini": bool(GEMINI_KEY), "groq": bool(GROQ_KEY)}

@app.get("/ping")
def ping():
    return {"pong": True}


# ════════════════════════════════════════════════════════════════════════════
# 1. RESUME SCREENING
# ════════════════════════════════════════════════════════════════════════════
@app.post("/ai/screen-resume")
async def screen_resume(
    file: UploadFile = File(...),
    job_description: str = Form(...),
    candidate_id: str = Form("")
):
    if not job_description.strip():
        raise HTTPException(status_code=400, detail="job_description is required")

    file_bytes = await file.read()
    resume_text = ""

    # Support PDF and DOCX
    filename = file.filename or ""
    if filename.lower().endswith(".pdf"):
        try:
            import pymupdf
            doc = pymupdf.open(stream=file_bytes, filetype="pdf")
            resume_text = "\n".join(p.get_text() for p in doc)
        except Exception as e:
            print(f"PDF error: {e}")
    elif filename.lower().endswith(".docx"):
        try:
            import zipfile, xml.etree.ElementTree as ET
            with zipfile.ZipFile(io.BytesIO(file_bytes), 'r') as z:
                xml_content = z.read('word/document.xml')
            tree = ET.fromstring(xml_content)
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            texts = tree.findall('.//w:t', ns)
            resume_text = ' '.join(t.text for t in texts if t.text)
        except Exception as e:
            print(f"DOCX error: {e}")
            resume_text = file_bytes.decode('utf-8', errors='ignore')
    else:
        resume_text = file_bytes.decode('utf-8', errors='ignore')

    if not resume_text.strip():
        resume_text = file_bytes.decode('utf-8', errors='ignore')

    if len(resume_text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Could not extract enough text from the file. Please upload a text-based PDF or DOCX.")

    print(f"Resume text length: {len(resume_text)}")

    # Semantic similarity
    jd_vec  = embedder.encode([job_description[:1000]])
    rv_vec  = embedder.encode([resume_text[:2000]])
    sim     = float(cosine_similarity(jd_vec, rv_vec)[0][0])
    sem_pct = round(sim * 100, 1)

    # Skills detection
    all_skills = [
        "python","javascript","typescript","react","node","nodejs","sql","java","c++","c#",
        "machine learning","deep learning","aws","azure","docker","kubernetes","git",
        "mongodb","postgresql","mysql","fastapi","django","flask","express","nextjs",
        "tailwind","figma","excel","communication","leadership","hr","recruitment",
        "data analysis","power bi","tableau","management","agile","scrum"
    ]
    found_skills = [s for s in all_skills if s.lower() in resume_text.lower()]

    # LLM evaluation — strict prompt to prevent 100% scores
    prompt = f"""You are a strict HR recruiter. Critically evaluate this resume against the job description.
Be honest and realistic — most resumes are NOT perfect matches. Score objectively.

JOB DESCRIPTION:
{job_description[:600]}

RESUME (first 1500 chars):
{resume_text[:1500]}

Instructions:
- Score 0-100 where 100 means PERFECT match (very rare)
- Most candidates score 40-75 unless they are exceptional
- Deduct points for: missing required skills, insufficient experience, gaps, irrelevant background
- Give specific reasons based on the actual resume content

Respond with ONLY this JSON (no markdown, no text outside):
{{"score": <realistic_number_40_to_85>, "recommendation": "<hire|maybe|reject>", "strengths": ["<specific strength from resume>", "<specific strength>", "<specific strength>"], "weaknesses": ["<specific gap>", "<specific gap>"], "summary": "<2 specific sentences about THIS candidate>", "confidence": "<high|medium|low>", "experience_years": <estimated_years>}}"""

    raw = call_gemini(prompt)
    print(f"Gemini raw response: {raw[:300]}")

    try:
        evaluation = parse_json(raw)
        # Sanity check — if score is suspiciously high, apply semantic similarity as anchor
        if evaluation.get("score", 0) > 90 and sem_pct < 60:
            evaluation["score"] = max(int(sem_pct * 0.8), 40)
            evaluation["confidence"] = "medium"
    except Exception as e:
        print(f"JSON parse error: {e}")
        evaluation = {
            "score": int(sem_pct * 0.8),
            "recommendation": "maybe" if sem_pct > 50 else "reject",
            "strengths": found_skills[:3] or ["Resume received"],
            "weaknesses": ["Could not fully evaluate — please retry"],
            "summary": f"Semantic match: {sem_pct}%. AI evaluation failed, manual review needed.",
            "confidence": "low",
            "experience_years": 0
        }

    return {
        "candidate_id": candidate_id,
        "filename": filename,
        "semantic_match_percent": sem_pct,
        "skills_found": found_skills,
        "llm_evaluation": evaluation
    }


# ════════════════════════════════════════════════════════════════════════════
# 2. INTERVIEW — NEXT QUESTION
# ════════════════════════════════════════════════════════════════════════════
class Message(BaseModel):
    role: str
    content: str

class InterviewRequest(BaseModel):
    job_title: str
    job_description: str
    conversation_history: List[Message]
    is_first_message: bool = False
    max_questions: int = 8

@app.post("/ai/interview/next-question")
async def next_question(req: InterviewRequest):
    answered = len([m for m in req.conversation_history if m.role == "user"])

    if answered >= req.max_questions:
        return {"question": "Thank you for completing the interview. That concludes our session today. INTERVIEW_COMPLETE", "is_complete": True}

    system = f"""You are a professional HR interviewer for a {req.job_title} role.
JD Summary: {req.job_description[:300]}

Rules:
- Ask ONE question per response. Be concise.
- Adapt based on previous answers — dig deeper on weak areas
- Progress: start easy, get harder
- Questions answered so far: {answered}/{req.max_questions}
- If this is question {req.max_questions}, end with: "Thank you, final question..."
- When done, end response with: INTERVIEW_COMPLETE
- Never repeat a question"""

    messages = [{"role": "system", "content": system}]
    for m in req.conversation_history:
        messages.append({"role": m.role, "content": m.content})

    if req.is_first_message:
        messages.append({"role": "user", "content": "Start the interview with a warm greeting and first question."})

    try:
        r = groq.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            max_tokens=250,
            temperature=0.7
        )
        text = r.choices[0].message.content
        is_complete = "INTERVIEW_COMPLETE" in text or answered >= req.max_questions - 1
        return {
            "question": text.replace("INTERVIEW_COMPLETE", "").strip(),
            "is_complete": is_complete,
            "questions_answered": answered
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ════════════════════════════════════════════════════════════════════════════
# 3. INTERVIEW SCORECARD
# ════════════════════════════════════════════════════════════════════════════
class ScorecardRequest(BaseModel):
    job_title: str
    conversation_history: List[Message]
    resume_score: Optional[int] = None
    proctoring_violations: Optional[List[str]] = []
    candidate_name: Optional[str] = ""
    duration_minutes: Optional[int] = None

@app.post("/ai/interview/scorecard")
async def scorecard(req: ScorecardRequest):
    transcript = "\n".join(f"{m.role.upper()}: {m.content}" for m in req.conversation_history)
    violations_text = f"\nProctoring violations: {len(req.proctoring_violations or [])}" if req.proctoring_violations else ""

    prompt = f"""Analyze this {req.job_title} interview. Be objective and realistic.
{violations_text}
Resume pre-screen score: {req.resume_score or 'N/A'}/100

TRANSCRIPT:
{transcript[:3000]}

Respond with ONLY this JSON:
{{"overall_score": <0-100>, "communication": {{"score": <0-10>, "comment": "<specific>"}}, "technical_depth": {{"score": <0-10>, "comment": "<specific>"}}, "confidence": {{"score": <0-10>, "comment": "<specific>"}}, "cultural_fit": {{"score": <0-10>, "comment": "<specific>"}}, "recommendation": "<advance|hold|reject>", "key_highlights": ["<from actual transcript>", "<from actual transcript>"], "red_flags": ["<if any>"], "summary": "<3 specific sentences>", "final_verdict": "<Selected|Not Selected|On Hold>"}}"""

    raw = call_gemini(prompt)
    try:
        result = parse_json(raw)
        # Apply proctoring penalty
        violations = len(req.proctoring_violations or [])
        if violations > 5:
            result["overall_score"] = max(0, result.get("overall_score", 50) - 15)
            result["red_flags"] = result.get("red_flags", []) + [f"{violations} proctoring violations detected"]
        return result
    except Exception as e:
        print(f"Scorecard parse error: {e}, raw: {raw[:200]}")
        return {
            "overall_score": 50, "recommendation": "hold",
            "final_verdict": "On Hold",
            "summary": "Could not generate detailed scorecard. Manual review required."
        }


# ════════════════════════════════════════════════════════════════════════════
# 4. TRANSCRIPTION
# ════════════════════════════════════════════════════════════════════════════
@app.post("/ai/transcribe")
async def transcribe(file: UploadFile = File(...)):
    audio = await file.read()
    try:
        r = groq.audio.transcriptions.create(
            file=(file.filename or "audio.webm", audio, "audio/webm"),
            model=GROQ_WHISPER,
            response_format="text"
        )
        return {"transcript": r}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ════════════════════════════════════════════════════════════════════════════
# 5. AI CO-PILOT
# ════════════════════════════════════════════════════════════════════════════
class CopilotRequest(BaseModel):
    page_context: str
    entity_data: dict
    user_role: str

@app.post("/ai/copilot")
async def copilot(req: CopilotRequest):
    question = req.entity_data.get("question", req.page_context)
    prompt = f"""You are Nexus AI, an intelligent HR Co-pilot embedded in an HRMS dashboard.
User role: {req.user_role}
User's question: {question}

Answer directly and specifically in 3-5 sentences. Give concrete, actionable advice.
If about HR strategy, use real numbers/percentages. Be conversational but professional."""

    # Use Groq directly for copilot — faster and separate quota from Gemini
    try:
        r = groq.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": "You are Nexus AI, an expert HR Co-pilot. Give direct, specific, actionable answers."},
                {"role": "user", "content": question}
            ],
            max_tokens=400,
            temperature=0.7
        )
        return {"insight": r.choices[0].message.content.strip()}
    except Exception as e:
        # Last resort: try Gemini
        return {"insight": call_gemini(prompt)}


# ════════════════════════════════════════════════════════════════════════════
# 6. EMPLOYEE EXPERIENCE SCORE
# ════════════════════════════════════════════════════════════════════════════
class EXSRequest(BaseModel):
    employee_name: str
    attendance_rate: float
    performance_score: float
    leave_utilization: float
    salary_growth_percent: float
    goal_completion: float
    days_since_last_raise: int
    manager_interactions_monthly: int

@app.post("/ai/exs")
async def exs(req: EXSRequest):
    score = round(min(max(
        req.attendance_rate * 0.20 +
        req.performance_score * 0.25 +
        min(req.leave_utilization, 80) * 0.15 +
        min(req.salary_growth_percent * 4, 20) +
        req.goal_completion * 0.20
    , 0), 100), 1)

    level = "Thriving" if score >= 80 else "Engaged" if score >= 60 else "At Risk" if score >= 40 else "Critical"
    color = "green"    if score >= 80 else "blue"    if score >= 60 else "amber"   if score >= 40 else "red"

    prompt = f"""Employee: {req.employee_name}, EXS: {score}/100 ({level})
Attendance: {req.attendance_rate}%, Performance: {req.performance_score}/100,
Goals: {req.goal_completion}%, Salary growth: {req.salary_growth_percent}%/yr,
Days since raise: {req.days_since_last_raise}

Write exactly 2 sentences: explain the score with specific numbers, then suggest ONE specific HR action."""

    # Try to get narrative but don't fail if AI is rate-limited
    try:
        narrative = call_gemini(prompt)
    except Exception:
        narrative = f"{req.employee_name} has an EXS score of {score}/100 ({level}), based on attendance, performance, and growth metrics. Consider scheduling a 1:1 check-in to discuss career development and address any concerns."

    return {
        "employee_name": req.employee_name,
        "exs_score": score, "level": level, "color": color,
        "breakdown": {
            "attendance":    round(req.attendance_rate * 0.20, 1),
            "performance":   round(req.performance_score * 0.25, 1),
            "leave_balance": round(min(req.leave_utilization, 80) * 0.15, 1),
            "salary_growth": round(min(req.salary_growth_percent * 4, 20), 1),
            "goals":         round(req.goal_completion * 0.20, 1),
        },
        "narrative": narrative
    }


# ════════════════════════════════════════════════════════════════════════════
# 7. JD GENERATOR
# ════════════════════════════════════════════════════════════════════════════
class JDRequest(BaseModel):
    job_title: str
    department: str
    seniority: str
    skills: Optional[List[str]] = []

@app.post("/ai/generate-jd")
async def generate_jd(req: JDRequest):
    prompt = f"""Generate a complete professional job description for:
Title: {req.job_title} | Dept: {req.department} | Level: {req.seniority}
Skills: {', '.join(req.skills) if req.skills else 'standard for role'}

Respond with ONLY this JSON:
{{"title": "{req.job_title}", "summary": "<2 sentences>", "responsibilities": ["<r1>","<r2>","<r3>","<r4>","<r5>"], "required_skills": ["<s1>","<s2>","<s3>","<s4>"], "nice_to_have": ["<n1>","<n2>"], "salary_range": "<India LPA e.g. 8-12 LPA>", "screening_questions": ["<q1>","<q2>","<q3>","<q4>","<q5>"]}}"""

    raw = call_gemini(prompt)
    try:
        result = parse_json(raw)
        result["title"] = req.job_title  # ← always force the title from request
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"JD generation failed: {e}")


# ════════════════════════════════════════════════════════════════════════════
# 8. DASHBOARD SUMMARY
# ════════════════════════════════════════════════════════════════════════════
class DashboardRequest(BaseModel):
    role: str
    metrics: dict

@app.post("/ai/dashboard-summary")
async def dashboard_summary(req: DashboardRequest):
    prompt = f"""Generate a morning briefing for a {req.role} in an HRMS.
Data: {str(req.metrics)[:500]}
Write exactly 3 bullet points starting with •. Be specific. Flag urgent with ⚠️."""
    text = call_gemini(prompt)
    bullets = [l.strip() for l in text.split('\n') if l.strip().startswith('•')]
    return {"role": req.role, "summary_bullets": bullets or ["• System is running normally", "• Check pending approvals", "• Review today's attendance"]}
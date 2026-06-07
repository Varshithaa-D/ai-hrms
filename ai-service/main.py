from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv
import os, re, json, time, io

load_dotenv()

app = FastAPI(title="AI-HRMS Lite", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from google import genai as google_genai
from groq import Groq

GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
GROQ_KEY   = os.getenv("GROQ_API_KEY", "")

gemini = google_genai.Client(api_key=GEMINI_KEY)
groq   = Groq(api_key=GROQ_KEY)

GEMINI_MODEL = "gemini-2.0-flash"
GROQ_MODEL   = "llama-3.3-70b-versatile"
GROQ_WHISPER = "whisper-large-v3-turbo"

# ── Helpers ──────────────────────────────────────────────────────────────────
def call_gemini(prompt: str) -> str:
    for attempt in range(3):
        try:
            r = gemini.models.generate_content(model=GEMINI_MODEL, contents=prompt)
            return r.text.strip()
        except Exception as e:
            if '429' in str(e) or 'RESOURCE_EXHAUSTED' in str(e):
                if attempt < 2:
                    time.sleep((attempt + 1) * 5)
                else:
                    return call_groq_fallback(prompt)
            else:
                raise HTTPException(status_code=500, detail=str(e))
    return call_groq_fallback(prompt)

def call_groq_fallback(prompt: str) -> str:
    try:
        r = groq.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000, temperature=0.7
        )
        return r.choices[0].message.content.strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Both AI services failed: {e}")

def parse_json(text: str) -> dict:
    text = re.sub(r'```json|```', '', text).strip()
    depth, start = 0, -1
    for i, c in enumerate(text):
        if c == '{':
            if depth == 0: start = i
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0 and start != -1:
                try: return json.loads(text[start:i+1])
                except: pass
    raise ValueError(f"No JSON found in: {text[:100]}")

def extract_text(file_bytes: bytes, filename: str) -> str:
    """Extract text without heavy libraries"""
    if filename.lower().endswith(".pdf"):
        try:
            import pymupdf
            doc = pymupdf.open(stream=file_bytes, filetype="pdf")
            return "\n".join(p.get_text() for p in doc)
        except: pass
    if filename.lower().endswith(".docx"):
        try:
            import zipfile, xml.etree.ElementTree as ET
            with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
                xml = z.read('word/document.xml')
            tree = ET.fromstring(xml)
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            return ' '.join(t.text for t in tree.findall('.//w:t', ns) if t.text)
        except: pass
    return file_bytes.decode('utf-8', errors='ignore')

# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "gemini": bool(GEMINI_KEY), "groq": bool(GROQ_KEY)}

@app.get("/ping")
def ping():
    return {"pong": True}

# ── Resume Screening (Gemini only — no sentence-transformers) ────────────────
@app.post("/ai/screen-resume")
async def screen_resume(
    file: UploadFile = File(...),
    job_description: str = Form(...),
    candidate_id: str = Form("")
):
    file_bytes = await file.read()
    filename   = file.filename or "resume"
    resume_text = extract_text(file_bytes, filename)

    if len(resume_text.strip()) < 30:
        raise HTTPException(status_code=400, detail="Could not extract text from file")

    # Keyword-based similarity (no ML needed)
    jd_words     = set(re.findall(r'\b\w{4,}\b', job_description.lower()))
    resume_words = set(re.findall(r'\b\w{4,}\b', resume_text.lower()))
    overlap      = jd_words & resume_words
    sem_pct      = round(min(len(overlap) / max(len(jd_words), 1) * 100 * 1.5, 95), 1)

    skills = ["python","javascript","typescript","react","node","sql","java","aws","docker",
              "git","mongodb","postgresql","machine learning","hr","management","agile","figma",
              "excel","communication","leadership","recruitment","c++","django","fastapi"]
    found_skills = [s for s in skills if s in resume_text.lower()]

    prompt = f"""Strictly evaluate this resume vs job description. Be honest, not generous.

JD: {job_description[:500]}
RESUME: {resume_text[:1200]}

Score 0-100 realistically. Most score 40-75. Return ONLY JSON:
{{"score":<40-80>,"recommendation":"<hire|maybe|reject>","strengths":["<specific>","<specific>","<specific>"],"weaknesses":["<gap>","<gap>"],"summary":"<2 sentences about THIS candidate>","confidence":"<high|medium|low>","experience_years":<number>}}"""

    raw = call_gemini(prompt)
    try:
        evaluation = parse_json(raw)
    except:
        evaluation = {"score": int(sem_pct*0.8), "recommendation": "maybe",
                      "strengths": found_skills[:3] or ["Resume received"],
                      "weaknesses": ["Manual review needed"],
                      "summary": f"Keyword match: {sem_pct}%.", "confidence": "low", "experience_years": 0}

    return {"candidate_id": candidate_id, "filename": filename,
            "semantic_match_percent": sem_pct, "skills_found": found_skills,
            "llm_evaluation": evaluation}

# ── Interview ─────────────────────────────────────────────────────────────────
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
    answered = sum(1 for m in req.conversation_history if m.role == "user")
    if answered >= req.max_questions:
        return {"question": "Thank you for completing the interview. INTERVIEW_COMPLETE", "is_complete": True}

    system = f"""Professional HR interviewer for {req.job_title}.
JD: {req.job_description[:200]}
Ask ONE concise question. Adapt from previous answers. Questions done: {answered}/{req.max_questions}.
Add INTERVIEW_COMPLETE when finished."""

    msgs = [{"role": "system", "content": system}]
    for m in req.conversation_history:
        msgs.append({"role": m.role, "content": m.content})
    if req.is_first_message:
        msgs.append({"role": "user", "content": "Start with greeting and first question."})

    try:
        r = groq.chat.completions.create(model=GROQ_MODEL, messages=msgs, max_tokens=200, temperature=0.7)
        text = r.choices[0].message.content
        return {"question": text.replace("INTERVIEW_COMPLETE","").strip(),
                "is_complete": "INTERVIEW_COMPLETE" in text or answered >= req.max_questions-1,
                "questions_answered": answered}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ScorecardRequest(BaseModel):
    job_title: str
    conversation_history: List[Message]
    resume_score: Optional[int] = None
    proctoring_violations: Optional[List[str]] = []
    candidate_name: Optional[str] = ""

@app.post("/ai/interview/scorecard")
async def scorecard(req: ScorecardRequest):
    transcript = "\n".join(f"{m.role.upper()}: {m.content}" for m in req.conversation_history)
    prompt = f"""Analyze {req.job_title} interview. Resume score: {req.resume_score or 'N/A'}.
TRANSCRIPT: {transcript[:2500]}
Return ONLY JSON:
{{"overall_score":<0-100>,"communication":{{"score":<0-10>,"comment":"<specific>"}},"technical_depth":{{"score":<0-10>,"comment":"<specific>"}},"confidence":{{"score":<0-10>,"comment":"<specific>"}},"cultural_fit":{{"score":<0-10>,"comment":"<specific>"}},"recommendation":"<advance|hold|reject>","key_highlights":["<from transcript>","<from transcript>"],"red_flags":["<if any>"],"summary":"<3 sentences>","final_verdict":"<Selected|Not Selected|On Hold>"}}"""
    raw = call_gemini(prompt)
    try:
        result = parse_json(raw)
        v = len(req.proctoring_violations or [])
        if v > 5:
            result["overall_score"] = max(0, result.get("overall_score",50) - 15)
        return result
    except:
        return {"overall_score": 50, "recommendation": "hold", "final_verdict": "On Hold",
                "summary": "Scorecard generation failed. Manual review required."}

@app.post("/ai/transcribe")
async def transcribe(file: UploadFile = File(...)):
    audio = await file.read()
    try:
        r = groq.audio.transcriptions.create(
            file=(file.filename or "audio.webm", audio, "audio/webm"),
            model=GROQ_WHISPER, response_format="text")
        return {"transcript": str(r)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class CopilotRequest(BaseModel):
    page_context: str
    entity_data: dict
    user_role: str

@app.post("/ai/copilot")
async def copilot(req: CopilotRequest):
    question = req.entity_data.get("question", req.page_context)
    try:
        r = groq.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role":"system","content":"You are Nexus AI, an expert HR Co-pilot. Give direct, actionable answers in 3-5 sentences."},
                      {"role":"user","content":question}],
            max_tokens=300, temperature=0.7)
        return {"insight": r.choices[0].message.content.strip()}
    except:
        return {"insight": call_gemini(f"HR question: {question}\nAnswer in 3 sentences.")}

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
        req.attendance_rate*0.20 + req.performance_score*0.25 +
        min(req.leave_utilization,80)*0.15 + min(req.salary_growth_percent*4,20) +
        req.goal_completion*0.20, 0), 100), 1)
    level = "Thriving" if score>=80 else "Engaged" if score>=60 else "At Risk" if score>=40 else "Critical"
    color = "green" if score>=80 else "blue" if score>=60 else "amber" if score>=40 else "red"
    try:
        narrative = call_gemini(f"Employee {req.employee_name} EXS {score}/100 ({level}). Attendance:{req.attendance_rate}%, Performance:{req.performance_score}/100, Goals:{req.goal_completion}%. Write 2 sentences: explain score, suggest one HR action.")
    except:
        narrative = f"{req.employee_name} has EXS {score}/100 ({level}). Schedule a 1:1 to discuss career growth."
    return {"employee_name":req.employee_name,"exs_score":score,"level":level,"color":color,
            "breakdown":{"attendance":round(req.attendance_rate*0.20,1),"performance":round(req.performance_score*0.25,1),
                         "leave_balance":round(min(req.leave_utilization,80)*0.15,1),
                         "salary_growth":round(min(req.salary_growth_percent*4,20),1),"goals":round(req.goal_completion*0.20,1)},
            "narrative":narrative}

class JDRequest(BaseModel):
    job_title: str
    department: str
    seniority: str
    skills: Optional[List[str]] = []

@app.post("/ai/generate-jd")
async def generate_jd(req: JDRequest):
    prompt = f"""Job description for: {req.job_title} | {req.department} | {req.seniority} | Skills: {', '.join(req.skills) if req.skills else 'standard'}
Return ONLY JSON:
{{"title":"{req.job_title}","summary":"<2 sentences>","responsibilities":["<r1>","<r2>","<r3>","<r4>","<r5>"],"required_skills":["<s1>","<s2>","<s3>","<s4>"],"nice_to_have":["<n1>","<n2>"],"salary_range":"<India LPA>","screening_questions":["<q1>","<q2>","<q3>","<q4>","<q5>"]}}"""
    raw = call_gemini(prompt)
    try:
        result = parse_json(raw)
        result["title"] = req.job_title
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class DashboardRequest(BaseModel):
    role: str
    metrics: dict

@app.post("/ai/dashboard-summary")
async def dashboard_summary(req: DashboardRequest):
    prompt = f"Morning briefing for {req.role}. Data: {str(req.metrics)[:300]}. Write 3 bullet points starting with •. Flag urgent with ⚠️."
    text = call_gemini(prompt)
    bullets = [l.strip() for l in text.split('\n') if l.strip().startswith('•')]
    return {"role": req.role, "summary_bullets": bullets or ["• All systems running normally","• Check pending approvals","• Review today's attendance"]}

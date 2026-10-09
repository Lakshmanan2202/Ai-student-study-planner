"""Study Planner API. Run: uvicorn main:app --reload  (docs at /docs)"""
import hashlib, hmac, json, os, secrets
from datetime import date, datetime, timedelta, timezone
from typing import Literal

import jwt
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import Boolean, Column, Date, ForeignKey, Integer, String, create_engine
from sqlalchemy.orm import declarative_base, relationship, sessionmaker, Session

load_dotenv()

SECRET = os.getenv("SECRET_KEY", "change-me-in-production")
DB_URL = os.getenv("DATABASE_URL", "sqlite:///./planner.db")
MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

engine = create_engine(DB_URL, connect_args={"check_same_thread": False} if DB_URL.startswith("sqlite") else {})
SessionLocal = sessionmaker(bind=engine, autoflush=False)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)


class Subject(Base):
    __tablename__ = "subjects"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    exam_date = Column(Date)
    topics = relationship("Topic", cascade="all, delete-orphan")


class Topic(Base):
    __tablename__ = "topics"
    id = Column(Integer, primary_key=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    name = Column(String)
    confidence = Column(Integer, default=3)  # 1 (weak) .. 5 (strong)
    weight = Column(Integer, default=1)      # 1..5 importance in exam
    done = Column(Boolean, default=False)
    subject = relationship("Subject", back_populates=None, viewonly=True)


class StudySession(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    topic_id = Column(Integer, ForeignKey("topics.id"))
    day = Column(Date)
    minutes = Column(Integer)
    completed = Column(Boolean, default=False)
    topic = relationship("Topic")


Base.metadata.create_all(engine)

app = FastAPI(title="Study Planner API")
app.add_middleware(CORSMiddleware, allow_origins=ORIGINS, allow_methods=["*"], allow_headers=["*"])
bearer = HTTPBearer()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------- auth ----------
def hash_pw(pw: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(8)
    h = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), 100_000).hex()
    return f"{salt}${h}"


def check_pw(pw: str, stored: str) -> bool:
    salt, _ = stored.split("$")
    return hmac.compare_digest(hash_pw(pw, salt), stored)


def make_token(uid: int) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=7)
    return jwt.encode({"sub": str(uid), "exp": exp}, SECRET, algorithm="HS256")


def current_user(cred: HTTPAuthorizationCredentials = Depends(bearer), db: Session = Depends(get_db)) -> User:
    try:
        uid = int(jwt.decode(cred.credentials, SECRET, algorithms=["HS256"])["sub"])
    except Exception:
        raise HTTPException(401, "Invalid or expired token")
    user = db.get(User, uid)
    if not user:
        raise HTTPException(401, "User not found")
    return user


class Creds(BaseModel):
    email: str
    password: str = Field(min_length=6)


@app.post("/auth/register")
def register(c: Creds, db: Session = Depends(get_db)):
    if db.query(User).filter_by(email=c.email.lower()).first():
        raise HTTPException(400, "Email already registered")
    u = User(email=c.email.lower(), password_hash=hash_pw(c.password))
    db.add(u); db.commit()
    return {"token": make_token(u.id)}


@app.post("/auth/login")
def login(c: Creds, db: Session = Depends(get_db)):
    u = db.query(User).filter_by(email=c.email.lower()).first()
    if not u or not check_pw(c.password, u.password_hash):
        raise HTTPException(401, "Wrong email or password")
    return {"token": make_token(u.id)}


# ---------- subjects & topics ----------
class SubjectIn(BaseModel):
    name: str
    exam_date: date


class TopicIn(BaseModel):
    name: str
    confidence: int = Field(3, ge=1, le=5)
    weight: int = Field(1, ge=1, le=5)


def topic_out(t: Topic):
    return {"id": t.id, "name": t.name, "confidence": t.confidence, "weight": t.weight, "done": t.done}


def subject_out(s: Subject):
    return {"id": s.id, "name": s.name, "exam_date": s.exam_date.isoformat(), "topics": [topic_out(t) for t in s.topics]}


def own_subject(db: Session, user: User, sid: int) -> Subject:
    s = db.get(Subject, sid)
    if not s or s.user_id != user.id:
        raise HTTPException(404, "Subject not found")
    return s


@app.get("/subjects")
def list_subjects(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [subject_out(s) for s in db.query(Subject).filter_by(user_id=user.id).order_by(Subject.exam_date)]


@app.post("/subjects")
def add_subject(b: SubjectIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    s = Subject(user_id=user.id, name=b.name, exam_date=b.exam_date)
    db.add(s); db.commit()
    return subject_out(s)


@app.delete("/subjects/{sid}")
def delete_subject(sid: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.delete(own_subject(db, user, sid)); db.commit()
    return {"ok": True}


@app.post("/subjects/{sid}/topics")
def add_topic(sid: int, b: TopicIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    s = own_subject(db, user, sid)
    t = Topic(subject_id=s.id, **b.model_dump())
    db.add(t); db.commit()
    return topic_out(t)


@app.patch("/topics/{tid}")
def update_topic(tid: int, b: dict, user: User = Depends(current_user), db: Session = Depends(get_db)):
    t = db.get(Topic, tid)
    if not t or db.get(Subject, t.subject_id).user_id != user.id:
        raise HTTPException(404, "Topic not found")
    for k in ("confidence", "weight", "done", "name"):
        if k in b:
            setattr(t, k, b[k])
    db.commit()
    return topic_out(t)


# ---------- planner (deterministic scoring) ----------
class PlanIn(BaseModel):
    days: int = Field(7, ge=1, le=30)
    hours_per_day: float = Field(2, gt=0, le=14)


BLOCK = 45  # minutes per study block


def session_out(x: StudySession):
    return {"id": x.id, "day": x.day.isoformat(), "minutes": x.minutes, "completed": x.completed,
            "topic_id": x.topic_id, "topic": x.topic.name,
            "subject": db_subject_name(x)}


def db_subject_name(x: StudySession) -> str:
    with SessionLocal() as db:
        return db.get(Subject, db.get(Topic, x.topic_id).subject_id).name


@app.post("/planner/generate")
def generate(b: PlanIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    today = date.today()
    db.query(StudySession).filter(StudySession.user_id == user.id, StudySession.day >= today,
                                  StudySession.completed == False).delete()  # noqa: E712
    topics = [(t, s) for s in db.query(Subject).filter_by(user_id=user.id) for t in s.topics if not t.done]
    planned = {t.id: 0 for t, _ in topics}
    for offset in range(b.days):
        day, left = today + timedelta(days=offset), int(b.hours_per_day * 60)
        while left >= 15:
            best, best_score = None, 0.0
            for t, s in topics:
                days_left = (s.exam_date - day).days
                if days_left < 0:
                    continue
                # weakness x importance x urgency, damped by blocks already planned
                score = (6 - t.confidence) * t.weight / max(days_left, 1) / (1 + 0.6 * planned[t.id])
                if score > best_score:
                    best, best_score = t, score
            if not best:
                break
            m = min(BLOCK, left)
            db.add(StudySession(user_id=user.id, topic_id=best.id, day=day, minutes=m))
            planned[best.id] += 1
            left -= m
    db.commit()
    return {"ok": True}


@app.get("/planner/today")
def today_plan(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(StudySession).filter_by(user_id=user.id, day=date.today()).all()
    return [session_out(x) for x in rows]


@app.get("/planner/week")
def week_plan(user: User = Depends(current_user), db: Session = Depends(get_db)):
    end = date.today() + timedelta(days=7)
    rows = db.query(StudySession).filter(StudySession.user_id == user.id, StudySession.day >= date.today(),
                                         StudySession.day <= end).order_by(StudySession.day).all()
    return [session_out(x) for x in rows]


@app.patch("/sessions/{sid}/complete")
def toggle_complete(sid: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    x = db.get(StudySession, sid)
    if not x or x.user_id != user.id:
        raise HTTPException(404, "Session not found")
    x.completed = not x.completed
    db.commit()
    return session_out(x)


@app.get("/progress")
def progress(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(StudySession).filter(StudySession.user_id == user.id, StudySession.day <= date.today()).all()
    done = [r for r in rows if r.completed]
    days_done = {r.day for r in done}
    streak, d = 0, date.today()
    while d in days_done:
        streak += 1; d -= timedelta(days=1)
    return {"sessions_total": len(rows), "sessions_done": len(done),
            "percent": round(100 * len(done) / len(rows)) if rows else 0,
            "minutes_studied": sum(r.minutes for r in done), "streak_days": streak}


# ---------- AI layer (Gemini) ----------
def generate_gemini(system: str, contents: str | list):
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise HTTPException(503, "GEMINI_API_KEY is missing. Add a valid Google AI Studio key to backend/.env.")
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=key)
    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=contents,
            config=types.GenerateContentConfig(system_instruction=system, max_output_tokens=1000),
        )
    except Exception as exc:
        message = str(exc).lower()
        if "api key" in message or "invalid" in message or "401" in message or "400" in message:
            raise HTTPException(401, "Gemini API key is invalid. Add a valid Google AI Studio key to backend/.env and restart the backend.") from exc
        raise HTTPException(502, f"Gemini request failed: {exc}") from exc
    finally:
        try:
            client.close()
        except Exception:
            pass
    if not getattr(response, "text", None):
        raise HTTPException(502, "Gemini returned an empty response")
    return response.text


def ask_gemini(system: str, prompt: str) -> str:
    return generate_gemini(system, prompt)


class BreakdownIn(BaseModel):
    subject: str
    syllabus: str


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    text: str = Field(min_length=1, max_length=4000)

    @field_validator("text")
    @classmethod
    def text_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Message cannot be blank")
        return value


class ChatIn(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=20)


@app.post("/ai/chat")
def chat(b: ChatIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if b.messages[-1].role != "user":
        raise HTTPException(422, "The latest chat message must be from the user")

    subjects = db.query(Subject).filter_by(user_id=user.id).order_by(Subject.exam_date).limit(30).all()
    today_sessions = db.query(StudySession).filter_by(user_id=user.id, day=date.today()).limit(50).all()
    study_context = {
        "subjects": [
            {
                "name": subject.name[:120],
                "exam_date": subject.exam_date.isoformat(),
                "topics": [
                    {
                        "name": topic.name[:120],
                        "confidence": topic.confidence,
                        "weight": topic.weight,
                        "done": topic.done,
                    }
                    for topic in subject.topics[:40]
                ],
            }
            for subject in subjects
        ],
        "today_sessions": [
            {
                "subject": session.topic.subject.name[:120],
                "topic": session.topic.name[:120],
                "minutes": session.minutes,
                "completed": session.completed,
            }
            for session in today_sessions
        ],
    }
    system = (
        "You are a friendly, practical study coach inside a study-planner app. Help with learning, "
        "revision, exam preparation, and planning. Explain concepts clearly, break work into manageable "
        "steps, and ask a clarifying question when useful. Use the student's planner data as context, "
        "but do not claim to change their plan or subjects. If the user asks for unrelated topics, answer "
        "briefly and steer back to studying.\n\n"
        f"Student planner data: {json.dumps(study_context)}"
    )

    from google.genai import types

    reply = generate_gemini(
        system,
        [
            types.Content(
                role="user" if message.role == "user" else "model",
                parts=[types.Part(text=message.text)],
            )
            for message in b.messages
        ],
    )
    return {"reply": reply}


@app.post("/ai/breakdown")
def breakdown(b: BreakdownIn, user: User = Depends(current_user)):
    text = ask_gemini(
        "You split exam syllabi into study topics. Reply with ONLY a JSON array of objects "
        '{"name": str, "weight": int 1-5}. No prose, no markdown fences.',
        f"Subject: {b.subject}\nSyllabus:\n{b.syllabus}")
    try:
        return json.loads(text.strip().strip("`").removeprefix("json").strip())
    except json.JSONDecodeError:
        raise HTTPException(502, "AI returned invalid JSON, try again")


@app.post("/ai/explain-plan")
def explain_plan(user: User = Depends(current_user), db: Session = Depends(get_db)):
    plan = [session_out(x) for x in db.query(StudySession).filter_by(user_id=user.id, day=date.today())]
    if not plan:
        raise HTTPException(400, "Generate a plan first")
    return {"explanation": ask_gemini(
        "You are a concise study coach. Explain in under 120 words why this plan is ordered this way "
        "and give 2 practical tips. Plain text, no markdown.", json.dumps(plan))}

# Study Planner

Study Planner is a focused workspace for subjects, exam plans, progress, and Gemini-powered study help.

## Run locally

### Backend

From the project root, create `backend/.env` from `backend/.env.example`. Set `GEMINI_API_KEY` for AI features and keep it on the backend; never add it to frontend source code.

```powershell
cd backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload
```

### Frontend

Create `frontend/.env` from `frontend/.env.example`.

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

## AI study coach

Set `GEMINI_API_KEY` in `backend/.env` to enable chat, syllabus breakdown, and plan explanations. The key must not be placed in `frontend/.env`.

Chat history is kept in the current browser session.

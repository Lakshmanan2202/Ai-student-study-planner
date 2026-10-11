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

## Deploy on Render

The app has a separate frontend and API. Deploy them as a Render Static Site and Web Service from this GitHub repository. Do not deploy `backend/planner.db`; production should use a Render PostgreSQL database.

### Prepare the repository

The local database file remains on your computer but is excluded from the deployment branch and its Git history. The existing `main` branch is unchanged.

Commit and push the app changes to GitHub:

```powershell
git add .
git commit -m "Prepare study planner for deployment"
git push -u origin study-planner-deploy
```

### Deploy the API

1. Create a PostgreSQL database in Render and copy its **Internal Database URL**.
2. Create a Web Service connected to this repository, with root directory `backend`.
3. Set the build command to `pip install -r requirements.txt`.
4. Set the start command to `uvicorn main:app --host 0.0.0.0 --port $PORT`.
5. Add these environment variables to the service:
   - `DATABASE_URL`: the PostgreSQL Internal Database URL from Render.
   - `SECRET_KEY`: a newly generated, long random value.
   - `CORS_ORIGINS`: the exact public URL of the frontend Static Site (set this after deploying the frontend).
   - `GEMINI_API_KEY`: optional; needed only for AI features.

### Deploy the frontend

1. Create a Static Site from the same repository, with root directory `frontend`.
2. Set the build command to `npm ci && npm run build` and the publish directory to `dist`.
3. Set `VITE_API_URL` to the public URL of the deployed API, without a trailing slash.
4. After the Static Site has a URL, set the API's `CORS_ORIGINS` to that exact URL and redeploy the API.

Keep secrets in Render's environment-variable settings, not in frontend environment variables or GitHub.

## AI study coach

Set `GEMINI_API_KEY` in `backend/.env` to enable chat, syllabus breakdown, and plan explanations. The key must not be placed in `frontend/.env`.

Chat history is kept in the current browser session.

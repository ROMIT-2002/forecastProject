# DevOps Report - ForecastIQ AI

## 1. Environment Configurations
We created separate `.env.example` templates for local and production setups:
*   `backend/.env.example`: Standardizes SQL URLs (`DATABASE_URL`), OpenAI secret credentials (`OPENAI_API_KEY`), Clerk auth tokens, and frontend URL origins.
*   `frontend/.env.example`: Standardizes API URLs (`NEXT_PUBLIC_API_URL`) and Clerk keys.

---

## 2. Docker & Containerization
We set up a complete containerized environment to streamline deployment:
1.  **Backend Dockerfile (`backend/Dockerfile`)**: Uses `python:3.11-slim` with build-essential dependencies to ensure compiled wheel support, copies source logs, and starts the API server via Uvicorn.
2.  **Frontend Dockerfile (`frontend/Dockerfile`)**: Implements Next.js multi-stage build optimization to compile assets.
3.  **Docker Compose (`docker-compose.yml`)**: Groups backend and frontend containers, exposes ports `8000` (API/embedded SPA) and `3000` (Next.js SPA), mounts directories, and maps data volumes for SQLite persistence.

---

## 3. Production Deployment Plan

### Frontend: Vercel
1.  Connect the GitHub repository containing the `/forecastiq-ai` monorepo to Vercel.
2.  Set the **Root Directory** option in project settings to `forecastiq-ai/frontend`.
3.  Set the **Build Command** to `npm run build` and **Output Directory** to `.next`.
4.  Configure environment variable:
    *   `NEXT_PUBLIC_API_URL`: Directs to the live Railway API domain (e.g. `https://forecastiq-backend.railway.app`).

### Backend & Database: Railway
1.  Add a new project in Railway and provision a **PostgreSQL** database service.
2.  Add a **GitHub Repo Service** pointing to the monorepo, specifying root folder as `forecastiq-ai/backend`.
3.  Set environment variables:
    *   `DATABASE_URL`: Automatically bind Railway's database URL (`${{DATABASE_URL}}` or copy the Postgres Connection String).
    *   `FRONTEND_URL`: Set to the live Vercel domain (e.g. `https://forecastiq-ai.vercel.app`).
    *   `OPENAI_API_KEY`: Paste production OpenAI API secret key.
    *   `PORT`: `8000` (FastAPI).
4.  Railway will build the docker container automatically and deploy the FastAPI endpoint. Run-time migrations will run automatically on SQLite/PostgreSQL through SQLAlchemy model mapping startup events.

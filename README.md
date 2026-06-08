# ForecastIQ AI - Paid Ads Forecasting & Decision Engine

ForecastIQ AI is a paid ads optimization and forecasting platform built for SEM managers, media agencies, growth directors, and marketing executives. The application ingests advertising log logs, computes performance indicators, identifies statistical anomalies, models future horizons, recommends bid/budget reallocations, and generates executive summaries.

---

## 1. Tech Stack Overview

### Backend Service
*   **FastAPI**: High-performance API routing and schemas validation.
*   **SQLAlchemy**: Object-Relational Mapper (ORM) with unified SQLite / PostgreSQL engine support.
*   **Pandas & NumPy**: Mathematical performance aggregation and cleaning.
*   **Scikit-Learn**: Fallback predictive seasonality time-series modeling.
*   **Prophet (Optional)**: Facebook's core forecasting library.

### Frontend Client
*   **Next.js 15 (TypeScript)**: Core web application framework.
*   **Tailwind CSS**: Clean typography and minimalistic styles.
*   **Lucide Icons**: Crisp modern iconography.
*   **Chart.js / Recharts**: Dynamic metric rendering.

---

## 2. Directory Layout
```
/forecastiq-ai
  /docs                - System contracts and requirements
  /backend             - FastAPI engine and analytical scripts
  /frontend            - Next.js web application
  /sample-data         - Baseline logs generator
  /agent-reports       - Verification logs
```

---

## 3. Local Installation & Setup

### Option A: Local Run (Recommended for Devs)

#### 1. Backend Setup
1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Install Python dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3.  Copy and configure environment settings:
    ```bash
    copy .env.example .env
    ```
4.  Run FastAPI app:
    ```bash
    python app/main.py
    ```
    The server will startup on [http://localhost:8000](http://localhost:8000) and automatically auto-initialize the SQLite tables.

*Note: Since Node.js might not be installed, the FastAPI server will automatically host a pre-compiled, fully functional client application at the root route [http://localhost:8000/](http://localhost:8000/). You can open this URL directly in your browser to interact with the system.*

#### 2. Frontend Setup (Next.js)
1.  Navigate to the frontend directory:
    ```bash
    cd ../frontend
    ```
2.  Install packages:
    ```bash
    npm install
    ```
3.  Copy env parameters:
    ```bash
    copy .env.example .env
    ```
4.  Run development hot-reload server:
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) to view the client.

---

### Option B: Docker Setup (Production Mock)

If you have Docker and Docker Compose installed:
1.  From the workspace root directory, start the services:
    ```bash
    docker-compose up --build
    ```
2.  Access the FastAPI backend at [http://localhost:8000](http://localhost:8000) and the Next.js frontend at [http://localhost:3000](http://localhost:3000).

---

## 4. Operation Instructions

### 1. Ingestion of Sample Data
*   Open the UI, enter a mock email and role to sign in.
*   Navigate to **Upload CSV**.
*   Click the upload dropzone and select `sample-data/sample_paid_ads_data.csv`.
*   Click **Upload Performance Data**.
*   The system will clean duplicates, resolve date gaps, and automatically trigger the initial forecasting, recommendation, and anomaly check loops.

### 2. Running Automated Agents
The platform features 10 specialized background agents (e.g. Daily Pacing Agent, Creative Fatigue Agent, Search Query Waste Agent, etc.).
*   Navigate to the **Settings** page.
*   Review the active agents list.
*   Click **Run Agent** on any of the cards to trigger a manual scan.
*   Review the completed logs and summaries in the **Automation Audit Logs** table on the same page.

# ForecastIQ AI - Production SaaS Paid Ads Forecasting & Decision Engine

ForecastIQ AI is an enterprise-grade SaaS decision engine built for SEM managers, paid media agencies, growth directors, and marketing executives. It ingests multi-channel paid advertising logs, derives performance indicators, runs predictive time-series models, identifies spending anomalies, runs budget scenario simulations, triggers bidding optimization recommendation rules, and compiles plain-English executive summary reports.

---

## Table of Contents
1. [Product Core Capabilities](#1-product-core-capabilities)
2. [Monorepo Architecture & File Structure](#2-monorepo-architecture--file-structure)
3. [Relational Database Schema (SQLAlchemy Models)](#3-relational-database-schema-sqlalchemy-models)
4. [FastAPI backend API Endpoints](#4-fastapi-backend-api-endpoints)
5. [Analytical Engines & Statistical Models](#5-analytical-engines--statistical-models)
6. [In-App Automation Agents Framework](#6-in-app-automation-agents-framework)
7. [Frontend Client Architectures](#7-frontend-client-architectures)
8. [Setup & Running Locally](#8-setup--running-locally)
9. [Automated QA Test Suite](#9-automated-qa-test-suite)
10. [Docker Compose & Deployment Guide](#10-docker-compose--deployment-guide)

---

## 1. Product Core Capabilities
*   **Data Ingestion & Cleaning**: Ingests campaign CSV reports, runs duplicate checks, filters out zero-cost entries, interpolates missing dates, and calculates derivative advertising indicators.
*   **Predictive Forecasting**: Forecasts cost (spend), impressions, clicks, conversions, revenue, CPA, and ROAS across 7, 14, and 30-day horizons.
*   **Rolling Z-Score Anomaly Detection**: Flags statistical outliers in CPC, CPA, ROAS, Spend, Conversions, and Revenue using rolling means and standard deviations.
*   **Rules-Based Recommendations**: Triggers action-oriented advice (scaling budgets, reducing spend, refreshing creative assets, audit search queries, adjust bid caps).
*   **Scenario Planning Simulator**: Simulates overall or campaign-specific budget changes (+/- %) incorporating diminishing marginal returns (exponents scaling) for scaling up and efficiency preservation for scaling down.
*   **Automated Background Operations**: Models ten distinct background agents managing daily pacing, weekly queries waste, creative fatigue, anomalies watching, and forecasts refreshing.
*   **Executive Intelligence Reporting**: Generates summaries of portfolio performance, forecast projections, risks, and action items. Supports OpenAI models with a robust rule-based fallback generator.

---

## 2. Monorepo Architecture & File Structure
```
/forecastiq-ai
  /docs/
    - product-requirements.md           # Product core KPIs and target persona specifications
    - system-architecture.md            # Data pipelines and architectural flowcharts
    - api-contract.md                   # FastAPI HTTP endpoints request/response contracts
  /backend/
    /app/
      /core/
        - config.py                     # Pydantic global settings (database, OpenAI keys, targets)
        - database.py                   # SQLAlchemy engine sessionmaker and local Session generator
      /models/
        - database_models.py            # Relational database declarative entities
      /schemas/
        - api_schemas.py                # Pydantic schema validation for API inputs/outputs
      /services/
        - data_quality.py               # Data cleaning logic and base KPI calculators
        - forecasting.py                # Linear regression and Prophet time-series models
        - optimization.py               # Performance rules evaluations and suggestions
        - anomaly_detection.py          # Rolling Z-score anomaly scanning logic
        - simulation.py                 # Diminishing returns budget simulators
        - ai_summary.py                 # OpenAI and rule-based executive summary builders
        - agents.py                     # 10 platform automation agents class registry
      /routers/
        - api.py                        # Consolidated REST routers mapping endpoints
      /static/
        - index.html                    # Embedded Apple-style SPA client
      - main.py                         # FastAPI setup, CORS middleware, and Uvicorn entry
    - requirements.txt                  # Python application packages list
    - Dockerfile                        # Multi-stage python deploy builder
    - .env.example                      # Backend environmental keys template
  /frontend/
    /src/
      /app/
        - layout.tsx                    # React HTML layouts wrapper
        - globals.css                   # Global styles and Apple aesthetics tokens
        - page.tsx                      # Polished mock authentication entry
        - dashboard/page.tsx            # Executive overview dashboard
        - upload/page.tsx               # Drag-and-drop CSV validation logs
        - campaigns/page.tsx            # Filterable campaigns performance grids
        - forecasting/page.tsx          # Multi-horizon forecast prediction charts
        - recommendations/page.tsx      # Priority-sorted recommendations feed
        - simulator/page.tsx            # Slider-controlled budget simulation sandbox
        - anomalies/page.tsx            # Chronological anomalies timeline
        - reports/page.tsx              # Executive summaries and markdown exporters
        - settings/page.tsx             # Target thresholds and background agents triggers
      /components/
        - Sidebar.tsx                   # Shared navigation sidebar
    - package.json                      # Next.js npm dependencies configurations
    - tailwind.config.js                # Tailwind CSS custom themes extension
    - tsconfig.json                     # TypeScript compilation settings
    - Dockerfile                        # Node runtime production build compiler
    - .env.example                      # Client public environmental keys template
  /sample-data/
    - generate_sample_data.py           # Programmatic raw logs generator script
    - sample_paid_ads_data.csv          # 90-day multi-channel sample ads report
  /agent-reports/                       # Detailed component verification summaries
    - backend-implementation.md
    - frontend-implementation.md
    - data-science-implementation.md
    - qa-report.md
    - devops-report.md
  - docker-compose.yml                  # Local development orchestration setup
```

---

## 3. Relational Database Schema (SQLAlchemy Models)
The system employs the following database entities (compatible with SQLite and PostgreSQL):

### `users`
*   `id` (Integer, Primary Key)
*   `email` (String, Unique)
*   `name` (String)
*   `role` (String, default "Analyst"): E.g., SEM Manager, Media Executive, Analyst
*   `created_at` (DateTime)

### `accounts`
*   `id` (Integer, Primary Key)
*   `user_id` (ForeignKey to `users.id`)
*   `account_name` (String): E.g., Google Ads, Meta Ads
*   `platform` (String): Platform identifier
*   `currency` (String, default "USD")
*   `created_at` (DateTime)

### `campaign_performance`
*   `id` (Integer, Primary Key)
*   `account_id` (ForeignKey to `accounts.id`)
*   `date` (Date)
*   `campaign_name` (String)
*   `channel` (String): E.g., Google Search, Performance Max, YouTube, Meta, Bing
*   `impressions` (Integer)
*   `clicks` (Integer)
*   `cost` (Float)
*   `conversions` (Integer)
*   `revenue` (Float)
*   `ctr`, `cpc`, `cvr`, `cpa`, `roas` (Float): Derived values
*   `created_at` (DateTime)

### `forecasts`
*   `id` (Integer, Primary Key)
*   `account_id` (ForeignKey to `accounts.id`)
*   `campaign_name` (String)
*   `forecast_date` (Date)
*   `metric` (String): Metric key (e.g. cost, conversions, revenue)
*   `predicted_value` (Float)
*   `lower_bound` (Float)
*   `upper_bound` (Float)
*   `model_name` (String): Model identifier (e.g. seasonal_regression, prophet)
*   `created_at` (DateTime)

### `recommendations`
*   `id` (Integer, Primary Key)
*   `account_id` (ForeignKey to `accounts.id`)
*   `campaign_name` (String)
*   `recommendation_type` (String): E.g. budget_scale, creative_refresh
*   `priority` (String): low, medium, high, critical
*   `title` (String)
*   `description` (Text)
*   `expected_impact` (String)
*   `action` (String)
*   `status` (String, default "new"): new, accepted, dismissed
*   `created_at` (DateTime)

### `anomalies`
*   `id` (Integer, Primary Key)
*   `account_id` (ForeignKey to `accounts.id`)
*   `campaign_name` (String)
*   `metric` (String)
*   `anomaly_date` (Date)
*   `actual_value` (Float)
*   `expected_value` (Float)
*   `severity` (String): low, medium, high, critical
*   `explanation` (Text)
*   `created_at` (DateTime)

### `simulations`
*   `id` (Integer, Primary Key)
*   `account_id` (ForeignKey to `accounts.id`)
*   `name` (String)
*   `budget_change_percentage` (Float)
*   `projected_spend`, `projected_conversions`, `projected_revenue`, `projected_cpa`, `projected_roas` (Float)
*   `created_at` (DateTime)

### `agent_runs`
*   `id` (Integer, Primary Key)
*   `agent_name` (String)
*   `status` (String): started, success, failed
*   `started_at` (DateTime)
*   `completed_at` (DateTime)
*   `summary` (Text)
*   `output_json` (Text): Payload logs JSON

---

## 4. FastAPI Backend API Endpoints
All API routes are prefixed with `/api` and execute within `backend/app/routers/api.py`.

*   `GET /health`: Returns service status and timezone timestamp.
*   `POST /upload`: Ingests multipart CSV report, runs cleaning checks, derives KPIs, and triggers subsequent forecasting, recommendation, and anomaly check pipeline runs.
*   `GET /dashboard/summary`: Retrieves aggregated spend, click, conversion, revenue, and efficiency KPIs for the overview dashboard.
*   `GET /campaigns`: Roller rollup campaign metric rows.
*   `GET /campaigns/{campaign_name}`: Returns chronological daily logs for a single campaign.
*   `POST /forecast/run`: Manually fits forecasting models.
*   `GET /forecast`: Returns forecasted metrics with upper/lower bounds. Filterable by metric and campaign.
*   `POST /recommendations/generate`: Computes recommendation rules.
*   `GET /recommendations`: Returns active campaign optimization proposals.
*   `POST /recommendations/{id}/status`: Set recommendation status to 'accepted' or 'dismissed'.
*   `POST /simulations/run`: Projects spend, CPA, and ROAS under budget adjustments (+/- %).
*   `POST /anomalies/detect`: Scans logs for Z-score outliers.
*   `GET /anomalies`: Fetches anomaly timeline feed.
*   `GET /agents`: Lists all background automation agents and status.
*   `POST /agents/run/{agent_name}`: Manually runs a specified agent task.
*   `GET /agents/logs`: Fetches agent historical log outputs.
*   `POST /reports/executive`: Synthesizes plain-English summaries.

---

## 5. Analytical Engines & Statistical Models

### Base KPI Calculations (`app/services/data_quality.py`)
Automatically derives derivative indicators while ensuring safety constraints against division by zero:
*   $\text{CTR} = \frac{\text{clicks}}{\text{impressions}}$ (returns 0.0 if impressions = 0)
*   $\text{CPC} = \frac{\text{cost}}{\text{clicks}}$ (returns 0.0 if clicks = 0)
*   $\text{CVR} = \frac{\text{conversions}}{\text{clicks}}$ (returns 0.0 if clicks = 0)
*   $\text{CPA} = \frac{\text{cost}}{\text{conversions}}$ (returns 0.0 if conversions = 0)
*   $\text{ROAS} = \frac{\text{revenue}}{\text{cost}}$ (returns 0.0 if cost = 0)

### Forecasting Module (`app/services/forecasting.py`)
Predicts Spend (cost), Conversions, Revenue, Clicks, CPA, and ROAS.
*   **Primary model**: Facebook Prophet (fit if package is installed).
*   **Fallback model**: Seasonal Linear Regression. Fits a multi-variable `LinearRegression` utilizing:
    1.  Linear trend ($t = \text{day count from start}$).
    2.  Day of week dummy indicators (7 columns).
*   **Prediction Bounds**: Confidence intervals are calculated based on the standard deviation of residuals of historical fits ($\pm 1.96 \times \sigma$).
*   **Ratios Derivation**: To prevent prediction volatility, CPA and ROAS are derived by dividing cost forecast by conversions/revenue forecasts, clipping lower values to zero.

### Anomaly Detection Module (`app/services/anomaly_detection.py`)
Scans daily logs using rolling statistics over a 7-day window.
*   Computes rolling mean ($\mu$) and standard deviation ($\sigma$).
*   Calculates daily Z-score: $Z = \frac{\text{Value} - \mu}{\sigma}$.
*   Flags values where $|Z| > 2.0$ as anomalies, mapping them to severity metrics:
    *   $|Z| \in (2.0, 2.5]$: Low
    *   $|Z| \in (2.5, 3.0]$: Medium
    *   $|Z| \in (3.0, 4.0]$: High
    *   $|Z| > 4.0$: Critical

### Scenario Simulation Module (`app/services/simulation.py`)
Simulates budget scaling factor $F = 1 + \frac{x}{100}$ (where $x$ is adjustment percentage):
*   **Scaling Up ($x > 0$)**: Math models diminishing marginal returns.
    *   $\text{Spend}_{\text{proj}} = \text{Spend}_{\text{base}} \times F$
    *   $\text{Clicks}_{\text{proj}} = \text{Clicks}_{\text{base}} \times F^{0.95}$
    *   $\text{Conversions}_{\text{proj}} = \text{Conversions}_{\text{base}} \times F^{0.90}$
    *   $\text{Revenue}_{\text{proj}} = \text{Revenue}_{\text{base}} \times F^{0.88}$ (exponents decrease for $x > 20.0$ to represent steeper drops).
*   **Scaling Down ($x < 0$)**: Preserving campaign efficiency.
    *   $\text{Spend}_{\text{proj}} = \text{Spend}_{\text{base}} \times F$
    *   $\text{Clicks}_{\text{proj}} = \text{Clicks}_{\text{base}} \times F^{0.98}$
    *   $\text{Conversions}_{\text{proj}} = \text{Conversions}_{\text{base}} \times F^{0.96}$
    *   $\text{Revenue}_{\text{proj}} = \text{Revenue}_{\text{base}} \times F^{0.95}$ (reflects retaining high-performing keywords/targeting).

---

## 6. In-App Automation Agents Framework
The platform defines ten specialized automation agents (`backend/app/services/agents.py`):

1.  **Daily Pacing Agent**: Scans daily spend logs, flagging campaigns pacing $25\%$ above baseline (overspending) or $30\%$ below (underpacing).
2.  **Forecast Refresh Agent**: Runs daily time-series models to regenerate 7, 14, and 30-day forecast logs.
3.  **Budget Optimization Agent**: Evaluates outperforming campaigns and generates budget shift recommendations.
4.  **Bid Optimization Agent**: Suggests target CPA or CPC bid limit adjustments based on conversion efficiency.
5.  **Search Query Waste Agent**: Audits weekly spend, flagging campaigns with high costs ($> \$300$) but zero conversions to stop budget waste.
6.  **Creative Fatigue Agent**: Flags campaigns experiencing a $>20\%$ drop in CTR compared to the previous week, recommending creative refresh.
7.  **Anomaly Watch Agent**: Scans daily logs for statistical outliers in CPC, CPA, ROAS, Spend, Conversions, and Revenue.
8.  **Executive Summary Agent**: Generates weekly plain-English performance summaries and action items.
9.  **Data Quality Agent**: Runs on every CSV upload, verifying schema, duplicate rows, missing dates, and outliers.
10. **Scenario Planning Agent**: Compares budget adjustment scenarios (-10%, +10%, +20%) to determine the optimal allocation.

---

## 7. Frontend Client Architectures

### Next.js Client (`/frontend`)
Production React client built with Next.js 15, Tailwind CSS, TypeScript, and Recharts. Implements Apple's design system utilizing:
*   San Francisco/Inter font family.
*   Clean `#f5f5f7` backgrounds with `#e8e8ed` outlines.
*   Rounded border cards with subtle animations.
*   Graceful loading states and empty state indicators.

### Embedded Single-Page App (`/backend/app/static/index.html`)
To enable running the system out-of-the-box in environments without Node.js, we have built a beautiful, fully interactive Apple-style single-page dashboard served directly by the Python FastAPI server at `http://localhost:8000/`.
*   Uses Tailwind CSS CDN for styling and Chart.js for canvas rendering.
*   Connects directly to the local FastAPI endpoints.
*   Provides complete parity of features (Dashboard, Uploads, Campaigns lists, Forecast graphs, Recommendations, Budget simulations, Anomaly scans, and Agents runs logs).

---

## 8. Setup & Running Locally

### Step 1: Start FastAPI backend & Embedded SPA
1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3.  Copy template and configure environment configurations:
    ```bash
    copy .env.example .env
    ```
4.  Start server:
    ```bash
    python -m app.main
    ```
5.  Access the embedded dashboard client directly at **[http://localhost:8000/](http://localhost:8000/)**.

---

### Step 2: Start Next.js Client (Optional)
If you have Node.js/npm installed and want to run the React Next.js development server:
1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install packages:
    ```bash
    npm install --legacy-peer-deps
    ```
3.  Copy template configurations:
    ```bash
    copy .env.example .env
    ```
4.  Start dev server:
    ```bash
    npm run dev
    ```
5.  Access the client at **[http://localhost:3000](http://localhost:3000)**.

---

## 9. Automated QA Test Suite
The backend is verified through an automated Python `unittest` suite checking CSV imports, ORM schemas, forecasting trends, anomalies Z-score flags, recommendation rules, and simulators diminishing returns.

Run tests:
```bash
cd backend
python tests/test_backend.py
```
*Output:*
```
Ran 6 tests in 0.213s
OK
```

---

## 10. Docker Compose & Deployment Guide

### Dev Multi-Container Run
To run both backend and frontend containerized, execute from workspace root:
```bash
docker-compose up --build
```
Access backend API at `http://localhost:8000` and frontend client at `http://localhost:3000`.

### Production Deployment
*   **Frontend**: Connect `/frontend` root to **Vercel**, build command `npm run build`, output `.next`, setting `NEXT_PUBLIC_API_URL` to backend live endpoint.
*   **Backend**: Build `/backend` on **Railway** container service. Provision PostgreSQL database and set `DATABASE_URL` connection strings and CORS `FRONTEND_URL` pointing to the Vercel domain.

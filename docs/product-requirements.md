# Product Requirements Document (PRD) - ForecastIQ AI

## 1. Overview
**ForecastIQ AI** is a premium, enterprise-grade SaaS platform built for SEM managers, paid media agencies, marketing directors, and executives. It acts as an optimization and forecasting decision engine that ingests multi-channel paid advertising logs, calculates standardized KPIs, flags performance anomalies, runs budget optimization simulations, and provides AI-driven executive insights.

## 2. Target Audience
*   **SEM Managers / Media Buyers**: Require detailed, campaign-level granularity, recommendation triggers (budgets, bids, pacing alerts), and creative fatigue indicators.
*   **Growth/Marketing Directors**: Require channel-level forecasts (7, 14, 30 days), scenario budget planners, and negative keyword search queries filters.
*   **Executives (CMO/CFO)**: Require high-level summary KPIs (ROAS, CPA, Spend, Revenue), automated executive reporting summaries, and risk/opportunity assessments.

## 3. Core Features
1.  **Multi-Channel Data Ingestion**: Clean CSV parsing for standard dimensions (`date`, `campaign_name`, `channel`, `impressions`, `clicks`, `cost`, `conversions`, `revenue`). Calculate derivative columns on the fly: CTR, CPC, CVR, CPA, ROAS.
2.  **Time Series Forecasting**: Forecast spend, conversions, revenue, CPA, and ROAS. Highlight prediction intervals (upper/lower bounds).
3.  **Anomaly Detection**: Roll up metrics dynamically and identify deviations using a rolling standard deviation threshold (Z-score > 2.0). Highlight anomalies in CPC spikes, CPA spikes, ROAS drops, conversions, and revenue drops.
4.  **Recommendations Engine**: Actionable suggestions across bids, budget reallocation, campaign status (pausing wasted spend), creative refreshes, and search query cleanups.
5.  **Scenario Planning & Simulation**: A interactive playground to evaluate overall or campaign-specific performance adjustments under budget shifts, applying diminishing returns formulas.
6.  **In-App Automation Agents**: Background operations managing pacing alerts, query cleaning recommendations, anomaly monitoring, and forecasting model recalibration.

## 4. Key Performance Indicators (KPIs)
*   **CTR (Click-Through Rate)** = `clicks / impressions`
*   **CPC (Cost Per Click)** = `cost / clicks`
*   **CVR (Conversion Rate)** = `conversions / clicks`
*   **CPA (Cost Per Acquisition)** = `cost / conversions`
*   **ROAS (Return on Ad Spend)** = `revenue / cost`

All indicators must handle cases of division by zero gracefully.

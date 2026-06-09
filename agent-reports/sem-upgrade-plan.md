# SEM Upgrade Plan

This document describes the design and components to upgrade our decision engine into a fully-fledged SEM intelligence dashboard.

## Overview
We are adding an **SEM Intelligence Layer** to improve PPC performance analytics and forecast curves. The core algorithms for diminishing returns, SQR analysis, negative keyword recommendations, incremental budget allocations, bid optimization recommendations, and portfolio optimization are already implemented in python services, but we need to:
1. Update `forecasting.py` to forecast `cpi` and `estimated_value`.
2. Connect the Next.js pages to these endpoints.
3. Replace visual placeholders with fully interactive Recharts charts.
4. Add comprehensive testing.

## Proposed Components
1. **Dashboard Overview Page**:
   - Integrate new cards calling `/api/sem/summary`.
   - Add diminishing returns warnings.
2. **Forecasting Page**:
   - Spend, CPI, and Estimated Value forecasting.
   - Actual vs Forecast curve + Confidence intervals (Recharts).
   - Diminishing returns curve (Spend vs Conversions/Value/Incremental ROAS).
3. **Recommendations Page**:
   - Add Search Query Report (SQR) analysis dashboard (Waste Queries, Negative Keywords, Expansion, Exact Matches).
   - Add Bid Optimization Panel (Increase, Decrease, Hold recommendations).
4. **Scenario Simulator Page**:
   - Incorporate CPI, Value, CPA, ROAS, Saturation levels.
   - Add Portfolio Budget Optimizer component.
5. **Campaign Performance Page**:
   - Display SEM-specific KPIs in campaign grid: CPI, Value, CPA, ROAS, and Spend Efficiency label.
6. **Robust CSV parsing**:
   - Validate compatibility with old CSV uploads.

## Verification
- Run backend tests: `python -m unittest discover -s backend/tests`
- Run frontend build checks.

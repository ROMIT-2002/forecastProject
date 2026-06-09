# SEM Intelligence Layer Documentation

This document describes the design, features, architecture, and mathematics of the upgraded SEM Decision-Support Platform.

---

## 1. Core Feature Explanation

The **SEM Intelligence Layer** adds professional search engine marketing decision utilities to the paid ads platform, allowing users to:
1.  **Map Diminishing Returns**: Predict where scaling campaign budgets will trigger performance degradation using power curves.
2.  **Audit Search Query Reports (SQR)**: Identify low-intent and high-cost queries with 0 conversions to stop budget waste.
3.  **Optimize Negative Keywords**: Group waste queries by priority and suggest match types (Broad, Phrase, Exact).
4.  **Forecast Advanced Metrics**: Build time-series seasonal forecasts for Spend, CPI, and Estimated Value, with upper/lower bounds.
5.  **Plan Incremental Budgets**: Simulate where next marginal dollars should go using a greedy iterative yield allocation.
6.  **Optimize Portfolio Budgets**: Reallocate total budget constraints across campaigns to maximize value or conversions.
7.  **Identify Bid Adjustments**: Recommend bid increases or decreases based on CPA targets and rank-based impression share loss.

---

## 2. Backend Modules & Services

All new services are located under `backend/app/services/`:

1.  **`sem_metrics.py`**:
    *   Formulas for advanced SEM metrics: CTR, CPC, CVR, CPA, ROAS, CPI, Estimated Value (LTV / Conv Value priority), Estimated Profit, and Spend Efficiency labels (Efficient, Near Saturation, Diminishing Returns, Wasteful).
2.  **`diminishing_returns.py`**:
    *   Fits conversions to spends using log-log space power curves: $\text{Conversions} = a \times \text{Spend}^b$.
    *   Solves for the point of diminishing return where $\text{Marginal CPA} = \text{Target CPA}$.
    *   Classifies campaigns by saturation percentage.
3.  **`sqr_analysis.py`**:
    *   Parses query-level performance records.
    *   Identifies low-intent words (`free`, `cheap`, `jobs`, `tutorial`, `pdf` etc.) and categorizes queries into `brand`, `competitor`, `low intent`, `support`, `transactional`, `informational`, and `unknown`.
    *   Generates lists of Waste Queries, Negative Keyword candidates, and Keyword Expansion opportunities.
4.  **`negative_keywords.py`**:
    *   Structures negative keyword suggestions, calculates monthly projected savings, and groups them by campaign.
5.  **`incremental_budget.py`**:
    *   Accepts a proposed additional budget and allocates it iteratively (greedy yield steps) to campaigns with positive ROI, avoiding saturated or wasteful campaigns.
6.  **`bid_optimization.py`**:
    *   Examines CPC and rank-based lost impression share over a rolling 14-day window. Suggests bid increases if ROAS is strong and Rank IS lost is high, or bid decreases if CPA target is violated.
7.  **`impression_share.py`**:
    *   Estimates potential clicks, conversions, and value lost due to budget limits or rank limitations.
8.  **`portfolio_optimizer.py`**:
    *   Maximizes total portfolio conversions, revenue, or value under a total budget constraint.

---

## 3. Mathematical Formulas

### Base KPIs (with division-by-zero protection)
*   $\text{CTR} = \frac{\text{clicks}}{\text{impressions}}$ (if impressions > 0 else 0)
*   $\text{CPC} = \frac{\text{cost}}{\text{clicks}}$ (if clicks > 0 else 0)
*   $\text{CVR} = \frac{\text{conversions}}{\text{clicks}}$ (if clicks > 0 else 0)
*   $\text{CPA} = \frac{\text{cost}}{\text{conversions}}$ (if conversions > 0 else 0)
*   $\text{ROAS} = \frac{\text{revenue}}{\text{cost}}$ (if cost > 0 else 0)
*   $\text{CPI} = \frac{\text{cost}}{\text{installs}}$ (if installs > 0 else 0)

### Estimated Value & Profit
*   If LTV is defined: $\text{Estimated Value} = \text{conversions} \times \text{estimated\_ltv}$
*   Else if Conversion Value is defined: $\text{Estimated Value} = \text{conversions} \times \text{conversion\_value}$
*   Else: $\text{Estimated Value} = \text{revenue}$
*   $\text{Estimated Profit} = \text{revenue} \times \text{margin} - \text{cost}$

### Incremental Planning
*   $\text{Incremental Spend} = \text{Proposed Spend} - \text{Current Spend}$
*   $\text{Incremental Conversions} = \text{Projected Conversions} - \text{Base Conversions}$
*   $\text{Marginal CPA} = \frac{\text{Incremental Spend}}{\text{Incremental Conversions}}$
*   $\text{Incremental ROAS} = \frac{\text{Incremental Revenue}}{\text{Incremental Spend}}$

---

## 4. API Endpoint Reference

*   `GET /api/sem/summary`: Returns overview cards data (CPI, Value, Marginal CPA, Incremental ROAS, alerts, wasted spend).
*   `GET /api/sem/diminishing-returns`: Campaign-level curves fits and recommended spend limits.
*   `POST /api/sem/incremental-budget`: Iteratively reallocates an incremental budget across campaigns.
*   `GET /api/sem/sqr`: Performs Search Query Report audits, returning waste queries and candidates.
*   `GET /api/sem/negative-keywords`: Structured negative keywords suggestions grouped by campaign.
*   `GET /api/sem/bid-recommendations`: Target CPC bid modifications (Increase, Decrease, Hold).
*   `GET /api/sem/impression-share`: Search impression share opportunity metrics.
*   `POST /api/sem/portfolio-optimize`: Solves for the optimal budget allocation under total budget limits.
*   `GET /api/sem/campaign-efficiency`: Dynamic efficiency grades for campaign grids.

---

## 5. Rich Sample CSV Dataset

*   File path: `sample-data/sem_intelligence_demo_data.csv`
*   Contains 180 days of campaign-level and query-level rows.
*   Triggers several realistic scenarios:
    *   *Diminishing Returns* on Non-Brand campaign after day 90 (spend scaled up but conversion rates decayed).
    *   *Negative Keyword opportunities* on YouTube Brand campaign (high spend, 0 conversions).
    *   *Impression share limitations* due to budget limits on Meta Retargeting, or rank limits on Google Brand.

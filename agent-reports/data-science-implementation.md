# Data Science Implementation Report - ForecastIQ AI

## 1. Accomplished Work
We have built the math and statistical models powering ForecastIQ's analysis pipeline.

### Core Modules Developed:

#### 1. Ingestion & KPI Calculation (`app/services/data_quality.py`)
Computes basic performance metrics safely. Division-by-zero is handled (returning 0.0) when clicks, impressions, cost, or conversions are zero.
*   `ctr` = clicks / impressions
*   `cpc` = cost / clicks
*   `cvr` = conversions / clicks
*   `cpa` = cost / conversions
*   `roas` = revenue / cost

#### 2. Forecasting Engine (`app/services/forecasting.py`)
Predicts Spend (cost), Conversions, Revenue, Clicks, CPA, and ROAS.
*   **Primary Model**: Facebook Prophet (fit if prophet package is installed).
*   **Fallback Model**: Seasonal Linear Regression. Fits a multi-variable Linear Regression with day-of-week dummy variables and a linear trend over historical day count.
*   **Confidence Intervals**: Calculated based on the standard deviation of residuals of historical fits ($\pm 1.96 \times \sigma$).
*   **Metrics Derivation**: To prevent statistical volatility in predicting ratios directly, CPA and ROAS forecasts are derived by dividing cost forecast by conversions/revenue forecasts, clipping lower values to zero.

#### 3. Anomaly Detection (`app/services/anomaly_detection.py`)
Identifies outliers on daily cost logs using a rolling 7-day window.
*   Computes rolling mean ($\mu$) and standard deviation ($\sigma$).
*   Calculates daily Z-score: $Z = \frac{Value - \mu}{\sigma}$.
*   Flags values where $|Z| > 2.0$ as anomalies, mapping the absolute Z-score to severity levels:
    *   $|Z| \in (2.0, 2.5]$: Low
    *   $|Z| \in (2.5, 3.0]$: Medium
    *   $|Z| \in (3.0, 4.0]$: High
    *   $|Z| > 4.0$: Critical

#### 4. Scenario Simulation (`app/services/simulation.py`)
Simulates budget scaling effects using diminishing returns math:
*   Scale factor: $F = 1 + \frac{x}{100}$ (where $x$ is the budget change percentage).
*   **Scaling Up ($x > 0$)**: Applying diminishing returns.
    *   Projected Spend = $Spend_{base} \times F$
    *   Projected Clicks = $Clicks_{base} \times F^{0.95}$
    *   Projected Conversions = $Conversions_{base} \times F^{0.90}$
    *   Projected Revenue = $Revenue_{base} \times F^{0.88}$ (exponents are slightly lower for $x > 20.0$ to represent steeper efficiency drops).
*   **Scaling Down ($x < 0$)**: Preserving campaign efficiency.
    *   Projected Spend = $Spend_{base} \times F$
    *   Projected Clicks = $Clicks_{base} \times F^{0.98}$
    *   Projected Conversions = $Conversions_{base} \times F^{0.96}$
    *   Projected Revenue = $Revenue_{base} \times F^{0.95}$ (reflects retaining only high-performing terms).
*   Projected CPA and ROAS are calculated from these values.

#### 5. Sample Data Generator (`sample-data/generate_sample_data.py`)
Creates `sample_paid_ads_data.csv` containing 90 days of daily log performance records across 12 campaigns and 5 channels. Features:
*   Weekday-weekend seasonality.
*   CTR decay over time (creative fatigue).
*   Injected anomalies: CPC spike in Meta, conversions drop in Performance Max, spend spike in Google Search Brand, and ROAS drop in Meta Prospecting.

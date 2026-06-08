# API Contract Specification - ForecastIQ AI

All backend endpoints are prefixed with `/api`.

## 1. General & Health
### `GET /health`
*   **Response**: `200 OK`
    ```json
    {
      "status": "healthy",
      "timestamp": "2026-06-08T15:39:27-04:00"
    }
    ```

---

## 2. Ingestion
### `POST /upload`
*   **Request**: `multipart/form-data` with key `file` (CSV format).
*   **Query Params**: `account_id` (optional integer).
*   **Response**: `200 OK`
    ```json
    {
      "message": "Data uploaded successfully",
      "rows_processed": 120,
      "account_id": 1,
      "data_quality_report": {
        "missing_dates": 0,
        "duplicates_removed": 2,
        "bad_values_fixed": 0,
        "zero_cost_rows": 5,
        "invalid_campaigns_skipped": 0
      }
    }
    ```

---

## 3. Campaigns & Metrics
### `GET /dashboard/summary`
*   **Query Params**: `account_id` (optional integer).
*   **Response**: `200 OK`
    ```json
    {
      "total_spend": 24500.50,
      "total_clicks": 18200,
      "total_conversions": 950,
      "total_revenue": 48200.00,
      "ctr": 0.052,
      "cpc": 1.35,
      "cvr": 0.052,
      "cpa": 25.79,
      "roas": 1.97
    }
    ```

### `GET /campaigns`
*   **Response**: `200 OK`
    ```json
    [
      {
        "campaign_name": "Google Search - Brand",
        "channel": "Google Search",
        "impressions": 150000,
        "clicks": 12000,
        "cost": 15000.0,
        "conversions": 600,
        "revenue": 30000.0,
        "ctr": 0.08,
        "cpc": 1.25,
        "cvr": 0.05,
        "cpa": 25.0,
        "roas": 2.0
      }
    ]
    ```

### `GET /campaigns/{campaign_name}`
*   **Response**: `200 OK`
    ```json
    {
      "campaign_name": "Google Search - Brand",
      "performance_history": [
        { "date": "2026-06-01", "clicks": 200, "cost": 250.0, "conversions": 10, "revenue": 500.0 }
      ]
    }
    ```

---

## 4. Forecasting
### `POST /forecast/run`
*   **Response**: `200 OK`
    ```json
    {
      "status": "completed",
      "records_generated": 180
    }
    ```

### `GET /forecast`
*   **Query Params**: `campaign_name` (optional), `metric` (optional, default `cost`), `horizon` (optional, default `30`).
*   **Response**: `200 OK`
    ```json
    [
      {
        "forecast_date": "2026-06-09",
        "predicted_value": 245.50,
        "lower_bound": 220.00,
        "upper_bound": 270.00,
        "metric": "cost",
        "campaign_name": "Google Search - Brand"
      }
    ]
    ```

---

## 5. Optimization & Recommendations
### `POST /recommendations/generate`
*   **Response**: `200 OK`
    ```json
    {
      "status": "generated",
      "count": 15
    }
    ```

### `GET /recommendations`
*   **Response**: `200 OK`
    ```json
    [
      {
        "id": 1,
        "campaign_name": "Google Search - Brand",
        "recommendation_type": "budget_scale",
        "priority": "high",
        "title": "Scale budget by 20%",
        "description": "ROAS (2.50) is significantly above target and traffic is trending upwards.",
        "expected_impact": "Increase conversion volume by 15% while maintaining current efficiency.",
        "action": "Increase daily budget from $200 to $240.",
        "status": "new"
      }
    ]
    ```

---

## 6. Anomalies
### `POST /anomalies/detect`
*   **Response**: `200 OK`
    ```json
    {
      "status": "completed",
      "anomalies_found": 3
    }
    ```

### `GET /anomalies`
*   **Response**: `200 OK`
    ```json
    [
      {
        "id": 1,
        "campaign_name": "Meta Ads - Retargeting",
        "metric": "cpc",
        "anomaly_date": "2026-06-07",
        "actual_value": 3.45,
        "expected_value": 1.20,
        "severity": "high",
        "explanation": "CPC spiked by 187% compared to rolling 7-day average."
      }
    ]
    ```

---

## 7. Scenario Simulations
### `POST /simulations/run`
*   **Request Body**:
    ```json
    {
      "budget_change_percentage": 20.0,
      "campaign_name": "All Campaigns"
    }
    ```
*   **Response**: `200 OK`
    ```json
    {
      "projected_spend": 29400.60,
      "projected_conversions": 1102,
      "projected_revenue": 55430.00,
      "projected_cpa": 26.68,
      "projected_roas": 1.88,
      "diminishing_returns_impact_applied": true,
      "explanation": "Budget increase of 20% is projected to yield 16% more revenue. Diminishing returns logic accounts for minor conversion efficiency drop."
    }
    ```

---

## 8. Platform Automation Agents
### `GET /agents`
*   **Response**: `200 OK`
    ```json
    [
      {
        "name": "Daily Pacing Agent",
        "description": "Checks whether campaigns are underpacing or overspending.",
        "status": "idle"
      }
    ]
    ```

### `POST /agents/run/{agent_name}`
*   **Response**: `200 OK`
    ```json
    {
      "agent_name": "Daily Pacing Agent",
      "status": "success",
      "summary": "Pacing check completed. 2 campaigns flagged with spend risks.",
      "output_json": {}
    }
    ```

### `GET /agents/logs`
*   **Response**: `200 OK`
    ```json
    [
      {
        "id": 1,
        "agent_name": "Daily Pacing Agent",
        "status": "success",
        "started_at": "2026-06-08T09:00:00",
        "completed_at": "2026-06-08T09:00:02",
        "summary": "Ran successfully. Flagged Meta Ads."
      }
    ]
    ```

---

## 9. Executive Reports
### `POST /reports/executive`
*   **Response**: `200 OK`
    ```json
    {
      "performance_summary": "Overall ROAS is stable at 1.97. Spend decreased by 5% while conversion volumes remained flat.",
      "forecast_summary": "Next 30 days are projected to maintain a steady conversion growth rate of 4.5% with spend at $25,100.",
      "risks": "Meta Ads Retargeting has an active critical CPC anomaly.",
      "opportunities": "Google Search Brand campaign has high efficiency (ROAS 2.50); scaling budget by 20% is recommended.",
      "action_plan": "1. Approve Google Search scale. 2. Investigate Meta Ads CPC spike.",
      "business_impact": "Implementing recommendations is expected to add $4,500 in monthly net revenue."
    }
    ```

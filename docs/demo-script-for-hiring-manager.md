# Demo Script for Hiring Manager

This script is designed to walk a hiring manager or media director through the advanced **SEM Intelligence Layer** features of ForecastIQ AI.

---

## Step 1: Ingesting the Rich SEM Intelligence Log
*   **Action**: Go to the **Upload CSV** page.
*   **Narrative**: *"We will start by ingesting a rich search engine marketing report. Our engine accepts standard media logs, but also parses query-level rows, installs, margins, LTVs, target CPAs, and impression share metrics dynamically. We will upload `sample-data/sem_intelligence_demo_data.csv`."*
*   **Action**: Select the file and click **Upload**. Watch the interactive parsing pipeline steps run.
*   **Highlight**: Once processed, show the **Data Quality Verification Log**. Detail how duplicate rows were cleared, margins filled, and CPA/ROAS targets derived safely.

---

## Step 2: The SEM Overview Command Center
*   **Action**: Return to the **Overview (Dashboard)** page.
*   **Narrative**: *"Instead of standard analytics, our main dashboard is an active command center. In addition to core metrics (Spend, Conversions, CPA), we now see an SEM Intelligence row."*
*   **Highlight**: Point out:
    1.  **Estimated CPI**: Calculated dynamically from installs.
    2.  **Estimated Value**: Calculated based on conversions $\times$ estimated LTV.
    3.  **Incremental ROAS**: Projections of marginal returns if we scale spend.
    4.  **Wasted Spend**: Aggregated queries showing zero conversions.
    5.  **Diminishing Return Warning**: Flags alert banners if a campaign exceeds its saturation point.

---

## Step 3: Predictive Forecasting & Diminishing Return Curves
*   **Action**: Navigate to the **Forecasting** page.
*   **Narrative**: *"Standard forecasting just predicts trendlines. Our page overlays seasonality, confidence bands, and diminishing returns on the same page."*
*   **Highlight**:
    1.  Select **Google Search - NonBrand** and select **Estimated Value ($)** or **CPI ($)**.
    2.  Observe the Recharts actual vs forecast timeline showing the 95% confidence intervals.
    3.  Scroll down to the **Diminishing Return Curves** section. Observe the interactive curves: Spend vs Conversions, Spend vs Value, and Spend vs Incremental ROAS. Point out where the current spend lies relative to the saturation threshold.

---

## Step 4: SQR Audits & Bid Optimization
*   **Action**: Navigate to the **Recommendations** page.
*   **Narrative**: *"We have expanded recommendations to cover keyword-level query optimization and bidding caps."*
*   **Highlight**:
    1.  Click the **SQR & Keyword Optimizer** tab. Detail the **Waste Queries** (which queries spent money without converting) and **Negative Candidates** (suggesting phrase/exact matches to exclude).
    2.  Click the **Bid Optimization** tab. Point out the recommended bid changes (Increase, Decrease, Hold) and the plain-English reason behind each recommendation.
    3.  Click the **Portfolio Shifts** tab. Show how we recommend shifting budget from YouTube (Wasteful/Saturated) to Retargeting (High headroom).

---

## Step 5: Scenario Simulation & Portfolio Allocator
*   **Action**: Navigate to the **Scenario Simulator** page.
*   **Narrative**: *"Finally, we have a sandboxed playground. We can model incremental budgets or solve for optimal allocations."*
*   **Highlight**:
    1.  Under **Incremental Allocator**, enter a budget of `$15,000` to allocate. Click **Simulate Budget**.
    2.  Show the campaign-level daily increase allocation table and the **Best/Worst/Expected Scenario** cards. Explain how this helps media planners pitch additional budgets to clients.
    3.  Switch to the **Portfolio Optimizer** tab. Enter a total budget of `$50,000` and click **Optimize Portfolio**. Show the budget shift recommendations showing exactly which campaigns to scale up or scale back.

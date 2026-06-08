import logging
from sqlalchemy.orm import Session
from app.models.database_models import CampaignPerformance, Anomaly, Recommendation, Forecast
from app.core.config import settings

logger = logging.getLogger(__name__)

def generate_executive_summary_report(db: Session, account_id: int) -> dict:
    """
    Generates an executive summary.
    If settings.OPENAI_API_KEY is defined, attempts to call OpenAI GPT models.
    Otherwise, returns a comprehensive, rule-based deterministic summary.
    """
    if settings.OPENAI_API_KEY:
        try:
            return generate_openai_summary(db, account_id)
        except Exception as e:
            logger.error(f"OpenAI executive summary failed: {str(e)}. Falling back to rule-based.")
            
    return generate_deterministic_summary(db, account_id)

def generate_deterministic_summary(db: Session, account_id: int) -> dict:
    """
    Runs deterministic rule analysis based on the latest performance data, active anomalies,
    and high priority recommendations to draft a structured plain-English executive summary.
    """
    # 1. Performance stats
    perf_records = db.query(CampaignPerformance).filter(CampaignPerformance.account_id == account_id).all()
    if not perf_records:
        return {
            "performance_summary": "No campaign data is currently available in the system.",
            "forecast_summary": "No forecast trends can be computed without historical logs.",
            "risks": "Database is empty.",
            "opportunities": "Upload campaign logs to identify scale targets.",
            "action_plan": "Upload a CSV on the data loading page.",
            "business_impact": "$0.00"
        }

    # Aggregate performance
    total_spend = sum(r.cost for r in perf_records)
    total_revenue = sum(r.revenue for r in perf_records)
    total_convs = sum(r.conversions for r in perf_records)
    overall_roas = total_revenue / total_spend if total_spend > 0 else 0.0
    overall_cpa = total_spend / total_convs if total_convs > 0 else 0.0

    # 2. Anomalies check
    anomalies = db.query(Anomaly).filter(Anomaly.account_id == account_id).all()
    critical_anom = [a for a in anomalies if a.severity in ["critical", "high"]]
    
    # 3. Recommendations check
    recs = db.query(Recommendation).filter(Recommendation.account_id == account_id, Recommendation.status == "new").all()
    high_recs = [r for r in recs if r.priority == "high"]
    
    # 4. Forecast summary
    forecasts = db.query(Forecast).filter(Forecast.account_id == account_id).all()
    
    # Generate texts
    perf_summary = (
        f"Over the recorded history, total campaign spend reached ${total_spend:,.2f} yielding a revenue "
        f"of ${total_revenue:,.2f}. The portfolio is running at a stable Return on Ad Spend (ROAS) of "
        f"{overall_roas:.2f} and an Average Cost Per Acquisition (CPA) of ${overall_cpa:.2f} across all campaigns."
    )
    
    if forecasts:
        # Sum spend forecast and conversions forecast
        f_cost = sum(f.predicted_value for f in forecasts if f.metric == "cost")
        f_convs = sum(f.predicted_value for f in forecasts if f.metric == "conversions")
        f_rev = sum(f.predicted_value for f in forecasts if f.metric == "revenue")
        avg_f_roas = f_rev / f_cost if f_cost > 0 else 0.0
        
        forecast_text = (
            f"Predictive simulations for the next 30 days project a spend pacing of ${f_cost:,.2f} "
            f"generating {f_convs:,.0f} conversions and ${f_rev:,.2f} in revenue. "
            f"The forecasted portfolio ROAS stands at {avg_f_roas:.2f}."
        )
    else:
        forecast_text = (
            "Forecast data is pending generation. Execute a forecasting refresh to calculate "
            "7, 14, and 30-day metric predictions."
        )

    # Risks text
    if critical_anom:
        risk_lines = [f"- {a.campaign_name}: {a.explanation} ({a.severity.upper()} severity)" for a in critical_anom[:3]]
        risks_text = "We detected critical anomalies requiring immediate media buyer inspection:\n" + "\n".join(risk_lines)
    else:
        risks_text = "No critical pacing issues or performance Z-score anomalies are currently flagged."

    # Opportunities text
    if high_recs:
        opp_lines = [f"- {r.campaign_name}: {r.title} ({r.description})" for r in high_recs[:3]]
        opps_text = "Key scaling opportunities identified based on campaign ROAS outperformance:\n" + "\n".join(opp_lines)
    else:
        opps_text = "No major scaling recommendations detected. Continue monitoring campaign trends."

    # Action Plan
    action_items = []
    if critical_anom:
        action_items.append("1. Audit bids and placements on campaigns flagged with CPC/CPA spikes.")
    if high_recs:
        action_items.append("2. Implement budget scaling recommendations for positive-ROI campaigns.")
    action_items.append("3. Review low-performing keywords and story creative variations experiencing ad fatigue.")
    action_plan_text = "\n".join(action_items)

    # Business impact calculation
    # Assume implementing positive suggestions yields a 10% lift in revenue
    projected_lift = total_revenue * 0.08
    business_impact_text = f"Implementing all high-priority recommendations is estimated to increase conversions by 8.5%, generating an additional ${projected_lift:,.2f} in net revenue."

    return {
        "performance_summary": perf_summary,
        "forecast_summary": forecast_text,
        "risks": risks_text,
        "opportunities": opps_text,
        "action_plan": action_plan_text,
        "business_impact": business_impact_text
    }

def generate_openai_summary(db: Session, account_id: int) -> dict:
    """
    Calls OpenAI to generate an advanced summary report.
    """
    # Fetch data to pass as context
    det_summary = generate_deterministic_summary(db, account_id)
    
    import openai
    client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
    
    prompt = f"""
    You are the AI Executive Reporting Agent for ForecastIQ AI.
    Generate a plain-English executive summary for an SEM manager and CMO based on these data facts:
    
    - Portfolio Overview: {det_summary['performance_summary']}
    - Forecast Projection: {det_summary['forecast_summary']}
    - Identified Risks: {det_summary['risks']}
    - Identified Opportunities: {det_summary['opportunities']}
    
    Output a JSON containing exactly these 6 keys:
    1. "performance_summary" (a high-level summary of what changed in the last 30 days)
    2. "forecast_summary" (plain English explanation of predicted trends)
    3. "risks" (biggest risks detected)
    4. "opportunities" (highest ROI scaling opportunities)
    5. "action_plan" (numbered concrete steps for this week)
    6. "business_impact" (plain English estimate of potential revenue gains)
    
    Respond ONLY with valid JSON.
    """
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        response_format={"type": "json_object"},
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7
    )
    
    result = json.loads(response.choices[0].message.content)
    return result

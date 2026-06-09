import json
from datetime import datetime
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models.database_models import User, Account, CampaignPerformance, Forecast, Recommendation, Anomaly, Simulation, AgentRun
from app.schemas.api_schemas import (
    DashboardSummary, CampaignSummaryRow, CampaignPerformanceResponse, ForecastResponse,
    RecommendationResponse, RecommendationUpdate, AnomalyResponse, SimulationRequest,
    SimulationResponse, AgentInfo, AgentRunResponse, AgentRunLogResponse, ExecutiveReportResponse,
    SemSummaryResponse, SemCampaignDiminishingReturns, SemIncrementalBudgetRequest,
    SemIncrementalBudgetResponse, SemSqrResponse, SemNegativeKeywordsResponse,
    SemBidRecommendation, SemImpressionShareResponse, SemPortfolioOptimizeRequest,
    SemPortfolioOptimizeResponse, SemCampaignEfficiency
)

from app.services.data_quality import validate_and_clean_csv, save_campaign_performance
from app.services.forecasting import run_campaign_forecasts
from app.services.optimization import generate_recommendations
from app.services.anomaly_detection import detect_anomalies
from app.services.simulation import run_budget_simulation
from app.services.ai_summary import generate_executive_summary_report
from app.services.agents import AGENTS_REGISTRY

# SEM Intelligence Service imports
from app.services.sem_metrics import (
    calculate_cpi, calculate_estimated_value, calculate_estimated_profit, calculate_spend_efficiency
)
from app.services.diminishing_returns import get_campaign_diminishing_returns
from app.services.sqr_analysis import analyze_sqr
from app.services.negative_keywords import get_negative_keyword_recommendations
from app.services.incremental_budget import allocate_incremental_budget
from app.services.bid_optimization import generate_bid_recommendations
from app.services.impression_share import analyze_impression_share
from app.services.portfolio_optimizer import optimize_portfolio_budget

router = APIRouter()

# Helper function to ensure we have a default user and account for the local MVP
def get_default_account_id(db: Session) -> int:
    default_user = db.query(User).first()
    if not default_user:
        default_user = User(email="demo@forecastiq.ai", name="Demo SEM Manager", role="SEM Manager")
        db.add(default_user)
        db.commit()
        db.refresh(default_user)
        
    default_account = db.query(Account).filter(Account.user_id == default_user.id).first()
    if not default_account:
        default_account = Account(user_id=default_user.id, account_name="Primary Google Ads", platform="Google Ads", currency="USD")
        db.add(default_account)
        db.commit()
        db.refresh(default_account)
        
    return default_account.id

@router.get("/health")
def health():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@router.post("/upload")
async def upload_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    account_id = get_default_account_id(db)
    
    # Read file content
    try:
        contents = await file.read()
        df, report = validate_and_clean_csv(contents)
        rows_saved = save_campaign_performance(db, df, account_id)
        
        # Trigger automation agents that run on upload (e.g. Data Quality Agent)
        AGENTS_REGISTRY["data-quality-agent"].run(db, account_id)
        
        # Run forecast refresh, anomalies detection, and recommendations automatically on new upload
        # to guarantee the dashboard gets populated with everything right away!
        run_campaign_forecasts(db, account_id, horizon=30)
        detect_anomalies(db, account_id)
        generate_recommendations(db, account_id)
        
        return {
            "message": "Data uploaded successfully",
            "rows_processed": rows_saved,
            "account_id": account_id,
            "data_quality_report": report
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")

@router.get("/dashboard/summary", response_model=DashboardSummary)
def get_dashboard_summary(db: Session = Depends(get_db)):
    account_id = get_default_account_id(db)
    records = db.query(CampaignPerformance).filter(CampaignPerformance.account_id == account_id).all()
    if not records:
        return DashboardSummary(
            total_spend=0.0, total_clicks=0, total_conversions=0, total_revenue=0.0,
            ctr=0.0, cpc=0.0, cvr=0.0, cpa=0.0, roas=0.0
        )
        
    total_spend = sum(r.cost for r in records)
    total_clicks = sum(r.clicks for r in records)
    total_impressions = sum(r.impressions for r in records)
    total_conversions = sum(r.conversions for r in records)
    total_revenue = sum(r.revenue for r in records)

    return DashboardSummary(
        total_spend=round(total_spend, 2),
        total_clicks=total_clicks,
        total_conversions=total_conversions,
        total_revenue=round(total_revenue, 2),
        ctr=total_clicks / total_impressions if total_impressions > 0 else 0.0,
        cpc=total_spend / total_clicks if total_clicks > 0 else 0.0,
        cvr=total_conversions / total_clicks if total_clicks > 0 else 0.0,
        cpa=total_spend / total_conversions if total_conversions > 0 else 0.0,
        roas=total_revenue / total_spend if total_spend > 0 else 0.0
    )

@router.get("/campaigns", response_model=List[CampaignSummaryRow])
def get_campaigns_list(db: Session = Depends(get_db)):
    account_id = get_default_account_id(db)
    records = db.query(CampaignPerformance).filter(CampaignPerformance.account_id == account_id).all()
    if not records:
        return []
        
    # Group by campaign_name and channel
    campaign_map = {}
    for r in records:
        key = (r.campaign_name, r.channel)
        if key not in campaign_map:
            campaign_map[key] = {
                "impressions": 0, "clicks": 0, "cost": 0.0, "conversions": 0, "revenue": 0.0
            }
        campaign_map[key]["impressions"] += r.impressions
        campaign_map[key]["clicks"] += r.clicks
        campaign_map[key]["cost"] += r.cost
        campaign_map[key]["conversions"] += r.conversions
        campaign_map[key]["revenue"] += r.revenue

    result = []
    for (name, ch), stats in campaign_map.items():
        cost = stats["cost"]
        clicks = stats["clicks"]
        conversions = stats["conversions"]
        impressions = stats["impressions"]
        revenue = stats["revenue"]
        
        result.append(CampaignSummaryRow(
            campaign_name=name,
            channel=ch,
            impressions=impressions,
            clicks=clicks,
            cost=round(cost, 2),
            conversions=conversions,
            revenue=round(revenue, 2),
            ctr=clicks / impressions if impressions > 0 else 0.0,
            cpc=cost / clicks if clicks > 0 else 0.0,
            cvr=conversions / clicks if clicks > 0 else 0.0,
            cpa=cost / conversions if conversions > 0 else 0.0,
            roas=revenue / cost if cost > 0 else 0.0
        ))
    return result

@router.get("/campaigns/{campaign_name}", response_model=List[CampaignPerformanceResponse])
def get_campaign_detail(campaign_name: str, db: Session = Depends(get_db)):
    account_id = get_default_account_id(db)
    records = db.query(CampaignPerformance).filter(
        CampaignPerformance.account_id == account_id,
        CampaignPerformance.campaign_name == campaign_name
    ).order_by(CampaignPerformance.date.asc()).all()
    
    if not records:
        raise HTTPException(status_code=404, detail="Campaign performance history not found.")
    return records

@router.post("/forecast/run")
def forecast_run(db: Session = Depends(get_db)):
    account_id = get_default_account_id(db)
    count = run_campaign_forecasts(db, account_id, horizon=30)
    return {"status": "completed", "records_generated": count}

@router.get("/forecast", response_model=List[ForecastResponse])
def get_forecasts(
    campaign_name: Optional[str] = None,
    metric: Optional[str] = "cost",
    db: Session = Depends(get_db)
):
    account_id = get_default_account_id(db)
    query = db.query(Forecast).filter(Forecast.account_id == account_id, Forecast.metric == metric)
    if campaign_name:
        query = query.filter(Forecast.campaign_name == campaign_name)
    results = query.order_by(Forecast.forecast_date.asc()).all()
    return results

@router.post("/recommendations/generate")
def recommendations_generate(db: Session = Depends(get_db)):
    account_id = get_default_account_id(db)
    count = generate_recommendations(db, account_id)
    return {"status": "generated", "count": count}

@router.get("/recommendations", response_model=List[RecommendationResponse])
def get_recommendations_list(db: Session = Depends(get_db)):
    account_id = get_default_account_id(db)
    results = db.query(Recommendation).filter(Recommendation.account_id == account_id).order_by(Recommendation.priority.desc()).all()
    return results

@router.post("/recommendations/{rec_id}/status")
def update_recommendation_status(rec_id: int, status_update: RecommendationUpdate, db: Session = Depends(get_db)):
    rec = db.query(Recommendation).filter(Recommendation.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    rec.status = status_update.status
    db.commit()
    return {"status": "updated", "id": rec_id, "new_status": rec.status}

@router.post("/simulations/run", response_model=SimulationResponse)
def simulations_run(req: SimulationRequest, db: Session = Depends(get_db)):
    account_id = get_default_account_id(db)
    
    # Save the simulation record to history
    sim_result = run_budget_simulation(
        db, account_id, req.budget_change_percentage, req.campaign_name
    )
    
    db_sim = Simulation(
        account_id=account_id,
        name=f"{req.campaign_name} simulation ({req.budget_change_percentage:+.1f}%)",
        budget_change_percentage=req.budget_change_percentage,
        projected_spend=sim_result["projected_spend"],
        projected_conversions=sim_result["projected_conversions"],
        projected_revenue=sim_result["projected_revenue"],
        projected_cpa=sim_result["projected_cpa"],
        projected_roas=sim_result["projected_roas"]
    )
    db.add(db_sim)
    db.commit()
    
    return sim_result

@router.post("/anomalies/detect")
def anomalies_detect(db: Session = Depends(get_db)):
    account_id = get_default_account_id(db)
    count = detect_anomalies(db, account_id)
    return {"status": "completed", "anomalies_found": count}

@router.get("/anomalies", response_model=List[AnomalyResponse])
def get_anomalies_list(db: Session = Depends(get_db)):
    account_id = get_default_account_id(db)
    results = db.query(Anomaly).filter(Anomaly.account_id == account_id).order_by(Anomaly.anomaly_date.desc()).all()
    return results

@router.get("/agents", response_model=List[AgentInfo])
def list_agents():
    res = []
    for name, agent in AGENTS_REGISTRY.items():
        res.append(AgentInfo(name=agent.name, description=agent.description, status=agent.status))
    return res

@router.post("/agents/run/{agent_name}", response_model=AgentRunResponse)
def run_agent_manually(agent_name: str, db: Session = Depends(get_db)):
    # Standardize name format
    agent_key = agent_name.lower().replace("_", "-")
    if agent_key not in AGENTS_REGISTRY:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_name}' not found.")
        
    account_id = get_default_account_id(db)
    agent = AGENTS_REGISTRY[agent_key]
    
    run_res = agent.run(db, account_id)
    
    return AgentRunResponse(
        agent_name=agent.name,
        status=run_res["status"],
        summary=run_res["summary"],
        output_json=json.dumps(run_res["output"])
    )

@router.get("/agents/logs", response_model=List[AgentRunLogResponse])
def get_agents_logs(db: Session = Depends(get_db)):
    logs = db.query(AgentRun).order_by(AgentRun.started_at.desc()).all()
    return logs

@router.post("/reports/executive", response_model=ExecutiveReportResponse)
def get_executive_report(db: Session = Depends(get_db)):
    account_id = get_default_account_id(db)
    report_data = generate_executive_summary_report(db, account_id)
    return report_data

# ==========================================
# SEM INTELLIGENCE LAYER ENDPOINTS
# ==========================================

@router.get("/sem/summary", response_model=SemSummaryResponse)
def get_sem_summary(db: Session = Depends(get_db)):
    account_id = get_default_account_id(db)
    records = db.query(CampaignPerformance).filter(CampaignPerformance.account_id == account_id).all()
    
    if not records:
        return SemSummaryResponse(
            estimated_cpi=0.0, estimated_value=0.0, marginal_cpa=0.0, incremental_roas=0.0,
            diminishing_return_status="Healthy", wasted_spend=0.0, estimated_savings=0.0, budget_opportunity=0.0
        )
        
    campaign_names = list(set(r.campaign_name for r in records))
    
    # Calculate SQR waste details
    sqr_res = analyze_sqr(db, account_id)
    wasted = sqr_res["total_wasted_spend"]
    savings = sqr_res["estimated_savings"]
    
    # Compute campaign efficiency metrics
    total_installs = sum(r.installs for r in records if r.installs is not None)
    total_cost = sum(r.cost for r in records)
    total_convs = sum(r.conversions for r in records)
    
    # Aggregated CPI
    overall_cpi = calculate_cpi(total_cost, total_installs)
    
    # Estimated Value sum
    overall_value = 0.0
    for r in records:
        ltv = r.estimated_ltv if (r.estimated_ltv is not None) else r.conversion_value
        overall_value += calculate_estimated_value(r.conversions, ltv, r.conversion_value, r.revenue)

    # Average diminishing return statistics
    dim_status = "Healthy"
    marginal_cpa_sum = 0.0
    incremental_roas_sum = 0.0
    c_count = 0
    budget_opp = 0.0
    
    for name in campaign_names:
        dim = get_campaign_diminishing_returns(db, account_id, name)
        if dim["status"] == "Diminishing returns":
            dim_status = "Warning"
        marginal_cpa_sum += dim["marginal_cpa"]
        incremental_roas_sum += dim["incremental_roas"]
        c_count += 1
        
        # Calculate budget opportunity (shifts recommended from wasteful/saturated to efficient)
        diff = dim["recommended_spend"] - dim["current_spend"]
        if diff > 0:
            budget_opp += diff

    avg_marginal_cpa = marginal_cpa_sum / c_count if c_count > 0 else 0.0
    avg_incr_roas = incremental_roas_sum / c_count if c_count > 0 else 0.0

    return SemSummaryResponse(
        estimated_cpi=round(overall_cpi, 2),
        estimated_value=round(overall_value, 2),
        marginal_cpa=round(avg_marginal_cpa, 2),
        incremental_roas=round(avg_incr_roas, 2),
        diminishing_return_status=dim_status,
        wasted_spend=round(wasted, 2),
        estimated_savings=round(savings, 2),
        budget_opportunity=round(budget_opp, 2)
    )

@router.get("/sem/diminishing-returns", response_model=List[SemCampaignDiminishingReturns])
def get_sem_diminishing_returns_api(db: Session = Depends(get_db)):
    account_id = get_default_account_id(db)
    records = db.query(CampaignPerformance).filter(CampaignPerformance.account_id == account_id).all()
    if not records:
        return []
    campaign_names = list(set(r.campaign_name for r in records))
    return [get_campaign_diminishing_returns(db, account_id, name) for name in campaign_names]

@router.post("/sem/incremental-budget", response_model=SemIncrementalBudgetResponse)
def post_sem_incremental_budget(req: SemIncrementalBudgetRequest, db: Session = Depends(get_db)):
    account_id = get_default_account_id(db)
    return allocate_incremental_budget(
        db, account_id, req.additional_budget, req.selected_campaigns, req.objective or "estimated_value"
    )

@router.get("/sem/sqr", response_model=SemSqrResponse)
def get_sem_sqr_api(db: Session = Depends(get_db)):
    account_id = get_default_account_id(db)
    return analyze_sqr(db, account_id)

@router.get("/sem/negative-keywords", response_model=SemNegativeKeywordsResponse)
def get_sem_neg_keywords_api(db: Session = Depends(get_db)):
    account_id = get_default_account_id(db)
    return get_negative_keyword_recommendations(db, account_id)

@router.get("/sem/bid-recommendations", response_model=List[SemBidRecommendation])
def get_sem_bid_recs_api(db: Session = Depends(get_db)):
    account_id = get_default_account_id(db)
    return generate_bid_recommendations(db, account_id)

@router.get("/sem/impression-share", response_model=SemImpressionShareResponse)
def get_sem_impression_share_api(db: Session = Depends(get_db)):
    account_id = get_default_account_id(db)
    return analyze_impression_share(db, account_id)

@router.post("/sem/portfolio-optimize", response_model=SemPortfolioOptimizeResponse)
def post_sem_portfolio_optimize(req: SemPortfolioOptimizeRequest, db: Session = Depends(get_db)):
    account_id = get_default_account_id(db)
    return optimize_portfolio_budget(db, account_id, req.total_budget, req.objective or "estimated_value")

@router.get("/sem/campaign-efficiency", response_model=List[SemCampaignEfficiency])
def get_sem_campaign_efficiency_api(db: Session = Depends(get_db)):
    account_id = get_default_account_id(db)
    records = db.query(CampaignPerformance).filter(CampaignPerformance.account_id == account_id).all()
    if not records:
        return []
        
    # Group by campaign
    campaign_records = {}
    for r in records:
        if r.campaign_name not in campaign_records:
            campaign_records[r.campaign_name] = []
        campaign_records[r.campaign_name].append(r)
        
    results = []
    for name, list_r in campaign_records.items():
        latest = sorted(list_r, key=lambda x: x.date)[-1]
        
        # Diminishing returns info
        dim = get_campaign_diminishing_returns(db, account_id, name)
        
        # Economical checks
        cost = latest.cost
        installs = latest.installs if latest.installs is not None else latest.conversions
        cpi = calculate_cpi(cost, installs)
        
        c_val = latest.conversion_value if (latest.conversion_value is not None) else (latest.revenue / latest.conversions if latest.conversions > 0 else 50.0)
        ltv = latest.estimated_ltv if (latest.estimated_ltv is not None) else c_val
        est_val = latest.conversions * ltv
        
        label = calculate_spend_efficiency(
            cost=latest.cost,
            conversions=latest.conversions,
            roas=latest.roas,
            cpa=latest.cpa,
            target_roas=latest.target_roas,
            target_cpa=latest.target_cpa,
            saturation_score=dim["saturation_score"]
        )
        
        results.append(SemCampaignEfficiency(
            campaign_name=name,
            channel=latest.channel,
            cpi=round(cpi, 2),
            estimated_value=round(est_val, 2),
            marginal_cpa=dim["marginal_cpa"],
            incremental_roas=dim["incremental_roas"],
            diminishing_return_point=dim["diminishing_return_point"],
            efficiency_label=label
        ))
        
    return results

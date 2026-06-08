import math
from sqlalchemy.orm import Session
from app.models.database_models import CampaignPerformance

def run_budget_simulation(db: Session, account_id: int, budget_change_pct: float, campaign_name: str = "All Campaigns") -> dict:
    """
    Simulates budget changes (+/- %) and projects key performance outcomes
    using diminishing returns logic for scaling up, and efficiency preservation logic for scaling down.
    """
    # Load campaign performance historical records
    query = db.query(CampaignPerformance).filter(CampaignPerformance.account_id == account_id)
    if campaign_name != "All Campaigns":
        query = query.filter(CampaignPerformance.campaign_name == campaign_name)
        
    records = query.all()
    if not records:
        return {
            "projected_spend": 0.0,
            "projected_conversions": 0.0,
            "projected_revenue": 0.0,
            "projected_cpa": 0.0,
            "projected_roas": 0.0,
            "diminishing_returns_impact_applied": False,
            "explanation": "No campaign data found to simulate."
        }

    # Aggregate base values (using last 30 days as baseline for simulation)
    # We find the latest date in performance log, and baseline is last 30 days of data.
    latest_date = max(r.date for r in records)
    start_baseline = latest_date - timedelta_days(30)
    
    baseline_records = [r for r in records if r.date >= start_baseline]
    if not baseline_records:
        baseline_records = records  # fallback to all
        
    base_spend = sum(r.cost for r in baseline_records)
    base_clicks = sum(r.clicks for r in baseline_records)
    base_conversions = sum(r.conversions for r in baseline_records)
    base_revenue = sum(r.revenue for r in baseline_records)

    # Budget change scaling factor F
    f = 1.0 + (budget_change_pct / 100.0)
    
    # Exponents for scaling
    if budget_change_pct > 0:
        # Diminishing returns scaling
        # If budget increase is steep (above 20%), diminishing returns are stronger
        if budget_change_pct > 20.0:
            click_exp = 0.92
            conv_exp = 0.85
            rev_exp = 0.82
        else:
            click_exp = 0.95
            conv_exp = 0.90
            rev_exp = 0.88
            
        diminishing_applied = True
        explanation = (
            f"Budget increase of {budget_change_pct:.1f}% projects a lift in spend, clicks, and revenue. "
            "Diminishing returns calculations have been applied: conversion rate and marginal ROAS decay slightly "
            "as traffic acquisition bids increase."
        )
    else:
        # Scaling down preserves or slightly increases efficiency
        click_exp = 0.98
        conv_exp = 0.96
        rev_exp = 0.95
        
        diminishing_applied = False
        explanation = (
            f"Budget reduction of {abs(budget_change_pct):.1f}% is projected to cut spend. "
            "Efficiency preservation logic assumes higher-performing search queries and retargeting ads "
            "remain active, yielding slightly better average CPC, lower CPA, and improved ROAS."
        )

    projected_spend = base_spend * f
    projected_clicks = base_clicks * (f ** click_exp)
    projected_conversions = base_conversions * (f ** conv_exp)
    projected_revenue = base_revenue * (f ** rev_exp)

    # CPA and ROAS derivation
    projected_cpa = projected_spend / projected_conversions if projected_conversions > 0 else 0.0
    projected_roas = projected_revenue / projected_spend if projected_spend > 0 else 0.0

    return {
        "projected_spend": round(projected_spend, 2),
        "projected_conversions": round(projected_conversions, 1),
        "projected_revenue": round(projected_revenue, 2),
        "projected_cpa": round(projected_cpa, 2),
        "projected_roas": round(projected_roas, 2),
        "diminishing_returns_impact_applied": diminishing_applied,
        "explanation": explanation
    }

def timedelta_days(days: int):
    from datetime import timedelta
    return timedelta(days=days)

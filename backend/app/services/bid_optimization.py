# Bid Optimization Service
import pandas as pd
from sqlalchemy.orm import Session
from app.models.database_models import CampaignPerformance
from app.core.config import settings

def generate_bid_recommendations(db: Session, account_id: int) -> list[dict]:
    """
    Evaluates conversion efficiency, cost pacing, and rank-based impression share loss
    to recommend target CPA / max CPC bidding limits adjustments.
    """
    records = db.query(CampaignPerformance).filter(CampaignPerformance.account_id == account_id).all()
    if not records:
        return []

    # Group by campaign and calculate metrics
    campaign_records = {}
    for r in records:
        name = r.campaign_name
        if name not in campaign_records:
            campaign_records[name] = []
        campaign_records[name].append(r)

    recommendations = []
    
    for name, list_r in campaign_records.items():
        if len(list_r) < 14:
            continue
            
        # Group by date ascending
        list_r = sorted(list_r, key=lambda x: x.date)
        
        # Segment into latest 7 days and prior 7 days
        latest = list_r[-7:]
        prior = list_r[-14:-7]
        
        # Latest KPIs
        tot_spend_l = sum(r.cost for r in latest)
        tot_conv_l = sum(r.conversions for r in latest)
        tot_rev_l = sum(r.revenue for r in latest)
        tot_clicks_l = sum(r.clicks for r in latest)
        
        avg_cpc_l = tot_spend_l / tot_clicks_l if tot_clicks_l > 0 else latest[-1].cpc
        avg_cpa_l = tot_spend_l / tot_conv_l if tot_conv_l > 0 else 0.0
        avg_roas_l = tot_rev_l / tot_spend_l if tot_spend_l > 0 else 0.0
        avg_cvr_l = tot_conv_l / tot_clicks_l if tot_clicks_l > 0 else 0.0
        
        # Prior KPIs
        tot_spend_p = sum(r.cost for r in prior)
        tot_conv_p = sum(r.conversions for r in prior)
        tot_clicks_p = sum(r.clicks for r in prior)
        
        avg_cpa_p = tot_spend_p / tot_conv_p if tot_conv_p > 0 else 0.0
        avg_cpc_p = tot_spend_p / tot_clicks_p if tot_clicks_p > 0 else 0.0
        avg_cvr_p = tot_conv_p / tot_clicks_p if tot_clicks_p > 0 else 0.0

        # Optional impression share
        lost_rank = latest[-1].lost_is_rank if (latest[-1].lost_is_rank is not None) else 0.0
        target_cpa = latest[-1].target_cpa if (latest[-1].target_cpa is not None) else settings.TARGET_CPA
        target_roas = latest[-1].target_roas if (latest[-1].target_roas is not None) else settings.TARGET_ROAS

        # Evaluate rules
        # Rule 1: Increase Bid
        if avg_roas_l > target_roas and (avg_cpa_l < target_cpa or avg_cpa_l == 0) and tot_conv_l >= tot_conv_p and lost_rank > 0.15:
            action = "Increase"
            change_pct = 15.0
            reason = f"ROAS ({avg_roas_l:.2f}x) is highly efficient and campaign has lost {lost_rank*100:.1f}% impression share due to bidding Rank. Bidding up will unlock high-converting inventory."
            expected_impact = "Capture incremental high-intent clicks and boost transaction volumes."
            confidence = "High"
        # Rule 2: Decrease Bid
        elif avg_cpa_l > target_cpa and avg_roas_l < target_roas and avg_cpa_l > avg_cpa_p and avg_cvr_l < avg_cvr_p:
            action = "Decrease"
            change_pct = -12.0
            reason = f"CPA (${avg_cpa_l:.2f}) is higher than target limit (${target_cpa:.2f}). Bidding efficiency is decaying as conversion rate dropped from {avg_cvr_p*100:.1f}% to {avg_cvr_l*100:.1f}%."
            expected_impact = "Decrease average CPC and bring target CPA back to healthy benchmarks."
            confidence = "Medium"
        # Rule 3: Hold Bid
        else:
            action = "Hold"
            change_pct = 0.0
            reason = "Bidding thresholds are stable. Campaign operates near Target CPA and Target ROAS optimization guidelines."
            expected_impact = "Maintain current volume and cost efficiencies."
            confidence = "High"

        recommendations.append({
            "campaign_name": name,
            "channel": latest[-1].channel,
            "current_cpc": round(avg_cpc_l, 2),
            "recommended_bid_change_percentage": change_pct,
            "action": action,
            "reason": reason,
            "expected_impact": expected_impact,
            "confidence": confidence
        })
        
    return recommendations

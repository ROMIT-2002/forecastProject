import pandas as pd
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.database_models import CampaignPerformance, Recommendation
from app.core.config import settings

def generate_recommendations(db: Session, account_id: int) -> int:
    """
    Analyzes historical data and generates action-oriented recommendations based on performance rules.
    Deletes existing new recommendations for this account first to prevent duplicate lists.
    """
    # Delete recommendations for this account that are still in "new" status
    db.query(Recommendation).filter(
        Recommendation.account_id == account_id,
        Recommendation.status == "new"
    ).delete()
    db.commit()

    # Load campaign performance historical records
    records = db.query(CampaignPerformance).filter(CampaignPerformance.account_id == account_id).all()
    if not records:
        return 0

    # Build DataFrame
    data = []
    for r in records:
        data.append({
            "campaign_name": r.campaign_name,
            "date": pd.to_datetime(r.date),
            "impressions": r.impressions,
            "clicks": r.clicks,
            "cost": r.cost,
            "conversions": r.conversions,
            "revenue": r.revenue,
            "ctr": r.ctr,
            "cpc": r.cpc,
            "cvr": r.cvr,
            "cpa": r.cpa,
            "roas": r.roas
        })
    df = pd.DataFrame(data)
    
    recommendation_objects = []
    campaign_names = df["campaign_name"].unique()
    
    # Thresholds from configuration settings
    target_roas = settings.TARGET_ROAS
    target_cpa = settings.TARGET_CPA
    
    for name in campaign_names:
        camp_df = df[df["campaign_name"] == name].sort_values("date")
        if len(camp_df) < 14:
            continue
            
        # Segment into latest 7 days and prior 7 days
        latest_df = camp_df.tail(7)
        prior_df = camp_df.iloc[-14:-7]
        
        # Calculate performance metrics for latest 7 days
        avg_spend_l = latest_df["cost"].mean()
        tot_spend_l = latest_df["cost"].sum()
        avg_roas_l = latest_df["revenue"].sum() / latest_df["cost"].sum() if latest_df["cost"].sum() > 0 else 0.0
        avg_cpa_l = latest_df["cost"].sum() / latest_df["conversions"].sum() if latest_df["conversions"].sum() > 0 else 0.0
        avg_ctr_l = latest_df["clicks"].sum() / latest_df["impressions"].sum() if latest_df["impressions"].sum() > 0 else 0.0
        avg_cvr_l = latest_df["conversions"].sum() / latest_df["clicks"].sum() if latest_df["clicks"].sum() > 0 else 0.0
        total_conv_l = latest_df["conversions"].sum()
        
        # Calculate performance metrics for prior 7 days
        avg_spend_p = prior_df["cost"].mean()
        avg_clicks_p = prior_df["clicks"].mean()
        avg_clicks_l = latest_df["clicks"].mean()
        avg_conv_p = prior_df["conversions"].mean()
        avg_conv_l = latest_df["conversions"].mean()
        avg_ctr_p = prior_df["clicks"].sum() / prior_df["impressions"].sum() if prior_df["impressions"].sum() > 0 else 0.0
        avg_cvr_p = prior_df["conversions"].sum() / prior_df["clicks"].sum() if prior_df["clicks"].sum() > 0 else 0.0
        avg_cost_p = prior_df["cost"].mean()
        avg_cost_l = latest_df["cost"].mean()
        avg_cpa_p = prior_df["cost"].sum() / prior_df["conversions"].sum() if prior_df["conversions"].sum() > 0 else 0.0

        # Rule 1: Budget Scaling
        # If ROAS > target ROAS and click/conversion trend is positive
        if avg_roas_l > target_roas and avg_clicks_l > avg_clicks_p and avg_conv_l >= avg_conv_p:
            scale_pct = int(min(25, max(10, (avg_roas_l / target_roas) * 10)))
            recommendation_objects.append(Recommendation(
                account_id=account_id,
                campaign_name=name,
                recommendation_type="budget_scale",
                priority="high",
                title=f"Increase Budget by {scale_pct}%",
                description=f"ROAS ({avg_roas_l:.2f}) is significantly outperforming your target of {target_roas:.2f}. Traffic and conversions are trending positive.",
                expected_impact=f"Increase conversion volume by projectedly {scale_pct - 5}% while maintaining stable efficiency.",
                action=f"Scale daily budget by {scale_pct}%. Proposed daily spend: ${(avg_spend_l * (1 + scale_pct/100)):.2f}.",
                status="new"
            ))

        # Rule 2: Budget Reduction
        # If CPA > target CPA and ROAS is below target
        elif avg_cpa_l > target_cpa and avg_roas_l < target_roas and avg_roas_l > 0:
            reduction_pct = int(min(20, max(10, (avg_cpa_l / target_cpa) * 10)))
            recommendation_objects.append(Recommendation(
                account_id=account_id,
                campaign_name=name,
                recommendation_type="budget_reduction",
                priority="medium",
                title=f"Reduce Budget by {reduction_pct}%",
                description=f"CPA of ${avg_cpa_l:.2f} is higher than the target of ${target_cpa:.2f}, and ROAS ({avg_roas_l:.2f}) is weak.",
                expected_impact="Cut unprofitable spend and optimize media budget allocation.",
                action=f"Reduce daily budget by {reduction_pct}%. Proposed daily spend: ${(avg_spend_l * (1 - reduction_pct/100)):.2f}.",
                status="new"
            ))

        # Rule 3: Pause Campaign
        # If spend > threshold (e.g. $500 in 7 days) and conversions = 0
        if tot_spend_l > 400.0 and total_conv_l == 0:
            recommendation_objects.append(Recommendation(
                account_id=account_id,
                campaign_name=name,
                recommendation_type="pause_campaign",
                priority="critical",
                title="Pause High-Spend Zero-Conversion Campaign",
                description=f"This campaign has spent ${tot_spend_l:.2f} over the last 7 days but generated 0 conversions.",
                expected_impact="Save up to 100% of current campaign budget ($" + f"{tot_spend_l:.2f}/week) immediately.",
                action="Pause the campaign to prevent budget leakage. Review landing page and keyword targeting.",
                status="new"
            ))

        # Rule 4: Bid Increase
        # If ROAS is strong and CPA is below target
        if avg_roas_l > target_roas * 1.2 and avg_cpa_l < target_cpa * 0.8 and avg_cpa_l > 0:
            recommendation_objects.append(Recommendation(
                account_id=account_id,
                campaign_name=name,
                recommendation_type="bid_increase",
                priority="medium",
                title="Increase Bids to Capture Impression Share",
                description=f"Campaign is highly efficient with ROAS ({avg_roas_l:.2f}) and CPA (${avg_cpa_l:.2f}). Capturing more search impressions will boost sales.",
                expected_impact="Higher impression share and click volumes on high-intent search terms.",
                action="Increase campaign target CPA or max CPC bid limit by 15%.",
                status="new"
            ))

        # Rule 5: Bid Decrease
        # If CPA is rising and conversion rate is falling
        if avg_cpa_l > avg_cpa_p and avg_cpa_p > 0 and avg_cvr_l < avg_cvr_p:
            recommendation_objects.append(Recommendation(
                account_id=account_id,
                campaign_name=name,
                recommendation_type="bid_decrease",
                priority="medium",
                title="Reduce Bids due to Conversion Decay",
                description=f"Average CPA rose from ${avg_cpa_p:.2f} to ${avg_cpa_l:.2f} as conversion rate fell from {avg_cvr_p*100:.2f}% to {avg_cvr_l*100:.2f}%.",
                expected_impact="Reduces average cost-per-click (CPC) and lowers CPA back to target level.",
                action="Decrease campaign target CPA or CPC bid limit by 10-15%.",
                status="new"
            ))

        # Rule 6: Creative Fatigue
        # If CTR drops more than 20% versus 7-day average
        if avg_ctr_p > 0 and (avg_ctr_p - avg_ctr_l) / avg_ctr_p > 0.20:
            recommendation_objects.append(Recommendation(
                account_id=account_id,
                campaign_name=name,
                recommendation_type="creative_refresh",
                priority="medium",
                title="Creative Refresh Required",
                description=f"Click-Through Rate (CTR) fell by {((avg_ctr_p - avg_ctr_l)/avg_ctr_p)*100:.1f}% compared to the previous week, indicating ad fatigue.",
                expected_impact="Restore click volumes and lower average CPC.",
                action="Introduce new creative variants or rotate old banner/video assets out.",
                status="new"
            ))

        # Rule 7: Keyword/Query Review
        # If cost rises but conversions do not rise
        if avg_cost_l > avg_cost_p * 1.15 and avg_conv_l <= avg_conv_p:
            recommendation_objects.append(Recommendation(
                account_id=account_id,
                campaign_name=name,
                recommendation_type="keyword_review",
                priority="low",
                title="Audit Search Queries & Negative Keywords",
                description=f"Spend grew by {((avg_cost_l - avg_cost_p)/avg_cost_p)*100:.1f}%, but weekly conversions remained flat or declined.",
                expected_impact="Excludes irrelevant search terms wasting budget.",
                action="Run a search query report. Add search terms with high costs and 0 conversions to negative keywords.",
                status="new"
            ))

        # Rule 8: Pacing Risk
        # If weekly projected spend (multiplied out to monthly) exceeds campaign budget baseline
        # (Let's assume a default budget baseline of $2,000 per month for this check)
        weekly_spend = tot_spend_l
        monthly_proj = weekly_spend * 4.28
        if monthly_proj > 3500.0:
            recommendation_objects.append(Recommendation(
                account_id=account_id,
                campaign_name=name,
                recommendation_type="pacing_risk",
                priority="high",
                title="Pacing Cap Recommended",
                description=f"Weekly spend of ${weekly_spend:.2f} projects to a monthly pacing of ${monthly_proj:.2f}, risking budget overruns.",
                expected_impact="Prevents exceeding target quarterly/monthly budgets.",
                action="Set a daily budget cap of " + f"${(3000.0/30.4):.2f} on the advertising platform.",
                status="new"
            ))

    db.bulk_save_objects(recommendation_objects)
    db.commit()
    return len(recommendation_objects)

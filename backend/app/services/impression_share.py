# Impression Share Opportunity Service
from sqlalchemy.orm import Session
from app.models.database_models import CampaignPerformance
from app.core.config import settings

def analyze_impression_share(db: Session, account_id: int) -> dict:
    """
    Analyzes search impression share (IS) fields in the database.
    Estimates missed impressions, clicks, conversions, and value due to budget or rank restrictions.
    """
    records = db.query(CampaignPerformance).filter(CampaignPerformance.account_id == account_id).all()
    if not records:
        return {"has_data": False, "message": "No data found in database.", "campaigns": []}

    # Group by campaign and take the latest record for each
    campaign_map = {}
    for r in records:
        campaign_map[r.campaign_name] = r

    has_is_data = False
    campaigns_report = []
    
    total_missed_clicks = 0.0
    total_missed_conversions = 0.0
    total_missed_value = 0.0
    
    for name, r in campaign_map.items():
        if r.impression_share is None or r.impression_share == 0.0:
            continue
            
        has_is_data = True
        
        is_val = r.impression_share
        lost_budget = r.lost_is_budget if r.lost_is_budget is not None else 0.0
        lost_rank = r.lost_is_rank if r.lost_is_rank is not None else 0.0
        
        impressions = r.impressions
        clicks = r.clicks
        conversions = r.conversions
        revenue = r.revenue
        
        # Derived conversion value and LTV
        c_val = r.conversion_value if (r.conversion_value is not None) else (revenue / conversions if conversions > 0 else 50.0)
        ltv = r.estimated_ltv if (r.estimated_ltv is not None) else c_val
        
        # Base conversion rates
        ctr = clicks / impressions if impressions > 0 else 0.0
        cvr = conversions / clicks if clicks > 0 else 0.0
        
        # Calculate market size: Total potential impressions = impressions / impression_share
        total_market_impressions = impressions / is_val if is_val > 0 else impressions
        
        # Lost impressions
        lost_imp_budget = total_market_impressions * lost_budget
        lost_imp_rank = total_market_impressions * lost_rank
        
        # Missed clicks and conversions
        missed_clicks_budget = lost_imp_budget * ctr
        missed_clicks_rank = lost_imp_rank * ctr
        missed_clicks = missed_clicks_budget + missed_clicks_rank
        
        missed_convs = missed_clicks * cvr
        missed_val = missed_convs * ltv
        
        total_missed_clicks += missed_clicks
        total_missed_conversions += missed_convs
        total_missed_value += missed_val
        
        campaigns_report.append({
            "campaign_name": name,
            "channel": r.channel,
            "impression_share": round(is_val * 100.0, 1),
            "lost_is_budget": round(lost_budget * 100.0, 1),
            "lost_is_rank": round(lost_rank * 100.0, 1),
            "missed_clicks": round(missed_clicks, 0),
            "missed_conversions": round(missed_convs, 1),
            "missed_value": round(missed_val, 2)
        })

    if not has_is_data:
        return {
            "has_data": False,
            "message": "Upload impression_share, lost_is_budget, and lost_is_rank columns to unlock impression share opportunity analysis.",
            "campaigns": [],
            "total_missed_clicks": 0.0,
            "total_missed_conversions": 0.0,
            "total_missed_value": 0.0
        }

    return {
        "has_data": True,
        "campaigns": campaigns_report,
        "total_missed_clicks": round(total_missed_clicks, 0),
        "total_missed_conversions": round(total_missed_conversions, 1),
        "total_missed_value": round(total_missed_value, 2)
    }

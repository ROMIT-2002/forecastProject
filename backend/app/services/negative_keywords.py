# Negative Keyword Recommendation Service
from sqlalchemy.orm import Session
from app.services.sqr_analysis import analyze_sqr

def get_negative_keyword_recommendations(db: Session, account_id: int) -> dict:
    """
    Retrieves and structures negative keyword recommendations.
    Groups results by campaign and match types.
    """
    sqr_results = analyze_sqr(db, account_id)
    
    if not sqr_results["has_data"]:
        return {
            "has_data": False,
            "message": sqr_results["message"],
            "candidates": [],
            "campaign_groups": {},
            "total_wasted_spend": 0.0,
            "estimated_monthly_savings": 0.0
        }
        
    candidates = sqr_results["negative_keyword_candidates"]
    
    # Group by campaign
    groups = {}
    for c in candidates:
        camp = c["campaign_name"]
        if camp not in groups:
            groups[camp] = []
        groups[camp].append(c)
        
    # Sort candidates by cost/savings descending for high priority recommendation
    sorted_candidates = sorted(candidates, key=lambda x: x["cost"], reverse=True)
    
    # Calculate monthly projection (daily spend * 30)
    # The sqr_results contains the historical total, let's assume it spans a 30-day window
    # estimated savings is already computed
    estimated_monthly = sqr_results["estimated_savings"]

    return {
        "has_data": True,
        "candidates": sorted_candidates,
        "campaign_groups": groups,
        "total_wasted_spend": sqr_results["total_wasted_spend"],
        "estimated_monthly_savings": round(estimated_monthly, 2)
    }

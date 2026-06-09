# Search Query Report (SQR) Analytics Service
from sqlalchemy.orm import Session
from app.models.database_models import CampaignPerformance
from app.core.config import settings

LOW_INTENT_WORDS = ["free", "cheap", "jobs", "career", "salary", "definition", "meaning", "tutorial", "pdf", "cracked", "torrent", "used", "second hand", "support", "refund"]

def analyze_sqr(db: Session, account_id: int) -> dict:
    """
    Analyzes SQR query records in CampaignPerformance.
    Returns categorized reports, wastes, expansion opportunities, and matches.
    """
    records = db.query(CampaignPerformance).filter(
        CampaignPerformance.account_id == account_id,
        CampaignPerformance.search_query != None,
        CampaignPerformance.search_query != ""
    ).all()

    if not records:
        return {
            "has_data": False,
            "message": "No SQR data uploaded yet. Upload a file with search_query, keyword, match_type, cost, clicks, conversions, revenue to unlock query-level insights.",
            "waste_queries": [],
            "negative_keyword_candidates": [],
            "expansion_opportunities": [],
            "exact_match_candidates": [],
            "query_category_summary": {},
            "total_wasted_spend": 0.0,
            "estimated_savings": 0.0,
            "recommendation_count": 0
        }

    waste_queries = []
    negatives = []
    expansions = []
    exacts = []
    
    total_wasted_spend = 0.0
    estimated_savings = 0.0
    
    # Category totals
    cat_counts = {"brand": 0, "competitor": 0, "informational": 0, "transactional": 0, "low intent": 0, "support": 0, "unknown": 0}
    cat_spend = {"brand": 0.0, "competitor": 0.0, "informational": 0.0, "transactional": 0.0, "low intent": 0.0, "support": 0.0, "unknown": 0.0}

    for r in records:
        query = r.search_query.lower()
        cost = r.cost
        convs = r.conversions
        roas = r.roas
        cpa = r.cpa
        
        # Targets (with defaults)
        target_cpa = r.target_cpa if (r.target_cpa is not None) else settings.TARGET_CPA
        target_roas = r.target_roas if (r.target_roas is not None) else settings.TARGET_ROAS
        
        # Determine category
        category = "unknown"
        if "forecastiq" in query or "iq" in query or "primary" in query:
            category = "brand"
        elif any(comp in query for comp in ["competitor", "semrush", "ahrefs", "spyfu"]):
            category = "competitor"
        elif any(word in query for word in ["free", "cheap", "jobs", "career", "salary", "used", "second hand"]):
            category = "low intent"
        elif any(word in query for word in ["support", "refund", "login", "reset", "help"]):
            category = "support"
        elif any(word in query for word in ["what", "how", "why", "meaning", "definition", "pdf", "tutorial"]):
            category = "informational"
        elif any(word in query for word in ["buy", "pricing", "sign up", "forecast", "tool", "software", "agency"]):
            category = "transactional"
            
        cat_counts[category] += 1
        cat_spend[category] += cost

        # 1. Waste Queries (conversions = 0, cost > $15)
        if convs == 0 and cost > 15.0:
            waste_item = {
                "id": r.id,
                "query": r.search_query,
                "campaign_name": r.campaign_name,
                "cost": round(cost, 2),
                "clicks": r.clicks,
                "conversions": 0,
                "CPA": 0.0,
                "ROAS": 0.0,
                "reason": "High cost with zero conversions."
            }
            waste_queries.append(waste_item)
            total_wasted_spend += cost

        # 2. Negative Keyword Candidates
        is_neg = False
        reason = ""
        suggested_match = "exact"

        if convs == 0 and cost > 15.0:
            is_neg = True
            reason = "Zero conversions with spend > $15."
        elif convs > 0 and cpa > 3.0 * target_cpa:
            is_neg = True
            reason = f"CPA (${cpa:.2f}) is 3x higher than target (${target_cpa:.2f})."
        elif cost > 0 and roas < 0.5 * target_roas:
            is_neg = True
            reason = f"ROAS ({roas:.2f}x) is less than half target ({target_roas:.2f}x)."
        elif any(word in query for word in LOW_INTENT_WORDS):
            is_neg = True
            reason = f"Query contains low-intent term: '{[w for w in LOW_INTENT_WORDS if w in query][0]}'."
            suggested_match = "phrase"

        if is_neg:
            neg_item = {
                "id": r.id,
                "search_query": r.search_query,
                "campaign_name": r.campaign_name,
                "cost": round(cost, 2),
                "clicks": r.clicks,
                "conversions": convs,
                "revenue": round(r.revenue, 2),
                "CPA": round(cpa, 2),
                "ROAS": round(roas, 2),
                "reason": reason,
                "suggested_match_type": suggested_match,
                "priority": "high" if (cost > 50.0 or cpa > 4.0 * target_cpa) else "medium",
                "estimated_savings": round(cost * 0.85, 2) # Assume avoiding query saves 85% of its historical cost
            }
            negatives.append(neg_item)
            estimated_savings += neg_item["estimated_savings"]

        # 3. Expansion Opportunities (conversions > 0, ROAS > target_roas, CPA < target_cpa, not exact)
        if convs > 0 and roas > target_roas and cpa < target_cpa and r.match_type != "exact":
            expansions.append({
                "id": r.id,
                "query": r.search_query,
                "campaign_name": r.campaign_name,
                "keyword": r.keyword or r.search_query,
                "cost": round(cost, 2),
                "conversions": convs,
                "CPA": round(cpa, 2),
                "ROAS": round(roas, 2),
                "current_match_type": r.match_type or "broad",
                "reason": f"High ROI ({roas:.2f}x) query running on a loose match type. Add as dedicated exact/phrase keyword."
            })

        # 4. Exact Match Candidates (strong repeated query performance ready for exact match)
        if convs > 2 and roas > target_roas * 1.1 and r.match_type in ["phrase", "broad"]:
            exacts.append({
                "id": r.id,
                "query": r.search_query,
                "campaign_name": r.campaign_name,
                "conversions": convs,
                "ROAS": round(roas, 2),
                "CPA": round(cpa, 2),
                "reason": f"Frequent converting query ({convs} conversions) on phrase/broad. Isolate as Exact match to control bidding."
            })

    # Prepare summary response
    query_category_summary = {}
    for cat in cat_counts.keys():
        query_category_summary[cat] = {
            "count": cat_counts[cat],
            "spend": round(cat_spend[cat], 2),
            "percentage_of_spend": round((cat_spend[cat] / sum(cat_spend.values()) * 100.0) if sum(cat_spend.values()) > 0 else 0.0, 1)
        }

    return {
        "has_data": True,
        "waste_queries": waste_queries[:15],
        "negative_keyword_candidates": negatives[:15],
        "expansion_opportunities": expansions[:15],
        "exact_match_candidates": exacts[:15],
        "query_category_summary": query_category_summary,
        "total_wasted_spend": round(total_wasted_spend, 2),
        "estimated_savings": round(estimated_savings, 2),
        "recommendation_count": len(negatives) + len(expansions)
    }

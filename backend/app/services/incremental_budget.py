# Incremental Budget Optimization Service
from sqlalchemy.orm import Session
from app.models.database_models import CampaignPerformance
from app.services.diminishing_returns import fit_diminishing_returns_curve
from app.core.config import settings

def allocate_incremental_budget(db: Session, account_id: int, additional_budget: float, selected_campaigns: list[str] = None, objective: str = "estimated_value") -> dict:
    """
    Allocates additional_budget across campaigns.
    Uses an iterative greedy solver to allocate increments to campaigns with high marginal returns.
    """
    # Load all campaign records
    records = db.query(CampaignPerformance).filter(CampaignPerformance.account_id == account_id).all()
    if not records:
        return {
            "total_incremental_budget": additional_budget,
            "campaign_allocations": [],
            "projected_incremental_conversions": 0,
            "projected_incremental_revenue": 0.0,
            "projected_estimated_value": 0.0,
            "projected_cpa": 0.0,
            "projected_cpi": 0.0,
            "projected_incremental_roas": 0.0,
            "explanation": "No campaign data is available to simulate allocation."
        }

    # Group records by campaign
    campaign_data = {}
    for r in records:
        name = r.campaign_name
        if selected_campaigns and name not in selected_campaigns:
            continue
        if name not in campaign_data:
            campaign_data[name] = {"spends": [], "conversions": [], "revenues": [], "installs": [], "ltvs": [], "cvalues": [], "record": r}
        campaign_data[name]["spends"].append(r.cost)
        campaign_data[name]["conversions"].append(r.conversions)
        campaign_data[name]["revenues"].append(r.revenue)
        campaign_data[name]["installs"].append(r.installs if r.installs is not None else r.conversions)
        campaign_data[name]["ltvs"].append(r.estimated_ltv if r.estimated_ltv is not None else 150.0)
        campaign_data[name]["cvalues"].append(r.conversion_value if r.conversion_value is not None else 50.0)

    # Fit curves and extract statistics
    campaigns = []
    for name, data in campaign_data.items():
        spends = data["spends"]
        convs = data["conversions"]
        r = data["record"]
        
        # Fit diminishing returns curve
        target_cpa = r.target_cpa if (r.target_cpa is not None) else settings.TARGET_CPA
        curve = fit_diminishing_returns_curve(spends, convs, target_cpa)
        
        # Compute ratios
        tot_conv = sum(convs)
        value_ratio = sum(data["revenues"]) / tot_conv if tot_conv > 0 else (r.conversion_value or 50.0)
        ltv_ratio = sum(data["ltvs"]) / len(data["ltvs"]) if data["ltvs"] else 150.0
        installs_ratio = sum(data["installs"]) / tot_conv if tot_conv > 0 else 1.0
        
        current_spend = sum(spends)
        
        # Avoid allocating to historically dead campaigns
        is_wasteful = tot_conv == 0 and current_spend > 50.0
        
        campaigns.append({
            "name": name,
            "a": curve["a"],
            "b": curve["b"],
            "diminishing_point": curve["diminishing_point"],
            "current_spend": current_spend,
            "allocated_spend": current_spend,
            "value_ratio": value_ratio,
            "ltv_ratio": ltv_ratio,
            "installs_ratio": installs_ratio,
            "is_wasteful": is_wasteful,
            "channel": r.channel
        })

    # Run Greedy Allocation Loop
    remaining_budget = additional_budget
    steps = 100
    step_size = additional_budget / steps
    
    while remaining_budget > 0.01:
        best_camp = None
        best_yield = -1.0
        
        for camp in campaigns:
            if camp["is_wasteful"]:
                continue
                
            spend_now = camp["allocated_spend"]
            spend_next = spend_now + step_size
            
            # Conversions increment: delta_C = a * (spend_next^b - spend_now^b)
            a, b = camp["a"], camp["b"]
            if spend_now > 0:
                delta_conv = a * (spend_next ** b) - a * (spend_now ** b)
            else:
                delta_conv = a * (spend_next ** b)
                
            # If camp is past diminishing returns point, heavily penalize its yield
            if spend_now >= camp["diminishing_point"]:
                delta_conv *= 0.05
                
            # Yield based on objective
            if objective == "conversions":
                item_yield = delta_conv
            elif objective == "revenue":
                item_yield = delta_conv * camp["value_ratio"]
            else: # estimated_value / default
                item_yield = delta_conv * camp["ltv_ratio"]
                
            if item_yield > best_yield:
                best_yield = item_yield
                best_camp = camp
                
        if best_camp is None:
            # Fall back to split evenly if all are wasteful
            split_step = remaining_budget / len(campaigns)
            for camp in campaigns:
                camp["allocated_spend"] += split_step
            break
            
        best_camp["allocated_spend"] += step_size
        remaining_budget -= step_size

    # Compile results
    campaign_allocations = []
    total_proj_conversions = 0.0
    total_proj_revenue = 0.0
    total_proj_value = 0.0
    total_proj_installs = 0.0
    
    total_base_conversions = 0.0
    total_base_revenue = 0.0
    total_base_value = 0.0
    total_base_installs = 0.0

    for camp in campaigns:
        # Base stats
        a, b = camp["a"], camp["b"]
        base_spend = camp["current_spend"]
        base_conv = a * (base_spend ** b) if base_spend > 0 else 0.0
        base_rev = base_conv * camp["value_ratio"]
        base_val = base_conv * camp["ltv_ratio"]
        base_inst = base_conv * camp["installs_ratio"]
        
        total_base_conversions += base_conv
        total_base_revenue += base_rev
        total_base_value += base_val
        total_base_installs += base_inst

        # New stats
        new_spend = camp["allocated_spend"]
        allocated_incr = new_spend - base_spend
        
        new_conv = a * (new_spend ** b) if new_spend > 0 else 0.0
        new_rev = new_conv * camp["value_ratio"]
        new_val = new_conv * camp["ltv_ratio"]
        new_inst = new_conv * camp["installs_ratio"]
        
        total_proj_conversions += new_conv
        total_proj_revenue += new_rev
        total_proj_value += new_val
        total_proj_installs += new_inst

        # Saturation score at new spend
        sat_score = min(100.0, (new_spend / camp["diminishing_point"]) * 100.0) if camp["diminishing_point"] > 0 else 0.0
        
        campaign_allocations.append({
            "campaign_name": camp["name"],
            "channel": camp["channel"],
            "allocated_increase": round(allocated_incr, 2),
            "base_spend": round(base_spend, 2),
            "new_spend": round(new_spend, 2),
            "projected_conversions": round(new_conv - base_conv, 1),
            "projected_revenue": round(new_rev - base_rev, 2),
            "projected_estimated_value": round(new_val - base_val, 2),
            "saturation_score": round(sat_score, 1),
            "status": "Saturated" if sat_score >= 80.0 else "Efficient"
        })

    # Calculations
    proj_incr_conv = max(0.0, total_proj_conversions - total_base_conversions)
    proj_incr_rev = max(0.0, total_proj_revenue - total_base_revenue)
    proj_incr_val = max(0.0, total_proj_value - total_base_value)
    proj_incr_inst = max(0.0, total_proj_installs - total_base_installs)
    
    projected_cpa = additional_budget / proj_incr_conv if proj_incr_conv > 0 else 0.0
    projected_cpi = additional_budget / proj_incr_inst if proj_incr_inst > 0 else 0.0
    projected_inc_roas = proj_incr_rev / additional_budget if additional_budget > 0 else 0.0

    # Build plain English explanation
    top_alloc = sorted(campaign_allocations, key=lambda x: x["allocated_increase"], reverse=True)
    allocated_names = [f"{c['campaign_name']} (+${c['allocated_increase']:.0f})" for c in top_alloc if c["allocated_increase"] > 0]
    
    if allocated_names:
        explanation = f"Allocated ${additional_budget:,.2f} budget prioritizing: {', '.join(allocated_names[:3])}. " \
                      f"Campaigns with high marginal returns and low current saturation scores were prioritized, " \
                      f"avoiding spending caps and underperforming target lines."
    else:
        explanation = "No budget was reallocated. Check if campaigns are selected or have active conversion histories."

    return {
        "total_incremental_budget": round(additional_budget, 2),
        "campaign_allocations": campaign_allocations,
        "projected_incremental_conversions": round(proj_incr_conv, 1),
        "projected_incremental_revenue": round(proj_incr_rev, 2),
        "projected_estimated_value": round(proj_incr_val, 2),
        "projected_cpa": round(projected_cpa, 2),
        "projected_cpi": round(projected_cpi, 2),
        "projected_incremental_roas": round(projected_inc_roas, 2),
        "explanation": explanation
    }

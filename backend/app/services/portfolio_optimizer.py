# Portfolio Budget Optimizer Service
from sqlalchemy.orm import Session
from app.models.database_models import CampaignPerformance
from app.services.diminishing_returns import fit_diminishing_returns_curve
from app.core.config import settings

def optimize_portfolio_budget(db: Session, account_id: int, total_budget: float, objective: str = "estimated_value") -> dict:
    """
    Solves for the optimal spend distribution across all campaigns that maximizes portfolio conversions/revenue
    subject to the total_budget constraint.
    """
    records = db.query(CampaignPerformance).filter(CampaignPerformance.account_id == account_id).all()
    if not records:
        return {
            "total_budget": total_budget,
            "current_allocation": {},
            "optimized_allocation": {},
            "expected_value": 0.0,
            "expected_conversions": 0.0,
            "expected_roas": 0.0,
            "expected_cpa": 0.0,
            "budget_shift_recommendations": []
        }

    # Group records by campaign
    campaign_records = {}
    for r in records:
        name = r.campaign_name
        if name not in campaign_records:
            campaign_records[name] = []
        campaign_records[name].append(r)

    campaigns = []
    total_current_spend = 0.0
    total_current_convs = 0.0
    total_current_rev = 0.0
    total_current_val = 0.0

    for name, list_r in campaign_records.items():
        list_r = sorted(list_r, key=lambda x: x.date)
        latest = list_r[-1]
        
        spends = [r.cost for r in list_r]
        convs = [r.conversions for r in list_r]
        
        target_cpa = latest.target_cpa if (latest.target_cpa is not None) else settings.TARGET_CPA
        curve = fit_diminishing_returns_curve(spends, convs, target_cpa)
        
        current_spend = float(latest.cost)
        current_convs = float(latest.conversions)
        current_rev = float(latest.revenue)
        
        c_val = latest.conversion_value if (latest.conversion_value is not None) else (current_rev / current_convs if current_convs > 0 else 50.0)
        ltv = latest.estimated_ltv if (latest.estimated_ltv is not None) else c_val
        
        total_current_spend += current_spend
        total_current_convs += current_convs
        total_current_rev += current_rev
        total_current_val += current_convs * ltv

        # Exponent check
        is_wasteful = sum(convs) == 0 and sum(spends) > 50.0
        
        campaigns.append({
            "name": name,
            "a": curve["a"],
            "b": curve["b"],
            "diminishing_point": curve["diminishing_point"],
            "current_spend": current_spend,
            "allocated_spend": 0.0, # Start optimization at 0 spend
            "value_ratio": current_rev / current_convs if current_convs > 0 else c_val,
            "ltv_ratio": ltv,
            "is_wasteful": is_wasteful,
            "channel": latest.channel
        })

    # If the user passes 0 or None, optimize based on the current overall spend level
    budget_to_allocate = total_budget if total_budget > 0 else total_current_spend
    
    # Run Greedy Allocation
    remaining_budget = budget_to_allocate
    steps = 200
    step_size = budget_to_allocate / steps
    
    while remaining_budget > 0.01:
        best_camp = None
        best_yield = -1.0
        
        for camp in campaigns:
            if camp["is_wasteful"]:
                continue
                
            spend_now = camp["allocated_spend"]
            spend_next = spend_now + step_size
            
            a, b = camp["a"], camp["b"]
            if spend_now > 0:
                delta_conv = a * (spend_next ** b) - a * (spend_now ** b)
            else:
                delta_conv = a * (spend_next ** b)
                
            # Saturating limit check
            if spend_now >= camp["diminishing_point"]:
                delta_conv *= 0.05
                
            # Yield metric
            if objective == "conversions":
                item_yield = delta_conv
            elif objective == "revenue":
                item_yield = delta_conv * camp["value_ratio"]
            else: # estimated_value
                item_yield = delta_conv * camp["ltv_ratio"]
                
            if item_yield > best_yield:
                best_yield = item_yield
                best_camp = camp
                
        if best_camp is None:
            # Distribute remaining budget evenly
            split_step = remaining_budget / len(campaigns)
            for camp in campaigns:
                camp["allocated_spend"] += split_step
            break
            
        best_camp["allocated_spend"] += step_size
        remaining_budget -= step_size

    # Prepare outputs
    current_allocation = {}
    optimized_allocation = {}
    
    total_opt_convs = 0.0
    total_opt_rev = 0.0
    total_opt_val = 0.0
    
    budget_shifts = []

    for camp in campaigns:
        a, b = camp["a"], camp["b"]
        new_spend = camp["allocated_spend"]
        old_spend = camp["current_spend"]
        
        current_allocation[camp["name"]] = round(old_spend, 2)
        optimized_allocation[camp["name"]] = round(new_spend, 2)
        
        # New conversions & value
        opt_conv = a * (new_spend ** b) if new_spend > 0 else 0.0
        opt_rev = opt_conv * camp["value_ratio"]
        opt_val = opt_conv * camp["ltv_ratio"]
        
        total_opt_convs += opt_conv
        total_opt_rev += opt_rev
        total_opt_val += opt_val
        
        shift = new_spend - old_spend
        # Estimate historical conversions
        old_conv = a * (old_spend ** b) if old_spend > 0 else 0.0
        old_rev = old_conv * camp["value_ratio"]
        
        rev_change = opt_rev - old_rev
        
        budget_shifts.append({
            "campaign_name": camp["name"],
            "channel": camp["channel"],
            "current_spend": round(old_spend, 2),
            "optimized_spend": round(new_spend, 2),
            "shift_amount": round(shift, 2),
            "projected_revenue_change": round(rev_change, 2)
        })

    # Calculations
    expected_roas = total_opt_rev / budget_to_allocate if budget_to_allocate > 0 else 0.0
    expected_cpa = budget_to_allocate / total_opt_convs if total_opt_convs > 0 else 0.0

    return {
        "total_budget": round(budget_to_allocate, 2),
        "current_allocation": current_allocation,
        "optimized_allocation": optimized_allocation,
        "expected_value": round(total_opt_val, 2),
        "expected_conversions": round(total_opt_convs, 1),
        "expected_roas": round(expected_roas, 2),
        "expected_cpa": round(expected_cpa, 2),
        "budget_shift_recommendations": budget_shifts
    }

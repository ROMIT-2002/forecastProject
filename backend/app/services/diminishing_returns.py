# Diminishing Returns Analytical Module
import numpy as np
from sqlalchemy.orm import Session
from app.models.database_models import CampaignPerformance
from app.core.config import settings

def fit_diminishing_returns_curve(spend_history: list[float], conversions_history: list[float], target_cpa: float = 30.0) -> dict:
    """
    Fits a power curve: Conversions = a * Spend^b
    Using linear regression in log-log space: ln(Conversions + 1) = ln(a) + b * ln(Spend + 1)
    
    Returns a dictionary of parameters and calculator functions.
    """
    n = len(spend_history)
    avg_spend = float(np.mean(spend_history)) if n > 0 else 0.0
    avg_conv = float(np.mean(conversions_history)) if n > 0 else 0.0
    
    # Defaults in case of insufficient data or bad fits
    b = 0.75
    a = avg_conv / (avg_spend ** b) if avg_spend > 0 else 0.0
    
    # Try fitting if we have enough points and variation
    if n >= 5 and np.std(spend_history) > 0 and np.std(conversions_history) > 0:
        try:
            X = np.log(np.array(spend_history) + 1.0)
            Y = np.log(np.array(conversions_history) + 1.0)
            
            # Linear fit: Y = slope * X + intercept
            slope, intercept = np.polyfit(X, Y, 1)
            
            # Constrain exponent to reasonable diminishing returns window [0.1, 0.9]
            b = float(np.clip(slope, 0.1, 0.90))
            a = float(np.exp(intercept))
        except Exception:
            pass # Fall back to historical averages defaults

    # Protect against extreme curve scaling
    if a <= 0:
        a = 0.1 if avg_conv > 0 else 0.0

    # Diminishing return point: Spend where Marginal CPA = Target CPA
    # Marginal CPA = 1 / d(Conversions)/d(Spend) = Spend^(1-b) / (a * b)
    # Target CPA = Spend^(1-b) / (a * b) => Spend = (a * b * Target CPA) ^ (1 / (1-b))
    t_cpa = target_cpa if target_cpa > 0 else 30.0
    if a > 0 and b < 1.0:
        diminishing_point = (a * b * t_cpa) ** (1.0 / (1.0 - b))
    else:
        diminishing_point = avg_spend * 1.5 if avg_spend > 0 else 500.0

    # Ensure diminishing point is reasonable
    diminishing_point = float(np.clip(diminishing_point, 50.0, 50000.0))

    return {
        "a": a,
        "b": b,
        "diminishing_point": diminishing_point,
        "avg_spend": avg_spend,
        "avg_conversions": avg_conv
    }

def get_campaign_diminishing_returns(db: Session, account_id: int, campaign_name: str) -> dict:
    """
    Loads historical daily spend and conversions for a campaign, fits the curve,
    and returns current saturation status and recommendations.
    """
    records = db.query(CampaignPerformance).filter(
        CampaignPerformance.account_id == account_id,
        CampaignPerformance.campaign_name == campaign_name
    ).all()

    if not records:
        return {
            "current_spend": 0.0,
            "recommended_spend": 100.0,
            "diminishing_return_point": 200.0,
            "marginal_cpa": 0.0,
            "incremental_roas": 0.0,
            "saturation_score": 0.0,
            "status": "Efficient",
            "explanation": "No campaign performance data available."
        }

    # Extract performance metrics
    spends = [r.cost for r in records]
    conversions = [r.conversions for r in records]
    revenues = [r.revenue for r in records]
    
    current_spend = float(records[-1].cost) if records else 0.0
    current_convs = float(records[-1].conversions) if records else 0.0
    
    # Target values from config or record fallbacks
    target_cpa = float(records[0].target_cpa) if (records and records[0].target_cpa is not None) else settings.TARGET_CPA
    target_roas = float(records[0].target_roas) if (records and records[0].target_roas is not None) else settings.TARGET_ROAS
    
    # Fit curve
    curve = fit_diminishing_returns_curve(spends, conversions, target_cpa)
    a, b = curve["a"], curve["b"]
    diminishing_point = curve["diminishing_point"]
    
    # Calculate Saturation score
    saturation_score = min(100.0, (current_spend / diminishing_point) * 100.0) if diminishing_point > 0 else 0.0
    
    # Marginal returns calculation at current spend
    # Marginal CPA = current_spend^(1-b) / (a * b)
    if a > 0 and current_spend > 0:
        marginal_cpa = (current_spend ** (1.0 - b)) / (a * b)
        # Solve for revenue curve: Value = a_rev * Spend^b_rev
        tot_rev = sum(revenues)
        tot_cost = sum(spends)
        roas_ratio = tot_rev / tot_cost if tot_cost > 0 else target_roas
        incremental_roas = roas_ratio * b / (current_spend ** (1.0 - b)) if current_spend > 0 else roas_ratio
    else:
        marginal_cpa = current_spend / current_convs if current_convs > 0 else target_cpa
        incremental_roas = target_roas

    # Determine status & recommendations
    if current_spend > 100.0 and current_convs == 0:
        status = "Wasteful"
        recommended_spend = 0.0
        explanation = f"Campaign has spent ${current_spend:.2f} recently with 0 conversions. We recommend pausing or reducing spend immediately."
    elif saturation_score >= 80.0:
        status = "Diminishing returns"
        recommended_spend = diminishing_point * 0.9
        explanation = f"Campaign is heavily saturated (Saturation: {saturation_score:.1f}%). Marginal CPA is ${marginal_cpa:.2f} which is higher than target. Scaling back budget is recommended."
    elif saturation_score >= 60.0:
        status = "Near saturation"
        recommended_spend = current_spend
        explanation = f"Campaign is approaching saturation limits. Monitor performance closely as further budget scaling will hit diminishing returns."
    else:
        status = "Efficient"
        recommended_spend = diminishing_point * 0.95
        explanation = f"Campaign is highly efficient and operates below the point of diminishing return (${diminishing_point:.2f}). Safe to scale up budget."

    # Determine LTV
    ltv = float(records[-1].estimated_ltv) if records and records[-1].estimated_ltv is not None else (float(records[-1].conversion_value) if records and records[-1].conversion_value is not None else 150.0)

    return {
        "campaign_name": campaign_name,
        "current_spend": round(current_spend, 2),
        "recommended_spend": round(recommended_spend, 2),
        "diminishing_return_point": round(diminishing_point, 2),
        "marginal_cpa": round(marginal_cpa, 2),
        "incremental_roas": round(incremental_roas, 2),
        "saturation_score": round(saturation_score, 1),
        "status": status,
        "explanation": explanation,
        "a": float(a),
        "b": float(b),
        "ltv": float(ltv)
    }
